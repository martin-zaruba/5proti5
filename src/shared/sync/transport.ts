/**
 * How sync messages travel (ADR 0006). The panel and the board talk to a `SyncTransport` and do not
 * care whether it is a BroadcastChannel between windows of one browser or a WebSocket room.
 */

import type { ConnectionStatus, SyncMessage } from './protocol'

export interface SyncTransport {
  /** Sends to the other side(s); silently dropped while offline – callers resend the latest state. */
  send(message: SyncMessage): void
  /** Receives valid messages; returns a function that stops listening. */
  subscribe(listener: (message: SyncMessage) => void): () => void
  /** Calls the listener with the current status right away and on every change. */
  onStatus(listener: (status: ConnectionStatus) => void): () => void
  /** Server time minus local time (ms) – 0 between windows of one computer (T-019). */
  clockOffset(): number
  close(): void
}

/** Minimal listener set shared by the transports. */
export function createListeners<T>() {
  const listeners = new Set<(value: T) => void>()
  return {
    add(listener: (value: T) => void) {
      listeners.add(listener)
      return () => void listeners.delete(listener)
    },
    emit(value: T) {
      for (const listener of listeners) listener(value)
    },
    clear: () => listeners.clear(),
  }
}
