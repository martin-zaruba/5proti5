/**
 * Which sounds the board plays for a change of the board view (T-009). Pure: the board compares
 * the previous and the next view, so sounds play only in the board window and never twice.
 */

import type { BoardSlot, BoardView } from '@/engine'

export type SoundCue =
  | 'buzz'
  | 'correct'
  | 'reveal'
  | 'strike'
  | 'duplicate'
  | 'zero'
  | 'roundWin'
  | 'victory'
  | 'timeUp'

const countSlots = (slots: BoardSlot[] | undefined, scored: boolean) =>
  (slots ?? []).filter((s) => s.answer && s.answer.scored === scored).length

/** Revealed final cells of one player with (or without) points. */
const finalCells = (view: BoardView, player: 'a' | 'b', points: boolean) =>
  (view.final?.rows ?? []).filter((row) => row[player] && row[player].points > 0 === points).length

/** Same question still on the board – otherwise a new round started and nothing is compared. */
const sameRound = (prev: BoardView, next: BoardView) =>
  prev.round !== null &&
  next.round !== null &&
  prev.round.number === next.round.number &&
  prev.round.question === next.round.question &&
  prev.round.replay === next.round.replay

export function soundCues(prev: BoardView | null, next: BoardView | null): SoundCue[] {
  if (!prev || !next) return []
  const cues: SoundCue[] = []

  if (
    next.phase === 'faceOff' &&
    prev.phase === 'faceOff' &&
    sameRound(prev, next) &&
    prev.round!.activeTeam === null &&
    next.round!.activeTeam !== null
  ) {
    cues.push('buzz')
  }

  if (sameRound(prev, next)) {
    // Scored = found by a team; not scored = shown by the host at the end of the round.
    if (countSlots(next.round!.slots, true) > countSlots(prev.round!.slots, true))
      cues.push('correct')
    else if (countSlots(next.round!.slots, false) > countSlots(prev.round!.slots, false)) {
      cues.push('reveal')
    }
  }

  // Zoraďovačka: a wrong guess only un-counts the streak, so compare placed answers.
  const placed = (v: BoardView) => v.ranking!.answers.filter((a) => a.placed).length
  if (prev.ranking && next.ranking && placed(next) > placed(prev)) cues.push('correct')

  if (prev.final && next.final) {
    // A's answers come back to the board while B's are revealed – only the current player's count.
    const player = next.final.step === 'playerA' ? 'a' : 'b'
    if (finalCells(next, player, true) > finalCells(prev, player, true)) cues.push('correct')
    if (finalCells(next, player, false) > finalCells(prev, player, false)) cues.push('zero')
    if (next.final.duplicateSignal > prev.final.duplicateSignal) cues.push('duplicate')
  }

  if (next.strikeSignal.seq > prev.strikeSignal.seq) cues.push('strike')

  const ended = (v: BoardView) => v.phase === 'roundEnd' || v.phase === 'rankingEnd'
  if (ended(next) && !ended(prev)) cues.push('roundWin')
  const bigPrize = (v: BoardView) => v.final?.prize?.kind === 'big'
  if (
    (next.phase === 'gameOver' && prev.phase !== 'gameOver') ||
    (bigPrize(next) && !bigPrize(prev))
  ) {
    cues.push('victory')
  }

  return cues
}
