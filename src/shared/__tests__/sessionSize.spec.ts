import { describe, expect, it } from 'vitest'

import { HISTORY_LIMIT } from '@/engine'
import { A, buzz, newSession, next, reveal, run } from '@/engine/__tests__/helpers'

import { encodeMessage, MAX_MESSAGE_BYTES, message } from '../sync/protocol'

describe('saved game size', () => {
  it('a game with full undo history fits into one sync message', () => {
    let s = run(newSession(), next, buzz(A), reveal(1), reveal(3))
    for (let i = 0; i < HISTORY_LIMIT + 50; i++) {
      s = run(s, { type: 'setShowQuestion', show: i % 2 === 0 })
    }
    const bytes = new TextEncoder().encode(
      encodeMessage(message('session', { session: s, savedAt: Date.now() })),
    ).byteLength
    // Real sets have longer texts than the test set – keep a generous margin.
    expect(bytes).toBeLessThan(MAX_MESSAGE_BYTES / 2)
  })
})
