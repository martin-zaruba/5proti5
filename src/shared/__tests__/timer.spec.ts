import { describe, it, expect } from 'vitest'

import {
  createTimer,
  isExpired,
  pauseTimer,
  remainingMs,
  resetTimer,
  startTimer,
  toTimerView,
  viewRemainingMs,
} from '../timer'

const T0 = 1_000_000

describe('timer', () => {
  it('counts down from the limit once started', () => {
    const timer = startTimer(createTimer('answer', 3), T0)
    expect(remainingMs(timer, T0)).toBe(3000)
    expect(remainingMs(timer, T0 + 1200)).toBe(1800)
    expect(remainingMs(timer, T0 + 5000)).toBe(0)
    expect(isExpired(timer, T0 + 3000)).toBe(true)
  })

  it('does not run before it is started', () => {
    const timer = createTimer('final', 20)
    expect(remainingMs(timer, T0 + 10_000)).toBe(20_000)
  })

  it('pauses and resumes', () => {
    let timer = startTimer(createTimer('final', 20), T0)
    timer = pauseTimer(timer, T0 + 5000)
    expect(remainingMs(timer, T0 + 60_000)).toBe(15_000)
    timer = startTimer(timer, T0 + 60_000)
    expect(remainingMs(timer, T0 + 61_000)).toBe(14_000)
  })

  it('starting a running timer changes nothing; an expired one starts again', () => {
    const running = startTimer(createTimer('answer', 3), T0)
    expect(startTimer(running, T0 + 1000)).toBe(running)
    const restarted = startTimer(running, T0 + 4000)
    expect(remainingMs(restarted, T0 + 4000)).toBe(3000)
  })

  it('resets to the full limit', () => {
    const timer = resetTimer(startTimer(createTimer('answer', 3), T0))
    expect(remainingMs(timer, T0 + 2000)).toBe(3000)
  })

  it('gives the board an end time, so it can count down on its own', () => {
    const view = toTimerView(startTimer(createTimer('answer', 3), T0), T0 + 500)
    expect(view).toEqual({
      kind: 'answer',
      durationMs: 3000,
      running: true,
      endsAt: T0 + 3000,
      remainingMs: 2500,
    })
    expect(viewRemainingMs(view, T0 + 2000)).toBe(1000)
    const paused = toTimerView(
      pauseTimer(startTimer(createTimer('final', 25), T0), T0 + 1000),
      T0 + 9000,
    )
    expect(paused.running).toBe(false)
    expect(viewRemainingMs(paused, T0 + 99_000)).toBe(24_000)
  })
})
