/**
 * Game engine – docs/pravidla.md §3, §5 and §8 here, Zoraďovačka (§4) in `ranking.ts`.
 * Pure logic: `gameReducer(state, action, questionSet) → newState`, no Vue/DOM.
 * Invalid actions throw `GameError` with a message for the host (in Slovak).
 */

import {
  addScore,
  GameError,
  nextSignal,
  otherTeam,
  requireProfile,
  type Team,
  type TeamIndex,
} from './core'
import type { RuleProfile, RuleProfileId } from './profiles'
import type { Question, QuestionSet } from './questions'
import {
  chooseStartingTeam,
  rankingGuess,
  rankingMiss,
  startRanking,
  type RankingState,
} from './ranking'

export { GameError, otherTeam, requireProfile, type Team, type TeamIndex } from './core'

export type Phase =
  'intro' | 'faceOff' | 'play' | 'steal' | 'roundEnd' | 'ranking' | 'rankingEnd' | 'gameOver'

export interface RevealedAnswer {
  /** Team that found the answer; `null` = revealed by the host without points. */
  by: TeamIndex | null
  /** Points added to the round bank for this answer (already multiplied). */
  points: number
}

export interface FaceOffAttempt {
  team: TeamIndex
  position: number
  /** Rank hit by the answer, `null` = miss. */
  rank: number | null
}

export type RoundOutcome = 'cleared' | 'stolen' | 'stealFailed'

export interface RoundState {
  /** Index into `profile.standardRounds`. */
  index: number
  number: number
  multiplier: number
  stealIncludesAnswer: boolean
  question: Question
  /** Indexed by rank − 1; `null` = still hidden. */
  revealed: (RevealedAnswer | null)[]
  bank: number
  strikes: number
  /** Team whose player pressed the buzzer first. */
  buzzed: TeamIndex | null
  attempts: FaceOffAttempt[]
  control: TeamIndex | null
  /** Position of the controlling team's player who answers next. */
  turnPosition: number | null
  winner: TeamIndex | null
  outcome: RoundOutcome | null
  /** Scores before this question – restored when the question is voided (§8). */
  scoreBefore: [number, number]
  /** Why this question replaced another one. */
  replay: 'void' | 'noHit' | 'tie' | null
}

export interface GameState {
  profileId: RuleProfileId
  teams: [Team, Team]
  phase: Phase
  /** Current standard round; `null` before the game and during Zoraďovačka. */
  round: RoundState | null
  ranking: RankingState | null
  /** How many reserve questions from the set were already used. */
  reserveUsed: number
  /** Whether the board shows the question text. */
  showQuestion: boolean
  /** Incremented on every miss so the board can flash `count` big X marks. */
  strikeSignal: { seq: number; count: number }
  winner: TeamIndex | null
}

export type GameAction =
  | { type: 'nextRound' }
  | { type: 'buzz'; team: TeamIndex }
  | { type: 'revealAnswer'; rank: number }
  | { type: 'wrongAnswer' }
  | { type: 'timeout' }
  | { type: 'penaltyConferring' }
  | { type: 'revealRemaining' }
  | { type: 'voidQuestion' }
  | { type: 'adjustScore'; team: TeamIndex; delta: number }
  | { type: 'setShowQuestion'; show: boolean }
  | { type: 'chooseStartingTeam'; team: TeamIndex }
  | { type: 'rankingGuess'; rank: number }

export const MAX_STRIKES = 3

export interface TeamSetup {
  name: string
  players: string[]
}

export function createGame(teams: [TeamSetup, TeamSetup], questionSet: QuestionSet): GameState {
  const profile = requireProfile(questionSet.ruleProfile)
  if (questionSet.rounds.length !== profile.standardRounds.length) {
    throw new GameError(`Sada otázok musí mať ${profile.standardRounds.length} bežných kôl.`)
  }
  const toTeam = (setup: TeamSetup, i: number): Team => {
    const name = setup.name.trim() || `Družstvo ${i + 1}`
    if (setup.players.length !== profile.teamSize) {
      throw new GameError(`Družstvo „${name}“ musí mať ${profile.teamSize} hráčov.`)
    }
    return {
      name,
      players: setup.players.map((p, pos) => p.trim() || `Hráč ${pos + 1}`),
      score: 0,
    }
  }
  return {
    profileId: profile.id,
    teams: [toTeam(teams[0], 0), toTeam(teams[1], 1)],
    phase: 'intro',
    round: null,
    ranking: null,
    reserveUsed: 0,
    showQuestion: true,
    strikeSignal: { seq: 0, count: 0 },
    winner: null,
  }
}

