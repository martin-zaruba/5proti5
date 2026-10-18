import { describe, it, expect } from 'vitest'

import {
  copyName,
  removeEntry,
  SAMPLE_ID,
  sampleDraft,
  seedLibrary,
  upsertEntry,
} from '../questionLibrary'
import { newSetTemplate } from '../questionDrafts'

const NOW = '2026-10-18T12:00:00.000Z'

describe('question library', () => {
  it('starts with the sample set', () => {
    expect(seedLibrary(null, NOW)).toEqual([{ id: SAMPLE_ID, set: sampleDraft(), updatedAt: NOW }])
  })

  it('keeps a set loaded in the game setup before the library existed', () => {
    const legacy = { ...newSetTemplate('Moja sada') }
    const entries = seedLibrary(legacy, NOW)
    expect(entries.map((e) => e.set.name)).toEqual(['Ukážková sada', 'Moja sada'])
    expect(seedLibrary(sampleDraft(), NOW)).toHaveLength(1)
  })

  it('adds, replaces and removes entries', () => {
    const a = { id: 'a', set: newSetTemplate('A'), updatedAt: NOW }
    const b = { id: 'b', set: newSetTemplate('B'), updatedAt: NOW }
    let entries = upsertEntry(upsertEntry([], a), b)
    entries = upsertEntry(entries, { ...a, set: newSetTemplate('A2') })
    expect(entries.map((e) => e.set.name)).toEqual(['A2', 'B'])
    expect(removeEntry(entries, 'a').map((e) => e.id)).toEqual(['b'])
  })

  it('names copies uniquely', () => {
    const entries = [
      { id: '1', set: newSetTemplate('Sada'), updatedAt: NOW },
      { id: '2', set: newSetTemplate('Kópia – Sada'), updatedAt: NOW },
    ]
    expect(copyName(entries, 'Sada')).toBe('Kópia 2 – Sada')
    expect(copyName(entries, 'Iná')).toBe('Kópia – Iná')
  })
})
