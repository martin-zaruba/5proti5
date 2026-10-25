/** HTTP calls to the sync server and the moderator's join link (ADR 0006, T-018). */

import { normalizeRoomCode, type CreatedRoom } from './protocol'

const base = (serverUrl: string) => serverUrl.replace(/\/+$/, '')

async function failure(response: Response, fallback: string): Promise<Error> {
  const text = await response.text().catch(() => '')
  return new Error(text || `${fallback} (HTTP ${response.status})`)
}

export async function createRoom(serverUrl: string): Promise<CreatedRoom> {
  let response: Response
  try {
    response = await fetch(`${base(serverUrl)}/rooms`, { method: 'POST' })
  } catch {
    throw new Error('Server nie je dostupný – skontroluj pripojenie na internet')
  }
  if (!response.ok) throw await failure(response, 'Miestnosť sa nepodarilo založiť')
  return (await response.json()) as CreatedRoom
}

/** Ends the room for every device; a room that no longer exists is fine too. */
export async function endRoom(serverUrl: string, room: CreatedRoom): Promise<void> {
  let response: Response
  try {
    response = await fetch(`${base(serverUrl)}/rooms/${room.roomCode}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${room.hostToken}` },
    })
  } catch {
    throw new Error('Server nie je dostupný – miestnosť sa nepodarilo ukončiť')
  }
  if (!response.ok && response.status !== 404) {
    throw await failure(response, 'Miestnosť sa nepodarilo ukončiť')
  }
}

/**
 * The moderator's link to another device carries the token in the URL fragment (`#join=CODE.TOKEN`):
 * the fragment never reaches a server, so the token stays out of access logs.
 */
export const joinHash = (room: CreatedRoom) => `#join=${room.roomCode}.${room.hostToken}`

export function parseJoinHash(hash: string): CreatedRoom | null {
  const match = /^#join=([^.]+)\.([A-Za-z0-9_-]+)$/.exec(hash)
  const roomCode = match && normalizeRoomCode(match[1]!)
  return roomCode ? { roomCode, hostToken: match[2]! } : null
}
