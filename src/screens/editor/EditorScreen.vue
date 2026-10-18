<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { parseQuestionSet, PROFILE_2026, type QuestionSet, type ValidationIssue } from '@/engine'
import ConfirmButton from '@/shared/ConfirmButton.vue'
import { downloadText } from '@/shared/download'
import { plural } from '@/shared/plural'
import { csvToQuestionSet, questionSetToCsv } from '@/shared/questionCsv'
import {
  emptyQuestion,
  fileName,
  newSetTemplate,
  STANDARD_ROUNDS,
  toDraft,
  toExport,
} from '@/shared/questionDrafts'
import { sampleDraft, useQuestionLibrary } from '@/shared/questionLibrary'

import QuestionEditor from './QuestionEditor.vue'

const library = useQuestionLibrary()
const route = useRoute()
const router = useRouter()
const profile = PROFILE_2026

const currentId = ref<string | null>(
  (typeof route.query.id === 'string' && route.query.id) ||
    library.selectedId.value ||
    library.entries.value[0]?.id ||
    null,
)
const entry = computed(() => library.find(currentId.value))
const set = computed(() => entry.value?.set ?? null)
watch(
  set,
  () => {
    if (currentId.value) library.touch(currentId.value)
  },
  { deep: true },
)

/* ---------- validation ---------- */
const result = computed(() => (set.value ? parseQuestionSet(set.value) : null))
const issues = computed(() => result.value?.issues ?? [])
const errorCount = computed(() => issues.value.filter((i) => i.severity === 'error').length)
/** Issues of one question, e.g. prefix `rounds[1]` (not `rounds[10]`). */
const issuesFor = (prefix: string): ValidationIssue[] =>
  issues.value.filter((i) => i.path === prefix || i.path.startsWith(`${prefix}.`))
const QUESTION_PATH = /^(rounds|final|reserve)\[\d+\]|^ranking\./
const setIssues = computed(() => issues.value.filter((i) => !QUESTION_PATH.test(i.path)))
const entryErrors = (s: QuestionSet) =>
  parseQuestionSet(s).issues.filter((i) => i.severity === 'error').length

/* ---------- library actions ---------- */
function select(id: string | null) {
  currentId.value = id
  router.replace({ query: id ? { id } : {} })
}
const create = () => select(library.add(newSetTemplate()))
const restoreSample = () => select(library.add(sampleDraft()))
const duplicate = () => currentId.value && select(library.duplicate(currentId.value))
function remove() {
  if (!currentId.value) return
  library.remove(currentId.value)
  select(library.entries.value[0]?.id ?? null)
}
function useInGame() {
  library.selectedId.value = currentId.value
  router.push('/moderator')
}

const importError = ref<string | null>(null)
async function onImport(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  importError.value = null
  const text = await file.text()
  if (/\.csv$/i.test(file.name)) {
    const { set: imported, errors } = csvToQuestionSet(text, file.name.replace(/\.csv$/i, ''))
    if (!imported) {
      importError.value = errors.join(' ')
      return
    }
    select(library.add(imported))
    return
  }
  try {
    const draft = toDraft(JSON.parse(text))
    if (!draft) throw new Error()
    select(library.add(draft))
  } catch {
    importError.value = `Súbor „${file.name}“ nie je platný JSON ani CSV so sadou otázok.`
  }
}

function exportJson() {
  if (!set.value) return
  downloadText(
    fileName(set.value, 'json'),
    JSON.stringify(toExport(set.value), null, 2),
    'application/json',
  )
}
function exportCsv() {
  if (!set.value) return
  // BOM so that Excel reads the file as UTF-8 (diacritics).
  downloadText(fileName(set.value, 'csv'), '﻿' + questionSetToCsv(set.value), 'text/csv')
}

const dateTime = (iso: string) =>
  new Date(iso).toLocaleString('sk-SK', { dateStyle: 'short', timeStyle: 'short' })
</script>

