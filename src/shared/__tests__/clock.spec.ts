import { describe, expect, it } from 'vitest'

import { clockSample, estimateOffset, shiftFeed } from '../sync/clock'

describe('clock offset', () => {
  it('assumes the server read its clock halfway through the round trip', () => {
    // Sent at 1000, answered with server time 6050, received at 1100 → server is 5000 ms ahead.
    expect(clockSample(1000, 6050, 1100)).toEqual({ offset: 5000, roundTrip: 100 })
  })

  it('trusts the sample with the shortest round trip', () => {
    expect(estimateOffset([])).toBe(0)
    expect(
      estimateOffset([
        { offset: 5200, roundTrip: 400 },
        { offset: 4990, roundTrip: 20 },
        { offset: 5100, roundTrip: 90 },
      ]),
    ).toBe(4990)
  })

  it('shifts only the end of a running countdown', () => {
    const timer = { kind: 'answer' as const, durationMs: 3000, running: true, remainingMs: 3000 }
    const running = { view: null, muted: false, timer: { ...timer, endsAt: 10_000 } }
    expect(shiftFeed(running, 500).timer?.endsAt).toBe(10_500)
    expect(shiftFeed(running, 0)).toBe(running)

    const stopped = { view: null, muted: false, timer: { ...timer, running: false, endsAt: null } }
    expect(shiftFeed(stopped, 500)).toBe(stopped)
  })
})
