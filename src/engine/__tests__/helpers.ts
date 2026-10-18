import { createGame, type GameAction, type TeamIndex } from '../game'
import type { Question, QuestionSet } from '../questions'
import { createSession, dispatch, type GameSession } from '../session'

export const A: TeamIndex = 0
export const B: TeamIndex = 1

/** Every test question has 5 answers worth 30, 25, 20, 15 and 10 points (ranks 1–5). */
export const POINTS = [30, 25, 20, 15, 10]

const question = (text: string): Question => ({
  type: 'standard',
  text,
  answers: POINTS.map((points, i) => ({ text: `${text} – odpoveď ${i + 1}`, points })),
})

export function makeSet(reserveCount = 3): QuestionSet {
  return {
    name: 'Testovacia sada',
    ruleProfile: '2026',
    rounds: [1, 2, 3, 4, 5].map((n) => question(`Kolo ${n}`)),
    final: [],
    reserve: Array.from({ length: reserveCount }, (_, i) => question(`Rezerva ${i + 1}`)),
  }
}

export function newSession(set = makeSet()): GameSession {
  const players = (prefix: string) => [1, 2, 3, 4, 5].map((n) => `${prefix}${n}`)
  const state = createGame(
    [
      { name: 'Modrí', players: players('M') },
      { name: 'Červení', players: players('C') },
    ],
    set,
  )
  return createSession(set, state, new Date('2026-10-18T10:00:00Z'))
}

export function run(session: GameSession, ...actions: GameAction[]): GameSession {
  return actions.reduce((s, action) => dispatch(s, action), session)
}

export const reveal = (rank: number): GameAction => ({ type: 'revealAnswer', rank })
export const wrong: GameAction = { type: 'wrongAnswer' }
export const timeout: GameAction = { type: 'timeout' }
export const next: GameAction = { type: 'nextRound' }
export const buzz = (team: TeamIndex): GameAction => ({ type: 'buzz', team })

/** Starts round 1 (or the next round) and lets `team` win control with the TOP answer. */
export const takeControl = (team: TeamIndex): GameAction[] => [next, buzz(team), reveal(1)]

/** Plays a whole round in which `team` clears the board without a strike. */
export const clearRound = (team: TeamIndex): GameAction[] => [
  ...takeControl(team),
  reveal(2),
  reveal(3),
  reveal(4),
  reveal(5),
]
