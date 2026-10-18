import { describe, it, expect } from 'vitest'

import { toBoardView, type GameAction } from '@/engine'
import {
  A,
  B,
  buzz,
  clearRound,
  makeSet,
  newSession,
  next,
  reveal,
  run,
  takeControl,
  wrong,
} from '@/engine/__tests__/helpers'
import type { GameSession } from '@/engine'

import { soundCues } from '../soundCues'

/** Cues for the last action applied to `session`. */
const cuesFor = (session: GameSession, action: GameAction) =>
  soundCues(toBoardView(session.state), toBoardView(run(session, action).state))

describe('soundCues', () => {
  it('nothing on the first view of a freshly opened board', () => {
    expect(soundCues(null, toBoardView(newSession().state))).toEqual([])
  })

  it('buzz, correct answer, strike', () => {
    const s = run(newSession(), next)
    expect(cuesFor(s, buzz(A))).toEqual(['buzz'])
    expect(cuesFor(run(s, buzz(A)), reveal(2))).toEqual(['correct'])
    expect(cuesFor(run(s, ...takeControl(B).slice(1)), wrong)).toEqual(['strike'])
  })

  it('a stolen round: correct answer and the round win', () => {
    const s = run(newSession(), ...takeControl(A), wrong, wrong, wrong)
    expect(cuesFor(s, reveal(2))).toEqual(['correct', 'roundWin'])
  })

  it('answers revealed by the host at the end of the round only “reveal”', () => {
    const s = run(newSession(), ...takeControl(A), wrong, wrong, wrong, wrong)
    expect(cuesFor(s, { type: 'revealRemaining' })).toEqual(['reveal'])
  })

  it('no answer sounds when a new round starts', () => {
    const s = run(newSession(), ...clearRound(A))
    expect(cuesFor(s, next)).toEqual([])
  })

  it('Zoraďovačka: correct guess, wrong guess only strikes', () => {
    const s = run(
      newSession(makeSet(3, true)),
      ...clearRound(A),
      ...clearRound(B),
      ...clearRound(A),
      next,
    )
    expect(cuesFor(s, { type: 'rankingGuess', rank: 4 })).toEqual(['correct'])
    const placed = run(s, { type: 'rankingGuess', rank: 4 })
    expect(cuesFor(placed, { type: 'rankingGuess', rank: 1 })).toEqual(['strike'])
  })

  it('final: points, zero, duplicate; A’s answers returning do not sound again', () => {
    let s = newSession(makeSet(3, false, true))
    for (let i = 0; i < 5; i++) s = run(s, ...clearRound(A))
    s = run(s, next, { type: 'finalChoosePlayers', positions: [1, 2] })
    s = run(s, { type: 'finalAnswer', question: 0, text: '', rank: 1 })
    const revealA = (question: number): GameAction => ({ type: 'finalReveal', question })
    expect(cuesFor(s, revealA(0))).toEqual(['correct'])
    s = run(s, ...[0, 1, 2, 3, 4].map(revealA), { type: 'finalNextPlayer' })
    // B repeats A's answer → duplicate.
    expect(cuesFor(s, { type: 'finalAnswer', question: 0, text: '', rank: 1 })).toEqual([
      'duplicate',
    ])
    // B's first reveal brings A's answers back – only B's own cell sounds.
    s = run(s, { type: 'finalAnswer', question: 0, text: '', rank: 2 })
    expect(cuesFor(s, revealA(0))).toEqual(['correct'])
    s = run(s, revealA(0))
    expect(cuesFor(s, revealA(1))).toEqual(['zero'])
  })

  it('victory when the game ends', () => {
    let s = newSession()
    for (let i = 0; i < 5; i++) s = run(s, ...clearRound(A))
    expect(cuesFor(s, next)).toEqual(['victory'])
  })
})
