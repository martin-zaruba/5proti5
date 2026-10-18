/**
 * Countdown timer as plain data + pure functions (T-009). Time is passed in (`now`, ms since epoch),
 * so the moderator panel and the board – both on the same computer – compute the same remaining time.
 * The timer never changes the game: when it runs out, the host confirms the X.
 */

export interface Timer {
  kind: 'answer' | 'final'
  durationMs: number
  /** Time used before the current run (accumulated over pauses). */
  elapsedMs: number
  /** When the current run started; `null` = not running. */
  startedAt: number | null
}

/** What the board needs to draw the countdown without receiving every tick. */
export interface TimerView {
  kind: Timer['kind']
  durationMs: number
  running: boolean
  /** When a running timer reaches zero. */
  endsAt: number | null
  /** Remaining time of a stopped timer. */
  remainingMs: number
}

export const createTimer = (kind: Timer['kind'], seconds: number): Timer => ({
  kind,
  durationMs: seconds * 1000,
  elapsedMs: 0,
  startedAt: null,
})

export function remainingMs(timer: Timer, now: number): number {
  const running = timer.startedAt === null ? 0 : now - timer.startedAt
  return Math.max(0, timer.durationMs - timer.elapsedMs - running)
}

export const isRunning = (timer: Timer, now: number) =>
  timer.startedAt !== null && remainingMs(timer, now) > 0

export const isExpired = (timer: Timer, now: number) => remainingMs(timer, now) === 0

/** Starts or resumes; an expired timer starts again from the full duration. */
export function startTimer(timer: Timer, now: number): Timer {
  if (isRunning(timer, now)) return timer
  const base = isExpired(timer, now) ? resetTimer(timer) : timer
  return { ...base, startedAt: now }
}

export function pauseTimer(timer: Timer, now: number): Timer {
  if (timer.startedAt === null) return timer
  return {
    ...timer,
    elapsedMs: Math.min(timer.durationMs, timer.elapsedMs + now - timer.startedAt),
    startedAt: null,
  }
}

export const resetTimer = (timer: Timer): Timer => ({ ...timer, elapsedMs: 0, startedAt: null })

export function toTimerView(timer: Timer, now: number): TimerView {
  const remaining = remainingMs(timer, now)
  const running = timer.startedAt !== null && remaining > 0
  return {
    kind: timer.kind,
    durationMs: timer.durationMs,
    running,
    endsAt: running ? now + remaining : null,
    remainingMs: remaining,
  }
}

/** Remaining time on the board side. */
export const viewRemainingMs = (view: TimerView, now: number) =>
  view.running && view.endsAt !== null ? Math.max(0, view.endsAt - now) : view.remainingMs
