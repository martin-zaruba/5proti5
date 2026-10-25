/** Rule profiles – see docs/pravidla.md §2. Only profile 2026 is supported for now (OQ-07). */

export type RuleProfileId = '2026' | '2022'

export interface StandardRoundDef {
  /** Round number 1–5; the player at this position goes to the buzzer. */
  number: number
  multiplier: number
  /** Round 5 (triple) exception: a successful steal also scores the captain's answer (§3.3). */
  stealIncludesAnswer: boolean
  label: string
}

export interface RuleProfile {
  id: RuleProfileId
  label: string
  /** Number of answers shown on the board for a standard question. */
  answersPerQuestion: { min: number; max: number }
  /**
   * Players per team (the statute has 5; fewer is an app option for small groups – §1, OQ-20).
   * Position 1 stands closest to the host. Both teams have the same number.
   */
  teamSize: { min: number; max: number }
  /** Where the captain stands: at the end of the line (2026) or at its head (2022). */
  captain: 'last' | 'first'
  /** Seconds a player has for an answer after the host calls him (§1). */
  answerTimeLimit: number
  standardRounds: StandardRoundDef[]
  /** Bonus round Zoraďovačka (§4), played after the given round number. */
  ranking?: {
    afterRound: number
    /** Who starts on equal scores (OQ-03): the host decides, or the loser of the last round. */
    tieStarter: 'host' | 'lastRoundLoser'
  }
  /** Final „Veľké peniaze“ (§6). */
  final?: {
    questionCount: number
    /** Answer time in seconds for player A and player B. */
    timeLimits: [number, number]
    /** A + B points needed for the big prize. */
    target: number
    bigPrize: number
    /** From this many points the team wins „Malé peniaze“ (its score in €). */
    smallMoneyFrom: number
  }
}

export const PROFILE_2026: RuleProfile = {
  id: '2026',
  label: 'Štatút 2026 (STVR)',
  answersPerQuestion: { min: 4, max: 6 },
  teamSize: { min: 2, max: 5 },
  captain: 'last',
  answerTimeLimit: 3,
  standardRounds: [
    { number: 1, multiplier: 1, stealIncludesAnswer: false, label: 'Prvé kolo' },
    { number: 2, multiplier: 1, stealIncludesAnswer: false, label: 'Druhé kolo' },
    { number: 3, multiplier: 1, stealIncludesAnswer: false, label: 'Tretie kolo' },
    { number: 4, multiplier: 2, stealIncludesAnswer: false, label: 'Štvrté kolo – dvojitá šanca' },
    { number: 5, multiplier: 3, stealIncludesAnswer: true, label: 'Piate kolo – trojitá šanca' },
  ],
  ranking: { afterRound: 3, tieStarter: 'host' },
  final: {
    questionCount: 5,
    timeLimits: [20, 25],
    target: 200,
    bigPrize: 1500,
    smallMoneyFrom: 100,
  },
}

const PROFILES: Partial<Record<RuleProfileId, RuleProfile>> = { '2026': PROFILE_2026 }

export function getProfile(id: RuleProfileId): RuleProfile | undefined {
  return PROFILES[id]
}
