import { env, runDurableObjectAlarm, runInDurableObject, SELF } from 'cloudflare:test'
import { describe, expect, it } from 'vitest'

import {
  CLOSE_CODES,
  decodeMessage,
  encodeMessage,
  MAX_MESSAGE_BYTES,
  message,
  PROTOCOL_VERSION,
  type BoardFeed,
  type CreatedRoom,
  type SyncMessage,
} from '../../src/shared/sync/protocol'
import { ROOM_TTL_MS, type GameRoom } from '../src/room'

const BASE = 'https://sync.test'
const feed = (muted: boolean): BoardFeed => ({ view: null, timer: null, muted })

async function createRoom(): Promise<CreatedRoom> {
  const response = await SELF.fetch(`${BASE}/rooms`, { method: 'POST' })
  expect(response.status).toBe(201)
  return response.json()
}

/** Test client: collects received messages and waits for the next one. */
async function connect(roomCode: string) {
  const response = await SELF.fetch(`${BASE}/rooms/${roomCode}/ws`, {
    headers: { Upgrade: 'websocket' },
  })
  const ws = response.webSocket!
  ws.accept()
  const inbox: SyncMessage[] = []
  const waiting: ((m: SyncMessage) => void)[] = []
  ws.addEventListener('message', (event) => {
    const m = decodeMessage(event.data as string)!
    const waiter = waiting.shift()
    if (waiter) waiter(m)
    else inbox.push(m)
  })
  const closed = new Promise<number>((resolve) =>
    ws.addEventListener('close', (event) => resolve(event.code)),
  )
  const client = {
    ws,
    closed,
    send: (m: SyncMessage) => ws.send(encodeMessage(m)),
    next: () =>
      new Promise<SyncMessage>((resolve) => {
        const m = inbox.shift()
        if (m) resolve(m)
        else waiting.push(resolve)
      }),
    /** Round trip through the server – everything sent before has been handled. */
    async flush() {
      client.send(message('ping', { clientTime: 0 }))
      const received: SyncMessage[] = []
      for (let m = await client.next(); m.type !== 'pong'; m = await client.next()) received.push(m)
      return received
    },
  }
  return client
}

async function join(roomCode: string, role: 'host' | 'board', token?: string) {
  const client = await connect(roomCode)
  client.send(message('hello', { role, token }))
  expect(await client.next()).toMatchObject({ type: 'welcome', role })
  return client
}

