import { describe, it, expect } from 'vitest'

import sampleSet from '../../../data/ukazkova-sada.json'
import { parseQuestionSet } from '@/engine'

import { fileName, newSetTemplate, sortAnswers, toDraft, toExport } from '../questionDrafts'

describe('question drafts', () => {
  it('a new set has 5 empty rounds – the validator lists what is missing', () => {
    const result = parseQuestionSet(newSetTemplate())
    expect(result.set).toBeUndefined()
    expect(result.issues.filter((i) => i.severity === 'error').map((i) => i.path)).toContain(
      'rounds[0].text',
    )
  })

  it('turns the sample JSON into a valid set and exports it unchanged', () => {
    const draft = toDraft(sampleSet)!
    expect(parseQuestionSet(draft).issues).toEqual([])
    expect(toExport(draft)).toEqual(sampleSet)
  })

  it('keeps whatever it can from a broken file', () => {
    const draft = toDraft({
      rounds: [{ text: 'Otázka', answers: [{ text: 'A', points: '12' }, null] }],
      final: 'nie',
    })!
    expect(draft.name).toBe('Importovaná sada')
    expect(draft.rounds[0]!.answers).toEqual([
      { text: 'A', points: 12 },
      { text: '', points: 0 },
    ])
    expect(draft.final).toEqual([])
    expect(toDraft('text')).toBeNull()
  })

  it('drops empty aliases on export', () => {
    const draft = newSetTemplate()
    draft.rounds[0]!.answers[0] = { text: 'A', points: 10, aliases: [] }
    expect(toExport(draft).rounds[0]!.answers[0]).toEqual({ text: 'A', points: 10 })
  })

  it('sorts answers by points and builds a safe file name', () => {
    const q = {
      type: 'standard' as const,
      text: '',
      answers: [
        { text: 'b', points: 5 },
        { text: 'a', points: 30 },
      ],
    }
    expect(sortAnswers(q).map((a) => a.text)).toEqual(['a', 'b'])
    expect(fileName({ ...newSetTemplate(), name: 'Vianoce 2026/firma' }, 'json')).toBe(
      'Vianoce 2026-firma.json',
    )
  })
})
