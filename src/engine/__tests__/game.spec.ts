import { describe, it, expect } from 'vitest'

import {
  createGame,
  currentTurns,
  GameError,
  isLastRound,
  isTieAfterLastRound,
  roundCount,
  type GameState,
} from '../game'
import { dispatch } from '../session'
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
  timeout,
  wrong,
} from './helpers'

const round = (state: GameState) => state.round!
const scores = (state: GameState) => state.teams.map((t) => t.score)
const misses = (count: number) => Array.from({ length: count }, () => wrong)

describe('createGame', () => {
  it('starts in the intro phase with zero scores and default names', () => {
    const set = makeSet()
    const state = createGame(
      [
        { name: ' ', players: ['', 'B', 'C', 'D', 'E'] },
        { name: 'Druhí', players: ['1', '2', '3', '4', '5'] },
      ],
      set,
    )
    expect(state.phase).toBe('intro')
    expect(scores(state)).toEqual([0, 0])
    expect(state.teams[0].name).toBe('Družstvo 1')
    expect(state.teams[0].players[0]).toBe('Hráč 1')
  })

  it('requires 5 players per team', () => {
    expect(() =>
      createGame(
        [
          { name: 'A', players: ['1', '2'] },
          { name: 'B', players: ['1', '2', '3', '4', '5'] },
        ],
        makeSet(),
      ),
    ).toThrow(GameError)
  })
})

describe('round setup (§2)', () => {
  it('uses multipliers ×1, ×1, ×1, ×2, ×3 for rounds 1–5', () => {
    let s = newSession()
    const multipliers: number[] = []
    for (let i = 0; i < 5; i++) {
      s = run(s, ...clearRound(A))
      multipliers.push(round(s.state).multiplier)
    }
    expect(multipliers).toEqual([1, 1, 1, 2, 3])
  })

  it('players at position N face off in round N', () => {
    let s = run(newSession(), ...clearRound(A), ...clearRound(A), next)
    expect(currentTurns(s.state)).toEqual([
      { team: A, position: 3 },
      { team: B, position: 3 },
    ])
    s = run(s, buzz(B))
    expect(currentTurns(s.state)).toEqual([{ team: B, position: 3 }])
  })
})

