import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { storageKey } from '../storage'
import { createLocalTransport } from '../sync/localTransport'
import { message, type ConnectionStatus, type SyncMessage } from '../sync/protocol'
import type { SyncTransport } from '../sync/transport'

const feed = (muted: boolean) => ({ view: null, timer: null, muted })

/** BroadcastChannel delivers asynchronously (no feed is stored, so nothing is replayed). */
const nextMessage = (transport: SyncTransport) =>
  new Promise<SyncMessage>((resolve) => {
    const stop = transport.subscribe((m) => {
      stop()
      resolve(m)
    })
  })

describe('local transport', () => {
  const open: SyncTransport[] = []
  const transport = () => {
    const t = createLocalTransport()
    open.push(t)
    return t
  }

  beforeEach(() => localStorage.clear())
  afterEach(() => {
    for (const t of open.splice(0)) t.close()
    vi.unstubAllGlobals()
  })

  it('delivers messages to other transports', async () => {
    const sender = transport()
    const receiver = transport()
    const received = nextMessage(receiver)
    sender.send(message('requestFeed', {}))
    expect(await received).toEqual(message('requestFeed', {}))
  })

  it('replays the last feed to a new subscriber', () => {
    transport().send(message('feed', { feed: feed(true) }))
    const listener = vi.fn<(m: SyncMessage) => void>()
    transport().subscribe(listener)
    expect(listener).toHaveBeenCalledWith(message('feed', { feed: feed(true) }))
  })

  it('ignores invalid messages on the channel', async () => {
    const receiver = transport()
    const listener = vi.fn<(m: SyncMessage) => void>()
    receiver.subscribe(listener)
    const raw = new BroadcastChannel('5proti5-board')
    raw.postMessage({ type: 'board', feed: feed(false) })
    raw.postMessage(message('requestFeed', {}))
    await nextMessage(receiver)
    raw.close()
    expect(listener).toHaveBeenCalledTimes(1)
    expect(listener).toHaveBeenCalledWith(message('requestFeed', {}))
  })

  it('is always online', () => {
    const status = vi.fn<(status: ConnectionStatus) => void>()
    transport().onStatus(status)
    expect(status).toHaveBeenCalledWith('online')
  })

  it('falls back to storage events without BroadcastChannel', () => {
    vi.stubGlobal('BroadcastChannel', undefined)
    const receiver = transport()
    const listener = vi.fn<(m: SyncMessage) => void>()
    receiver.subscribe(listener)

    localStorage.setItem(storageKey('board-feed'), JSON.stringify(feed(true)))
    window.dispatchEvent(new StorageEvent('storage', { key: storageKey('board-feed') }))
    window.dispatchEvent(new StorageEvent('storage', { key: storageKey('other') }))

    expect(listener).toHaveBeenCalledTimes(1)
    expect(listener).toHaveBeenCalledWith(message('feed', { feed: feed(true) }))
  })
})
