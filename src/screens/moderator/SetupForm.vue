<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'

import { PROFILE_2026, parseQuestionSet, type ParseResult, type TeamSetup } from '@/engine'
import { useGameStore } from '@/shared/gameStore'
import { toDraft } from '@/shared/questionDrafts'
import { useQuestionLibrary } from '@/shared/questionLibrary'
import { loadJson, saveJson } from '@/shared/storage'

const store = useGameStore()
const profile = PROFILE_2026

const emptyTeam = (name: string): TeamSetup => ({
  name,
  players: Array.from({ length: profile.teamSize }, () => ''),
})

const teams = reactive<[TeamSetup, TeamSetup]>(
  loadJson<[TeamSetup, TeamSetup]>('setup-teams') ?? [
    emptyTeam('Družstvo A'),
    emptyTeam('Družstvo B'),
  ],
)
watch(teams, (value) => saveJson('setup-teams', value), { deep: true })

/* Question set from the library (T-011); the editor prepares the sets. */
const library = useQuestionLibrary()
const selected = computed(() => library.find(library.selectedId.value))
const result = computed<ParseResult>(() =>
  selected.value ? parseQuestionSet(selected.value.set) : { issues: [] },
)
const errors = computed(() => result.value.issues.filter((i) => i.severity === 'error'))
const warnings = computed(() => result.value.issues.filter((i) => i.severity === 'warning'))
const isPlayable = (set: unknown) => parseQuestionSet(set).set !== undefined
const fileError = ref<string | null>(null)

async function onFile(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  fileError.value = null
  try {
    const draft = toDraft(JSON.parse(await file.text()))
    if (!draft) throw new Error()
    library.selectedId.value = library.add(draft)
  } catch {
    fileError.value = `Súbor „${file.name}“ nie je platný JSON.`
  }
}

function start() {
  if (result.value.set) store.startGame(teams, result.value.set)
}
</script>

<template>
  <div class="mx-auto max-w-5xl space-y-8 p-6">
    <header>
      <h1 class="text-3xl font-black">Nová hra</h1>
      <p class="text-slate-400">Profil pravidiel: {{ profile.label }}</p>
    </header>

    <section class="grid gap-6 md:grid-cols-2">
      <fieldset
        v-for="(team, t) in teams"
        :key="t"
        class="space-y-3 rounded-xl border p-4"
        :class="t === 0 ? 'border-sky-500/60' : 'border-orange-500/60'"
      >
        <legend class="px-2 font-bold" :class="t === 0 ? 'text-sky-400' : 'text-orange-400'">
          Družstvo {{ t + 1 }}
        </legend>
        <label class="block">
          <span class="text-sm text-slate-400">Názov družstva</span>
          <input v-model="team.name" class="input text-lg font-bold" />
        </label>
        <div v-for="(_, p) in team.players" :key="p" class="flex items-center gap-3">
          <span class="w-24 shrink-0 text-sm text-slate-400">
            Pozícia {{ p + 1 }}
            <strong v-if="p + 1 === profile.captainPosition" class="block text-amber-400"
              >kapitán</strong
            >
          </span>
          <input v-model="team.players[p]" class="input" :placeholder="`Hráč ${p + 1}`" />
        </div>
      </fieldset>
    </section>
    <p class="text-sm text-slate-400">
      Pozícia 1 stojí najbližšie k moderátorovi, kapitán na pozícii {{ profile.captainPosition }}. V
      kole N ide k pultu hráč na pozícii N.
    </p>

    <section class="space-y-3 rounded-xl border border-slate-700 p-4">
      <h2 class="text-xl font-bold">Sada otázok</h2>
      <div class="flex flex-wrap items-center gap-3">
        <select v-model="library.selectedId.value" class="input mt-0 w-auto min-w-64">
          <option v-for="e in library.entries.value" :key="e.id" :value="e.id">
            {{ e.set.name }}{{ isPlayable(e.set) ? '' : ' (má chyby)' }}
          </option>
        </select>
        <RouterLink
          class="btn bg-slate-700"
          :to="{
            path: '/editor',
            query: library.selectedId.value ? { id: library.selectedId.value } : {},
          }"
        >
          Upraviť v editore
        </RouterLink>
        <label class="btn cursor-pointer bg-slate-700">
          Načítať JSON…
          <input type="file" accept=".json,application/json" class="hidden" @change="onFile" />
        </label>
      </div>
      <p v-if="result.set" class="text-slate-300">
        {{ result.set.rounds.length }} kôl{{ result.set.ranking ? ', Zoraďovačka' : '' }},
        {{ result.set.final.length }} finálových a {{ result.set.reserve.length }} rezervných otázok
      </p>
      <p v-else-if="!selected" class="text-amber-400">
        Knižnica je prázdna – vytvor sadu v editore.
      </p>
      <p v-if="fileError" class="text-red-400">{{ fileError }}</p>
      <ul v-if="errors.length" class="space-y-1 text-sm text-red-400">
        <li v-for="issue in errors" :key="issue.path + issue.message">
          {{ issue.message }} <code class="text-red-300/70">({{ issue.path }})</code>
        </li>
      </ul>
      <ul v-if="warnings.length" class="space-y-1 text-sm text-amber-400">
        <li v-for="issue in warnings" :key="issue.path + issue.message">⚠ {{ issue.message }}</li>
      </ul>
    </section>

    <button
      class="btn w-full bg-amber-400 py-4 text-xl text-slate-900 disabled:opacity-40"
      :disabled="!result.set"
      @click="start"
    >
      Začať hru
    </button>
  </div>
</template>
