import { describe, it, expect } from 'vitest'

import { toBoardView } from '../boardView'
import { finalPrize, finalTotal } from '../final'
import { currentTurns, GameError, type GameAction, type GameState } from '../game'
import { PROFILE_2026 } from '../profiles'
import { dispatch, type GameSession } from '../session'
import { A, B, clearRound, makeSet, newSession, next, run } from './helpers'

const answer = (question: number, rank: number | null, text = ''): GameAction => ({
  type: 'finalAnswer',
  question,
  text,
  rank,
})
const reveal = (question: number): GameAction => ({ type: 'finalReveal', question })
const revealAll = [0, 1, 2, 3, 4].map(reveal)
const choose = (a: number, b: number): GameAction => ({
  type: 'finalChoosePlayers',
  positions: [a, b],
})
const nextPlayer: GameAction = { type: 'finalNextPlayer' }
const final = (state: GameState) => state.final!

/** Rounds 1–5 cleared: A 100 + 100 + 100 + 200, B 300 (round 5 ×3) → A 500 : B 300. */
const toFinal = () =>
  run(
    newSession(makeSet(3, false, true)),
    ...clearRound(A),
    ...clearRound(A),
    ...clearRound(A),
    ...clearRound(A),
    ...clearRound(B),
    next,
  )

/** Player A answers with the given ranks (null = not in the survey, undefined = no answer). */
const playA = (s: GameSession, ranks: (number | null | undefined)[]) =>
  run(
    s,
    choose(2, 5),
    ...ranks.flatMap((rank, q) => (rank === undefined ? [] : [answer(q, rank, rank ? '' : 'iné')])),
    ...revealAll,
    nextPlayer,
  )

const playB = (s: GameSession, ranks: (number | null | undefined)[]) =>
  run(
    s,
    ...ranks.flatMap((rank, q) =>
      rank === undefined ? [] : [answer(q, rank, rank ? '' : 'niečo')],
    ),
    ...revealAll,
  )

describe('final – start (§6)', () => {
  it('follows round 5 with the leading team', () => {
    const s = toFinal()
    expect(s.state.phase).toBe('final')
    expect(final(s.state).team).toBe(A)
    expect(final(s.state).step).toBe('choosePlayers')
    expect(final(s.state).teamScore).toBe(500)
    expect(s.state.winner).toBe(A)
  })

  it('needs two different players of the winning team (the captain may play)', () => {
    const s = toFinal()
    expect(() => dispatch(s, choose(3, 3))).toThrow('dvoch rôznych')
    expect(() => dispatch(s, choose(0, 6))).toThrow(GameError)
    expect(() => dispatch(s, answer(0, 1))).toThrow(GameError)
    const chosen = run(s, choose(1, 5))
    expect(final(chosen.state).positions).toEqual([1, 5])
    expect(final(chosen.state).step).toBe('playerA')
    expect(currentTurns(chosen.state)).toEqual([{ team: A, position: 1 }])
  })

  it('is skipped when the set does not have 5 final questions', () => {
    let s = newSession(makeSet())
    for (let i = 0; i < 5; i++) s = run(s, ...clearRound(A))
    expect(run(s, next).state.phase).toBe('gameOver')
  })
})

