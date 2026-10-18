import { describe, it, expect } from 'vitest'

import sampleSet from '../../../data/ukazkova-sada.json'
import { PROFILE_2026 } from '../profiles'
import { parseQuestionSet, validateQuestion, type Question } from '../questions'

const standard = (answers: [string, number][]): Question => ({
  type: 'standard',
  text: 'Otázka?',
  answers: answers.map(([text, points]) => ({ text, points })),
})

const errors = (q: Question) =>
  validateQuestion(q, PROFILE_2026).filter((i) => i.severity === 'error')

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v))

describe('validateQuestion', () => {
  const valid = standard([
    ['A', 40],
    ['B', 30],
    ['C', 20],
    ['D', 10],
  ])

  it('accepts a valid standard question', () => {
    expect(errors(valid)).toEqual([])
  })

  it('requires 4–6 answers for a standard question (profile 2026)', () => {
    expect(
      errors(
        standard([
          ['A', 50],
          ['B', 30],
          ['C', 20],
        ]),
      ),
    ).toHaveLength(1)
    const seven = standard([1, 2, 3, 4, 5, 6, 7].map((n) => [`O${n}`, 10]))
    expect(errors(seven)).toHaveLength(1)
  })

  it('requires points in descending order, equal points allowed', () => {
    expect(
      errors(
        standard([
          ['A', 10],
          ['B', 30],
          ['C', 20],
          ['D', 5],
        ]),
      ),
    ).toHaveLength(1)
    expect(
      errors(
        standard([
          ['A', 30],
          ['B', 30],
          ['C', 20],
          ['D', 5],
        ]),
      ),
    ).toEqual([])
  })

  it('requires strictly descending points in the ranking round', () => {
    const ranking: Question = {
      ...standard([
        ['A', 30],
        ['B', 30],
        ['C', 20],
      ]),
      type: 'ranking',
    }
    expect(errors(ranking)).toHaveLength(1)
  })

  it('limits the sum of points to 100', () => {
    const result = errors(
      standard([
        ['A', 40],
        ['B', 30],
        ['C', 20],
        ['D', 20],
      ]),
    )
    expect(result.map((i) => i.message)).toEqual(['Súčet bodov je 110, môže byť najviac 100.'])
  })

  it('rejects non-integer or out-of-range points', () => {
    expect(
      errors(
        standard([
          ['A', 40],
          ['B', 30.5],
          ['C', 20],
          ['D', 0],
        ]),
      ),
    ).toHaveLength(2)
  })

  it('rejects duplicate answer texts and aliases (case-insensitive)', () => {
    expect(
      errors(
        standard([
          ['Pes', 40],
          ['B', 30],
          [' pes ', 20],
          ['D', 10],
        ]),
      ),
    ).toHaveLength(1)
    const withAlias = clone(valid)
    withAlias.answers[0]!.aliases = ['b']
    expect(errors(withAlias)).toHaveLength(1)
  })

  it('allows a final question with up to 6 answers', () => {
    expect(errors({ ...standard([['A', 40]]), type: 'final' })).toEqual([])
  })
})

describe('parseQuestionSet', () => {
  it('accepts the sample set without issues', () => {
    const result = parseQuestionSet(sampleSet)
    expect(result.issues).toEqual([])
    expect(result.set?.rounds).toHaveLength(5)
    expect(result.set?.final).toHaveLength(5)
    expect(result.set?.reserve.length).toBeGreaterThan(0)
  })

  it('rejects a set without exactly 5 standard rounds', () => {
    const raw = clone(sampleSet)
    raw.rounds.pop()
    const result = parseQuestionSet(raw)
    expect(result.set).toBeUndefined()
    expect(result.issues.map((i) => i.path)).toContain('rounds')
  })

  it('reports invalid questions with their path', () => {
    const raw = clone(sampleSet)
    raw.rounds[1]!.answers[0]!.points = 1
    const result = parseQuestionSet(raw)
    expect(result.set).toBeUndefined()
    expect(result.issues[0]?.path).toBe('rounds[1].answers[1].points')
  })

  it('rejects malformed input', () => {
    expect(parseQuestionSet(null).set).toBeUndefined()
    expect(parseQuestionSet({ name: 'X', rounds: 'nie' }).set).toBeUndefined()
    expect(parseQuestionSet({ ...clone(sampleSet), ruleProfile: '2022' }).set).toBeUndefined()
  })

  it('rejects a question of the wrong type in a slot', () => {
    const raw = clone(sampleSet)
    raw.reserve[0]!.type = 'final'
    expect(parseQuestionSet(raw).issues.map((i) => i.path)).toContain('reserve[0].type')
  })

  it('only warns about missing ranking, final and reserve questions', () => {
    const raw = { name: 'Bez rezerv', ruleProfile: '2026', rounds: clone(sampleSet).rounds }
    const result = parseQuestionSet(raw)
    expect(result.set).toBeDefined()
    expect(result.issues.map((i) => [i.severity, i.path])).toEqual([
      ['warning', 'ranking'],
      ['warning', 'final'],
      ['warning', 'reserve'],
    ])
  })
})
