/** Which time limit applies right now (docs/pravidla.md §1 and §6). The countdown itself lives in the UI. */

import { requireProfile } from './core'
import type { GameState } from './game'

export interface TimeLimit {
  kind: 'answer' | 'final'
  seconds: number
  /** Changes whenever a different limit starts to apply (the UI then prepares a fresh timer). */
  key: string
}

export function timeLimit(state: GameState): TimeLimit | null {
  const profile = requireProfile(state.profileId)
  const final = state.final
  if (state.phase === 'final' && final && profile.final) {
    if (final.step !== 'playerA' && final.step !== 'playerB') return null
    const player = final.step === 'playerB' ? 1 : 0
    return { kind: 'final', seconds: profile.final.timeLimits[player], key: `final-${final.step}` }
  }
  const answering =
    (state.phase === 'faceOff' && state.round?.buzzed !== null) ||
    state.phase === 'play' ||
    state.phase === 'steal' ||
    (state.phase === 'ranking' && state.ranking?.control !== null)
  return answering ? { kind: 'answer', seconds: profile.answerTimeLimit, key: 'answer' } : null
}
