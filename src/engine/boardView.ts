/**
 * Projection of the game state for the audience board (T-008).
 * The board must never receive hidden answers – only revealed slots carry text and points.
 */

import {
  currentTurns,
  isTieAfterLastRound,
  requireProfile,
  type GameState,
  type Phase,
  type RoundOutcome,
  type TeamIndex,
} from './game'
import { rankingTarget } from './ranking'

export interface BoardSlot {
  rank: number
  /** `null` while the answer is hidden. */
  answer: { text: string; points: number; scored: boolean } | null
}

export interface BoardView {
  phase: Phase
  teams: { name: string; score: number }[]
  round: {
    number: number
    label: string
    multiplier: number
    bank: number
    strikes: number
    question: string | null
    slots: BoardSlot[]
    /** Team that is playing now (control in play, the thief during a steal). */
    activeTeam: TeamIndex | null
    winner: TeamIndex | null
    outcome: RoundOutcome | null
    replay: 'void' | 'noHit' | 'tie' | null
    tie: boolean
  } | null
  /** Zoraďovačka (§4). Answer texts are public there; ranks and points only once placed. */
  ranking: {
    label: string
    question: string | null
    /** All answers in board order (alphabetical); `placed` = already on the ladder. */
    answers: { text: string; placed: boolean }[]
    /** Ladder from rank 1; `scored` = part of the current streak. */
    slots: BoardSlot[]
    /** Rank being guessed now (from the bottom). */
    target: number | null
    bank: number
    activeTeam: TeamIndex | null
    winner: TeamIndex | null
  } | null
  strikeSignal: { seq: number; count: number }
  winner: TeamIndex | null
}

export function toBoardView(state: GameState): BoardView {
  const round = state.round
  const profile = requireProfile(state.profileId)
  const turns = currentTurns(state)
  return {
    phase: state.phase,
    teams: state.teams.map((t) => ({ name: t.name, score: t.score })),
    round: round && {
      number: round.number,
      label: profile.standardRounds[round.index]!.label,
      multiplier: round.multiplier,
      bank: round.bank,
      strikes: round.strikes,
      question: state.showQuestion ? round.question.text : null,
      slots: round.revealed.map((revealed, i) => {
        const answer = round.question.answers[i]!
        return {
          rank: i + 1,
          answer: revealed && {
            text: answer.text,
            points: answer.points,
            scored: revealed.by !== null,
          },
        }
      }),
      activeTeam: turns.length === 1 ? turns[0]!.team : null,
      winner: round.winner,
      outcome: round.outcome,
      replay: round.replay,
      tie: isTieAfterLastRound(state),
    },
    ranking: toRankingView(state),
    strikeSignal: state.strikeSignal,
    winner: state.winner,
  }
}

function toRankingView(state: GameState): BoardView['ranking'] {
  const ranking = state.ranking
  if (!ranking) return null
  const answers = ranking.question.answers
  return {
    label: 'Bonusové kolo – Zoraďovačka',
    question: state.showQuestion ? ranking.question.text : null,
    answers: ranking.displayOrder.map((rank) => ({
      text: answers[rank - 1]!.text,
      placed: ranking.revealed[rank - 1] !== null,
    })),
    slots: ranking.revealed.map((revealed, i) => ({
      rank: i + 1,
      answer: revealed && {
        text: answers[i]!.text,
        points: answers[i]!.points,
        scored: revealed.counted,
      },
    })),
    target: rankingTarget(ranking),
    bank: ranking.bank,
    activeTeam: ranking.control,
    winner: ranking.winner,
  }
}
