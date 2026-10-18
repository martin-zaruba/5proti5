import { describe, it, expect } from 'vitest'

import { toBoardView } from '../boardView'
import { currentTurns, GameError, type GameAction, type GameState, type TeamIndex } from '../game'
import { rankingStarter, rankingTarget } from '../ranking'
import { dispatch, undo } from '../session'
import { A, B, clearRound, makeSet, newSession, next, run, wrong, timeout } from './helpers'

const guess = (rank: number): GameAction => ({ type: 'rankingGuess', rank })
const choose = (team: TeamIndex): GameAction => ({ type: 'chooseStartingTeam', team })
const ranking = (state: GameState) => state.ranking!
const scores = (state: GameState) => state.teams.map((t) => t.score)
const turn = (state: GameState) => currentTurns(state)[0]

/** Rounds 1–3 → A 200, B 100, then Zoraďovačka starts. */
const toRanking = () =>
  run(newSession(makeSet(3, true)), ...clearRound(A), ...clearRound(B), ...clearRound(A), next)

/** Rounds 1–3 → A 200, B 100; a correction of +100 for B creates a tie. */
const toTiedRanking = () =>
  run(
    newSession(makeSet(3, true)),
    ...clearRound(A),
    ...clearRound(B),
    ...clearRound(A),
    { type: 'adjustScore', team: B, delta: 100 },
    next,
  )

describe('Zoraďovačka – start (§4)', () => {
  it('follows round 3 and lists all answers alphabetically', () => {
    const s = toRanking()
    expect(s.state.phase).toBe('ranking')
    expect(s.state.round).toBeNull()
    expect(ranking(s.state).displayOrder).toEqual([2, 4, 3, 1])
    expect(ranking(s.state).revealed).toEqual([null, null, null, null])
  })

  it('is started by the team with fewer points, captain first', () => {
    const s = toRanking()
    expect(scores(s.state)).toEqual([200, 100])
    expect(ranking(s.state).control).toBe(B)
    expect(turn(s.state)).toEqual({ team: B, position: 5 })
  })

  it('lets the host choose the starting team on equal scores (OQ-03)', () => {
    let s = toTiedRanking()
    expect(ranking(s.state).control).toBeNull()
    expect(currentTurns(s.state)).toEqual([])
    expect(() => dispatch(s, guess(4))).toThrow('Najprv vyber')
    s = run(s, choose(A))
    expect(turn(s.state)).toEqual({ team: A, position: 5 })
    expect(() => dispatch(s, choose(B))).toThrow(GameError)
  })

  it('does not allow choosing the starter when scores differ', () => {
    expect(() => dispatch(toRanking(), choose(A))).toThrow('je už určené')
  })

  it('can be configured to start with the loser of the last round on a tie (OQ-03)', () => {
    expect(rankingStarter([100, 100], A, 'lastRoundLoser')).toBe(B)
    expect(rankingStarter([100, 100], A, 'host')).toBeNull()
    expect(rankingStarter([90, 100], B, 'lastRoundLoser')).toBe(A)
  })

  it('is skipped when the question set has no Zoraďovačka question', () => {
    const s = run(newSession(makeSet()), ...clearRound(A), ...clearRound(B), ...clearRound(A), next)
    expect(s.state.phase).toBe('faceOff')
    expect(s.state.round?.number).toBe(4)
  })
})

