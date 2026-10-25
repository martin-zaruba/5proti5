import { describe, expect, it } from 'vitest'

import { joinHash, parseJoinHash } from '../sync/roomApi'

describe('join link', () => {
  it('round-trips the room code and token through the URL fragment', () => {
    const room = { roomCode: 'ABCDEF', hostToken: 'aZ09_-xyz' }
    expect(joinHash(room)).toBe('#join=ABCDEF.aZ09_-xyz')
    expect(parseJoinHash(joinHash(room))).toEqual(room)
  })

  it('ignores other fragments and invalid codes', () => {
    expect(parseJoinHash('')).toBeNull()
    expect(parseJoinHash('#join=ABCDE0.token')).toBeNull()
    expect(parseJoinHash('#join=ABCDEF.')).toBeNull()
    expect(parseJoinHash('#other')).toBeNull()
  })
})
