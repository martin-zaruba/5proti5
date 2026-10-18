/**
 * Bonus round Zoraďovačka – docs/pravidla.md §4 (profile 2026), decisions OQ-03 to OQ-06.
 * Teams order all survey answers from the bottom (least frequent first); a wrong guess wipes
 * the bonus-round points and passes control. The team that completes the table wins its streak.
 */

import { addScore, GameError, nextSignal, otherTeam, type TeamIndex } from './core'
import type { GameState } from './game'
import type { RuleProfile } from './profiles'
import type { Question } from './questions'

export interface RankingReveal {
  by: TeamIndex
  /** Still part of the controlling team's unbroken streak – only these points are won (§4). */
  counted: boolean
}

export interface RankingState {
  question: Question
  /** Ranks of the answers in the order they are listed on the board – alphabetical, so it gives no hint. */
  displayOrder: number[]
  /** Indexed by rank − 1; `null` = not placed yet. */
  revealed: (RankingReveal | null)[]
  /** `null` until the host picks the starting team on equal scores (OQ-03). */
  control: TeamIndex | null
  turnPosition: number | null
  /** Points of the controlling team's current streak (×1, OQ-06). */
  bank: number
  winner: TeamIndex | null
  scoreBefore: [number, number]
}

/** The rank that is being guessed now: the lowest one still hidden (§4 – from the bottom). */
export function rankingTarget(ranking: RankingState): number | null {
  for (let rank = ranking.revealed.length; rank >= 1; rank--) {
    if (!ranking.revealed[rank - 1]) return rank
  }
  return null
}

/** Starting team: fewer points after round 3; on equal scores per profile (OQ-03), `null` = host decides. */
export function rankingStarter(
  scores: [number, number],
  lastRoundWinner: TeamIndex | null,
  tieStarter: 'host' | 'lastRoundLoser',
): TeamIndex | null {
  if (scores[0] !== scores[1]) return scores[0] < scores[1] ? 0 : 1
  if (tieStarter === 'lastRoundLoser' && lastRoundWinner !== null) return otherTeam(lastRoundWinner)
  return null
}

/** The captain answers first; then the player standing next to him, and so on (§4). */
function nextRankingPosition(position: number, profile: RuleProfile): number {
  const step = profile.captainPosition === profile.teamSize ? -1 : 1
  const n = profile.teamSize
  return ((position - 1 + step + n) % n) + 1
}

export function startRanking(
  state: GameState,
  question: Question,
  profile: RuleProfile,
): GameState {
  const config = profile.ranking!
  const control = rankingStarter(
    [state.teams[0].score, state.teams[1].score],
    state.round?.winner ?? null,
    config.tieStarter,
  )
  const text = (rank: number) => question.answers[rank - 1]!.text
  const displayOrder = question.answers
    .map((_, i) => i + 1)
    .sort((a, b) => text(a).localeCompare(text(b), 'sk'))
  return {
    ...state,
    phase: 'ranking',
    round: null,
    ranking: {
      question,
      displayOrder,
      revealed: question.answers.map(() => null),
      control,
      turnPosition: control === null ? null : profile.captainPosition,
      bank: 0,
      winner: null,
      scoreBefore: [state.teams[0].score, state.teams[1].score],
    },
  }
}

function requireRanking(state: GameState): RankingState {
  if (state.phase !== 'ranking' || !state.ranking) {
    throw new GameError('Toto sa dá len počas Zoraďovačky.')
  }
  return state.ranking
}

function requireControl(ranking: RankingState): TeamIndex {
  if (ranking.control === null) {
    throw new GameError('Najprv vyber, ktoré družstvo začína Zoraďovačku.')
  }
  return ranking.control
}

export function chooseStartingTeam(
  state: GameState,
  team: TeamIndex,
  profile: RuleProfile,
): GameState {
  const ranking = requireRanking(state)
  if (ranking.control !== null || ranking.revealed.some((r) => r)) {
    throw new GameError('Začínajúce družstvo je už určené.')
  }
  return {
    ...state,
    ranking: { ...ranking, control: team, turnPosition: profile.captainPosition },
  }
}

/** The host marks which answer the team named for the current (lowest hidden) rank. */
export function rankingGuess(state: GameState, rank: number, profile: RuleProfile): GameState {
  const ranking = requireRanking(state)
  const control = requireControl(ranking)
  const answer = ranking.question.answers[rank - 1]
  if (!answer) throw new GameError(`Odpoveď č. ${rank} v Zoraďovačke nie je.`)
  if (ranking.revealed[rank - 1]) throw new GameError(`„${answer.text}“ je už zaradená.`)

  if (rank !== rankingTarget(ranking)) return rankingMiss(state, profile)

  const revealed = [...ranking.revealed]
  revealed[rank - 1] = { by: control, counted: true }
  const next: RankingState = {
    ...ranking,
    revealed,
    bank: ranking.bank + answer.points,
    turnPosition: nextRankingPosition(ranking.turnPosition!, profile),
  }
  if (rankingTarget(next) !== null) return { ...state, ranking: next }

  // The table is complete without a mistake – the team wins its streak (§4).
  return {
    ...state,
    phase: 'rankingEnd',
    teams: addScore(state.teams, control, next.bank),
    ranking: { ...next, winner: control },
  }
}

/** Wrong guess (or timeout): the streak is lost, control passes to the other captain (OQ-04, OQ-05). */
export function rankingMiss(state: GameState, profile: RuleProfile): GameState {
  const ranking = requireRanking(state)
  const control = requireControl(ranking)
  return {
    ...state,
    strikeSignal: nextSignal(state.strikeSignal, 1),
    ranking: {
      ...ranking,
      control: otherTeam(control),
      turnPosition: profile.captainPosition,
      bank: 0,
      revealed: ranking.revealed.map((r) => r && { ...r, counted: false }),
    },
  }
}
