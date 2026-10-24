/**
 * Moderator's game store: wraps the engine session, persists it and publishes the board feed
 * (game view, countdown, mute). All game rules live in `@/engine`; this module connects them to Vue.
 */

import { computed, ref, shallowRef, watch } from 'vue'

import {
  canUndo,
  createGame,
  createSession,
  dispatch,
  FULL_GAME,
  GameError,
  resolveOptions,
  timeLimit,
  toBoardView,
  undo as undoSession,
  type GameAction,
  type GameOptions,
  type GameSession,
  type GameState,
  type QuestionSet,
  type TeamSetup,
} from '@/engine'

import { createBoardPublisher, type BoardFeed } from './boardSync'
import { loadJson, saveJson } from './storage'
import {
  createTimer,
  isRunning,
  pauseTimer,
  resetTimer,
  startTimer,
  toTimerView,
  type Timer,
} from './timer'

const SESSION_KEY = 'session'
const SESSION_VERSION = 1

interface StoredSession {
  version: number
  session: GameSession
}

function loadSession(): GameSession | null {
  const stored = loadJson<StoredSession>(SESSION_KEY)
  if (stored?.version !== SESSION_VERSION || !stored.session?.state?.phase) return null
  // Games saved before the setup had options (T-014) are full episodes.
  const { session } = stored
  const migrate = (state: GameState): GameState =>
    state.options ? state : { ...state, options: resolveOptions(FULL_GAME, session.questionSet) }
  return {
    ...session,
    state: migrate(session.state),
    past: session.past.map((entry) => ({ ...entry, state: migrate(entry.state) })),
  }
}

const session = shallowRef<GameSession | null>(loadSession())
const error = ref<string | null>(null)
const boardView = computed(() => (session.value ? toBoardView(session.value.state) : null))

/** Countdown for the limit that applies now (3 s answer, 20 / 25 s final) – not part of the game history. */
const timer = shallowRef<Timer | null>(null)
const limit = computed(() => (session.value ? timeLimit(session.value.state) : null))
watch(
  () => limit.value?.key,
  () => (timer.value = limit.value && createTimer(limit.value.kind, limit.value.seconds)),
  { immediate: true },
)

const muted = ref(loadJson<boolean>('muted') ?? false)
watch(muted, (value) => saveJson('muted', value))

const feed = computed<BoardFeed>(() => ({
  view: boardView.value,
  timer: timer.value && toTimerView(timer.value, Date.now()),
  muted: muted.value,
}))

let publisher: ReturnType<typeof createBoardPublisher> | null = null

function ensurePublisher() {
  if (publisher) return
  publisher = createBoardPublisher(() => feed.value)
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
  watch(feed, (value) => publisher?.publish(value), { immediate: true })
}

function run(update: () => GameSession | null) {
  try {
    session.value = update()
    error.value = null
    // An answer was given (or taken back) – the next one gets a fresh 3 s; the final clock keeps running.
    if (timer.value?.kind === 'answer') timer.value = resetTimer(timer.value)
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
    timer,
    muted,

    /** Space: the answer timer always starts from the full limit, the final timer toggles pause. */
    toggleTimer() {
      const t = timer.value
      if (!t) return
      const now = Date.now()
      if (t.kind === 'answer') timer.value = startTimer(resetTimer(t), now)
      else timer.value = isRunning(t, now) ? pauseTimer(t, now) : startTimer(t, now)
    },
    resetTimer() {
      if (timer.value) timer.value = resetTimer(timer.value)
    },

    startGame(teams: [TeamSetup, TeamSetup], questionSet: QuestionSet, options: GameOptions) {
      run(() => createSession(questionSet, createGame(teams, questionSet, options)))
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
