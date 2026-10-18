/**
 * Editable question sets (T-011). A draft has the shape of `QuestionSet` but may break the rules
 * (empty texts, wrong counts …) – the editor shows `parseQuestionSet` issues until it is valid.
 */

import type { Answer, Question, QuestionSet, QuestionType } from '@/engine'

type Obj = Record<string, unknown>
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v)

export const emptyAnswer = (): Answer => ({ text: '', points: 0 })

export const emptyQuestion = (type: QuestionType, answers = 4): Question => ({
  type,
  text: '',
  answers: Array.from({ length: answers }, emptyAnswer),
})

export const STANDARD_ROUNDS = 5

export function newSetTemplate(name = 'Nová sada'): QuestionSet {
  return {
    name,
    ruleProfile: '2026',
    rounds: Array.from({ length: STANDARD_ROUNDS }, () => emptyQuestion('standard')),
    final: [],
    reserve: [],
  }
}

function toAnswer(raw: unknown): Answer {
  const a = isObj(raw) ? raw : {}
  const answer: Answer = {
    text: typeof a.text === 'string' ? a.text : '',
    points: typeof a.points === 'number' ? a.points : Number(a.points) || 0,
  }
  if (Array.isArray(a.aliases)) {
    const aliases = a.aliases.filter((x): x is string => typeof x === 'string' && x.trim() !== '')
    if (aliases.length) answer.aliases = aliases
  }
  return answer
}

function toQuestion(raw: unknown, type: QuestionType): Question {
  const q = isObj(raw) ? raw : {}
  return {
    type,
    text: typeof q.text === 'string' ? q.text : '',
    answers: Array.isArray(q.answers) ? q.answers.map(toAnswer) : [],
  }
}

const toList = (raw: unknown, type: QuestionType) =>
  Array.isArray(raw) ? raw.map((q) => toQuestion(q, type)) : []

/**
 * Best-effort conversion of imported JSON into a draft, so even a broken file can be fixed in the editor.
 * Returns `null` when the input is not an object at all.
 */
export function toDraft(raw: unknown): QuestionSet | null {
  if (!isObj(raw)) return null
  return {
    name: typeof raw.name === 'string' && raw.name.trim() ? raw.name : 'Importovaná sada',
    ruleProfile: '2026',
    rounds: toList(raw.rounds, 'standard'),
    ranking: raw.ranking === undefined ? undefined : toQuestion(raw.ranking, 'ranking'),
    final: toList(raw.final, 'final'),
    reserve: toList(raw.reserve, 'standard'),
  }
}

/** The set as it is exported: answers without empty alias lists. */
export function toExport(set: QuestionSet): QuestionSet {
  const clean = (q: Question): Question => ({
    type: q.type,
    text: q.text,
    answers: q.answers.map((a) =>
      a.aliases?.length ? { ...a } : { text: a.text, points: a.points },
    ),
  })
  return {
    name: set.name,
    ruleProfile: set.ruleProfile,
    rounds: set.rounds.map(clean),
    ...(set.ranking ? { ranking: clean(set.ranking) } : {}),
    final: set.final.map(clean),
    reserve: set.reserve.map(clean),
  }
}

/** Orders answers by points, most frequent first (the rank order on the board). */
export const sortAnswers = (question: Question): Answer[] =>
  [...question.answers].sort((a, b) => b.points - a.points)

/** Safe file name from the set name (keeps Slovak letters). */
export const fileName = (set: QuestionSet, extension: string) =>
  `${set.name.trim().replace(/[\\/:*?"<>|]+/g, '-') || 'sada'}.${extension}`
