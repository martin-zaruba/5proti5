<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'

import { useGameStore } from '@/shared/gameStore'
import { isRunning, remainingMs } from '@/shared/timer'

/** Countdown control for the host (T-009). The timer never gives an X by itself. */
const store = useGameStore()
const timer = store.timer
const muted = store.muted

const now = ref(Date.now())
let interval: ReturnType<typeof setInterval> | undefined
onMounted(() => (interval = setInterval(() => (now.value = Date.now()), 100)))
onUnmounted(() => clearInterval(interval))

const remaining = computed(() => (timer.value ? remainingMs(timer.value, now.value) : 0))
const running = computed(() => (timer.value ? isRunning(timer.value, now.value) : false))
const expired = computed(() => timer.value !== null && remaining.value === 0)
const label = computed(() => (timer.value?.kind === 'final' ? 'Čas finále' : 'Čas na odpoveď'))
const startLabel = computed(() => {
  if (timer.value?.kind === 'answer') return running.value ? 'Znova' : 'Štart'
  return running.value ? 'Pauza' : 'Štart'
})
</script>

<template>
  <div class="space-y-2 rounded-lg bg-slate-800 p-3">
    <div class="flex items-center justify-between">
      <h4 class="font-bold">{{ timer ? label : 'Časovač' }}</h4>
      <label class="flex cursor-pointer items-center gap-2 text-sm">
        <input v-model="muted" type="checkbox" />
        Stlmiť zvuk na tabuli
      </label>
    </div>
    <template v-if="timer">
      <div class="flex items-center gap-3">
        <span
          class="w-20 text-3xl font-black tabular-nums"
          :class="expired ? 'text-red-400' : running ? 'text-amber-400' : ''"
        >
          {{ (remaining / 1000).toFixed(1) }}
        </span>
        <button class="btn bg-amber-400 text-slate-900" @click="store.toggleTimer()">
          {{ startLabel }} <span class="kbd">Medzera</span>
        </button>
        <button class="btn bg-slate-600" @click="store.resetTimer()">Reset</button>
      </div>
      <p
        v-if="expired && timer.kind === 'answer'"
        class="rounded bg-red-600 px-2 py-1 font-bold"
        role="alert"
      >
        Čas vypršal – potvrď X tlačidlom „Čas vypršal“ (T).
      </p>
      <p v-else-if="expired" class="rounded bg-red-600 px-2 py-1 font-bold" role="alert">
        Čas finále vypršal – odkry odpovede.
      </p>
    </template>
    <p v-else class="text-sm text-slate-400">
      Spustí sa, keď niekto odpovedá (3 s) alebo vo finále.
    </p>
  </div>
</template>
