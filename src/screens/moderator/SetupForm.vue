<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'

import {
  canPlayFinal,
  captainPosition,
  faceOffPosition,
  PROFILE_2026,
  parseQuestionSet,
  type GameOptions,
  type ParseResult,
  type TeamSetup,
} from '@/engine'
import { useGameStore } from '@/shared/gameStore'
import { toDraft } from '@/shared/questionDrafts'
import { useQuestionLibrary } from '@/shared/questionLibrary'
import { loadJson, saveJson } from '@/shared/storage'

const store = useGameStore()
const profile = PROFILE_2026

/* Team size 2–5 (OQ-20). The form keeps names for the largest team, so changing the size loses nothing. */
const { min: minSize, max: maxSize } = profile.teamSize
const sizes = Array.from({ length: maxSize - minSize + 1 }, (_, i) => minSize + i)
const savedSize = loadJson<number>('setup-team-size')
const teamSize = ref(savedSize && sizes.includes(savedSize) ? savedSize : maxSize)
watch(teamSize, (value) => saveJson('setup-team-size', value))

const withAllPositions = (team: TeamSetup): TeamSetup => ({
  name: team.name,
  players: Array.from({ length: maxSize }, (_, i) => team.players[i] ?? ''),
})
const saved = loadJson<[TeamSetup, TeamSetup]>('setup-teams')
const teams = reactive<[TeamSetup, TeamSetup]>(
  saved
    ? [withAllPositions(saved[0]), withAllPositions(saved[1])]
    : [
        withAllPositions({ name: 'Družstvo A', players: [] }),
        withAllPositions({ name: 'Družstvo B', players: [] }),
      ],
)
watch(teams, (value) => saveJson('setup-teams', value), { deep: true })

const captain = computed(() => captainPosition(profile, teamSize.value))
/** Positions at the buzzer in rounds 1–5 (the line starts over with fewer players). */
const buzzerOrder = computed(() =>
  profile.standardRounds.map((r) => faceOffPosition(r.number, teamSize.value)).join(', '),
)

/* Question set from the library (T-011); the editor prepares the sets. */
const library = useQuestionLibrary()
const selected = computed(() => library.find(library.selectedId.value))
const result = computed<ParseResult>(() =>
  selected.value ? parseQuestionSet(selected.value.set) : { issues: [] },
)
const errors = computed(() => result.value.issues.filter((i) => i.severity === 'error'))
const warnings = computed(() => result.value.issues.filter((i) => i.severity === 'warning'))
const isPlayable = (set: unknown) => parseQuestionSet(set).set !== undefined

/* Which parts of the episode are played (T-014); a new setup starts with the short game. */
const options = reactive<GameOptions>({
  ranking: false,
  final: false,
  ...loadJson<GameOptions>('setup-options'),
})
watch(options, (value) => saveJson('setup-options', value), { deep: true })
const hasRanking = computed(() => result.value.set?.ranking !== undefined)
const hasFinal = computed(() => !!result.value.set && canPlayFinal(profile, result.value.set.final))
const afterRanking = profile.ranking!.afterRound
const flow = computed(() => {
  const last = profile.standardRounds.length
  const parts = options.ranking
    ? hasRanking.value
      ? [`kolá 1–${afterRanking}`, 'Zoraďovačka', `kolá ${afterRanking + 1}–${last}`]
      : [`kolá 1–${last}`]
    : [`kolá 1–${afterRanking}`]
  if (options.final && hasFinal.value) parts.push('finále')
  return parts.join(' → ')
})
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
  if (!result.value.set) return
  const playing = (team: TeamSetup): TeamSetup => ({
    name: team.name,
    players: team.players.slice(0, teamSize.value),
  })
  store.startGame([playing(teams[0]), playing(teams[1])], result.value.set, options)
}
</script>

<template>
  <div class="mx-auto max-w-5xl space-y-8 p-6">
    <header>
      <h1 class="text-3xl font-black">Nová hra</h1>
      <p class="text-slate-400">Profil pravidiel: {{ profile.label }}</p>
    </header>

    <label class="flex flex-wrap items-center gap-3">
      <span class="font-bold">Počet hráčov v družstve</span>
      <select v-model.number="teamSize" class="input mt-0 w-auto">
        <option v-for="n in sizes" :key="n" :value="n">{{ n }}</option>
      </select>
      <span v-if="teamSize < maxSize" class="text-sm text-slate-400">
        Štatút má {{ maxSize }} hráčov – menšie družstvá sú úprava pre menšiu skupinu.
      </span>
    </label>

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
        <div v-for="p in teamSize" :key="p - 1" class="flex items-center gap-3">
          <span class="w-24 shrink-0 text-sm text-slate-400">
            Pozícia {{ p }}
            <strong v-if="p === captain" class="block text-amber-400">kapitán</strong>
          </span>
          <input v-model="team.players[p - 1]" class="input" :placeholder="`Hráč ${p}`" />
        </div>
      </fieldset>
    </section>
    <p class="text-sm text-slate-400">
      Pozícia 1 stojí najbližšie k moderátorovi, kapitán na pozícii {{ captain }}.
      <template v-if="teamSize === maxSize">V kole N ide k pultu hráč na pozícii N.</template>
      <template v-else>
        K pultu idú postupne hráči na pozíciách {{ buzzerOrder }} (po kapitánovi sa rad opakuje).
      </template>
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

    <section class="space-y-3 rounded-xl border border-slate-700 p-4">
      <h2 class="text-xl font-bold">Priebeh hry</h2>
      <label class="flex items-start gap-3">
        <input v-model="options.ranking" type="checkbox" class="mt-1 size-5 accent-amber-400" />
        <span>
          <span class="font-bold">Zoraďovačka a kolá {{ afterRanking + 1 }}–5</span>
          <span class="block text-sm text-slate-400">
            Bez nej sa hrajú len kolá 1–{{ afterRanking }}; pri remíze bez finále hra končí
            nerozhodne.
            <template v-if="result.set && !hasRanking">
              Sada nemá otázku pre Zoraďovačku – kolá sa odohrajú bez nej.
            </template>
          </span>
        </span>
      </label>
      <label class="flex items-start gap-3" :class="{ 'opacity-50': result.set && !hasFinal }">
        <input
          v-model="options.final"
          type="checkbox"
          class="mt-1 size-5 accent-amber-400"
          :disabled="!!result.set && !hasFinal"
        />
        <span>
          <span class="font-bold">Finále „Veľké peniaze“</span>
          <span class="block text-sm text-slate-400">
            <template v-if="result.set && !hasFinal">
              Sada nemá {{ profile.final!.questionCount }} finálových otázok – finále sa nehrá.
            </template>
            <template v-else>Bez finále hra končí vyhlásením víťaza.</template>
          </span>
        </span>
      </label>
      <p class="text-slate-300">Priebeh: {{ flow }}</p>
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
