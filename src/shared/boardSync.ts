/**
 * Moderator → board synchronisation (ADR 0001): BroadcastChannel for live updates,
 * localStorage copy of the last feed so a freshly opened board shows the current state.
 * Only `BoardView` is ever sent – never the full game state with hidden answers.
 */

import type { BoardView } from '@/engine'

import { loadJson, saveJson, storageKey } from './storage'
import type { TimerView } from './timer'

/** Everything the board shows: the game, the countdown and whether sounds are muted. */
export interface BoardFeed {
  view: BoardView | null
  timer: TimerView | null
  muted: boolean
}

const CHANNEL = '5proti5-board'
const FEED_KEY = 'board-feed'

type Message = { type: 'board'; feed: BoardFeed } | { type: 'requestBoard' }

function openChannel(): BroadcastChannel | null {
  return typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel(CHANNEL)
}

/** Moderator side: publish feeds and answer requests from boards that were just opened. */
export function createBoardPublisher(current: () => BoardFeed) {
  const channel = openChannel()
  channel?.addEventListener('message', (event: MessageEvent<Message>) => {
    if (event.data.type === 'requestBoard') channel.postMessage({ type: 'board', feed: current() })
  })
  return {
    publish(feed: BoardFeed) {
      saveJson(FEED_KEY, feed)
      channel?.postMessage({ type: 'board', feed } satisfies Message)
    },
    close: () => channel?.close(),
  }
}

/** Board side: receive feeds; returns a function that stops listening. */
export function subscribeToBoard(onFeed: (feed: BoardFeed | null) => void): () => void {
  onFeed(loadJson<BoardFeed>(FEED_KEY))

  const channel = openChannel()
  if (channel) {
    channel.addEventListener('message', (event: MessageEvent<Message>) => {
      if (event.data.type === 'board') onFeed(event.data.feed)
    })
    channel.postMessage({ type: 'requestBoard' } satisfies Message)
    return () => channel.close()
  }

  // Fallback without BroadcastChannel. Not used together with it: a late storage event
  // could bring back an older feed and the board would play its sounds again.
  const onStorage = (event: StorageEvent) => {
    if (event.key === storageKey(FEED_KEY)) onFeed(loadJson<BoardFeed>(FEED_KEY))
  }
  window.addEventListener('storage', onStorage)
  return () => window.removeEventListener('storage', onStorage)
}
