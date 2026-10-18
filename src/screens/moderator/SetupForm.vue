<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'

import sampleSet from '../../../data/ukazkova-sada.json'
import { PROFILE_2026, parseQuestionSet, type ParseResult, type TeamSetup } from '@/engine'
import { useGameStore } from '@/shared/gameStore'
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

const rawSet = ref<unknown>(loadJson('question-set') ?? sampleSet)
const result = computed<ParseResult>(() => parseQuestionSet(rawSet.value))
const errors = computed(() => result.value.issues.filter((i) => i.severity === 'error'))
const warnings = computed(() => result.value.issues.filter((i) => i.severity === 'warning'))
const fileError = ref<string | null>(null)

function useRawSet(raw: unknown) {
  rawSet.value = raw
  fileError.value = null
  if (parseQuestionSet(raw).set) saveJson('question-set', raw)
}

async function onFile(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  try {
    useRawSet(JSON.parse(await file.text()))
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
        <button class="btn bg-slate-700" @click="useRawSet(sampleSet)">Použiť ukážkovú sadu</button>
        <label class="btn cursor-pointer bg-slate-700">
          Načítať JSON…
          <input type="file" accept=".json,application/json" class="hidden" @change="onFile" />
        </label>
        <span v-if="result.set" class="text-slate-300">
          „{{ result.set.name }}“ – {{ result.set.rounds.length }} kôl,
          {{ result.set.reserve.length }} rezervných otázok
        </span>
      </div>
      <p v-if="fileError" class="text-red-400">{{ fileError }}</p>
      <ul v-if="errors.length" class="space-y-1 text-sm text-red-400">
        <li v-for="issue in errors" :key="issue.path + issue.message">
          <code class="text-red-300">{{ issue.path }}</code> – {{ issue.message }}
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
