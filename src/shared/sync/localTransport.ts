/**
 * Transport between windows of one browser (ADR 0001, OQ-09): BroadcastChannel for live messages,
 * a localStorage copy of the last feed so a freshly opened board shows the current state even when
 * the panel is closed. Works without a server, also from `file://` (ADR 0004).
 */

import { loadJson, saveJson, storageKey } from '../storage'
import { message, parseMessage, type BoardFeed, type SyncMessage } from './protocol'
import { createListeners, type SyncTransport } from './transport'

const CHANNEL = '5proti5-board'
const FEED_KEY = 'board-feed'

export function createLocalTransport(): SyncTransport {
  const channel = typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel(CHANNEL)
  const received = createListeners<SyncMessage>()

  const onMessage = (event: MessageEvent<unknown>) => {
    const m = parseMessage(event.data)
    if (m) received.emit(m)
  }
  // Fallback without BroadcastChannel (feeds only). Not used together with it: a late storage event
  // could bring back an older feed and the board would play its sounds again.
  const onStorage = (event: StorageEvent) => {
    if (event.key !== storageKey(FEED_KEY)) return
    const feed = loadJson<BoardFeed>(FEED_KEY)
    if (feed) received.emit(message('feed', { feed }))
  }
  if (channel) channel.addEventListener('message', onMessage)
  else window.addEventListener('storage', onStorage)

  return {
    send(m) {
      if (m.type === 'feed') saveJson(FEED_KEY, m.feed)
      channel?.postMessage(m)
    },
    subscribe(listener) {
      // Like the server, a new listener first gets the last known feed.
      const feed = loadJson<BoardFeed>(FEED_KEY)
      if (feed) listener(message('feed', { feed }))
      return received.add(listener)
    },
    onStatus(listener) {
      listener('online')
      return () => {}
    },
    close() {
      received.clear()
      if (channel) channel.close()
      else window.removeEventListener('storage', onStorage)
    },
  }
}