/* ---------- queries (also used by the UI) ---------- */

export interface Turn {
  team: TeamIndex
  position: number
}

const nextPosition = (position: number, profile: RuleProfile) => (position % profile.teamSize) + 1

/** Who answers next in the face-off (§3.1, OQ-13): pairs from position N, buzzing team first. */
function nextFaceOffTurn(round: RoundState): Turn | null {
  if (round.buzzed === null) return null
  const pair = Math.floor(round.attempts.length / 2)
  const first = round.attempts.length % 2 === 0
  return {
    team: first ? round.buzzed : otherTeam(round.buzzed),
    position: round.number + pair,
  }
}

/** Players who are expected to answer now (two players at the buzzer before anyone buzzes). */
export function currentTurns(state: GameState): Turn[] {
  const ranking = state.ranking
  if (state.phase === 'ranking' && ranking?.control != null) {
    return [{ team: ranking.control, position: ranking.turnPosition! }]
  }
  const round = state.round
  if (!round) return []
  switch (state.phase) {
    case 'faceOff': {
      const turn = nextFaceOffTurn(round)
      return turn
        ? [turn]
        : [
            { team: 0, position: round.number },
            { team: 1, position: round.number },
          ]
    }
    case 'play':
      return [{ team: round.control!, position: round.turnPosition! }]
    case 'steal':
      return [
        {
          team: otherTeam(round.control!),
          position: requireProfile(state.profileId).captainPosition,
        },
      ]
    default:
      return []
  }
}

export const isLastRound = (state: GameState, round: RoundState) =>
  round.index === requireProfile(state.profileId).standardRounds.length - 1

/** Zoraďovačka follows this round (profile has it and the question set contains its question). */
export const leadsToRanking = (state: GameState, round: RoundState, questionSet: QuestionSet) =>
  requireProfile(state.profileId).ranking?.afterRound === round.number &&
  questionSet.ranking !== undefined

/** Round 5 ended with equal scores → it will be voided and replayed (§5). */
export const isTieAfterLastRound = (state: GameState) =>
  state.phase === 'roundEnd' &&
  state.round !== null &&
  isLastRound(state, state.round) &&
  state.teams[0].score === state.teams[1].score

/* ---------- reducer ---------- */

export function gameReducer(
  state: GameState,
  action: GameAction,
  questionSet: QuestionSet,
): GameState {
  const profile = requireProfile(state.profileId)
  switch (action.type) {
    case 'nextRound':
      return nextRound(state, profile, questionSet)
    case 'buzz':
      return buzz(state, action.team)
    case 'revealAnswer':
      return revealAnswer(state, action.rank, profile, questionSet)
    case 'wrongAnswer':
    case 'timeout':
      return state.phase === 'ranking'
        ? rankingMiss(state, profile)
        : miss(state, profile, questionSet)
    case 'chooseStartingTeam':
      return chooseStartingTeam(state, action.team, profile)
    case 'rankingGuess':
      return rankingGuess(state, action.rank, profile)
    case 'penaltyConferring': {
      const round = requireRound(
        state,
        ['play'],
        'Penalizovať sa dá len počas hry družstva s kontrolou.',
      )
      return {
        ...state,
        phase: 'steal',
        round: { ...round, strikes: MAX_STRIKES },
        strikeSignal: signal(state, MAX_STRIKES),
      }
    }
    case 'revealRemaining': {
      const round = requireRound(
        state,
        ['roundEnd'],
        'Zvyšné odpovede sa odkrývajú až na konci kola.',
      )
      return {
        ...state,
        round: { ...round, revealed: round.revealed.map((r) => r ?? { by: null, points: 0 }) },
      }
    }
    case 'voidQuestion': {
      if (state.phase === 'ranking' || state.phase === 'rankingEnd') {
        throw new GameError('Zoraďovačka nemá náhradnú otázku – chybu oprav tlačidlom Späť.')
      }
      const round = requireRound(
        state,
        ['faceOff', 'play', 'steal', 'roundEnd'],
        'Anulovať sa dá len otázka práve hraného kola.',
      )
      return replayRound(state, round, questionSet, 'void')
    }
    case 'adjustScore': {
      if (!Number.isInteger(action.delta) || action.delta === 0) {
        throw new GameError('Korekcia skóre musí byť nenulové celé číslo.')
      }
      return { ...state, teams: addScore(state.teams, action.team, action.delta) }
    }
    case 'setShowQuestion':
      return { ...state, showQuestion: action.show }
  }
}

