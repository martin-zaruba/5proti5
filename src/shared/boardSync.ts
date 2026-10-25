/**
 * Moderator → board synchronisation over any `SyncTransport` (ADR 0006); by default between windows
 * of one browser. Only `BoardFeed` is ever sent to boards – never the full game state with hidden answers.
 */

import { createLocalTransport } from './sync/localTransport'
import { message, type BoardFeed } from './sync/protocol'
import type { SyncTransport } from './sync/transport'

export type { BoardFeed }

/** Moderator side: publish feeds and answer requests from boards that were just opened. */
export function createBoardPublisher(
  current: () => BoardFeed,
  transport: SyncTransport = createLocalTransport(),
) {
  const stop = transport.subscribe((m) => {
    if (m.type === 'requestFeed') transport.send(message('feed', { feed: current() }))
  })
  return {
    publish(feed: BoardFeed) {
      transport.send(message('feed', { feed }))
    },
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
  const stop = transport.subscribe((m) => {
    if (m.type === 'feed') onFeed(m.feed)
  })
  transport.send(message('requestFeed', {}))
  return () => {
    stop()
    transport.close()
  }
}
