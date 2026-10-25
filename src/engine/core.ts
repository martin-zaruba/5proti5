/** Primitives shared by all parts of the engine (standard rounds, Zoraďovačka, …). */

import { getProfile, type RuleProfile, type RuleProfileId } from './profiles'

export type TeamIndex = 0 | 1

export const otherTeam = (team: TeamIndex): TeamIndex => (team === 0 ? 1 : 0)

export interface Team {
  name: string
  /** Player names, index = position − 1 (the captain at the end or head of the line, see the profile). */
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

/** Players per team in this game – both teams have the same number (§1, OQ-20). */
export const teamSize = (teams: readonly [Team, Team]) => teams[0].players.length

export const captainPosition = (profile: RuleProfile, size: number) =>
  profile.captain === 'last' ? size : 1

/** The player after `position` in the line; after the last one the line starts over (OQ-02). */
export const nextPosition = (position: number, size: number) => (position % size) + 1

/**
 * Who goes to the buzzer in round N: the player at position N; with fewer players than rounds
 * the line starts over (3 players: rounds 1–5 → positions 1, 2, 3, 1, 2 – OQ-20).
 */
export const faceOffPosition = (roundNumber: number, size: number) => ((roundNumber - 1) % size) + 1

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
