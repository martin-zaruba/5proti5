/**
 * Moderator → board synchronisation over any `SyncTransport` (ADR 0006); by default between windows
 * of one browser. Only `BoardFeed` is ever sent to boards – never the full game state with hidden answers.
 * On the wire the countdown is in server time (T-019): every device converts with its own clock offset.
 */

import { shiftFeed } from './sync/clock'
import { createLocalTransport } from './sync/localTransport'
import { message, type BoardFeed } from './sync/protocol'
import type { SyncTransport } from './sync/transport'

export type { BoardFeed }

/** Moderator side: publish feeds and answer requests from boards that were just opened. */
export function createBoardPublisher(
  current: () => BoardFeed,
  transport: SyncTransport = createLocalTransport(),
) {
  let offset = 0
  const send = (feed: BoardFeed) => {
    offset = transport.clockOffset()
    transport.send(message('feed', { feed: shiftFeed(feed, offset) }))
  }
  const stop = transport.subscribe((m) => {
    if (m.type === 'requestFeed') send(current())
    // A better clock estimate arrived while the countdown runs: send it again in correct server time.
    if (m.type === 'pong' && current().timer?.running && transport.clockOffset() !== offset) {
      send(current())
    }
  })
  return {
    publish: send,
    close() {
      stop()
      transport.close()
    },
  }
}

/** Board side: receive feeds; returns a function that stops listening. */
export function subscribeToBoard(
  onFeed: (feed: BoardFeed) => void,
  transport: SyncTransport = createLocalTransport(),
): () => void {
  let last: BoardFeed | null = null
  let offset = 0
  const show = (feed: BoardFeed) => {
    last = feed
    offset = transport.clockOffset()
    onFeed(shiftFeed(feed, -offset))
  }
  const stop = transport.subscribe((m) => {
    if (m.type === 'feed') show(m.feed)
    // The first feed may come before the clock offset is known – correct a running countdown.
    if (m.type === 'pong' && last?.timer?.running && transport.clockOffset() !== offset) show(last)
  })
  transport.send(message('requestFeed', {}))
  return () => {
    stop()
    transport.close()
  }
}
