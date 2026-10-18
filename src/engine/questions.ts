/** Question set data model and validation – see tasks/done/T-002 and docs/poziadavky.md §4. */

import { getProfile, type RuleProfile, type RuleProfileId } from './profiles'

export type QuestionType = 'standard' | 'ranking' | 'final' | 'oneOnOne'

export interface Answer {
  text: string
  /** Number of respondents (out of 100) who gave this answer. */
  points: number
  /** Synonyms that help the host find the answer quickly. */
  aliases?: string[]
}

export interface Question {
  type: QuestionType
  text: string
  /** Ordered by rank: answers[0] is rank 1 (the most frequent). */
  answers: Answer[]
}

export interface QuestionSet {
  name: string
  ruleProfile: RuleProfileId
  /** Standard rounds 1–5 in order. */
  rounds: Question[]
  ranking?: Question
  final: Question[]
  /** Standard questions used when a question is voided or round 5 ends in a tie. */
  reserve: Question[]
}

export interface ValidationIssue {
  severity: 'error' | 'warning'
  /** Location in the set, e.g. `rounds[2].answers[1]`. */
  path: string
  message: string
}

const ANSWER_LIMITS: Record<Exclude<QuestionType, 'standard'>, { min: number; max: number }> = {
  ranking: { min: 3, max: 10 },
  final: { min: 1, max: 6 },
  oneOnOne: { min: 3, max: 6 },
}

const FINAL_QUESTION_COUNT = 5

export function normalizeAnswerText(text: string): string {
  return text.trim().toLocaleLowerCase('sk')
}

function answerLimits(type: QuestionType, profile: RuleProfile) {
  return type === 'standard' ? profile.answersPerQuestion : ANSWER_LIMITS[type]
}

/** Validates a single question that already has the correct shape. */
export function validateQuestion(
  question: Question,
  profile: RuleProfile,
  path = 'question',
): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const error = (p: string, message: string) => issues.push({ severity: 'error', path: p, message })

  if (question.text.trim() === '') error(`${path}.text`, 'Otázka nemá text.')

  const { min, max } = answerLimits(question.type, profile)
  const count = question.answers.length
  if (count < min || count > max) {
    error(`${path}.answers`, `Počet odpovedí má byť ${min}–${max}, je ${count}.`)
  }

  const seen = new Map<string, number>()
  let sum = 0
  question.answers.forEach((answer, i) => {
    const p = `${path}.answers[${i}]`
    if (answer.text.trim() === '') error(`${p}.text`, `Odpoveď č. ${i + 1} nemá text.`)
    if (!Number.isInteger(answer.points) || answer.points < 1 || answer.points > 100) {
      error(`${p}.points`, `Body odpovede „${answer.text}“ musia byť celé číslo 1–100.`)
    }
    sum += answer.points

    const previous = question.answers[i - 1]
    if (previous) {
      const strict = question.type === 'ranking'
      if (strict ? answer.points >= previous.points : answer.points > previous.points) {
        error(
          `${p}.points`,
          strict
            ? `V Zoraďovačke musia mať odpovede rôzny počet bodov zoradený zostupne („${previous.text}“ ${previous.points} → „${answer.text}“ ${answer.points}).`
            : `Odpovede musia byť zoradené podľa bodov zostupne („${previous.text}“ ${previous.points} → „${answer.text}“ ${answer.points}).`,
        )
      }
    }

    for (const variant of [answer.text, ...(answer.aliases ?? [])]) {
      const key = normalizeAnswerText(variant)
      if (key === '') continue
      const other = seen.get(key)
      if (other !== undefined && other !== i) {
        error(`${p}.text`, `Text „${variant}“ sa opakuje (aj pri odpovedi č. ${other + 1}).`)
      } else {
        seen.set(key, i)
      }
    }
  })
  if (sum > 100) error(`${path}.answers`, `Súčet bodov je ${sum}, môže byť najviac 100.`)

  return issues
}

/* ---------- parsing of untrusted JSON ---------- */

type Obj = Record<string, unknown>

const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v)