describe('sync server', () => {
  it('creates rooms with a code and a host token', async () => {
    const room = await createRoom()
    expect(room.roomCode).toMatch(/^[A-Z2-9]{6}$/)
    expect(room.hostToken.length).toBeGreaterThan(20)
  })

  it('passes the host feed to boards, also to boards that join later', async () => {
    const { roomCode, hostToken } = await createRoom()
    const host = await join(roomCode, 'host', hostToken)
    const board = await join(roomCode, 'board')

    host.send(message('feed', { feed: feed(true) }))
    expect(await board.next()).toEqual(message('feed', { feed: feed(true) }))

    const late = await join(roomCode, 'board')
    expect(await late.next()).toEqual(message('feed', { feed: feed(true) }))
    late.send(message('requestFeed', {}))
    expect(await late.next()).toEqual(message('feed', { feed: feed(true) }))
  })

  it('keeps the session for hosts only', async () => {
    const { roomCode, hostToken } = await createRoom()
    const host = await join(roomCode, 'host', hostToken)
    const board = await join(roomCode, 'board')
    const otherHost = await join(roomCode, 'host', hostToken)

    const session = message('session', { session: null, savedAt: 42 })
    host.send(session)
    expect(await otherHost.next()).toEqual(session)
    expect(await board.flush()).toEqual([])

    const reconnected = await join(roomCode, 'host', hostToken)
    expect(await reconnected.next()).toEqual(session)
    const lateBoard = await join(roomCode, 'board')
    expect(await lateBoard.flush()).toEqual([])
  })

  it('does not let a board change the game', async () => {
    const { roomCode, hostToken } = await createRoom()
    const host = await join(roomCode, 'host', hostToken)
    host.send(message('feed', { feed: feed(false) }))
    await host.flush()

    const board = await join(roomCode, 'board')
    expect(await board.next()).toMatchObject({ type: 'feed' })
    board.send(message('feed', { feed: feed(true) }))
    board.send(message('session', { session: null, savedAt: 1 }))
    expect(await board.next()).toMatchObject({ type: 'error', code: 'unauthorized' })
    expect(await board.next()).toMatchObject({ type: 'error', code: 'unauthorized' })

    board.send(message('requestFeed', {}))
    expect(await board.next()).toEqual(message('feed', { feed: feed(false) }))
  })

  it('refuses a wrong host token and closes the socket', async () => {
    const { roomCode } = await createRoom()
    const client = await connect(roomCode)
    client.send(message('hello', { role: 'host', token: 'wrong' }))
    expect(await client.next()).toMatchObject({ type: 'error', code: 'unauthorized' })
    expect(await client.closed).toBe(CLOSE_CODES.unauthorized)
  })

  it('requires hello before anything but ping', async () => {
    const { roomCode } = await createRoom()
    const client = await connect(roomCode)
    client.send(message('ping', { clientTime: 7 }))
    const pong = await client.next()
    expect(pong).toMatchObject({ type: 'pong', clientTime: 7 })
    expect(pong.type === 'pong' && pong.serverTime).toBeGreaterThan(0)
    client.send(message('requestFeed', {}))
    expect(await client.next()).toMatchObject({ type: 'error', code: 'unauthorized' })
  })

  it('rejects invalid, too large and outdated messages', async () => {
    const { roomCode } = await createRoom()
    const client = await join(roomCode, 'board')
    client.ws.send('not json')
    expect(await client.next()).toMatchObject({ type: 'error', code: 'badMessage' })
    client.ws.send('x'.repeat(MAX_MESSAGE_BYTES + 1))
    expect(await client.next()).toMatchObject({ type: 'error', code: 'tooLarge' })
    client.ws.send(JSON.stringify({ v: PROTOCOL_VERSION + 1, type: 'requestFeed' }))
    expect(await client.next()).toMatchObject({ type: 'error', code: 'unsupportedVersion' })
    expect(await client.closed).toBe(CLOSE_CODES.unsupportedVersion)
  })

  it('closes sockets of a room that does not exist', async () => {
    const client = await connect('ABCDEF')
    expect(await client.closed).toBe(CLOSE_CODES.roomNotFound)
  })

  it('ends a room only with the host token', async () => {
    const { roomCode, hostToken } = await createRoom()
    const board = await join(roomCode, 'board')
    const remove = (token: string) =>
      SELF.fetch(`${BASE}/rooms/${roomCode}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })

    expect((await remove('wrong')).status).toBe(403)
    expect((await remove(hostToken)).status).toBe(204)
    expect(await board.closed).toBe(CLOSE_CODES.roomNotFound)
    expect((await remove(hostToken)).status).toBe(404)
    expect(await (await connect(roomCode)).closed).toBe(CLOSE_CODES.roomNotFound)
  })

  it('deletes a room after the inactivity period', async () => {
    const { roomCode } = await createRoom()
    const stub = env.ROOMS.get(env.ROOMS.idFromName(roomCode))

    // Recently used: the alarm only plans the next check.
    expect(await runDurableObjectAlarm(stub)).toBe(true)
    expect(
      await runInDurableObject(stub, (_: GameRoom, state) => state.storage.get('tokenHash')),
    ).toBeTruthy()

    await runInDurableObject(stub, async (_: GameRoom, state) => {
      await state.storage.put('updatedAt', Date.now() - ROOM_TTL_MS - 1)
      await state.storage.setAlarm(Date.now())
    })
    expect(await runDurableObjectAlarm(stub)).toBe(true)
    expect(await (await connect(roomCode)).closed).toBe(CLOSE_CODES.roomNotFound)
  })

  it('allows only configured origins and answers CORS preflight', async () => {
    const evil = await SELF.fetch(`${BASE}/rooms`, {
      method: 'POST',
      headers: { Origin: 'https://evil.example' },
    })
    expect(evil.status).toBe(403)

    const preflight = await SELF.fetch(`${BASE}/rooms/ABCDEF`, {
      method: 'OPTIONS',
      headers: { Origin: 'http://localhost:5173' },
    })
    expect(preflight.status).toBe(204)
    expect(preflight.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:5173')
    expect(preflight.headers.get('Access-Control-Allow-Methods')).toContain('DELETE')

    const created = await SELF.fetch(`${BASE}/rooms`, {
      method: 'POST',
      headers: { Origin: 'null' },
    })
    expect(created.status).toBe(201)
    expect(created.headers.get('Access-Control-Allow-Origin')).toBe('null')
  })

  it('answers 404 for unknown paths and invalid codes', async () => {
    expect((await SELF.fetch(`${BASE}/nothing`)).status).toBe(404)
    expect(
      (await SELF.fetch(`${BASE}/rooms/00000/ws`, { headers: { Upgrade: 'websocket' } })).status,
    ).toBe(404)
  })
})