describe('face-off (§3.1)', () => {
  it('requires a buzz before an answer', () => {
    const s = run(newSession(), next)
    expect(() => dispatch(s, reveal(2))).toThrow('Najprv zaznač')
    expect(() => dispatch(s, wrong)).toThrow(GameError)
  })

  it('rejects a second buzz', () => {
    const s = run(newSession(), next, buzz(A))
    expect(() => dispatch(s, buzz(B))).toThrow(GameError)
  })

  it('TOP answer wins control immediately, opponent does not answer', () => {
    const s = run(newSession(), next, buzz(B), reveal(1))
    expect(s.state.phase).toBe('play')
    expect(round(s.state).control).toBe(B)
    expect(round(s.state).bank).toBe(30)
    expect(currentTurns(s.state)).toEqual([{ team: B, position: 2 }])
  })

  it('after a non-TOP answer the opponent answers and the higher-ranked answer wins', () => {
    let s = run(newSession(), next, buzz(A), reveal(3))
    expect(s.state.phase).toBe('faceOff')
    expect(currentTurns(s.state)).toEqual([{ team: B, position: 1 }])
    s = run(s, reveal(2))
    expect(s.state.phase).toBe('play')
    expect(round(s.state).control).toBe(B)
  })

  it('keeps control with the first team if its answer ranks higher', () => {
    const s = run(newSession(), next, buzz(A), reveal(2), reveal(4))
    expect(round(s.state).control).toBe(A)
  })

  it('puts the points of both face-off answers into the round bank (OQ-01)', () => {
    const s = run(newSession(), next, buzz(A), reveal(3), reveal(2))
    expect(round(s.state).bank).toBe(20 + 25)
    expect(round(s.state).revealed.map((r) => r?.by ?? null)).toEqual([null, B, A, null, null])
  })

  it('gives control to the only team that hit an answer', () => {
    expect(round(run(newSession(), next, buzz(A), wrong, reveal(5)).state).control).toBe(B)
    expect(round(run(newSession(), next, buzz(A), reveal(5), timeout).state).control).toBe(A)
  })

  it('continues with the next players in line when nobody hits, buzzing team first (OQ-13)', () => {
    let s = run(newSession(), next, buzz(B), wrong, timeout)
    expect(currentTurns(s.state)).toEqual([{ team: B, position: 2 }])
    s = run(s, wrong)
    expect(currentTurns(s.state)).toEqual([{ team: A, position: 2 }])
    s = run(s, reveal(4))
    expect(round(s.state).control).toBe(A)
    // The team continues with the player after the one who won control.
    expect(currentTurns(s.state)).toEqual([{ team: A, position: 3 }])
  })

  it('TOP answer by a later player also ends the face-off at once', () => {
    const s = run(newSession(), next, buzz(A), wrong, wrong, reveal(1))
    expect(round(s.state).control).toBe(A)
    expect(round(s.state).attempts).toHaveLength(3)
  })

  it('voids the question when nobody hits even the captains, same round number', () => {
    let s = run(newSession(), next, buzz(A), ...misses(9))
    expect(currentTurns(s.state)).toEqual([{ team: B, position: 5 }])
    s = run(s, wrong)
    const r = round(s.state)
    expect(s.state.phase).toBe('faceOff')
    expect(r.number).toBe(1)
    expect(r.question.text).toBe('Rezerva 1')
    expect(r.replay).toBe('noHit')
    expect(r.buzzed).toBeNull()
    expect(r.attempts).toEqual([])
    expect(s.state.reserveUsed).toBe(1)
  })

  it('in round 5 the captains are the last pair', () => {
    let s = newSession()
    for (let i = 0; i < 4; i++) s = run(s, ...clearRound(A))
    s = run(s, next, buzz(A), wrong, wrong)
    expect(round(s.state).replay).toBe('noHit')
    expect(round(s.state).number).toBe(5)
  })

  it('rejects the void when no reserve question is left (OQ-14)', () => {
    const s = run(newSession(makeSet(0)), next, buzz(A), ...misses(9))
    expect(() => dispatch(s, wrong)).toThrow('Došli však rezervné otázky')
  })

  it('signals a single X for every face-off miss', () => {
    const s = run(newSession(), next, buzz(A), wrong)
    expect(s.state.strikeSignal).toEqual({ seq: 1, count: 1 })
  })
})

describe('play of the team in control (§3.2)', () => {
  it('rotates through the line cyclically from the player after the face-off (OQ-02)', () => {
    let s = run(newSession(), ...clearRound(A), ...clearRound(A), next, buzz(B), reveal(1))
    const order: number[] = []
    for (const action of [reveal(2), wrong, reveal(3), wrong, reveal(4)]) {
      order.push(currentTurns(s.state)[0]!.position)
      s = run(s, action)
    }
    order.push(currentTurns(s.state)[0]!.position)
    expect(order).toEqual([4, 5, 1, 2, 3, 4])
  })

  it('adds points × multiplier to the bank', () => {
    let s = newSession()
    for (let i = 0; i < 3; i++) s = run(s, ...clearRound(A))
    s = run(s, ...takeControl(B), reveal(3))
    expect(round(s.state).multiplier).toBe(2)
    expect(round(s.state).bank).toBe((30 + 20) * 2)
  })

  it('a team that reveals all answers wins the bank', () => {
    const s = run(
      newSession(),
      ...takeControl(B),
      reveal(2),
      wrong,
      reveal(3),
      wrong,
      reveal(4),
      reveal(5),
    )
    expect(s.state.phase).toBe('roundEnd')
    expect(round(s.state).winner).toBe(B)
    expect(round(s.state).outcome).toBe('cleared')
    expect(scores(s.state)).toEqual([0, 100])
  })

  it('wrong answer and timeout both cost a life; the 3rd X starts the steal', () => {
    let s = run(newSession(), ...takeControl(A), wrong)
    expect(round(s.state).strikes).toBe(1)
    expect(s.state.strikeSignal.count).toBe(1)
    s = run(s, timeout)
    expect(s.state.strikeSignal.count).toBe(2)
    expect(s.state.phase).toBe('play')
    s = run(s, wrong)
    expect(round(s.state).strikes).toBe(3)
    expect(s.state.strikeSignal.count).toBe(3)
    expect(s.state.phase).toBe('steal')
    expect(currentTurns(s.state)).toEqual([{ team: B, position: 5 }])
  })

  it('penalty for conferring takes all remaining lives', () => {
    const s = run(newSession(), ...takeControl(A), wrong, { type: 'penaltyConferring' })
    expect(s.state.phase).toBe('steal')
    expect(round(s.state).strikes).toBe(3)
  })

  it('penalty is only possible while the team in control plays', () => {
    const s = run(newSession(), next, buzz(A))
    expect(() => dispatch(s, { type: 'penaltyConferring' })).toThrow(GameError)
  })

  it('rejects revealing an answer twice or a rank that is not on the board', () => {
    const s = run(newSession(), ...takeControl(A))
    expect(() => dispatch(s, reveal(1))).toThrow('je už odkrytá')
    expect(() => dispatch(s, reveal(6))).toThrow('na tabuli nie je')
  })
})

