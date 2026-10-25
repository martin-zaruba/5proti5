/**
 * Final „Veľké peniaze“ – docs/pravidla.md §6 (profile 2026), decisions OQ-06 and OQ-15.
 * Two players of the winning team answer the same 5 questions; an answer scores the survey points
 * if it is among the 6 most frequent ones. A + B ≥ 200 wins the big prize.
 * Time limits are shown to the host only – timers come with T-009.
 */

import { GameError, type TeamIndex } from './core'
import type { GameState } from './game'
import type { RuleProfile } from './profiles'
import { normalizeAnswerText, type Question } from './questions'

export type FinalStep = 'choosePlayers' | 'playerA' | 'playerB' | 'done'

export interface FinalEntry {
  /** What the player said (for the board). */
  text: string
  /** Matched survey answer, `null` = not among the most frequent → 0 points. */
  rank: number | null
  points: number
}

export interface FinalPrize {
  kind: 'big' | 'small' | 'none'
  euros: number
}

export interface FinalState {
  team: TeamIndex
  questions: Question[]
  /** Positions of player A and player B in the winning team. */
  positions: [number, number] | null
  step: FinalStep
  /** `answers[player][question]`, player 0 = A, 1 = B; `null` = no answer (passed / out of time). */
  answers: [(FinalEntry | null)[], (FinalEntry | null)[]]
  revealed: [boolean[], boolean[]]
  /** Team score after round 5 = „Malé peniaze“ (OQ-15). */
  teamScore: number
  prize: FinalPrize | null
  /** Incremented on every duplicate so the board can signal it. */
  duplicateSignal: number
}

type FinalConfig = NonNullable<RuleProfile['final']>

export const currentFinalPlayer = (final: FinalState): 0 | 1 => (final.step === 'playerB' ? 1 : 0)

/** Sum of A + B points (all recorded answers – the board shows only revealed ones). */
export function finalTotal(final: FinalState): number {
  return final.answers.flat().reduce((sum, entry) => sum + (entry?.points ?? 0), 0)
}

/** Prize bands (§6, 2026): ≥ target → big prize, ≥ smallMoneyFrom → team score in €, else nothing. */
export function finalPrize(total: number, teamScore: number, config: FinalConfig): FinalPrize {
  if (total >= config.target) return { kind: 'big', euros: config.bigPrize }
  if (total >= config.smallMoneyFrom) return { kind: 'small', euros: teamScore }
  return { kind: 'none', euros: 0 }
}

/** Short Slovak description of the prize for the host and the log. */
export function prizeLabel(prize: FinalPrize): string {
  if (prize.kind === 'big') return `Veľké peniaze ${prize.euros} €`
  if (prize.kind === 'small') return `Malé peniaze ${prize.euros} €`
  return 'bez výhry'
}

/** The final can be played when the profile has it and the set contains the right number of questions. */
export const canPlayFinal = (profile: RuleProfile, questions: Question[]) =>
  profile.final !== undefined && questions.length === profile.final.questionCount

export function startFinal(state: GameState, team: TeamIndex, questions: Question[]): GameState {
  const empty = () => questions.map(() => null)
  const hidden = () => questions.map(() => false)
  return {
    ...state,
    phase: 'final',
    round: null,
    winner: team,
    final: {
      team,
      questions,
      positions: null,
      step: 'choosePlayers',
      answers: [empty(), empty()],
      revealed: [hidden(), hidden()],
      teamScore: state.teams[team].score,
      prize: null,
      duplicateSignal: 0,
    },
  }
}

function requireFinal(state: GameState, steps: FinalStep[], message: string): FinalState {
  if (state.phase !== 'final' || !state.final || !steps.includes(state.final.step)) {
    throw new GameError(message)
  }
  return state.final
}

function requireQuestion(final: FinalState, question: number): Question {
  const q = final.questions[question]
  if (!q) throw new GameError(`Finálová otázka č. ${question + 1} neexistuje.`)
  return q
}

const withFinal = (state: GameState, final: FinalState): GameState => ({ ...state, final })