function requireRound(state: GameState, phases: Phase[], message: string): RoundState {
  if (!state.round || !phases.includes(state.phase)) throw new GameError(message)
  return state.round
}

const signal = (state: GameState, count: number) => nextSignal(state.strikeSignal, count)

function startRound(
  state: GameState,
  index: number,
  question: Question,
  profile: RuleProfile,
  replay: RoundState['replay'],
  scoreBefore: [number, number] = [state.teams[0].score, state.teams[1].score],
): GameState {
  const def = profile.standardRounds[index]!
  return {
    ...state,
    phase: 'faceOff',
    round: {
      index,
      number: def.number,
      multiplier: def.multiplier,
      stealIncludesAnswer: def.stealIncludesAnswer,
      question,
      revealed: question.answers.map(() => null),
      bank: 0,
      strikes: 0,
      buzzed: null,
      attempts: [],
      control: null,
      turnPosition: null,
      winner: null,
      outcome: null,
      scoreBefore,
      replay,
    },
  }
}

function takeReserve(state: GameState, questionSet: QuestionSet, reason: string) {
  const question = questionSet.reserve[state.reserveUsed]
  if (!question) throw new GameError(`${reason} Došli však rezervné otázky – doplň ich do sady.`)
  return { question, reserveUsed: state.reserveUsed + 1 }
}

/** Voids the current question (incl. its points) and replays the same round with a reserve question. */
function replayRound(
  state: GameState,
  round: RoundState,
  questionSet: QuestionSet,
  reason: 'void' | 'noHit' | 'tie',
): GameState {
  const messages = {
    void: 'Otázku treba nahradiť novou.',
    noHit: 'V súboji nikto netrafil – otázka sa anuluje.',
    tie: 'Po 5. kole je remíza – kolo sa opakuje.',
  }
  const { question, reserveUsed } = takeReserve(state, questionSet, messages[reason])
  const teams: [Team, Team] = [
    { ...state.teams[0], score: round.scoreBefore[0] },
    { ...state.teams[1], score: round.scoreBefore[1] },
  ]
  const profile = requireProfile(state.profileId)
  return startRound(
    { ...state, teams, reserveUsed },
    round.index,
    question,
    profile,
    reason,
    round.scoreBefore,
  )
}

function nextRound(state: GameState, profile: RuleProfile, questionSet: QuestionSet): GameState {
  if (state.phase === 'intro') {
    return startRound(state, 0, questionSet.rounds[0]!, profile, null)
  }
  if (state.phase === 'rankingEnd') {
    // Round numbers are 1-based, so the index of the round after Zoraďovačka equals `afterRound`.
    const index = profile.ranking!.afterRound
    return startRound({ ...state, ranking: null }, index, questionSet.rounds[index]!, profile, null)
  }
  const round = requireRound(state, ['roundEnd'], 'Ďalšie kolo sa dá spustiť až po skončení kola.')
  if (leadsToRanking(state, round, questionSet)) {
    return startRanking(state, questionSet.ranking!, profile)
  }
  if (!isLastRound(state, round)) {
    const index = round.index + 1
    return startRound(state, index, questionSet.rounds[index]!, profile, null)
  }
  if (isTieAfterLastRound(state)) return replayRound(state, round, questionSet, 'tie')
  const winner: TeamIndex = state.teams[0].score > state.teams[1].score ? 0 : 1
  return { ...state, phase: 'gameOver', winner }
}

function buzz(state: GameState, team: TeamIndex): GameState {
  const round = requireRound(state, ['faceOff'], 'Tlačidlo sa stláča len v súboji pri pulte.')
  if (round.buzzed !== null) throw new GameError('Tlačidlo už niekto stlačil.')
  return { ...state, round: { ...round, buzzed: team } }
}

function requireHiddenRank(round: RoundState, rank: number) {
  const answer = round.question.answers[rank - 1]
  if (!answer) throw new GameError(`Odpoveď č. ${rank} na tabuli nie je.`)
  if (round.revealed[rank - 1]) throw new GameError(`Odpoveď č. ${rank} je už odkrytá.`)
  return answer
}

function reveal(round: RoundState, rank: number, by: TeamIndex | null, points: number): RoundState {
  const revealed = [...round.revealed]
  revealed[rank - 1] = { by, points }
  return { ...round, revealed, bank: round.bank + points }
}

