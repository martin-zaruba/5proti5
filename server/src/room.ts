/**
 * One game room = one Durable Object (ADR 0006). The moderator's panel is the source of truth:
 * the room only stores what the host sends (`feed`, `session`) and passes it on. Boards get the feed,
 * never the session with hidden answers. WebSockets use the Hibernation API, so nothing important
 * lives in memory – every handler reads from storage.
 */

import { DurableObject } from 'cloudflare:workers'

import {
  CLOSE_CODES,
  decodeMessage,
  encodeMessage,
  MAX_MESSAGE_BYTES,
  message,
  PROTOCOL_VERSION,
  type BoardFeed,
  type ErrorCode,
  type Role,
  type SyncMessage,
} from '../../src/shared/sync/protocol'
import { hashToken } from './rooms'

/** Rooms nobody used for this long are deleted (OQ-19). */
export const ROOM_TTL_MS = 14 * 24 * 60 * 60 * 1000

/** Survives hibernation together with the socket; `null` until the client says `hello`. */
interface Attachment {
  role: Role | null
}

type SessionMessage = Extract<SyncMessage, { type: 'session' }>

/** Storage keys. */
const TOKEN_HASH = 'tokenHash'
const FEED = 'feed'
const SESSION = 'session'
const UPDATED_AT = 'updatedAt'

export type RemoveResult = 'removed' | 'notFound' | 'unauthorized'

export class GameRoom extends DurableObject<Env> {
  /** Called by the Worker for a fresh code; `false` if the code is already taken. */
  async create(tokenHash: string): Promise<boolean> {
    if (await this.ctx.storage.get(TOKEN_HASH)) return false
    await this.ctx.storage.put(TOKEN_HASH, tokenHash)
    await this.touch()
    return true
  }

  /** Ends the room for everybody (the moderator's „Ukončiť miestnosť“). */
  async remove(tokenHash: string): Promise<RemoveResult> {
    const stored = await this.ctx.storage.get<string>(TOKEN_HASH)
    if (!stored) return 'notFound'
    if (stored !== tokenHash) return 'unauthorized'
    await this.destroy()
    return 'removed'
  }

  async fetch(): Promise<Response> {
    const pair = new WebSocketPair()
    const [client, server] = [pair[0], pair[1]]
    this.ctx.acceptWebSocket(server)
    server.serializeAttachment({ role: null } satisfies Attachment)
    if (!(await this.ctx.storage.get(TOKEN_HASH))) {
      server.close(CLOSE_CODES.roomNotFound, 'Miestnosť neexistuje')
    }
    return new Response(null, { status: 101, webSocket: client })
  }

  async webSocketMessage(ws: WebSocket, data: string | ArrayBuffer): Promise<void> {
    if (typeof data !== 'string') return this.reject(ws, 'badMessage', 'Očakáva sa textová správa')
    if (new TextEncoder().encode(data).byteLength > MAX_MESSAGE_BYTES) {
      return this.reject(ws, 'tooLarge', 'Správa je príliš veľká')
    }
    const m = decodeMessage(data)
    if (!m) {
      const v = versionOf(data)
      return typeof v === 'number' && v !== PROTOCOL_VERSION
        ? this.close(ws, 'unsupportedVersion', 'Nepodporovaná verzia protokolu – obnov stránku')
        : this.reject(ws, 'badMessage', 'Neplatná správa')
    }

    if (m.type === 'ping') {
      return send(ws, message('pong', { clientTime: m.clientTime, serverTime: Date.now() }))
    }
    const { role } = ws.deserializeAttachment() as Attachment
    if (role === null) {
      return m.type === 'hello'
        ? this.hello(ws, m.role, m.token)
        : this.reject(ws, 'unauthorized', 'Najprv sa treba predstaviť (hello)')
    }

    switch (m.type) {
      case 'requestFeed': {
        const feed = await this.ctx.storage.get<BoardFeed>(FEED)
        if (feed) send(ws, message('feed', { feed }))
        return
      }
      case 'feed':
        if (role !== 'host') return this.reject(ws, 'unauthorized', 'Tabuľa nemôže meniť stav hry')
        await this.ctx.storage.put(FEED, m.feed)
        await this.touch()
        return this.broadcast(ws, 'board', m)
      case 'session':
        if (role !== 'host') return this.reject(ws, 'unauthorized', 'Tabuľa nemôže meniť stav hry')
        // The last session received wins; other panels of the room get it too (OQ-18).
        await this.ctx.storage.put(SESSION, m)
        await this.touch()
        return this.broadcast(ws, 'host', m)
      default:
        return this.reject(ws, 'badMessage', `Správu „${m.type}“ server neprijíma`)
    }
  }