export function chooseFinalPlayers(state: GameState, positions: [number, number]): GameState {
  const final = requireFinal(state, ['choosePlayers'], 'Hráči finále sú už vybraní.')
  const size = state.teams[final.team].players.length
  const valid = (p: number) => Number.isInteger(p) && p >= 1 && p <= size
  if (!positions.every(valid) || positions[0] === positions[1]) {
    throw new GameError('Vyber dvoch rôznych hráčov víťazného družstva.')
  }
  return withFinal(state, { ...final, positions, step: 'playerA' })
}

/** Records the answer of the current player; it can be corrected until it is revealed. */
export function recordFinalAnswer(
  state: GameState,
  question: number,
  text: string,
  rank: number | null,
): GameState {
  const final = requireFinal(state, ['playerA', 'playerB'], 'Teraz sa vo finále neodpovedá.')
  const q = requireQuestion(final, question)
  const player = currentFinalPlayer(final)
  if (final.revealed[player][question]) {
    throw new GameError(`Odpoveď na otázku č. ${question + 1} je už odkrytá.`)
  }
  if (rank !== null && !q.answers[rank - 1]) {
    throw new GameError(`Odpoveď č. ${rank} v prieskume k tejto otázke nie je.`)
  }
  const said = text.trim() || (rank === null ? '' : q.answers[rank - 1]!.text)
  if (said === '') throw new GameError('Zadaj, čo hráč povedal.')

  // §6: B repeating A's answer → duplicate signal, no points, B must answer again.
  const a = final.answers[0][question]
  if (
    player === 1 &&
    a &&
    (rank !== null ? a.rank === rank : normalizeAnswerText(a.text) === normalizeAnswerText(said))
  ) {
    return duplicate(state, final, question)
  }

  const entry: FinalEntry = {
    text: said,
    rank,
    points: rank === null ? 0 : q.answers[rank - 1]!.points,
  }
  const answers = [...final.answers] as FinalState['answers']
  answers[player] = answers[player].map((e, i) => (i === question ? entry : e))
  return withFinal(state, { ...final, answers })
}

/** Host marks a duplicate the engine could not detect (e.g. the same meaning, different words). */
export function markFinalDuplicate(state: GameState, question: number): GameState {
  const final = requireFinal(state, ['playerB'], 'Duplicita je možná len u druhého hráča.')
  requireQuestion(final, question)
  if (!final.answers[0][question]) {
    throw new GameError(
      `Prvý hráč na otázku č. ${question + 1} neodpovedal – nemôže ísť o duplicitu.`,
    )
  }
  if (final.revealed[1][question]) {
    throw new GameError(`Odpoveď na otázku č. ${question + 1} je už odkrytá.`)
  }
  return duplicate(state, final, question)
}

function duplicate(state: GameState, final: FinalState, question: number): GameState {
  const answers: FinalState['answers'] = [
    final.answers[0],
    final.answers[1].map((e, i) => (i === question ? null : e)),
  ]
  return withFinal(state, { ...final, answers, duplicateSignal: final.duplicateSignal + 1 })
}

/** Reveals the current player's answer (or the empty row) on the board. */
export function revealFinalAnswer(
  state: GameState,
  question: number,
  profile: RuleProfile,
): GameState {
  const final = requireFinal(state, ['playerA', 'playerB'], 'Teraz sa vo finále nič neodkrýva.')
  requireQuestion(final, question)
  const player = currentFinalPlayer(final)
  if (final.revealed[player][question]) {
    throw new GameError(`Odpoveď na otázku č. ${question + 1} je už odkrytá.`)
  }
  const revealed = [...final.revealed] as FinalState['revealed']
  revealed[player] = revealed[player].map((r, i) => r || i === question)
  const next: FinalState = { ...final, revealed }
  if (player === 0 || !revealed[1].every(Boolean)) return withFinal(state, next)

  // All of B's answers are on the board – the final is decided.
  const prize = finalPrize(finalTotal(next), next.teamScore, profile.final!)
  return withFinal(state, { ...next, step: 'done', prize })
}

/** Player A has finished and all answers were shown – player B comes in, A's answers leave the board. */
export function finalNextPlayer(state: GameState): GameState {
  const final = requireFinal(state, ['playerA'], 'Druhý hráč nastupuje po prvom hráčovi.')
  if (!final.revealed[0].every(Boolean)) {
    throw new GameError('Najprv odkry všetky odpovede prvého hráča.')
  }
  return withFinal(state, { ...final, step: 'playerB' })
}