describe('Zoraďovačka – guessing (§4)', () => {
  it('flawless solution from the bottom: the team wins all points ×1, players rotate from the captain', () => {
    let s = toRanking()
    const positions: number[] = []
    for (const rank of [4, 3, 2, 1]) {
      expect(rankingTarget(ranking(s.state))).toBe(rank)
      positions.push(turn(s.state)!.position)
      s = run(s, guess(rank))
    }
    expect(positions).toEqual([5, 4, 3, 2])
    expect(s.state.phase).toBe('rankingEnd')
    expect(ranking(s.state).winner).toBe(B)
    expect(ranking(s.state).bank).toBe(100)
    expect(scores(s.state)).toEqual([200, 200])
  })

  it('a wrong guess wipes the streak, keeps the rank hidden and passes control to the other captain', () => {
    let s = run(toRanking(), guess(4), guess(3))
    expect(ranking(s.state).bank).toBe(30)
    // Target is rank 2 (Alfa); naming Delta (rank 1) is wrong.
    s = run(s, guess(1))
    const r = ranking(s.state)
    expect(r.control).toBe(A)
    expect(r.bank).toBe(0)
    expect(turn(s.state)).toEqual({ team: A, position: 5 })
    expect(r.revealed).toEqual([null, null, { by: B, counted: false }, { by: B, counted: false }])
    expect(s.state.strikeSignal).toEqual({ seq: 1, count: 1 })
  })

  it('placed ranks stay; the next team continues from the next hidden rank', () => {
    const s = run(toRanking(), guess(4), guess(1))
    expect(rankingTarget(ranking(s.state))).toBe(3)
  })

  it('wrong answer and timeout count as a wrong guess', () => {
    expect(ranking(run(toRanking(), wrong).state).control).toBe(A)
    expect(ranking(run(toRanking(), timeout).state).control).toBe(A)
  })

  it('several changes of control – the winner gets only its unbroken streak', () => {
    let s = toRanking()
    s = run(s, guess(4)) // B: Beta ✓ (10)
    s = run(s, guess(2)) // B: Alfa ✗ → A
    s = run(s, guess(3)) // A: Cézar ✓ (20)
    s = run(s, guess(1)) // A: Delta ✗ → B, captain again (OQ-04)
    expect(ranking(s.state).control).toBe(B)
    expect(turn(s.state)).toEqual({ team: B, position: 5 })
    s = run(s, guess(2), guess(1)) // B: Alfa ✓ (30), Delta ✓ (40)
    expect(s.state.phase).toBe('rankingEnd')
    expect(ranking(s.state).winner).toBe(B)
    expect(ranking(s.state).bank).toBe(70)
    expect(scores(s.state)).toEqual([200, 170])
    expect(ranking(s.state).revealed.map((r) => r && [r.by, r.counted])).toEqual([
      [B, true],
      [B, true],
      [A, false],
      [B, false],
    ])
  })

  it('the team that took over can win after a change of control', () => {
    const s = run(toRanking(), guess(3), guess(4), guess(3), guess(2), guess(1))
    expect(ranking(s.state).winner).toBe(A)
    expect(scores(s.state)).toEqual([200 + 10 + 20 + 30 + 40, 100])
  })

  it('rejects guessing an answer that is already placed or does not exist', () => {
    const s = run(toRanking(), guess(4))
    expect(() => dispatch(s, guess(4))).toThrow('je už zaradená')
    expect(() => dispatch(s, guess(9))).toThrow(GameError)
  })

  it('does not use revealAnswer or voidQuestion', () => {
    const s = toRanking()
    expect(() => dispatch(s, { type: 'revealAnswer', rank: 4 })).toThrow(GameError)
    expect(() => dispatch(s, { type: 'voidQuestion' })).toThrow('Späť')
  })
})

describe('Zoraďovačka – end', () => {
  it('continues with round 4 (×2) after the table is complete', () => {
    let s = run(toRanking(), guess(4), guess(3), guess(2), guess(1))
    expect(() => dispatch(run(toRanking()), next)).toThrow(GameError)
    s = run(s, next)
    expect(s.state.phase).toBe('faceOff')
    expect(s.state.round?.number).toBe(4)
    expect(s.state.round?.multiplier).toBe(2)
    expect(s.state.ranking).toBeNull()
  })

  it('a guess can be undone', () => {
    const before = toRanking()
    const after = run(before, guess(1))
    expect(undo(after).state).toEqual(before.state)
  })
})

describe('Zoraďovačka – log and board', () => {
  it('logs start, guesses and the result', () => {
    const s = run(toRanking(), guess(4), guess(1))
    const texts = s.log.slice(-3).map((e) => e.text)
    expect(texts).toEqual([
      'Zoraďovačka: Zoraďovačka – začína Červení',
      'Zoraďovačka: „Beta“ je na 4. mieste (+10 b., séria 10 b.)',
      'Zoraďovačka: „Delta“ – nie je na 3. mieste; séria prepadá, pokračuje Modrí',
    ])
  })

  it('board shows all answer texts but ranks and points only for placed ones', () => {
    const s = run(toRanking(), guess(4))
    const view = toBoardView(s.state).ranking!
    expect(view.answers).toEqual([
      { text: 'Alfa', placed: false },
      { text: 'Beta', placed: true },
      { text: 'Cézar', placed: false },
      { text: 'Delta', placed: false },
    ])
    expect(view.slots.map((slot) => slot.answer)).toEqual([
      null,
      null,
      null,
      { text: 'Beta', points: 10, scored: true },
    ])
    expect(view.target).toBe(3)
    expect(view.activeTeam).toBe(B)
    const json = JSON.stringify(view)
    for (const hidden of ['40', '30', '20']) expect(json).not.toContain(hidden)
  })
})