describe('final – answers', () => {
  it('scores survey points for answers among the most frequent, 0 otherwise', () => {
    const s = run(toFinal(), choose(1, 2), answer(0, 2), answer(1, null, 'Mačka'))
    expect(final(s.state).answers[0].slice(0, 2)).toEqual([
      { text: 'F1 – odpoveď 2', rank: 2, points: 25 },
      { text: 'Mačka', rank: null, points: 0 },
    ])
  })

  it('keeps the text the player said when it matches a survey answer', () => {
    const s = run(toFinal(), choose(1, 2), answer(0, 1, 'psíka'))
    expect(final(s.state).answers[0][0]).toEqual({ text: 'psíka', rank: 1, points: 40 })
  })

  it('allows skipping a question and coming back to it later', () => {
    const s = run(toFinal(), choose(1, 2), answer(1, 1), answer(2, 1), answer(0, 3))
    expect(final(s.state).answers[0].map((e) => e?.points ?? null)).toEqual([
      15,
      40,
      40,
      null,
      null,
    ])
  })

  it('lets the host correct an answer until it is revealed', () => {
    let s = run(toFinal(), choose(1, 2), answer(0, 4), answer(0, 1))
    expect(final(s.state).answers[0][0]?.points).toBe(40)
    s = run(s, reveal(0))
    expect(() => dispatch(s, answer(0, 2))).toThrow('je už odkrytá')
  })

  it('rejects an empty answer and an unknown survey answer', () => {
    const s = run(toFinal(), choose(1, 2))
    expect(() => dispatch(s, answer(0, null, '  '))).toThrow('Zadaj, čo hráč povedal')
    expect(() => dispatch(s, answer(0, 7))).toThrow(GameError)
    expect(() => dispatch(s, answer(5, 1))).toThrow(GameError)
  })

  it('player B comes in only after all answers of player A were revealed', () => {
    const s = run(toFinal(), choose(1, 2), answer(0, 1), reveal(0))
    expect(() => dispatch(s, nextPlayer)).toThrow('Najprv odkry')
    const ready = run(s, reveal(1), reveal(2), reveal(3), reveal(4), nextPlayer)
    expect(final(ready.state).step).toBe('playerB')
    expect(currentTurns(ready.state)).toEqual([{ team: A, position: 2 }])
  })
})

describe('final – duplicate (§6)', () => {
  const toB = () => playA(toFinal(), [1, 2, null, undefined, 3])

  it('B repeating A’s survey answer is a duplicate – no answer is recorded, B must answer again', () => {
    let s = run(toB(), answer(0, 1))
    expect(final(s.state).answers[1][0]).toBeNull()
    expect(final(s.state).duplicateSignal).toBe(1)
    s = run(s, answer(0, 2))
    expect(final(s.state).answers[1][0]?.points).toBe(25)
  })

  it('repeating A’s answer that is not in the survey is a duplicate too', () => {
    const s = run(toB(), answer(2, null, ' INÉ '))
    expect(final(s.state).answers[1][2]).toBeNull()
    expect(final(s.state).duplicateSignal).toBe(1)
  })

  it('the host can mark a duplicate in other words; it removes B’s recorded answer', () => {
    let s = run(toB(), answer(1, null, 'skoro to isté'))
    s = run(s, { type: 'finalDuplicate', question: 1 })
    expect(final(s.state).answers[1][1]).toBeNull()
    expect(final(s.state).duplicateSignal).toBe(1)
  })

  it('there is no duplicate where A did not answer, nor for player A', () => {
    expect(() => dispatch(toB(), { type: 'finalDuplicate', question: 3 })).toThrow('neodpovedal')
    const a = run(toFinal(), choose(1, 2), answer(0, 1))
    expect(() => dispatch(a, { type: 'finalDuplicate', question: 0 })).toThrow(GameError)
  })
})

