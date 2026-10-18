/**
 * Game session = engine state + undo history + event log (docs/pravidla.md §8, T-004).
 * The question set lives here (not in every history entry) to keep persisted history small.
 */

import { gameReducer, isTieAfterLastRound, type GameAction, type GameState } from './game'
import type { QuestionSet } from './questions'

export interface LogEntry {
  /** ISO timestamp. */
  at: string
  text: string
}

export interface HistoryEntry {
  state: GameState
  /** Log text of the action that left this state – shown when it is undone. */
  label: string
}

export interface GameSession {
  questionSet: QuestionSet
  state: GameState
  past: HistoryEntry[]
  log: LogEntry[]
}

export const HISTORY_LIMIT = 200

export function createSession(
  questionSet: QuestionSet,
  state: GameState,
  now = new Date(),
): GameSession {
  const names = state.teams.map((t) => t.name).join(' vs. ')
  return {
    questionSet,
    state,
    past: [],
    log: [{ at: now.toISOString(), text: `Nová hra: ${names} (sada „${questionSet.name}“)` }],
  }
}

/** Applies an action; throws `GameError` if it is not allowed (the session is left untouched). */
export function dispatch(session: GameSession, action: GameAction, now = new Date()): GameSession {
  const before = session.state
  const after = gameReducer(before, action, session.questionSet)
  const label = describeAction(before, action, after)
  return {
    ...session,
    state: after,
    past: [...session.past, { state: before, label }].slice(-HISTORY_LIMIT),
    log: [...session.log, { at: now.toISOString(), text: label }],
  }
}

export const canUndo = (session: GameSession) => session.past.length > 0

/** Restores the state before the last action. The log keeps the undone entry and records the undo. */
export function undo(session: GameSession, now = new Date()): GameSession {
  const last = session.past[session.past.length - 1]
  if (!last) return session
  return {
    ...session,
    state: last.state,
    past: session.past.slice(0, -1),
    log: [...session.log, { at: now.toISOString(), text: `↶ Vrátené: ${last.label}` }],
  }
}

/* ---------- human readable log ---------- */

const pts = (n: number) => `${n} b.`

export function describeAction(before: GameState, action: GameAction, after: GameState): string {
  const team = (i: 0 | 1) => after.teams[i].name
  const round = after.round
  const parts: string[] = []

  switch (action.type) {
    case 'nextRound':
      if (after.phase === 'gameOver') {
        parts.push(`Koniec hry – vyhráva ${team(after.winner!)}`)
      } else if (round?.replay === 'tie') {
        parts.push(
          `Remíza po ${round.number}. kole – kolo sa anuluje a hrá sa znova s novou otázkou`,
        )
      } else if (round) {
        parts.push(`${round.number}. kolo (×${round.multiplier}): ${round.question.text}`)
      }
      break
    case 'buzz':
      parts.push(`Tlačidlo prvé stlačilo družstvo ${team(action.team)}`)
      break
    case 'revealAnswer': {
      const answer = after.round?.question.answers[action.rank - 1]
      const revealed = after.round?.revealed[action.rank - 1]
      const scored =
        revealed && revealed.points > 0 ? ` (+${pts(revealed.points)})` : ' (bez bodov)'
      parts.push(`Odkrytá odpoveď č. ${action.rank} „${answer?.text}“${scored}`)
      break
    }
    case 'wrongAnswer':
    case 'timeout': {
      const reason = action.type === 'timeout' ? 'čas vypršal' : 'nesprávna odpoveď'
      parts.push(
        before.phase === 'play' && round ? `X – ${reason} (${round.strikes}. X)` : `X – ${reason}`,
      )
      break
    }
    case 'penaltyConferring':
      parts.push('Penalizácia za radenie sa – družstvo stráca všetky životy')
      break
    case 'revealRemaining':
      parts.push('Odkryté zvyšné odpovede (bez bodov)')
      break
    case 'voidQuestion':
      parts.push(
        `Otázka anulovaná, skóre vrátené na ${after.teams[0].score} : ${after.teams[1].score}; nová otázka: ${round?.question.text}`,
      )
      break
    case 'adjustScore':
      parts.push(
        `Ručná korekcia: ${team(action.team)} ${action.delta > 0 ? '+' : ''}${action.delta} → ${pts(after.teams[action.team].score)}`,
      )
      break
    case 'setShowQuestion':
      parts.push(action.show ? 'Otázka sa zobrazuje na tabuli' : 'Otázka je na tabuli skrytá')
      break
  }

  // Consequences of the action that the host should see in the log.
  if (
    !round ||
    before.round === round ||
    action.type === 'nextRound' ||
    action.type === 'voidQuestion'
  ) {
    return parts.join('; ')
  }
  const isMiss = action.type === 'wrongAnswer' || action.type === 'timeout'
  if (
    before.phase === 'faceOff' &&
    after.phase === 'faceOff' &&
    isMiss &&
    round.attempts.length === 0
  ) {
    parts.push(
      `nikto netrafil ani po kapitánov – otázka sa anuluje, nová otázka: ${round.question.text}`,
    )
  }
  if (before.phase === 'faceOff' && after.phase !== 'faceOff') {
    parts.push(`kontrolu získava ${team(round.control!)}`)
  }
  if (before.phase !== 'steal' && after.phase === 'steal') {
    parts.push(`krádež – odpovedá kapitán družstva ${team(round.control === 0 ? 1 : 0)}`)
  }
  if (before.phase !== 'roundEnd' && after.phase === 'roundEnd') {
    const outcomes = {
      cleared: 'všetky odpovede odkryté',
      stolen: 'krádež úspešná',
      stealFailed: 'krádež neúspešná',
    }
    parts.push(
      `${outcomes[round.outcome!]} – bank ${pts(round.bank)} získava ${team(round.winner!)}`,
    )
    if (isTieAfterLastRound(after)) parts.push('remíza – 5. kolo sa bude opakovať')
  }
  return parts.join('; ')
}
