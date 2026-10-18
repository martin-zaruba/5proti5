<script setup lang="ts">
import { computed } from 'vue'

import { rankingTarget, type GameState, type TeamIndex } from '@/engine'
import { useGameStore } from '@/shared/gameStore'

/** Moderator view of Zoraďovačka: answers in board order, click = the answer the team named. */
const store = useGameStore()
const state = computed(() => store.state.value as GameState)
const ranking = computed(() => state.value.ranking!)
const target = computed(() => rankingTarget(ranking.value))
const canGuess = computed(() => state.value.phase === 'ranking' && ranking.value.control !== null)
const correctAnswer = computed(() =>
  target.value === null ? null : ranking.value.question.answers[target.value - 1]!.text,
)

const TEAM_TEXT = ['text-sky-400', 'text-orange-400'] as const
const TEAM_BORDER = ['border-sky-500', 'border-orange-500'] as const
const teamName = (team: TeamIndex) => state.value.teams[team].name

const items = computed(() =>
  ranking.value.displayOrder.map((rank, i) => ({
    key: i + 1,
    rank,
    answer: ranking.value.question.answers[rank - 1]!,
    revealed: ranking.value.revealed[rank - 1] ?? null,
  })),
)
</script>

<template>
  <div class="space-y-3">
    <h3 class="text-2xl font-bold">{{ ranking.question.text }}</h3>

    <div
      v-if="state.phase === 'ranking' && ranking.control === null"
      class="flex flex-wrap items-center gap-2 rounded-lg bg-slate-800 p-3"
    >
      <span class="mr-2">Skóre je rovnaké – kto začína?</span>
      <button
        class="btn bg-sky-500 text-slate-900"
        @click="store.act({ type: 'chooseStartingTeam', team: 0 })"
      >
        {{ teamName(0) }} <span class="kbd">A</span>
      </button>
      <button
        class="btn bg-orange-500 text-slate-900"
        @click="store.act({ type: 'chooseStartingTeam', team: 1 })"
      >
        {{ teamName(1) }} <span class="kbd">L</span>
      </button>
    </div>

    <p v-if="target !== null" class="text-slate-300">
      Hľadá sa <strong class="text-amber-400">{{ target }}. miesto</strong> – správne je
      <strong>„{{ correctAnswer }}“</strong>. Klikni na odpoveď, ktorú družstvo povedalo.
    </p>

    <ol class="space-y-2">
      <li
        v-for="item in items"
        :key="item.rank"
        class="flex items-center gap-3 rounded-lg border px-3 py-2"
        :class="
          item.revealed
            ? [
                'bg-slate-800',
                TEAM_BORDER[item.revealed.by],
                !item.revealed.counted && 'opacity-60',
              ]
            : item.rank === target
              ? 'border-amber-400/60 bg-slate-800'
              : 'border-slate-600 bg-slate-800'
        "
      >
        <span class="flex-1 text-lg font-bold">{{ item.answer.text }}</span>
        <span class="w-28 text-right text-sm text-slate-400 tabular-nums">
          {{ item.rank }}. miesto · {{ item.answer.points }}
        </span>
        <span v-if="item.revealed" class="w-36 text-right text-sm">
          <span :class="TEAM_TEXT[item.revealed.by]">{{ teamName(item.revealed.by) }}</span>
          {{ item.revealed.counted ? 'v sérii' : 'séria prepadla' }}
        </span>
        <button
          v-else
          class="btn w-36 bg-emerald-500 text-slate-900"
          :disabled="!canGuess"
          @click="store.act({ type: 'rankingGuess', rank: item.rank })"
        >
          Tip <span v-if="item.key <= 9" class="kbd">{{ item.key }}</span>
        </button>
      </li>
    </ol>
  </div>
</template>
