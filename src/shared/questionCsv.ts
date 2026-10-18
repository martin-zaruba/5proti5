/**
 * CSV import/export of question sets (T-011) – for preparing questions in a spreadsheet.
 *
 * One row per answer, separator `;` (Slovak Excel default, `,` is accepted on import):
 *   sekcia;otázka;odpoveď;body;synonymá
 *   kolo;Čo si berieme na dovolenku k moru?;Plavky;38;kúpačky|plavečky
 * `sekcia` = kolo | zoradovacka | finale | rezerva; consecutive rows with the same section
 * and question form one question; synonyms are separated by `|`.
 */

import type { Question, QuestionSet, QuestionType } from '@/engine'

const HEADER = ['sekcia', 'otázka', 'odpoveď', 'body', 'synonymá']

type Section = 'rounds' | 'ranking' | 'final' | 'reserve'

const SECTION_NAMES: Record<Section, string> = {
  rounds: 'kolo',
  ranking: 'zoradovacka',
  final: 'finale',
  reserve: 'rezerva',
}

const SECTION_TYPES: Record<Section, QuestionType> = {
  rounds: 'standard',
  ranking: 'ranking',
  final: 'final',
  reserve: 'standard',
}

const normalize = (s: string) => s.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

function sectionOf(value: string): Section | null {
  const key = normalize(value)
  const aliases: Record<string, Section> = {
    kolo: 'rounds',
    bezne: 'rounds',
    'bezne kolo': 'rounds',
    zoradovacka: 'ranking',
    finale: 'final',
    rezerva: 'reserve',
  }
  return aliases[key] ?? null
}

const quote = (field: string) => (/[;"\n\r]/.test(field) ? `"${field.replace(/"/g, '""')}"` : field)

export function questionSetToCsv(set: QuestionSet): string {
  const rows: string[][] = [HEADER]
  const add = (section: Section, q: Question) => {
    for (const a of q.answers) {
      rows.push([
        SECTION_NAMES[section],
        q.text,
        a.text,
        String(a.points),
        (a.aliases ?? []).join('|'),
      ])
    }
  }
  set.rounds.forEach((q) => add('rounds', q))
  if (set.ranking) add('ranking', set.ranking)
  set.final.forEach((q) => add('final', q))
  set.reserve.forEach((q) => add('reserve', q))
  return rows.map((row) => row.map(quote).join(';')).join('\r\n') + '\r\n'
}

/** RFC 4180-style parser with a configurable separator (quotes, doubled quotes, newlines in quotes). */
export function parseCsvRows(text: string, separator: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]!
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"'
        i++
      } else if (c === '"') quoted = false
      else field += c
    } else if (c === '"' && field === '') quoted = true
    else if (c === separator) {
      row.push(field)
      field = ''
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else field += c
  }
  if (field !== '' || row.length) {
    row.push(field)
    rows.push(row)
  }
  return rows.filter((r) => r.some((f) => f.trim() !== ''))
}

export interface CsvImport {
  set?: QuestionSet
  errors: string[]
}

/** Parses the CSV into a draft set; only structural problems are errors here, rules are checked by the validator. */
export function csvToQuestionSet(text: string, name: string): CsvImport {
  const clean = text.replace(/^﻿/, '')
  const firstLine = clean.split(/\r?\n/, 1)[0] ?? ''
  const separator = firstLine.includes(';') ? ';' : ','
  const rows = parseCsvRows(clean, separator)
  const errors: string[] = []
  if (rows[0] && normalize(rows[0][0] ?? '') === 'sekcia') rows.shift()
  if (rows.length === 0) return { errors: ['Súbor neobsahuje žiadne odpovede.'] }

  const set: QuestionSet = { name, ruleProfile: '2026', rounds: [], final: [], reserve: [] }
  let current: { section: Section; question: Question } | null = null

  rows.forEach((row, i) => {
    const line = i + 2
    const [sectionText = '', questionText = '', answerText = '', pointsText = '', aliases = ''] =
      row
    const section = sectionOf(sectionText)
    if (!section) {
      errors.push(
        `Riadok ${line}: neznáma sekcia „${sectionText}“ (kolo, zoradovacka, finale, rezerva).`,
      )
      return
    }
    const points = Number(pointsText.trim().replace(',', '.'))
    if (pointsText.trim() === '' || !Number.isFinite(points)) {
      errors.push(`Riadok ${line}: body „${pointsText}“ nie sú číslo.`)
      return
    }
    if (!current || current.section !== section || current.question.text !== questionText) {
      if (section === 'ranking' && set.ranking) {
        errors.push(`Riadok ${line}: Zoraďovačka môže mať len jednu otázku.`)
        return
      }
      current = {
        section,
        question: { type: SECTION_TYPES[section], text: questionText, answers: [] },
      }
      if (section === 'ranking') set.ranking = current.question
      else set[section].push(current.question)
    }
    const aliasList = aliases
      .split('|')
      .map((a) => a.trim())
      .filter(Boolean)
    current.question.answers.push({
      text: answerText,
      points,
      ...(aliasList.length ? { aliases: aliasList } : {}),
    })
  })

  return errors.length ? { errors } : { set, errors }
}
