import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'

import { newSession } from '@/engine/__tests__/helpers'

import { message, type ConnectionStatus, type SyncMessage } from '../sync/protocol'
import type { ClosedReason, WebSocketTransportOptions } from '../sync/webSocketTransport'

/** Fake room connection: records what the panel sends, lets the test play the server. */
interface FakeRoom {
  options: WebSocketTransportOptions
  sent: SyncMessage[]
  /** Server time − local time of this device. */
  offset: number
  receive(m: SyncMessage): void
  setStatus(s: ConnectionStatus, reason?: ClosedReason): void
}
const rooms: FakeRoom[] = []

vi.mock('../sync/config', () => ({ syncServerUrl: 'https://sync.test' }))
vi.mock('../sync/webSocketTransport', async () => {
  const { createListeners } = await import('../sync/transport')
  return {
    createWebSocketTransport(options: WebSocketTransportOptions) {
      const received = createListeners<SyncMessage>()
      const statuses = createListeners<ConnectionStatus>()
      let status: ConnectionStatus = 'connecting'
      let closedReason: ClosedReason | null = null
      const room: FakeRoom = {
        options,
        sent: [],
        offset: 0,
        receive: received.emit,
        setStatus(s, reason) {
          status = s
          closedReason = reason ?? null
          statuses.emit(s)
        },
      }
      rooms.push(room)
      return {
        get closedReason() {
          return closedReason
        },
        send: (m: SyncMessage) => room.sent.push(m),
        subscribe: received.add,
        onStatus(listener: (s: ConnectionStatus) => void) {
          listener(status)
          return statuses.add(listener)
        },
        clockOffset: () => room.offset,
        close() {
          received.clear()
          statuses.clear()
        },
      }
    },
  }
})

const ROOM = { roomCode: 'ABCDEF', hostToken: 'token' }
const sessions = (room: FakeRoom) =>
  room.sent.filter((m): m is Extract<SyncMessage, { type: 'session' }> => m.type === 'session')

/** Fresh modules for every test: the stores keep their state at module level. */
async function load() {
  vi.resetModules()
  const { useGameStore } = await import('../gameStore')
  const { useHostRoom } = await import('../hostRoom')
  return { store: useGameStore(), host: useHostRoom() }
}

/** A local game last changed at `savedAt`. */
async function withLocalGame(savedAt: number) {
  const { store, host } = await load()
  const local = newSession()
  store.adoptSession(local, savedAt)
  return { store, host, local }
}

describe('host room', () => {
  beforeEach(() => {
    localStorage.clear()
    rooms.length = 0
  })
  afterEach(() => vi.unstubAllGlobals())

  it('sends nothing before the room answers with its session', async () => {
    const { host } = await withLocalGame(100)
    host.join(ROOM)
    await nextTick()
    expect(rooms[0]!.options).toMatchObject({ roomCode: 'ABCDEF', role: 'host', token: 'token' })
    expect(rooms[0]!.sent).toEqual([])
  })

  it('a device joining by link takes over the room game, even an older one', async () => {
    const { store, host } = await withLocalGame(100)
    const roomGame = newSession()
    host.join(ROOM)
    rooms[0]!.receive(message('session', { session: roomGame, savedAt: 50 }))
    await nextTick()

    expect(store.savedAt.value).toBe(50)
    expect(store.session.value?.state).toEqual(roomGame.state)
    expect(sessions(rooms[0]!).at(-1)?.savedAt).toBe(50)
    expect(rooms[0]!.sent.some((m) => m.type === 'feed')).toBe(true)
    expect(host.remoteChangeAt.value).toBeNull()
  })

  it('a joining device keeps its game when the room has none yet', async () => {
    const { store, host, local } = await withLocalGame(100)
    host.join(ROOM)
    rooms[0]!.receive(message('session', { session: null, savedAt: 0 }))
    expect(store.session.value).toStrictEqual(local)
    expect(sessions(rooms[0]!).at(-1)).toMatchObject({ savedAt: 100 })
  })

  it('after a reload the newer game wins', async () => {
    localStorage.setItem('5proti5:room', JSON.stringify(ROOM))
    const { store, host } = await withLocalGame(100)
    expect(host.room.value).toEqual(ROOM)

    rooms[0]!.receive(message('session', { session: null, savedAt: 90 }))
    expect(store.session.value).not.toBeNull()
    expect(sessions(rooms[0]!).at(-1)?.savedAt).toBe(100)

    // Later another panel of the room ends the game.
    rooms[0]!.receive(message('session', { session: null, savedAt: 200 }))
    expect(store.session.value).toBeNull()
    expect(host.remoteChangeAt.value).not.toBeNull()
  })

  it('compares the saved times in server time (clocks of devices differ)', async () => {
    localStorage.setItem('5proti5:room', JSON.stringify(ROOM))
    const { store } = await withLocalGame(100)
    rooms[0]!.offset = 1000 // this device's clock is 1 s behind the server

    // Server time 1050 = local 50: older than the local game (100) – keep it, send it as 1100.
    rooms[0]!.receive(message('session', { session: null, savedAt: 1050 }))
    expect(store.session.value).not.toBeNull()
    expect(sessions(rooms[0]!).at(-1)?.savedAt).toBe(1100)

    // Server time 1150 = local 150: newer – adopt it with the local time.
    rooms[0]!.receive(message('session', { session: null, savedAt: 1150 }))
    expect(store.session.value).toBeNull()
    expect(store.savedAt.value).toBe(150)
  })

  it('publishes every local change once in sync', async () => {
    const { store, host } = await withLocalGame(100)
    host.join(ROOM)
    rooms[0]!.receive(message('session', { session: null, savedAt: 0 }))
    store.act({ type: 'setShowQuestion', show: false })
    await nextTick()
    expect(sessions(rooms[0]!).at(-1)!.savedAt).toBe(store.savedAt.value)
    expect(store.savedAt.value).toBeGreaterThan(100)
  })

  it('forgets a room that no longer exists', async () => {
    const { host } = await withLocalGame(100)
    host.join(ROOM)
    rooms[0]!.setStatus('closed', 'roomNotFound')
    expect(host.room.value).toBeNull()
    expect(host.status.value).toBeNull()
    expect(host.error.value).toMatch(/neexistuje/)
    expect(localStorage.getItem('5proti5:room')).toBeNull()
  })

  it('creates a room on the server and connects to it', async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => Response.json(ROOM, { status: 201 }))
    vi.stubGlobal('fetch', fetchMock)
    const { host } = await withLocalGame(100)
    await host.create()
    expect(fetchMock).toHaveBeenCalledWith('https://sync.test/rooms', { method: 'POST' })
    expect(host.room.value).toEqual(ROOM)
    expect(JSON.parse(localStorage.getItem('5proti5:room')!)).toEqual(ROOM)
    expect(rooms).toHaveLength(1)
  })

  it('shows the server error when a room cannot be created', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>(async () => new Response('Nepovolený pôvod', { status: 403 })),
    )
    const { host } = await withLocalGame(100)
    await host.create()
    expect(host.room.value).toBeNull()
    expect(host.error.value).toBe('Nepovolený pôvod')
  })
})
