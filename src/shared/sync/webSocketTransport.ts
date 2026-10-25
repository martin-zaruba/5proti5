/**
 * Transport to a room on the sync server (ADR 0006, T-017). Survives drops of Wi-Fi, a sleeping phone
 * or a server restart: it reconnects with a growing delay and, once the server says `welcome`, sends the
 * latest `feed` and `session` again – not a queue of every change, only the current state matters.
 */

import {
  CLOSE_CODES,
  decodeMessage,
  encodeMessage,
  message,
  type ConnectionStatus,
  type Role,
  type SyncMessage,
} from './protocol'
import { createListeners, type SyncTransport } from './transport'

export interface WebSocketTransportOptions {
  /** Server base URL (`VITE_SYNC_URL`), e.g. `https://5proti5-sync.example.workers.dev`. */
  serverUrl: string
  roomCode: string
  role: Role
  /** Host token; boards have none. */
  token?: string
  /** For tests. */
  createSocket?: (url: string) => WebSocket
}

/** Why the server refused us for good. */
export type ClosedReason = keyof typeof CLOSE_CODES

export interface WebSocketTransport extends SyncTransport {
  /** Set when the status is `closed`. */
  readonly closedReason: ClosedReason | null
}

export const RECONNECT_MIN_MS = 500
export const RECONNECT_MAX_MS = 10_000
export const PING_INTERVAL_MS = 15_000
/** No message (not even a pong) for this long = the connection is dead even if the browser did not notice. */
export const SILENCE_LIMIT_MS = 2 * PING_INTERVAL_MS + 5_000

/** Messages that carry the current state – the newest one is sent again after a reconnect. */
const LATEST_TYPES = new Set<SyncMessage['type']>(['feed', 'session'])

export function roomSocketUrl(serverUrl: string, roomCode: string): string {
  return `${serverUrl.replace(/^http/, 'ws').replace(/\/+$/, '')}/rooms/${roomCode}/ws`
}

export function createWebSocketTransport(options: WebSocketTransportOptions): WebSocketTransport {
  const { role, token } = options
  const url = roomSocketUrl(options.serverUrl, options.roomCode)
  const createSocket = options.createSocket ?? ((u: string) => new WebSocket(u))

  const received = createListeners<SyncMessage>()
  const statusListeners = createListeners<ConnectionStatus>()
  const latest = new Map<SyncMessage['type'], SyncMessage>()

  let status: ConnectionStatus = 'connecting'
  let closedReason: ClosedReason | null = null
  let socket: WebSocket | null = null
  let attempt = 0
  let stopped = false
  let reconnectTimer: ReturnType<typeof setTimeout> | undefined
  let lastHeard = 0

  function setStatus(next: ConnectionStatus) {
    if (status === next) return
    status = next
    statusListeners.emit(next)
  }

  function connect() {
    clearTimeout(reconnectTimer)
    if (stopped || closedReason) return
    setStatus('connecting')
    const ws = createSocket(url)
    socket = ws
    ws.addEventListener('open', () => {
      if (socket !== ws) return
      lastHeard = Date.now()
      ws.send(encodeMessage(message('hello', { role, token })))
    })
    ws.addEventListener('message', (event: MessageEvent) => {
      if (socket !== ws || typeof event.data !== 'string') return
      lastHeard = Date.now()
      const m = decodeMessage(event.data)
      if (!m) return
      if (m.type === 'welcome') {
        attempt = 0
        setStatus('online')
        for (const pending of latest.values()) ws.send(encodeMessage(pending))
      }
      received.emit(m)
    })
    ws.addEventListener('close', (event: CloseEvent) => {
      if (socket !== ws) return
      socket = null
      const reason = (Object.keys(CLOSE_CODES) as ClosedReason[]).find(
        (key) => CLOSE_CODES[key] === event.code,
      )
      if (reason) {
        closedReason = reason
        setStatus('closed')
        return
      }
      scheduleReconnect()
    })
    // An `error` is always followed by `close`, which does the work.
  }

  function scheduleReconnect() {
    if (stopped || closedReason) return
    setStatus('offline')
    const delay = Math.min(RECONNECT_MAX_MS, RECONNECT_MIN_MS * 2 ** attempt)
    attempt++
    reconnectTimer = setTimeout(connect, delay * (0.8 + Math.random() * 0.4))
  }

  /** Drops the current socket (its events are ignored from now on) and connects again. */
  function restart() {
    const ws = socket
    socket = null
    ws?.close()
    connect()
  }

  const pingTimer = setInterval(() => {
    if (!socket || status !== 'online') return
    if (Date.now() - lastHeard > SILENCE_LIMIT_MS) return restart()
    socket.send(encodeMessage(message('ping', { clientTime: Date.now() })))
  }, PING_INTERVAL_MS)

  // Back online / back in the foreground: do not wait for the backoff.
  const wakeUp = () => {
    if (stopped || closedReason || status === 'online') return
    attempt = 0
    if (!socket) connect()
  }
  const onVisibility = () => {
    if (document.visibilityState === 'visible') wakeUp()
  }
  if (typeof window !== 'undefined') window.addEventListener('online', wakeUp)
  if (typeof document !== 'undefined') document.addEventListener('visibilitychange', onVisibility)

  connect()

  return {
    get closedReason() {
      return closedReason
    },
    send(m) {
      if (LATEST_TYPES.has(m.type)) latest.set(m.type, m)
      if (socket && status === 'online') socket.send(encodeMessage(m))
    },
    subscribe: received.add,
    onStatus(listener) {
      listener(status)
      return statusListeners.add(listener)
    },
    close() {
      stopped = true
      clearTimeout(reconnectTimer)
      clearInterval(pingTimer)
      if (typeof window !== 'undefined') window.removeEventListener('online', wakeUp)
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', onVisibility)
      }
      const ws = socket
      socket = null
      ws?.close(1000)
      setStatus('offline')
      received.clear()
      statusListeners.clear()
    },
  }
}