  async webSocketClose(ws: WebSocket, code: number, reason: string): Promise<void> {
    try {
      ws.close(code, reason)
    } catch {
      // Already closed, or a code that may not be sent back (1005, 1006).
    }
  }

  /** Deletes a room nobody used for `ROOM_TTL_MS`; otherwise plans the next check. */
  async alarm(): Promise<void> {
    const updatedAt = (await this.ctx.storage.get<number>(UPDATED_AT)) ?? 0
    if (Date.now() - updatedAt < ROOM_TTL_MS) {
      await this.ctx.storage.setAlarm(updatedAt + ROOM_TTL_MS)
      return
    }
    await this.destroy()
  }

  private async hello(ws: WebSocket, role: Role, token: string | undefined) {
    if (role === 'host') {
      const stored = await this.ctx.storage.get<string>(TOKEN_HASH)
      if (!token || (await hashToken(token)) !== stored) {
        return this.close(ws, 'unauthorized', 'Nesprávny token moderátora')
      }
    }
    ws.serializeAttachment({ role } satisfies Attachment)
    send(ws, message('welcome', { role, serverTime: Date.now() }))

    // Like the local transport: a new client first gets the last known state.
    const feed = await this.ctx.storage.get<BoardFeed>(FEED)
    if (feed) send(ws, message('feed', { feed }))
    // A host always gets a session (savedAt 0 = the room has no game yet): until then it does not send
    // its own, so a panel that joins a running room does not overwrite the game with its local one.
    if (role === 'host') {
      const session = await this.ctx.storage.get<SessionMessage>(SESSION)
      send(ws, session ?? message('session', { session: null, savedAt: 0 }))
    }
  }

  private broadcast(sender: WebSocket, role: Role, m: SyncMessage) {
    const text = encodeMessage(m)
    for (const ws of this.ctx.getWebSockets()) {
      if (ws === sender) continue
      if ((ws.deserializeAttachment() as Attachment | null)?.role === role) trySend(ws, text)
    }
  }

  private async touch() {
    const now = Date.now()
    await this.ctx.storage.put(UPDATED_AT, now)
    await this.ctx.storage.setAlarm(now + ROOM_TTL_MS)
  }

  private async destroy() {
    for (const ws of this.ctx.getWebSockets()) {
      try {
        ws.close(CLOSE_CODES.roomNotFound, 'Miestnosť bola ukončená')
      } catch {
        // already closed
      }
    }
    await this.ctx.storage.deleteAlarm()
    await this.ctx.storage.deleteAll()
  }

  private reject(ws: WebSocket, code: ErrorCode, text: string) {
    send(ws, message('error', { code, message: text }))
  }

  /** Errors after which the client must not reconnect. */
  private close(ws: WebSocket, code: 'unauthorized' | 'unsupportedVersion', text: string) {
    this.reject(ws, code, text)
    ws.close(CLOSE_CODES[code], text)
  }
}

function send(ws: WebSocket, m: SyncMessage) {
  trySend(ws, encodeMessage(m))
}

function trySend(ws: WebSocket, text: string) {
  try {
    ws.send(text)
  } catch {
    // The socket is closing; the client gets the current state again when it reconnects.
  }
}

/** Protocol version of a message that did not pass validation (to tell an old client to reload). */
function versionOf(text: string): unknown {
  try {
    return (JSON.parse(text) as { v?: unknown } | null)?.v
  } catch {
    return undefined
  }
}
