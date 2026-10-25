/** Room codes, host tokens and origin checks – small pure helpers of the sync server (ADR 0006). */

import { ROOM_CODE_ALPHABET, ROOM_CODE_LENGTH } from '../../src/shared/sync/protocol'

/** Random room code; rejection sampling keeps every character equally likely. */
export function generateRoomCode(): string {
  const limit = 256 - (256 % ROOM_CODE_ALPHABET.length)
  let code = ''
  while (code.length < ROOM_CODE_LENGTH) {
    for (const byte of crypto.getRandomValues(new Uint8Array(ROOM_CODE_LENGTH))) {
      if (byte < limit && code.length < ROOM_CODE_LENGTH)
        code += ROOM_CODE_ALPHABET[byte % ROOM_CODE_ALPHABET.length]
    }
  }
  return code
}

/** 128 random bits, base64url. */
export function generateToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

/** The server keeps only this hash of the host token. */
export async function hashToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * `allowed` is a comma separated list from the config; `*` allows everything. A request without
 * an Origin header does not come from a web page, so there is nothing to protect against.
 */
export function isAllowedOrigin(origin: string | null, allowed: string): boolean {
  if (origin === null) return true
  const list = allowed.split(',').map((o) => o.trim())
  return list.includes('*') || list.includes(origin)
}
