import { describe, expect, it, vi } from 'vitest'

import { createBoardPublisher, subscribeToBoard, type BoardFeed } from '../boardSync'
import { message, type SyncMessage } from '../sync/protocol'
import { createListeners, type SyncTransport } from '../sync/transport'

/**
 * In-memory hub: what one transport sends, all the others receive (synchronously).
 * `offset` = the device's clock offset to the server (server time − local time).
 */
function createHub() {
  const transports = new Set<{ deliver: (m: SyncMessage) => void }>()
  return (offset = 0) => {
    const received = createListeners<SyncMessage>()
    const self = { deliver: received.emit, offset }
    transports.add(self)
    const transport: SyncTransport & { self: typeof self } = {
      self,
      send: (m) => transports.forEach((t) => t !== self && t.deliver(m)),
      subscribe: received.add,
      onStatus: (listener) => (listener('online'), () => {}),
      clockOffset: () => self.offset,
      close: () => transports.delete(self),
    }
    return transport
  }
}

const feed = (muted: boolean): BoardFeed => ({ view: null, timer: null, muted })
const countdown = (endsAt: number): BoardFeed => ({
  view: null,
  timer: { kind: 'final', durationMs: 20_000, running: true, endsAt, remainingMs: 20_000 },
  muted: false,
})

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

  it('the countdown ends at the same moment on devices with different clocks (T-019)', () => {
    const connect = createHub()
    // Moderator's clock is 5 s behind the server, the board's is 3 s ahead.
    const publisher = createBoardPublisher(() => feed(false), connect(5000))
    const onFeed = vi.fn<(feed: BoardFeed) => void>()
    subscribeToBoard(onFeed, connect(-3000))

    publisher.publish(countdown(1_000_000))
    // Moderator 1 000 000 = server 1 005 000 = board 1 008 000.
    expect(onFeed).toHaveBeenLastCalledWith(countdown(1_008_000))
  })

  it('corrects a running countdown when a better clock estimate arrives', () => {
    const connect = createHub()
    const host = connect()
    const board = connect()
    const publisher = createBoardPublisher(() => countdown(1_000_000), host)
    const onFeed = vi.fn<(feed: BoardFeed) => void>()
    subscribeToBoard(onFeed, board)
    publisher.publish(countdown(1_000_000))
    expect(onFeed).toHaveBeenLastCalledWith(countdown(1_000_000))

    // The board learns its clock is 2 s ahead of the server.
    board.self.offset = -2000
    board.self.deliver(message('pong', { clientTime: 0, serverTime: 0 }))
    expect(onFeed).toHaveBeenLastCalledWith(countdown(1_002_000))

    // The moderator learns its clock is 1 s behind: it sends the countdown again in server time.
    host.self.offset = 1000
    host.self.deliver(message('pong', { clientTime: 0, serverTime: 0 }))
    expect(onFeed).toHaveBeenLastCalledWith(countdown(1_003_000))
  })

  it('a stopped countdown is not shifted', () => {
    const connect = createHub()
    const publisher = createBoardPublisher(() => feed(false), connect(5000))
    const onFeed = vi.fn<(feed: BoardFeed) => void>()
    subscribeToBoard(onFeed, connect())
    publisher.publish(feed(true))
    expect(onFeed).toHaveBeenLastCalledWith(feed(true))
  })
})