describe('steal (§3.3)', () => {
  const toSteal = [...takeControl(A), reveal(2), wrong, wrong, wrong]

  it('successful steal takes the whole bank but not the points of the stealing answer', () => {
    const s = run(newSession(), ...toSteal, reveal(4))
    expect(s.state.phase).toBe('roundEnd')
    expect(round(s.state).outcome).toBe('stolen')
    expect(round(s.state).winner).toBe(B)
    expect(round(s.state).revealed[3]).toEqual({ by: B, points: 0 })
    expect(scores(s.state)).toEqual([0, 30 + 25])
  })

  it('failed steal leaves the bank with the team in control', () => {
    const s = run(newSession(), ...toSteal, wrong)
    expect(round(s.state).outcome).toBe('stealFailed')
    expect(scores(s.state)).toEqual([55, 0])
    expect(run(newSession(), ...toSteal, timeout).state.teams[0].score).toBe(55)
  })

  it('in round 5 (triple) the stolen bank also includes the captain’s answer × 3', () => {
    let s = newSession()
    for (let i = 0; i < 4; i++) s = run(s, ...clearRound(A))
    const before = scores(s.state)
    s = run(s, ...toSteal, reveal(4))
    expect(scores(s.state)).toEqual([before[0], before[1]! + (30 + 25 + 15) * 3])
  })
})

describe('end of round (§3.4)', () => {
  it('reveals remaining answers without points', () => {
    let s = run(newSession(), ...takeControl(A), wrong, wrong, wrong, wrong)
    expect(() => dispatch(newSession(), { type: 'revealRemaining' })).toThrow(GameError)
    s = run(s, reveal(5))
    expect(round(s.state).revealed[4]).toEqual({ by: null, points: 0 })
    s = run(s, { type: 'revealRemaining' })
    expect(round(s.state).revealed.every((r) => r !== null)).toBe(true)
    expect(scores(s.state)).toEqual([30, 0])
  })

  it('does not allow the next round before the current one ends', () => {
    const s = run(newSession(), ...takeControl(A))
    expect(() => dispatch(s, next)).toThrow(GameError)
  })
})

describe('after round 5 (§5)', () => {
  it('ends the game with the team with more points', () => {
    let s = newSession()
    for (let i = 0; i < 4; i++) s = run(s, ...clearRound(A))
    s = run(s, ...clearRound(B), next)
    expect(s.state.phase).toBe('gameOver')
    expect(s.state.winner).toBe(A)
  })

  it('on a tie voids round 5 incl. its points and replays it with a new question', () => {
    let s = run(
      newSession(),
      ...clearRound(A),
      ...clearRound(B),
      ...clearRound(A),
      ...clearRound(B),
    )
    expect(scores(s.state)).toEqual([200, 300])
    const beforeRound5 = scores(s.state)
    // Round 5: A keeps a bank of (30 + 25 + 20) × 3 = 225 after a failed steal → 425 : 300.
    s = run(s, ...takeControl(A), reveal(2), reveal(3), wrong, wrong, wrong, wrong)
    // A manual correction creates the tie.
    s = run(s, { type: 'adjustScore', team: B, delta: 125 })
    expect(scores(s.state)).toEqual([425, 425])
    s = run(s, next)
    expect(s.state.phase).toBe('faceOff')
    expect(round(s.state).number).toBe(5)
    expect(round(s.state).replay).toBe('tie')
    expect(round(s.state).question.text).toBe('Rezerva 1')
    expect(scores(s.state)).toEqual(beforeRound5)
  })
})

