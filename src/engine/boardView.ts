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
    strikeSignal: state.strikeSignal,
    winner: state.winner,
  }
}