<template>
  <main class="mx-auto grid max-w-7xl gap-6 p-6 lg:grid-cols-[18rem_1fr]">
    <!-- Library -->
    <aside class="space-y-3">
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-black">Sady otázok</h1>
        <RouterLink to="/" class="text-sm text-slate-400 hover:text-white">← Domov</RouterLink>
      </div>
      <ul class="space-y-1">
        <li v-for="e in library.entries.value" :key="e.id">
          <button
            class="w-full rounded-lg px-3 py-2 text-left transition"
            :class="
              e.id === currentId ? 'bg-amber-400 text-slate-900' : 'bg-slate-800 hover:bg-slate-700'
            "
            @click="select(e.id)"
          >
            <span class="block truncate font-bold">{{ e.set.name || '(bez názvu)' }}</span>
            <span class="text-xs opacity-80">
              <template v-if="entryErrors(e.set)">
                ⚠ {{ entryErrors(e.set) }}
                {{ plural(entryErrors(e.set), 'chyba', 'chyby', 'chýb') }}
              </template>
              <template v-else>✓ pripravená</template>
              · {{ dateTime(e.updatedAt) }}
              <template v-if="e.id === library.selectedId.value"> · v hre</template>
            </span>
          </button>
        </li>
      </ul>
      <div class="flex flex-wrap gap-2">
        <button class="btn bg-amber-400 text-slate-900" @click="create">+ Nová sada</button>
        <label class="btn cursor-pointer bg-slate-700">
          Import JSON / CSV
          <input
            type="file"
            accept=".json,.csv,application/json,text/csv"
            class="hidden"
            @change="onImport"
          />
        </label>
        <button class="btn bg-slate-700 text-sm" @click="restoreSample">+ Ukážková sada</button>
      </div>
      <p v-if="importError" class="text-sm text-red-400" role="alert">{{ importError }}</p>
      <details class="text-sm text-slate-400">
        <summary class="cursor-pointer">Formát CSV</summary>
        <p class="mt-2">
          Jeden riadok = jedna odpoveď, oddeľovač bodkočiarka:
          <code class="block text-slate-300">sekcia;otázka;odpoveď;body;synonymá</code>
          sekcia = <code>kolo</code>, <code>zoradovacka</code>, <code>finale</code> alebo
          <code>rezerva</code>; riadky s rovnakou otázkou tvoria jednu otázku; synonymá oddeľ znakom
          <code>|</code>.
        </p>
      </details>
    </aside>

    <!-- Selected set -->
    <section v-if="set" class="space-y-6">
      <div class="flex flex-wrap items-end gap-3">
        <label class="block min-w-64 flex-1">
          <span class="text-sm text-slate-400">Názov sady</span>
          <input v-model="set.name" class="input text-xl font-bold" />
        </label>
        <button
          class="btn bg-emerald-500 text-slate-900"
          :disabled="errorCount > 0"
          @click="useInGame"
        >
          Použiť v hre
        </button>
        <button class="btn bg-slate-700" @click="exportJson">Export JSON</button>
        <button class="btn bg-slate-700" @click="exportCsv">Export CSV</button>
        <button class="btn bg-slate-700" @click="duplicate">Duplikovať</button>
        <ConfirmButton
          class="bg-red-900"
          confirm-label="Zmazať sadu? Klikni znova"
          @confirm="remove"
        >
          Zmazať
        </ConfirmButton>
      </div>

      <p
        class="rounded-lg px-4 py-2 font-bold"
        :class="errorCount ? 'bg-red-900/60' : 'bg-emerald-900/60'"
      >
        <template v-if="errorCount"
          >Sada má {{ errorCount }} {{ plural(errorCount, 'chybu', 'chyby', 'chýb') }} – kým
          {{ plural(errorCount, 'ju', 'ich', 'ich') }} neopravíš, nedá sa hrať.</template
        >
        <template v-else>Sada je v poriadku a dá sa hrať. Ukladá sa automaticky.</template>
      </p>
      <ul v-if="setIssues.length" class="space-y-1 text-sm">
        <li
          v-for="issue in setIssues"
          :key="issue.path + issue.message"
          :class="issue.severity === 'error' ? 'text-red-400' : 'text-amber-400'"
        >
          {{ issue.severity === 'error' ? '✕' : '⚠' }} {{ issue.message }}
        </li>
      </ul>

      <h2 class="text-xl font-black">Bežné kolá</h2>
      <QuestionEditor
        v-for="(_, i) in set.rounds"
        :key="`r${i}`"
        v-model="set.rounds[i]!"
        :title="profile.standardRounds[i]?.label ?? `Kolo ${i + 1} (navyše)`"
        :issues="issuesFor(`rounds[${i}]`)"
        :max-answers="profile.answersPerQuestion.max"
        :removable="set.rounds.length > STANDARD_ROUNDS"
        @remove="set.rounds.splice(i, 1)"
      />
      <button
        v-if="set.rounds.length < STANDARD_ROUNDS"
        class="btn bg-slate-700"
        @click="set.rounds.push(emptyQuestion('standard'))"
      >
        + Kolo
      </button>

      <h2 class="text-xl font-black">Bonusové kolo – Zoraďovačka</h2>
      <QuestionEditor
        v-if="set.ranking"
        v-model="set.ranking"
        title="Zoraďovačka (všetky odpovede, rôzne body)"
        :issues="issuesFor('ranking')"
        :max-answers="10"
        removable
        @remove="set.ranking = undefined"
      />
      <button v-else class="btn bg-slate-700" @click="set.ranking = emptyQuestion('ranking', 6)">
        + Zoraďovačka
      </button>

      <h2 class="text-xl font-black">Finále – Veľké peniaze</h2>
      <QuestionEditor
        v-for="(_, i) in set.final"
        :key="`f${i}`"
        v-model="set.final[i]!"
        :title="`Finálová otázka ${i + 1} (top 6 odpovedí)`"
        :issues="issuesFor(`final[${i}]`)"
        :max-answers="6"
        removable
        @remove="set.final.splice(i, 1)"
      />
      <button
        class="btn bg-slate-700"
        :disabled="set.final.length >= 5"
        @click="set.final.push(emptyQuestion('final', 6))"
      >
        + Finálová otázka
      </button>

      <h2 class="text-xl font-black">Rezervné otázky</h2>
      <p class="text-sm text-slate-400">
        Použijú sa pri anulovaní otázky, keď v súboji nikto netrafí, a pri remíze po 5. kole.
      </p>
      <QuestionEditor
        v-for="(_, i) in set.reserve"
        :key="`z${i}`"
        v-model="set.reserve[i]!"
        :title="`Rezervná otázka ${i + 1}`"
        :issues="issuesFor(`reserve[${i}]`)"
        :max-answers="profile.answersPerQuestion.max"
        removable
        @remove="set.reserve.splice(i, 1)"
      />
      <button class="btn bg-slate-700" @click="set.reserve.push(emptyQuestion('standard'))">
        + Rezervná otázka
      </button>
    </section>

    <section v-else class="flex items-center justify-center text-slate-400">
      Knižnica je prázdna – vytvor novú sadu alebo pridaj ukážkovú.
    </section>
  </main>
</template>