describe('final – prize bands (§6, 2026)', () => {
  it('pure function: 200+ → 1 500 €, 100–199 → Malé peniaze, < 100 → 0 €', () => {
    const config = PROFILE_2026.final!
    expect(finalPrize(200, 480, config)).toEqual({ kind: 'big', euros: 1500 })
    expect(finalPrize(199, 480, config)).toEqual({ kind: 'small', euros: 480 })
    expect(finalPrize(100, 480, config)).toEqual({ kind: 'small', euros: 480 })
    expect(finalPrize(99, 480, config)).toEqual({ kind: 'none', euros: 0 })
  })

  it('A + B ≥ 200 wins 1 500 €', () => {
    // A: 40 + 40 + 40 = 120, B: 25 + 25 + 25 + 15 = 90 → 210
    const s = playB(playA(toFinal(), [1, 1, 1, undefined, null]), [2, 2, 2, 3, undefined])
    expect(final(s.state).step).toBe('done')
    expect(finalTotal(final(s.state))).toBe(210)
    expect(final(s.state).prize).toEqual({ kind: 'big', euros: 1500 })
  })

  it('100–199 points win „Malé peniaze“ = the team score after round 5', () => {
    // A: 40 + 25 = 65, B: 25 + 15 + 40 = 80 → 145
    const s = playB(playA(toFinal(), [1, 2, undefined, undefined, undefined]), [2, 3, 1])
    expect(finalTotal(final(s.state))).toBe(145)
    expect(final(s.state).prize).toEqual({ kind: 'small', euros: 500 })
  })

  it('less than 100 points win nothing', () => {
    // A: 0 + 0 + 10, B: 4 + 0 + 6 → 20
    const s = playB(playA(toFinal(), [null, null, 4]), [6, null, 5])
    expect(finalTotal(final(s.state))).toBe(20)
    expect(final(s.state).prize).toEqual({ kind: 'none', euros: 0 })
  })

  it('the game ends after the final; not before it is decided', () => {
    const half = playA(toFinal(), [1])
    expect(() => dispatch(half, next)).toThrow('Finále ešte neskončilo')
    const done = run(playB(half, [2]), next)
    expect(done.state.phase).toBe('gameOver')
    expect(done.state.winner).toBe(A)
    expect(done.log.at(-1)?.text).toBe('Koniec hry – vyhráva Modrí, bez výhry')
  })

  it('does not use revealAnswer or voidQuestion', () => {
    const s = run(toFinal(), choose(1, 2))
    expect(() => dispatch(s, { type: 'revealAnswer', rank: 1 })).toThrow(GameError)
    expect(() => dispatch(s, { type: 'voidQuestion' })).toThrow('Späť')
  })
})

describe('final – board and log', () => {
  it('shows only revealed answers; A’s answers are hidden while B answers', () => {
    let s = run(toFinal(), choose(2, 5), answer(0, 1), answer(1, null, 'Mačka'), reveal(0))
    let view = toBoardView(s.state).final!
    expect(view.players).toEqual(['M2', 'M5'])
    expect(view.rows[0]).toEqual({ a: { text: 'F1 – odpoveď 1', points: 40 }, b: null })
    expect(view.rows[1]).toEqual({ a: null, b: null })
    expect(JSON.stringify(view)).not.toContain('Mačka')
    expect(view.timeLimit).toBe(20)

    s = run(s, reveal(1), reveal(2), reveal(3), reveal(4), nextPlayer, answer(0, 2))
    view = toBoardView(s.state).final!
    expect(view.rows.every((row) => row.a === null && row.b === null)).toBe(true)
    expect(view.total).toBe(0)
    expect(view.timeLimit).toBe(25)

    s = run(s, reveal(0))
    view = toBoardView(s.state).final!
    expect(view.rows[0]).toEqual({
      a: { text: 'F1 – odpoveď 1', points: 40 },
      b: { text: 'F1 – odpoveď 2', points: 25 },
    })
    expect(view.rows[1]!.a).toEqual({ text: 'Mačka', points: 0 })
    expect(view.total).toBe(65)
  })

  it('logs the course of the final', () => {
    const s = run(playA(toFinal(), [1]), answer(0, 1))
    const texts = s.log.map((e) => e.text)
    expect(texts).toContain('Finále – Veľké peniaze hrá Modrí (500 b.)')
    expect(texts).toContain('Finále: hráč A M2, hráč B M5')
    expect(texts).toContain('Finále, hráč A, otázka 1: „F1 – odpoveď 1“ (40 b.)')
    expect(texts).toContain('Finále: hráč A získal 40 b., nastupuje hráč B')
    expect(texts.at(-1)).toBe(
      'Finále, hráč B, otázka 1: „F1 – odpoveď 1“ – duplicita, musí povedať inú odpoveď',
    )
  })
})
