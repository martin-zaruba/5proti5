import { describe, expect, it } from 'vitest'

import {
  normalizeRoomCode,
  ROOM_CODE_ALPHABET,
  ROOM_CODE_LENGTH,
} from '../../src/shared/sync/protocol'
import { generateRoomCode, generateToken, hashToken, isAllowedOrigin } from '../src/rooms'

describe('room helpers', () => {
  it('generates codes from the unambiguous alphabet', () => {
    for (let i = 0; i < 200; i++) {
      const code = generateRoomCode()
      expect(code).toHaveLength(ROOM_CODE_LENGTH)
      for (const c of code) expect(ROOM_CODE_ALPHABET).toContain(c)
    }
    expect(ROOM_CODE_ALPHABET).not.toMatch(/[01OIL]/)
  })

  it('normalizes typed codes', () => {
    expect(normalizeRoomCode(' abc-def ')).toBe('ABCDEF')
    expect(normalizeRoomCode('ABCDE')).toBeNull()
    expect(normalizeRoomCode('ABCDE0')).toBeNull()
  })

  it('generates 128-bit url-safe tokens and hashes them', async () => {
    const token = generateToken()
    expect(token).toMatch(/^[A-Za-z0-9_-]{22}$/)
    expect(generateToken()).not.toBe(token)
    expect(await hashToken(token)).toMatch(/^[0-9a-f]{64}$/)
    expect(await hashToken(token)).toBe(await hashToken(token))
  })

  it('checks the origin against the allowed list', () => {
    const allowed = 'https://example.org, null'
    expect(isAllowedOrigin(null, allowed)).toBe(true)
    expect(isAllowedOrigin('https://example.org', allowed)).toBe(true)
    expect(isAllowedOrigin('null', allowed)).toBe(true)
    expect(isAllowedOrigin('https://evil.example', allowed)).toBe(false)
    expect(isAllowedOrigin('https://evil.example', '*')).toBe(true)
  })
})
