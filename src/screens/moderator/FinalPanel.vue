<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'

import {
  captainPosition,
  currentFinalPlayer,
  finalTotal,
  prizeLabel,
  requireProfile,
  type GameState,
} from '@/engine'
import { useGameStore } from '@/shared/gameStore'

/** Moderator view of the final „Veľké peniaze“ (§6). */
const store = useGameStore()
const state = computed(() => store.state.value as GameState)
const final = computed(() => state.value.final!)
const config = computed(() => requireProfile(state.value.profileId).final!)
const team = computed(() => state.value.teams[final.value.team])
const player = computed(() => currentFinalPlayer(final.value))
const answering = computed(() => final.value.step === 'playerA' || final.value.step === 'playerB')

/* ---------- choosing the two players ---------- */
const chosen = ref<[number, number]>([
  1,
  captainPosition(requireProfile(state.value.profileId), team.value.players.length),
])
const playerName = (position: number) => team.value.players[position - 1]

/* ---------- answers ---------- */
/** What the player said, per question – optional when the answer matches a survey answer. */
const drafts = reactive<string[]>(final.value.questions.map(() => ''))
watch(
  () => final.value.step,
  () => drafts.fill(''),
)

function record(question: number, rank: number | null) {
  store.act({ type: 'finalAnswer', question, text: drafts[question] ?? '', rank })
  if (!store.error.value) drafts[question] = ''
}

const sumOf = (p: 0 | 1) =>
  final.value.answers[p].reduce((sum, entry) => sum + (entry?.points ?? 0), 0)
const allRevealed = computed(() => final.value.revealed[0].every(Boolean))
const prizeText = computed(() => final.value.prize && prizeLabel(final.value.prize))
</script>

<template>
  <div class="space-y-4">
    <h3 class="text-2xl font-bold">Finále – Veľké peniaze ({{ team.name }})</h3>

    <!-- Choose players -->
    <div v-if="final.step === 'choosePlayers'" class="space-y-3 rounded-lg bg-slate-800 p-4">
      <p>Kapitán určí dvoch hráčov (môže hrať aj kapitán). Hráč B odíde, aby nepočul otázky.</p>
      <div class="flex flex-wrap items-end gap-3">
        <label v-for="(label, i) in ['Hráč A', 'Hráč B']" :key="label" class="block">
          <span class="text-sm text-slate-400">{{ label }}</span>
          <select v-model.number="chosen[i]" class="input">
            <option v-for="(name, p) in team.players" :key="p" :value="p + 1">
              {{ p + 1 }}. {{ name }}
            </option>
          </select>
        </label>
        <button
          class="btn bg-amber-400 text-slate-900"
          @click="store.act({ type: 'finalChoosePlayers', positions: [chosen[0], chosen[1]] })"
        >
          Potvrdiť
        </button>
      </div>
    </div>

    <template v-else>
      <p v-if="answering" class="rounded-lg bg-slate-800 px-4 py-3">
        Odpovedá <strong>hráč {{ player ? 'B' : 'A' }}</strong> –
        {{ playerName(final.positions![player]) }}, limit
        <strong>{{ config.timeLimits[player] }} s</strong> od položenia 1. otázky. Zapíš odpoveď
        kliknutím na zhodnú odpoveď z prieskumu, alebo napíš, čo povedal, a daj „Iné (0 b.)“. Po
        uplynutí času odpovede postupne odkry.
      </p>

      <ol class="space-y-3">
        <li
          v-for="(question, q) in final.questions"
          :key="q"
          class="space-y-2 rounded-lg border border-slate-600 bg-slate-800 p-3"
        >
          <div class="flex flex-wrap items-baseline gap-x-4">
            <span class="text-lg font-bold">{{ q + 1 }}. {{ question.text }}</span>
            <span v-for="p in [0, 1] as const" :key="p" class="text-sm">
              <template v-if="p === 0 || final.step !== 'playerA'">
                <span class="text-slate-400">{{ p ? 'B' : 'A' }}:</span>
                <template v-if="final.answers[p][q]">
                  „{{ final.answers[p][q]!.text }}“
                  <strong class="text-amber-400">{{ final.answers[p][q]!.points }}</strong>
                </template>
                <span v-else class="text-slate-500">—</span>
                <span v-if="final.revealed[p][q]" class="text-emerald-400"> ✓ na tabuli</span>
              </template>
            </span>
          </div>

          <div
            v-if="answering && !final.revealed[player][q]"
            class="flex flex-wrap items-center gap-2"
          >
            <input
              v-model="drafts[q]"
              class="input mt-0 w-48"
              placeholder="čo povedal (nepovinné)"
              @keydown.enter="drafts[q] && record(q, null)"
            />
            <button
              v-for="(answer, i) in question.answers"
              :key="i"
              class="btn bg-emerald-600 px-2 py-1 text-sm"
              :class="final.answers[player][q]?.rank === i + 1 && 'ring-2 ring-white'"
              @click="record(q, i + 1)"
            >
              {{ answer.text }} <span class="text-emerald-200">{{ answer.points }}</span>
            </button>
            <button class="btn bg-slate-600 px-2 py-1 text-sm" @click="record(q, null)">
              Iné (0 b.)
            </button>
            <button
              v-if="player === 1 && final.answers[0][q]"
              class="btn bg-red-700 px-2 py-1 text-sm"
              @click="store.act({ type: 'finalDuplicate', question: q })"
            >
              Duplicita
            </button>
            <button
              class="btn ml-auto bg-amber-400 px-3 py-1 text-slate-900"
              @click="store.act({ type: 'finalReveal', question: q })"
            >
              Odkryť
            </button>
          </div>
        </li>
      </ol>

      <div class="flex flex-wrap items-center gap-4 rounded-lg bg-slate-800 px-4 py-3 text-lg">
        <span
          >A: <strong>{{ sumOf(0) }}</strong></span
        >
        <span v-if="final.step !== 'playerA'"
          >B: <strong>{{ sumOf(1) }}</strong></span
        >
        <span>
          spolu <strong class="text-amber-400">{{ finalTotal(final) }}</strong> /
          {{ config.target }}
        </span>
        <span v-if="prizeText" class="font-black text-amber-400">{{ prizeText }}</span>
        <button
          v-if="final.step === 'playerA'"
          class="btn ml-auto bg-amber-400 text-slate-900"
          :disabled="!allRevealed"
          :title="allRevealed ? '' : 'Najprv odkry všetky odpovede hráča A'"
          @click="store.act({ type: 'finalNextPlayer' })"
        >
          Nastupuje hráč B
        </button>
      </div>
    </template>
  </div>
</template>
