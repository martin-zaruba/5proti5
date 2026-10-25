import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  CLOSE_CODES,
  decodeMessage,
  encodeMessage,
  message,
  type BoardFeed,
  type ConnectionStatus,
  type SyncMessage,
} from '../sync/protocol'
import {
  createWebSocketTransport,
  PING_INTERVAL_MS,
  RECONNECT_MAX_MS,
  RECONNECT_MIN_MS,
  roomSocketUrl,
  SILENCE_LIMIT_MS,
  type WebSocketTransport,
} from '../sync/webSocketTransport'

/** Stand-in for a browser WebSocket that the test drives by hand. */
class FakeSocket extends EventTarget {
  sent: SyncMessage[] = []
  closed = false
  constructor(readonly url: string) {
    super()
  }
  send(text: string) {
    this.sent.push(decodeMessage(text)!)
  }
  close() {
    this.closed = true
  }
  open() {
    this.dispatchEvent(new Event('open'))
  }
  receive(m: SyncMessage | string) {
    const data = typeof m === 'string' ? m : encodeMessage(m)
    this.dispatchEvent(new MessageEvent('message', { data }))
  }
  welcome() {
    this.open()
    this.receive(message('welcome', { role: 'host', serverTime: Date.now() }))
  }
  drop(code = 1006) {
    this.dispatchEvent(new CloseEvent('close', { code }))
  }
}

const feed = (muted: boolean): BoardFeed => ({ view: null, timer: null, muted })

describe('WebSocket transport', () => {
  let sockets: FakeSocket[]
  let transport: WebSocketTransport | undefined
  let statuses: ConnectionStatus[]
  const last = () => sockets[sockets.length - 1]!

  function start(role: 'host' | 'board' = 'host') {
    transport = createWebSocketTransport({
      serverUrl: 'https://sync.example/',
      roomCode: 'ABCDEF',
      role,
      token: role === 'host' ? 'secret' : undefined,
      createSocket: (url) => {
        const socket = new FakeSocket(url)
        sockets.push(socket)
        return socket as unknown as WebSocket
      },
    })
    transport.onStatus((s) => statuses.push(s))
    return transport
  }

  beforeEach(() => {
    vi.useFakeTimers()
    sockets = []
    statuses = []
  })
  afterEach(() => {
    transport?.close()
    transport = undefined
    vi.useRealTimers()
  })

  it('builds the socket URL from the server URL', () => {
    expect(roomSocketUrl('https://sync.example/', 'ABCDEF')).toBe(
      'wss://sync.example/rooms/ABCDEF/ws',
    )
    expect(roomSocketUrl('http://127.0.0.1:8787', 'ABCDEF')).toBe(
      'ws://127.0.0.1:8787/rooms/ABCDEF/ws',
    )
  })

  it('says hello and is online after the welcome', () => {
    start()
    expect(last().url).toBe('wss://sync.example/rooms/ABCDEF/ws')
    last().open()
    expect(last().sent).toEqual([message('hello', { role: 'host', token: 'secret' })])
    expect(statuses).toEqual(['connecting'])
    last().receive(message('welcome', { role: 'host', serverTime: 1 }))
    expect(statuses).toEqual(['connecting', 'online'])
  })

  it('sends only the latest feed and session once connected', () => {
    const transport = start()
    transport.send(message('feed', { feed: feed(false) }))
    transport.send(message('feed', { feed: feed(true) }))
    transport.send(message('session', { session: null, savedAt: 1 }))
    transport.send(message('requestFeed', {}))
    last().welcome()
    expect(last().sent.slice(1)).toEqual([
      message('feed', { feed: feed(true) }),
      message('session', { session: null, savedAt: 1 }),
    ])

    transport.send(message('requestFeed', {}))
    expect(last().sent.at(-1)).toEqual(message('requestFeed', {}))
  })

  it('passes valid messages to subscribers', () => {
    const transport = start('board')
    const listener = vi.fn<(m: SyncMessage) => void>()
    transport.subscribe(listener)
    last().welcome()
    last().receive(message('feed', { feed: feed(true) }))
    last().receive('garbage')
    expect(listener.mock.calls.map(([m]) => m.type)).toEqual(['welcome', 'feed'])
  })

  it('reconnects with a growing delay and resends the current state', () => {
    const transport = start()
    last().welcome()
    last().drop()
    expect(statuses.at(-1)).toBe('offline')
    transport.send(message('feed', { feed: feed(true) }))

    vi.advanceTimersByTime(RECONNECT_MIN_MS * 1.2)
    expect(sockets).toHaveLength(2)
    last().drop()
    vi.advanceTimersByTime(RECONNECT_MIN_MS * 1.2)
    expect(sockets).toHaveLength(2) // second attempt waits twice as long
    vi.advanceTimersByTime(RECONNECT_MIN_MS * 1.2)
    expect(sockets).toHaveLength(3)

    last().welcome()
    expect(statuses.at(-1)).toBe('online')
    expect(last().sent.at(-1)).toEqual(message('feed', { feed: feed(true) }))
  })

  it('never waits longer than the maximum delay', () => {
    start()
    for (let i = 0; i < 10; i++) {
      last().drop()
      vi.advanceTimersByTime(RECONNECT_MAX_MS * 1.2)
    }
    expect(sockets).toHaveLength(11)
  })

  it('stops for good when the server refuses the room or the token', () => {
    for (const [reason, code] of Object.entries(CLOSE_CODES)) {
      sockets = []
      statuses = []
      const transport = start()
      last().open()
      last().drop(code)
      vi.advanceTimersByTime(RECONNECT_MAX_MS * 2)
      expect(sockets).toHaveLength(1)
      expect(statuses.at(-1)).toBe('closed')
      expect(transport.closedReason).toBe(reason)
      transport.close()
    }
  })

  it('pings while online and reconnects when the server goes silent', () => {
    start()
    last().welcome()
    vi.advanceTimersByTime(PING_INTERVAL_MS)
    expect(last().sent.at(-1)?.type).toBe('ping')

    vi.advanceTimersByTime(SILENCE_LIMIT_MS)
    expect(sockets[0]!.closed).toBe(true)
    expect(sockets).toHaveLength(2)
    expect(statuses.at(-1)).toBe('connecting')
  })

  it('reconnects right away when the browser is back online', () => {
    start()
    last().drop()
    last().drop() // ignored: the socket is already gone
    window.dispatchEvent(new Event('online'))
    expect(sockets).toHaveLength(2)
  })

  it('does nothing after close', () => {
    const transport = start()
    last().welcome()
    transport.close()
    expect(sockets[0]!.closed).toBe(true)
    last().drop()
    vi.advanceTimersByTime(RECONNECT_MAX_MS * 2)
    expect(sockets).toHaveLength(1)
  })
})
