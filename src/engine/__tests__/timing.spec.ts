import { describe, it, expect } from 'vitest'

import { timeLimit } from '../timing'
import { A, buzz, clearRound, makeSet, newSession, next, run, takeControl, wrong } from './helpers'

describe('timeLimit (§1, §6)', () => {
  it('3 s for an answer once a player answers, none before the buzz or between rounds', () => {
    expect(timeLimit(newSession().state)).toBeNull()
    expect(timeLimit(run(newSession(), next).state)).toBeNull()
    expect(timeLimit(run(newSession(), next, buzz(A)).state)).toEqual({
      kind: 'answer',
      seconds: 3,
      key: 'answer',
    })
    expect(timeLimit(run(newSession(), ...takeControl(A)).state)?.seconds).toBe(3)
    expect(
      timeLimit(run(newSession(), ...takeControl(A), wrong, wrong, wrong).state)?.seconds,
    ).toBe(3)
    expect(timeLimit(run(newSession(), ...clearRound(A)).state)).toBeNull()
  })

  it('20 s for player A and 25 s for player B in the final', () => {
    let s = newSession(makeSet(3, false, true))
    for (let i = 0; i < 5; i++) s = run(s, ...clearRound(A))
    s = run(s, next)
    expect(timeLimit(s.state)).toBeNull()
    s = run(s, { type: 'finalChoosePlayers', positions: [1, 2] })
    expect(timeLimit(s.state)).toEqual({ kind: 'final', seconds: 20, key: 'final-playerA' })
    s = run(s, ...[0, 1, 2, 3, 4].map((question) => ({ type: 'finalReveal' as const, question })), {
      type: 'finalNextPlayer',
    })
    expect(timeLimit(s.state)).toEqual({ kind: 'final', seconds: 25, key: 'final-playerB' })
  })
})
