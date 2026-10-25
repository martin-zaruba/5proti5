/**
 * Clock offset between this device and the sync server (T-019). The board's countdown uses absolute
 * times (`TimerView.endsAt`); between devices those are sent in server time, so a clock that is a few
 * seconds off does not shift the countdown. NTP-like: from a ping/pong round trip the server time is
 * assumed to be read halfway; the sample with the shortest round trip is the most accurate.
 */

import type { BoardFeed } from './protocol'

export interface ClockSample {
  /** Server time minus local time (ms). */
  offset: number
  roundTrip: number
}

/** How many recent samples are kept (pings come every few seconds). */
export const CLOCK_SAMPLES = 8

export function clockSample(
  clientTime: number,
  serverTime: number,
  receivedAt: number,
): ClockSample {
  return {
    offset: Math.round(serverTime - (clientTime + receivedAt) / 2),
    roundTrip: receivedAt - clientTime,
  }
}

/** Offset of the sample with the shortest round trip; 0 before the first sample. */
export function estimateOffset(samples: readonly ClockSample[]): number {
  let best: ClockSample | null = null
  for (const s of samples) if (!best || s.roundTrip < best.roundTrip) best = s
  return best?.offset ?? 0
}

/** Moves the absolute times of a feed by `delta` ms (local → server: +offset, server → local: −offset). */
export function shiftFeed(feed: BoardFeed, delta: number): BoardFeed {
  const endsAt = feed.timer?.endsAt
  if (!delta || endsAt === null || endsAt === undefined) return feed
  return { ...feed, timer: { ...feed.timer!, endsAt: endsAt + delta } }
}