describe('game options (T-014)', () => {
  const short = { ranking: false, final: false }
  const fullSet = () => makeSet(3, true, true)

  it('plays the full episode by default', () => {
    const s = newSession(fullSet())
    expect(s.state.options).toEqual({ ranking: true, final: true })
    expect(roundCount(s.state)).toBe(5)
  })

  it('turns the final off when the set has no final questions', () => {
    expect(newSession(makeSet(3, true, false)).state.options.final).toBe(false)
  })

  it('without Zoraďovačka and the final the game ends after round 3', () => {
    let s = newSession(fullSet(), short)
    expect(roundCount(s.state)).toBe(3)
    s = run(s, ...clearRound(A), ...clearRound(B), ...clearRound(A))
    expect(isLastRound(s.state, round(s.state))).toBe(true)
    s = run(s, next)
    expect(s.state.phase).toBe('gameOver')
    expect(s.state.winner).toBe(A)
    expect(s.state.ranking).toBeNull()
    expect(s.state.final).toBeNull()
  })

  it('a tie after round 3 without the final ends as a draw', () => {
    let s = run(newSession(fullSet(), short), ...clearRound(A), ...clearRound(B), ...clearRound(A))
    s = run(s, { type: 'adjustScore', team: B, delta: 100 })
    expect(scores(s.state)).toEqual([200, 200])
    expect(isTieAfterLastRound(s.state)).toBe(false)
    s = run(s, next)
    expect(s.state.phase).toBe('gameOver')
    expect(s.state.winner).toBeNull()
    expect(s.log.at(-1)!.text).toBe('Koniec hry – remíza 200 : 200')
  })

  it('without Zoraďovačka but with the final the winner of round 3 goes to the final', () => {
    let s = newSession(fullSet(), { ranking: false, final: true })
    s = run(s, ...clearRound(A), ...clearRound(B), ...clearRound(B), next)
    expect(s.state.phase).toBe('final')
    expect(s.state.final!.team).toBe(B)
  })

  it('without Zoraďovačka but with the final a tie replays round 3 (§5)', () => {
    let s = newSession(fullSet(), { ranking: false, final: true })
    s = run(s, ...clearRound(A), ...clearRound(B), ...clearRound(A))
    s = run(s, { type: 'adjustScore', team: B, delta: 100 })
    expect(isTieAfterLastRound(s.state)).toBe(true)
    s = run(s, next)
    expect(s.state.phase).toBe('faceOff')
    expect(round(s.state).number).toBe(3)
    expect(round(s.state).replay).toBe('tie')
  })

  it('with Zoraďovačka but without the final the game ends after round 5', () => {
    let s = newSession(fullSet(), { ranking: true, final: false })
    s = run(s, ...clearRound(A), ...clearRound(B), ...clearRound(A), next)
    expect(s.state.phase).toBe('ranking')
    s = run(s, { type: 'rankingGuess', rank: 4 }, { type: 'rankingGuess', rank: 3 })
    s = run(s, { type: 'rankingGuess', rank: 2 }, { type: 'rankingGuess', rank: 1 }, next)
    s = run(s, ...clearRound(A).slice(1), ...clearRound(A), next)
    expect(s.state.phase).toBe('gameOver')
    expect(s.state.winner).toBe(A)
    expect(s.state.final).toBeNull()
  })
})

describe('board question visibility', () => {
  it('can be toggled', () => {
    const s = run(newSession(), { type: 'setShowQuestion', show: false })
    expect(s.state.showQuestion).toBe(false)
  })
})
