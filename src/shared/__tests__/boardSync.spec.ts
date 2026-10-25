import { describe, expect, it, vi } from 'vitest'

import { createBoardPublisher, subscribeToBoard, type BoardFeed } from '../boardSync'
import type { SyncMessage } from '../sync/protocol'
import { createListeners, type SyncTransport } from '../sync/transport'

/** In-memory hub: what one transport sends, all the others receive (synchronously). */
function createHub() {
  const transports = new Set<{ deliver: (m: SyncMessage) => void }>()
  return () => {
    const received = createListeners<SyncMessage>()
    const self = { deliver: received.emit }
    transports.add(self)
    const transport: SyncTransport = {
      send: (m) => transports.forEach((t) => t !== self && t.deliver(m)),
      subscribe: received.add,
      onStatus: (listener) => (listener('online'), () => {}),
      close: () => transports.delete(self),
    }
    return transport
  }
}

const feed = (muted: boolean): BoardFeed => ({ view: null, timer: null, muted })

describe('board sync', () => {
  it('a board that opens later gets the current feed from the publisher', () => {
    const connect = createHub()
    let current = feed(false)
    createBoardPublisher(() => current, connect())
    current = feed(true)

    const onFeed = vi.fn<(feed: BoardFeed) => void>()
    subscribeToBoard(onFeed, connect())
    expect(onFeed).toHaveBeenCalledWith(feed(true))
  })

  it('published feeds reach every board, until it unsubscribes', () => {
    const connect = createHub()
    const publisher = createBoardPublisher(() => feed(false), connect())
    const first = vi.fn<(feed: BoardFeed) => void>()
    const second = vi.fn<(feed: BoardFeed) => void>()
    const stopFirst = subscribeToBoard(first, connect())
    subscribeToBoard(second, connect())

    stopFirst()
    publisher.publish(feed(true))
    expect(first).not.toHaveBeenCalledWith(feed(true))
    expect(second).toHaveBeenLastCalledWith(feed(true))
  })
})
