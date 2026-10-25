import { describe, expect, it } from 'vitest'

import { FULL_GAME, currentTurns, type GameAction, type GameState } from '../game'
import { dispatch } from '../session'
import { A, B, buzz, clearRound, makeSet, newSession, next, reveal, run, wrong } from './helpers'

/** Smaller teams than the statute's 5 (OQ-20): the line starts over after the captain. */
const game = (size: number, set = makeSet()) => newSession(set, FULL_GAME, size)
const turns = (state: GameState) => currentTurns(state)
const misses = (count: number) => Array.from({ length: count }, () => wrong)

describe('team size 2–4 (OQ-20)', () => {
  it('sends the players to the buzzer in turn, starting over after the captain', () => {
    const buzzerPositions = (size: number) => {
      let s = game(size)
      const positions: number[] = []
      for (let i = 0; i < 5; i++) {
        s = run(s, next)
        positions.push(turns(s.state)[0]!.position)
        s = run(s, buzz(A), reveal(1), reveal(2), reveal(3), reveal(4), reveal(5))
      }
      return positions
    }
    expect(buzzerPositions(3)).toEqual([1, 2, 3, 1, 2])
    expect(buzzerPositions(4)).toEqual([1, 2, 3, 4, 1])
    expect(buzzerPositions(2)).toEqual([1, 2, 1, 2, 1])
  })

  it('the team in control answers around its shorter line', () => {
    let s = run(game(3), next, buzz(A), reveal(1))
    expect(turns(s.state)).toEqual([{ team: A, position: 2 }])
    s = run(s, reveal(2))
    expect(turns(s.state)).toEqual([{ team: A, position: 3 }])
    s = run(s, wrong)
    expect(turns(s.state)).toEqual([{ team: A, position: 1 }])
  })

  it('the captain at the last position steals', () => {
    const s = run(game(3), next, buzz(A), reveal(1), ...misses(3))
    expect(s.state.phase).toBe('steal')
    expect(turns(s.state)).toEqual([{ team: B, position: 3 }])
  })

  it('the face-off goes on to the captains, then the question is voided', () => {
    let s = run(game(3), next, buzz(A), ...misses(5))
    expect(turns(s.state)).toEqual([{ team: B, position: 3 }])
    s = run(s, wrong)
    expect(s.state.round!.replay).toBe('noHit')
  })

  it('a round that starts with the captains has only one face-off pair', () => {
    let s = run(game(3), ...clearRound(A), ...clearRound(A), next)
    expect(turns(s.state)[0]!.position).toBe(3)
    s = run(s, buzz(B), wrong, wrong)
    expect(s.state.round!.replay).toBe('noHit')
  })

  it('in Zoraďovačka the captain answers first, then back along the line', () => {
    let s = run(
      newSession(makeSet(3, true), FULL_GAME, 3),
      ...clearRound(A),
      ...clearRound(B),
      ...clearRound(A),
      next,
    )
    const guess = (rank: number): GameAction => ({ type: 'rankingGuess', rank })
    expect(turns(s.state)).toEqual([{ team: B, position: 3 }])
    s = run(s, guess(4))
    expect(turns(s.state)).toEqual([{ team: B, position: 2 }])
    s = run(s, guess(3))
    expect(turns(s.state)).toEqual([{ team: B, position: 1 }])
    s = run(s, guess(1))
    expect(turns(s.state)).toEqual([{ team: A, position: 3 }])
  })

  it('in the final any two players of the team can be chosen', () => {
    let s = game(2, makeSet(3, false, true))
    for (const team of [A, A, A, A, B]) s = run(s, ...clearRound(team))
    s = run(s, next)
    const choose = (a: number, b: number): GameAction => ({
      type: 'finalChoosePlayers',
      positions: [a, b],
    })
    expect(() => dispatch(s, choose(1, 3))).toThrow('dvoch rôznych hráčov')
    expect(run(s, choose(2, 1)).state.final!.positions).toEqual([2, 1])
  })
})
