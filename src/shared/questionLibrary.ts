/**
 * Library of question sets kept in localStorage (T-011), shared by the editor and the game setup.
 * Pure helpers are exported for tests; `useQuestionLibrary()` is the reactive store.
 */

import { ref, watch } from 'vue'

import sampleSet from '../../data/ukazkova-sada.json'
import type { QuestionSet } from '@/engine'

import { toDraft } from './questionDrafts'
import { loadJson, saveJson } from './storage'

export interface LibraryEntry {
  id: string
  set: QuestionSet
  /** ISO timestamp of the last change. */
  updatedAt: string
}

const LIBRARY_KEY = 'question-library'
const SELECTED_KEY = 'selected-set-id'
/** Set loaded in the game setup before the library existed (T-007). */
const LEGACY_KEY = 'question-set'

export const SAMPLE_ID = 'ukazkova-sada'

export const sampleDraft = (): QuestionSet => toDraft(sampleSet)!

/** First start: the sample set, plus the set the user loaded before the library existed. */
export function seedLibrary(legacy: unknown, now: string): LibraryEntry[] {
  const entries: LibraryEntry[] = [{ id: SAMPLE_ID, set: sampleDraft(), updatedAt: now }]
  const old = toDraft(legacy)
  if (old && JSON.stringify(old) !== JSON.stringify(entries[0]!.set)) {
    entries.push({ id: 'predosla-sada', set: old, updatedAt: now })
  }
  return entries
}

export function upsertEntry(entries: LibraryEntry[], entry: LibraryEntry): LibraryEntry[] {
  const index = entries.findIndex((e) => e.id === entry.id)
  return index === -1 ? [...entries, entry] : entries.map((e, i) => (i === index ? entry : e))
}

export const removeEntry = (entries: LibraryEntry[], id: string) =>
  entries.filter((e) => e.id !== id)

/** „Kópia – …“ name that is not used yet. */
export function copyName(entries: LibraryEntry[], name: string): string {
  const names = new Set(entries.map((e) => e.set.name))
  let candidate = `Kópia – ${name}`
  for (let n = 2; names.has(candidate); n++) candidate = `Kópia ${n} – ${name}`
  return candidate
}

const newId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value))

/* ---------- reactive store ---------- */

const entries = ref<LibraryEntry[]>(
  loadJson<LibraryEntry[]>(LIBRARY_KEY) ??
    seedLibrary(loadJson(LEGACY_KEY), new Date().toISOString()),
)
watch(entries, (value) => saveJson(LIBRARY_KEY, value), { deep: true, immediate: true })

const selectedId = ref<string | null>(
  loadJson<string>(SELECTED_KEY) ?? entries.value[0]?.id ?? null,
)
watch(selectedId, (value) => saveJson(SELECTED_KEY, value))

function add(set: QuestionSet): string {
  const id = newId()
  entries.value = upsertEntry(entries.value, { id, set, updatedAt: new Date().toISOString() })
  return id
}

function duplicate(id: string): string | null {
  const entry = entries.value.find((e) => e.id === id)
  if (!entry) return null
  return add({ ...clone(entry.set), name: copyName(entries.value, entry.set.name) })
}

function touch(id: string) {
  const entry = entries.value.find((e) => e.id === id)
  if (entry) entry.updatedAt = new Date().toISOString()
}

function remove(id: string) {
  entries.value = removeEntry(entries.value, id)
  if (selectedId.value === id) selectedId.value = entries.value[0]?.id ?? null
}

export function useQuestionLibrary() {
  return {
    entries,
    /** Set chosen for the next game. */
    selectedId,
    find: (id: string | null) => entries.value.find((e) => e.id === id) ?? null,
    add,
    duplicate,
    touch,
    remove,
  }
}
