/**
 * Moderator's game store: wraps the engine session, persists it and publishes the board view.
 * All game rules live in `@/engine`; this module only connects them to Vue.
 */

import { computed, ref, shallowRef, watch } from 'vue'

import {
  canUndo,
  createGame,
  createSession,
  dispatch,
  GameError,
  toBoardView,
  undo as undoSession,
  type GameAction,
  type GameSession,
  type QuestionSet,
  type TeamSetup,
} from '@/engine'

import { createBoardPublisher } from './boardSync'
import { loadJson, saveJson } from './storage'

const SESSION_KEY = 'session'
const SESSION_VERSION = 1

interface StoredSession {
  version: number
  session: GameSession
}

function loadSession(): GameSession | null {
  const stored = loadJson<StoredSession>(SESSION_KEY)
  return stored?.version === SESSION_VERSION && stored.session?.state?.phase ? stored.session : null
}

const session = shallowRef<GameSession | null>(loadSession())
const error = ref<string | null>(null)
const boardView = computed(() => (session.value ? toBoardView(session.value.state) : null))

let publisher: ReturnType<typeof createBoardPublisher> | null = null

function ensurePublisher() {
  if (publisher) return
  publisher = createBoardPublisher(() => boardView.value)
  watch(
    session,
    (value) => {
      saveJson(
        SESSION_KEY,
        value && ({ version: SESSION_VERSION, session: value } satisfies StoredSession),
      )
    },
    { immediate: true },
  )
  watch(boardView, (view) => publisher?.publish(view), { immediate: true })
}

function run(update: () => GameSession | null) {
  try {
    session.value = update()
    error.value = null
  } catch (e) {
    if (!(e instanceof GameError)) throw e
    error.value = e.message
  }
}

export function useGameStore() {
  ensurePublisher()
  return {
    session,
    state: computed(() => session.value?.state ?? null),
    error,
    canUndo: computed(() => (session.value ? canUndo(session.value) : false)),

    startGame(teams: [TeamSetup, TeamSetup], questionSet: QuestionSet) {
      run(() => createSession(questionSet, createGame(teams, questionSet)))
    },
    act(action: GameAction) {
      run(() => (session.value ? dispatch(session.value, action) : null))
    },
    undo() {
      run(() => (session.value ? undoSession(session.value) : null))
    },
    endGame() {
      run(() => null)
    },
    clearError() {
      error.value = null
    },
  }
}
