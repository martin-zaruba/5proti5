/**
 * Messages between the moderator panel, boards and the sync server (ADR 0006). Plain types and
 * checks only – no Vue, no DOM – so the Cloudflare server in `server/` shares them with the app.
 *
 * Who sends what:
 * - host → others: `feed` (what boards show), `session` (saved game, contains hidden answers)
 * - board → host: `requestFeed` (a board just opened and wants the current feed)
 * - client ↔ server: `hello` / `welcome`, `ping` / `pong`, `error`
 * Boards never receive `session`.
 */

import type { BoardView, GameSession } from '@/engine'

import type { TimerView } from '../timer'

export const PROTOCOL_VERSION = 1

/** Larger messages are refused (a saved game with full undo history fits comfortably). */
export const MAX_MESSAGE_BYTES = 1_000_000

/** Everything the board shows: the game, the countdown and whether sounds are muted. */
export interface BoardFeed {
  view: BoardView | null
  timer: TimerView | null
  muted: boolean
}

export type Role = 'host' | 'board'

export type ConnectionStatus = 'connecting' | 'online' | 'offline'

export type ErrorCode = 'badMessage' | 'unauthorized' | 'tooLarge' | 'unsupportedVersion'

/**
 * WebSocket close codes after which a client must not reconnect. (A browser cannot read the HTTP
 * status of a refused upgrade, so the server accepts the socket and closes it with a reason.)
 */
export const CLOSE_CODES = {
  unauthorized: 4001,
  unsupportedVersion: 4002,
  roomNotFound: 4004,
} as const

/** Answer of `POST /rooms`. */
export interface CreatedRoom {
  roomCode: string
  hostToken: string
}

/** Room codes avoid characters that are easy to mix up (0/O, 1/I/L). */
export const ROOM_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
export const ROOM_CODE_LENGTH = 6

/** Cleans up a typed room code (case, spaces, dashes); `null` if it cannot be a room code. */
export function normalizeRoomCode(input: string): string | null {
  const code = input.toUpperCase().replace(/[\s-]/g, '')
  return code.length === ROOM_CODE_LENGTH && [...code].every((c) => ROOM_CODE_ALPHABET.includes(c))
    ? code
    : null
}

export type SyncMessage =
  | { v: number; type: 'feed'; feed: BoardFeed }
  | { v: number; type: 'requestFeed' }
  /** `savedAt` (ms) decides which copy is newer when two devices disagree (OQ-18). */
  | { v: number; type: 'session'; session: GameSession | null; savedAt: number }
  | { v: number; type: 'hello'; role: Role; token?: string }
  | { v: number; type: 'welcome'; role: Role; serverTime: number }
  | { v: number; type: 'ping'; clientTime: number }
  | { v: number; type: 'pong'; clientTime: number; serverTime: number }
  | { v: number; type: 'error'; code: ErrorCode; message: string }

type Payload<T extends SyncMessage['type']> = Omit<Extract<SyncMessage, { type: T }>, 'v' | 'type'>

/** Builds a message of the current protocol version. */
export function message<T extends SyncMessage['type']>(type: T, payload: Payload<T>) {
  return { v: PROTOCOL_VERSION, type, ...payload } as Extract<SyncMessage, { type: T }>
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value)

const isRole = (value: unknown): value is Role => value === 'host' || value === 'board'

/** Shape check only – the feed and session contents come from our own engine. */
const isFeed = (value: unknown): value is BoardFeed =>
  isObject(value) &&
  (value.view === null || isObject(value.view)) &&
  (value.timer === null || isObject(value.timer)) &&
  typeof value.muted === 'boolean'

const CHECKS: { [T in SyncMessage['type']]: (m: Record<string, unknown>) => boolean } = {
  feed: (m) => isFeed(m.feed),
  requestFeed: () => true,
  session: (m) => (m.session === null || isObject(m.session)) && isNumber(m.savedAt),
  hello: (m) => isRole(m.role) && (m.token === undefined || typeof m.token === 'string'),
  welcome: (m) => isRole(m.role) && isNumber(m.serverTime),
  ping: (m) => isNumber(m.clientTime),
  pong: (m) => isNumber(m.clientTime) && isNumber(m.serverTime),
  error: (m) => typeof m.code === 'string' && typeof m.message === 'string',
}

/** Returns the message if it is a valid message of the current version, otherwise `null`. */
export function parseMessage(data: unknown): SyncMessage | null {
  if (!isObject(data) || data.v !== PROTOCOL_VERSION || typeof data.type !== 'string') return null
  if (!Object.hasOwn(CHECKS, data.type)) return null
  return CHECKS[data.type as SyncMessage['type']](data) ? (data as SyncMessage) : null
}

export const encodeMessage = (m: SyncMessage): string => JSON.stringify(m)

/** Parses a received text frame; invalid JSON or an invalid message gives `null`. */
export function decodeMessage(text: string): SyncMessage | null {
  try {
    return parseMessage(JSON.parse(text))
  } catch {
    return null
  }
}
