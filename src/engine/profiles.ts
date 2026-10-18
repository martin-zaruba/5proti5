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
  /** Players per team; position 1 stands closest to the host, the captain at the last position. */
  teamSize: number
  captainPosition: number
  standardRounds: StandardRoundDef[]
}

export const PROFILE_2026: RuleProfile = {
  id: '2026',
  label: 'Štatút 2026 (STVR)',
  answersPerQuestion: { min: 4, max: 6 },
  teamSize: 5,
  captainPosition: 5,
  standardRounds: [
    { number: 1, multiplier: 1, stealIncludesAnswer: false, label: 'Prvé kolo' },
    { number: 2, multiplier: 1, stealIncludesAnswer: false, label: 'Druhé kolo' },
    { number: 3, multiplier: 1, stealIncludesAnswer: false, label: 'Tretie kolo' },
    { number: 4, multiplier: 2, stealIncludesAnswer: false, label: 'Štvrté kolo – dvojitá šanca' },
    { number: 5, multiplier: 3, stealIncludesAnswer: true, label: 'Piate kolo – trojitá šanca' },
  ],
}

const PROFILES: Partial<Record<RuleProfileId, RuleProfile>> = { '2026': PROFILE_2026 }

export function getProfile(id: RuleProfileId): RuleProfile | undefined {
  return PROFILES[id]
}