function parseQuestion(
  raw: unknown,
  type: QuestionType,
  path: string,
  issues: ValidationIssue[],
): Question | undefined {
  const error = (p: string, message: string) => issues.push({ severity: 'error', path: p, message })
  if (!isObj(raw)) {
    error(path, 'Otázka musí byť objekt.')
    return undefined
  }
  if (raw.type !== undefined && raw.type !== type) {
    error(
      `${path}.type`,
      `Na tomto mieste sa očakáva otázka typu „${type}“, nie „${String(raw.type)}“.`,
    )
  }
  if (typeof raw.text !== 'string') error(`${path}.text`, 'Text otázky musí byť reťazec.')
  if (!Array.isArray(raw.answers)) {
    error(`${path}.answers`, 'Odpovede musia byť pole.')
    return undefined
  }
  const answers: Answer[] = []
  raw.answers.forEach((a, i) => {
    const p = `${path}.answers[${i}]`
    if (!isObj(a) || typeof a.text !== 'string' || typeof a.points !== 'number') {
      error(p, 'Odpoveď musí mať `text` (reťazec) a `points` (číslo).')
      return
    }
    const answer: Answer = { text: a.text, points: a.points }
    if (a.aliases !== undefined) {
      if (Array.isArray(a.aliases) && a.aliases.every((x) => typeof x === 'string')) {
        answer.aliases = a.aliases
      } else {
        error(`${p}.aliases`, 'Synonymá (`aliases`) musia byť pole reťazcov.')
      }
    }
    answers.push(answer)
  })
  return { type, text: typeof raw.text === 'string' ? raw.text : '', answers }
}

function parseQuestionList(
  raw: unknown,
  type: QuestionType,
  path: string,
  issues: ValidationIssue[],
): Question[] {
  if (raw === undefined) return []
  if (!Array.isArray(raw)) {
    issues.push({ severity: 'error', path, message: 'Musí to byť pole otázok.' })
    return []
  }
  return raw.flatMap((q, i) => parseQuestion(q, type, `${path}[${i}]`, issues) ?? [])
}

export interface ParseResult {
  /** Present when there are no errors (warnings are allowed). */
  set?: QuestionSet
  issues: ValidationIssue[]
}

/** Parses and validates a question set loaded from JSON. */
export function parseQuestionSet(raw: unknown): ParseResult {
  const issues: ValidationIssue[] = []
  const error = (path: string, message: string) => issues.push({ severity: 'error', path, message })
  const warn = (path: string, message: string) =>
    issues.push({ severity: 'warning', path, message })

  if (!isObj(raw)) {
    error('', 'Sada otázok musí byť JSON objekt.')
    return { issues }
  }

  const profileId = raw.ruleProfile ?? '2026'
  const profile = profileId === '2026' || profileId === '2022' ? getProfile(profileId) : undefined
  if (!profile) {
    error(
      'ruleProfile',
      `Profil pravidiel „${String(profileId)}“ nie je podporovaný (podporovaný je „2026“).`,
    )
    return { issues }
  }

  const name = typeof raw.name === 'string' ? raw.name.trim() : ''
  if (name === '') error('name', 'Sada nemá názov.')

  const rounds = parseQuestionList(raw.rounds, 'standard', 'rounds', issues)
  const expectedRounds = profile.standardRounds.length
  if (!Array.isArray(raw.rounds) || raw.rounds.length !== expectedRounds) {
    error('rounds', `Sada musí mať presne ${expectedRounds} otázok pre bežné kolá.`)
  }

  const ranking =
    raw.ranking === undefined ? undefined : parseQuestion(raw.ranking, 'ranking', 'ranking', issues)
  if (raw.ranking === undefined) warn('ranking', 'Chýba otázka pre Zoraďovačku.')

  const final = parseQuestionList(raw.final, 'final', 'final', issues)
  if (final.length !== FINAL_QUESTION_COUNT) {
    warn('final', `Finále potrebuje ${FINAL_QUESTION_COUNT} otázok, sada ich má ${final.length}.`)
  }

  const reserve = parseQuestionList(raw.reserve, 'standard', 'reserve', issues)
  if (reserve.length === 0) {
    warn(
      'reserve',
      'Sada nemá rezervné otázky – nebude sa dať anulovať otázka ani rozhodnúť remízu.',
    )
  }

  rounds.forEach((q, i) => issues.push(...validateQuestion(q, profile, `rounds[${i}]`)))
  if (ranking) issues.push(...validateQuestion(ranking, profile, 'ranking'))
  final.forEach((q, i) => issues.push(...validateQuestion(q, profile, `final[${i}]`)))
  reserve.forEach((q, i) => issues.push(...validateQuestion(q, profile, `reserve[${i}]`)))

  if (issues.some((i) => i.severity === 'error')) return { issues }
  return {
    set: { name, ruleProfile: profile.id, rounds, ranking, final, reserve },
    issues,
  }
}