const allRevealed = (round: RoundState) => round.revealed.every((r) => r !== null)

function finishRound(
  state: GameState,
  round: RoundState,
  winner: TeamIndex,
  outcome: RoundOutcome,
): GameState {
  const teams = addScore(state.teams, winner, round.bank)
  return { ...state, teams, phase: 'roundEnd', round: { ...round, winner, outcome } }
}

function revealAnswer(
  state: GameState,
  rank: number,
  profile: RuleProfile,
  questionSet: QuestionSet,
): GameState {
  const round = state.round
  if (state.phase === 'ranking' || state.phase === 'rankingEnd') {
    throw new GameError('V Zoraďovačke sa odpoveď zaraďuje ako tip družstva, nie odkrytím.')
  }
  if (!round || state.phase === 'intro' || state.phase === 'gameOver') {
    throw new GameError('Teraz sa nedá odkryť žiadna odpoveď.')
  }
  const answer = requireHiddenRank(round, rank)
  const points = answer.points * round.multiplier

  switch (state.phase) {
    case 'faceOff':
      return faceOffAttempt(state, round, rank, profile, questionSet)
    case 'play': {
      const control = round.control!
      const next = {
        ...reveal(round, rank, control, points),
        turnPosition: nextPosition(round.turnPosition!, profile),
      }
      return allRevealed(next)
        ? finishRound(state, next, control, 'cleared')
        : { ...state, round: next }
    }
    case 'steal': {
      // §3.3: the stealing team gets the bank but not its own answer – except in round 5.
      const thief = otherTeam(round.control!)
      const next = reveal(round, rank, thief, round.stealIncludesAnswer ? points : 0)
      return finishRound(state, next, thief, 'stolen')
    }
    case 'roundEnd':
      // §3.4: presentation reveal of a remaining answer, no points.
      return { ...state, round: reveal(round, rank, null, 0) }
  }
}

function miss(state: GameState, profile: RuleProfile, questionSet: QuestionSet): GameState {
  const round = requireRound(state, ['faceOff', 'play', 'steal'], 'Teraz nikto neodpovedá.')
  switch (state.phase) {
    case 'faceOff':
      return faceOffAttempt(
        { ...state, strikeSignal: signal(state, 1) },
        round,
        null,
        profile,
        questionSet,
      )
    case 'play': {
      const strikes = round.strikes + 1
      return {
        ...state,
        phase: strikes >= MAX_STRIKES ? 'steal' : 'play',
        round: { ...round, strikes, turnPosition: nextPosition(round.turnPosition!, profile) },
        strikeSignal: signal(state, strikes),
      }
    }
    default:
      // Failed steal – the bank stays with the team in control (§3.3).
      return finishRound(
        { ...state, strikeSignal: signal(state, 1) },
        round,
        round.control!,
        'stealFailed',
      )
  }
}

/** Face-off resolution – §3.1 and OQ-13. */
function faceOffAttempt(
  state: GameState,
  round: RoundState,
  rank: number | null,
  profile: RuleProfile,
  questionSet: QuestionSet,
): GameState {
  const turn = nextFaceOffTurn(round)
  if (!turn) throw new GameError('Najprv zaznač, ktoré družstvo stlačilo tlačidlo prvé.')

  let next: RoundState = { ...round, attempts: [...round.attempts, { ...turn, rank }] }
  if (rank !== null) {
    const points = round.question.answers[rank - 1]!.points * round.multiplier
    next = reveal(next, rank, turn.team, points)
  }

  const gainControl = (team: TeamIndex, position: number): GameState => {
    const controlled: RoundState = {
      ...next,
      control: team,
      turnPosition: nextPosition(position, profile),
    }
    return allRevealed(controlled)
      ? finishRound(state, controlled, team, 'cleared')
      : { ...state, phase: 'play', round: controlled }
  }

  const isFirstOfPair = next.attempts.length % 2 === 1
  if (isFirstOfPair) {
    // TOP answer ends the face-off immediately.
    return rank === 1 ? gainControl(turn.team, turn.position) : { ...state, round: next }
  }

  const first = next.attempts[next.attempts.length - 2]!
  const hits = [first, { ...turn, rank }].filter((a) => a.rank !== null)
  if (hits.length > 0) {
    const best = hits.reduce((a, b) => (b.rank! < a.rank! ? b : a))
    return gainControl(best.team, best.position)
  }
  if (turn.position >= profile.teamSize) {
    return replayRound(state, next, questionSet, 'noHit')
  }
  return { ...state, round: next }
}
