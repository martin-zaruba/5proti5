import { describe, it, expect } from 'vitest'

import sampleSet from '../../../data/ukazkova-sada.json'
import { parseQuestionSet } from '@/engine'

import { csvToQuestionSet, parseCsvRows, questionSetToCsv } from '../questionCsv'
import { toDraft, toExport } from '../questionDrafts'

describe('question set CSV', () => {
  it('round-trips the sample set', () => {
    const sample = toDraft(sampleSet)!
    const csv = questionSetToCsv(sample)
    expect(csv.split('\r\n')[0]).toBe('sekcia;otázka;odpoveď;body;synonymá')
    expect(csv).toContain('kolo;Čo si berieme na dovolenku k moru?;Plavky;38;kúpačky')
    const back = csvToQuestionSet(csv, sample.name)
    expect(back.errors).toEqual([])
    expect(toExport(back.set!)).toEqual(sampleSet)
    expect(parseQuestionSet(back.set).issues).toEqual([])
  })

  it('quotes fields with separators, quotes and new lines', () => {
    const rows = parseCsvRows('a;"b;c";"d ""e"""\r\n"x\ny";2\n', ';')
    expect(rows).toEqual([
      ['a', 'b;c', 'd "e"'],
      ['x\ny', '2'],
    ])
    const set = toDraft({
      name: 'X',
      rounds: [{ text: 'Čo; prečo?', answers: [{ text: 'A "B"', points: 1 }] }],
    })!
    const back = csvToQuestionSet(questionSetToCsv(set), 'X').set!
    expect(back.rounds[0]).toEqual(set.rounds[0])
  })

  it('accepts a comma separator, no header, any case and diacritics in sections', () => {
    const csv =
      'Kolo,Q1,A,40,a1|a2\nKOLO,Q1,B,30,\nZoraďovačka,R,X,50,\nFinále,F,Y,10,\nrezerva,Z,W,5,'
    const { set, errors } = csvToQuestionSet(csv, 'Excel')
    expect(errors).toEqual([])
    expect(set!.rounds).toEqual([
      {
        type: 'standard',
        text: 'Q1',
        answers: [
          { text: 'A', points: 40, aliases: ['a1', 'a2'] },
          { text: 'B', points: 30 },
        ],
      },
    ])
    expect(set!.ranking?.answers).toEqual([{ text: 'X', points: 50 }])
    expect(set!.final[0]?.type).toBe('final')
    expect(set!.reserve[0]?.text).toBe('Z')
  })

  it('reports unknown sections and non-numeric points with line numbers', () => {
    const csv = 'sekcia;otázka;odpoveď;body;synonymá\nkolo;Q;A;veľa;\nbonus;Q;B;3;\n'
    expect(csvToQuestionSet(csv, 'X').errors).toEqual([
      'Riadok 2: body „veľa“ nie sú číslo.',
      'Riadok 3: neznáma sekcia „bonus“ (kolo, zoradovacka, finale, rezerva).',
    ])
    expect(csvToQuestionSet('', 'X').errors).toEqual(['Súbor neobsahuje žiadne odpovede.'])
  })

  it('ignores the BOM Excel adds to UTF-8 files', () => {
    expect(csvToQuestionSet('﻿sekcia;otázka;odpoveď;body\nkolo;Q;A;1', 'X').errors).toEqual([])
  })
})
