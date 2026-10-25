import { describe, expect, it } from 'vitest'

import {
  decodeMessage,
  encodeMessage,
  message,
  parseMessage,
  PROTOCOL_VERSION,
} from '../sync/protocol'

const feed = { view: null, timer: null, muted: false }

describe('sync protocol', () => {
  it('builds messages of the current version', () => {
    expect(message('feed', { feed })).toEqual({ v: PROTOCOL_VERSION, type: 'feed', feed })
    expect(message('requestFeed', {})).toEqual({ v: PROTOCOL_VERSION, type: 'requestFeed' })
  })

  it('accepts every valid message', () => {
    const valid = [
      message('feed', { feed }),
      message('requestFeed', {}),
      message('session', { session: null, savedAt: 1 }),
      message('hello', { role: 'board' }),
      message('hello', { role: 'host', token: 'secret' }),
      message('welcome', { role: 'host', serverTime: 5 }),
      message('ping', { clientTime: 1 }),
      message('pong', { clientTime: 1, serverTime: 2 }),
      message('error', { code: 'unauthorized', message: 'Nesprávny token' }),
    ]
    for (const m of valid) expect(parseMessage(m)).toEqual(m)
  })

  it('rejects other versions, unknown types and wrong shapes', () => {
    const invalid: unknown[] = [
      null,
      'feed',
      [],
      { type: 'feed', feed },
      { v: PROTOCOL_VERSION + 1, type: 'feed', feed },
      { v: PROTOCOL_VERSION, type: 'board', feed },
      { v: PROTOCOL_VERSION, type: 'toString' },
      { v: PROTOCOL_VERSION, type: 'feed', feed: { view: null, timer: null } },
      { v: PROTOCOL_VERSION, type: 'feed', feed: { view: 'x', timer: null, muted: false } },
      { v: PROTOCOL_VERSION, type: 'session', session: {} },
      { v: PROTOCOL_VERSION, type: 'session', session: [], savedAt: 1 },
      { v: PROTOCOL_VERSION, type: 'hello', role: 'admin' },
      { v: PROTOCOL_VERSION, type: 'hello', role: 'host', token: 42 },
      { v: PROTOCOL_VERSION, type: 'ping', clientTime: Number.NaN },
    ]
    for (const data of invalid) expect(parseMessage(data)).toBeNull()
  })

  it('round-trips through text frames and ignores invalid JSON', () => {
    const m = message('ping', { clientTime: 123 })
    expect(decodeMessage(encodeMessage(m))).toEqual(m)
    expect(decodeMessage('{not json')).toBeNull()
  })
})
