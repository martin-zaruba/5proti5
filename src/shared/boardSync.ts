/**
 * Moderator → board synchronisation (ADR 0001): BroadcastChannel for live updates,
 * localStorage copy of the last board view so a freshly opened board shows the current state.
 * Only `BoardView` is ever sent – never the full game state with hidden answers.
 */

import type { BoardView } from '@/engine'

import { loadJson, saveJson, storageKey } from './storage'

const CHANNEL = '5proti5-board'
const BOARD_KEY = 'board-view'

type Message = { type: 'board'; view: BoardView | null } | { type: 'requestBoard' }

function openChannel(): BroadcastChannel | null {
  return typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel(CHANNEL)
}

/** Moderator side: publish views and answer requests from boards that were just opened. */
export function createBoardPublisher(current: () => BoardView | null) {
  const channel = openChannel()
  channel?.addEventListener('message', (event: MessageEvent<Message>) => {
    if (event.data.type === 'requestBoard') channel.postMessage({ type: 'board', view: current() })
  })
  return {
    publish(view: BoardView | null) {
      saveJson(BOARD_KEY, view)
      channel?.postMessage({ type: 'board', view } satisfies Message)
    },
    close: () => channel?.close(),
  }
}

/** Board side: receive views; returns a function that stops listening. */
export function subscribeToBoard(onView: (view: BoardView | null) => void): () => void {
  onView(loadJson<BoardView>(BOARD_KEY))

  const channel = openChannel()
  channel?.addEventListener('message', (event: MessageEvent<Message>) => {
    if (event.data.type === 'board') onView(event.data.view)
  })
  channel?.postMessage({ type: 'requestBoard' } satisfies Message)

  // Fallback for browsers without BroadcastChannel – fires in other tabs on every save.
  const onStorage = (event: StorageEvent) => {
    if (event.key === storageKey(BOARD_KEY)) onView(loadJson<BoardView>(BOARD_KEY))
  }
  window.addEventListener('storage', onStorage)

  return () => {
    channel?.close()
    window.removeEventListener('storage', onStorage)
  }
}
