import { createGame, FULL_GAME, type GameAction, type GameOptions, type TeamIndex } from '../game'
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

/**
 * Zoraďovačka question: ranks 1–4 = Delta 40, Alfa 30, Cézar 20, Beta 10.
 * Alphabetical board order is Alfa, Beta, Cézar, Delta → ranks [2, 4, 3, 1].
 */
export const RANKING_QUESTION: Question = {
  type: 'ranking',
  text: 'Zoraďovačka',
  answers: [
    { text: 'Delta', points: 40 },
    { text: 'Alfa', points: 30 },
    { text: 'Cézar', points: 20 },
    { text: 'Beta', points: 10 },
  ],
}

/** Final questions have 6 answers worth 40, 25, 15, 10, 6 and 4 points (ranks 1–6). */
export const FINAL_POINTS = [40, 25, 15, 10, 6, 4]

const finalQuestion = (n: number): Question => ({
  type: 'final',
  text: `Finále ${n}`,
  answers: FINAL_POINTS.map((points, i) => ({ text: `F${n} – odpoveď ${i + 1}`, points })),
})

/**
 * Without `withRanking` / `withFinal` the set has no Zoraďovačka / final questions,
 * so the game skips them.
 */
export function makeSet(reserveCount = 3, withRanking = false, withFinal = false): QuestionSet {
  return {
    name: 'Testovacia sada',
    ruleProfile: '2026',
    rounds: [1, 2, 3, 4, 5].map((n) => question(`Kolo ${n}`)),
    ranking: withRanking ? RANKING_QUESTION : undefined,
    final: withFinal ? [1, 2, 3, 4, 5].map(finalQuestion) : [],
    reserve: Array.from({ length: reserveCount }, (_, i) => question(`Rezerva ${i + 1}`)),
  }
}

export function newSession(set = makeSet(), options: GameOptions = FULL_GAME): GameSession {
  const players = (prefix: string) => [1, 2, 3, 4, 5].map((n) => `${prefix}${n}`)
  const state = createGame(
    [
      { name: 'Modrí', players: players('M') },
      { name: 'Červení', players: players('C') },
    ],
    set,
    options,
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
