/** Primitives shared by all parts of the engine (standard rounds, Zoraďovačka, …). */

import { getProfile, type RuleProfile, type RuleProfileId } from './profiles'

export type TeamIndex = 0 | 1

export const otherTeam = (team: TeamIndex): TeamIndex => (team === 0 ? 1 : 0)

export interface Team {
  name: string
  /** Player names, index = position − 1 (the captain is at the profile's captain position). */
  players: string[]
  score: number
}

/** A rejected action; the message is shown to the host (in Slovak). */
export class GameError extends Error {
  override name = 'GameError'
}

export function requireProfile(id: RuleProfileId): RuleProfile {
  const profile = getProfile(id)
  if (!profile) throw new GameError(`Profil pravidiel ${id} zatiaľ nie je podporovaný.`)
  return profile
}

/** Next strike signal for the board (`count` big X marks). */
export const nextSignal = (signal: { seq: number }, count: number) => ({
  seq: signal.seq + 1,
  count,
})

export const addScore = (teams: [Team, Team], team: TeamIndex, points: number): [Team, Team] => {
  const next = [...teams] as [Team, Team]
  next[team] = { ...next[team], score: next[team].score + points }
  return next
}
