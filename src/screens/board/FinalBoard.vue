<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'

import type { BoardView, FinalPrize } from '@/engine'

const props = defineProps<{ final: NonNullable<BoardView['final']>; teamName: string }>()

/* „Duplicita“ flash – only for duplicates that happen while the board is open. */
const duplicateFlash = ref(false)
let timer: ReturnType<typeof setTimeout> | undefined
watch(
  () => props.final.duplicateSignal,
  (seq, previous) => {
    if (seq <= previous) return
    duplicateFlash.value = true
    clearTimeout(timer)
    timer = setTimeout(() => (duplicateFlash.value = false), 1400)
  },
)
onUnmounted(() => clearTimeout(timer))

const euros = (n: number) => `${n.toLocaleString('sk-SK')} €`
const prizeText = (prize: FinalPrize) =>
  prize.kind === 'big'
    ? `Veľké peniaze · ${euros(prize.euros)}`
    : prize.kind === 'small'
      ? `Malé peniaze · ${euros(prize.euros)}`
      : 'Tentokrát bez výhry'

const subtitle = computed(() => {
  const f = props.final
  if (f.step === 'choosePlayers') return 'Kapitán vyberá dvoch hráčov'
  if (!f.players) return ''
  if (f.step === 'done') return `${f.players[0]} a ${f.players[1]}`
  const index = f.step === 'playerB' ? 1 : 0
  return `Odpovedá ${f.players[index]} · ${f.timeLimit} sekúnd`
})
</script>

<template>
  <div class="flex h-full flex-col gap-[1.5cqw] p-[2.5cqw]">
    <header class="text-center">
      <div class="text-[1.8cqw] font-bold text-blue-200 uppercase">
        Finále – Veľké peniaze · {{ teamName }}
      </div>
      <div class="text-[2.6cqw] font-bold">{{ subtitle }}</div>
    </header>

    <section
      class="grid min-h-0 flex-1 grid-cols-2 grid-rows-5 gap-x-[2cqw] gap-y-[1cqw] rounded-[1.5cqw] bg-blue-950/60 p-[1.5cqw]"
    >
      <template v-for="(row, i) in final.rows" :key="i">
        <div v-for="(cell, c) in [row.a, row.b]" :key="c" class="cell flex">
          <Transition name="flip">
            <div v-if="cell" class="flex flex-1 items-center">
              <span class="min-w-0 flex-1 truncate px-[1.5cqw] text-[2.6cqw] font-black uppercase">
                {{ cell.text }}
              </span>
              <span
                class="points flex h-full w-[20%] items-center justify-center text-[3cqw] font-black tabular-nums text-amber-300"
              >
                {{ cell.points }}
              </span>
            </div>
          </Transition>
        </div>
      </template>
    </section>

    <footer class="flex items-center justify-center gap-[3cqw]">
      <div class="text-[2.4cqw] font-bold text-blue-200 uppercase">Spolu</div>
      <div
        class="score rounded-[1cqw] px-[3cqw] py-[0.4cqw] text-[5cqw] leading-none font-black tabular-nums text-amber-300"
      >
        {{ final.total }}
      </div>
      <div class="text-[2.4cqw] font-bold text-blue-200">cieľ {{ final.target }}</div>
      <Transition name="fade">
        <div
          v-if="final.prize"
          class="rounded-full bg-amber-300 px-[3cqw] py-[0.6cqw] text-[2.6cqw] font-black text-blue-950 uppercase"
        >
          {{ prizeText(final.prize) }}
        </div>
      </Transition>
    </footer>

    <Transition name="fade">
      <div
        v-if="duplicateFlash"
        class="absolute inset-0 flex items-center justify-center bg-black/50"
      >
        <span class="duplicate text-[9cqw] font-black uppercase">Duplicita</span>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.cell {
  border-radius: 0.6cqw;
  border: 0.25cqw solid rgb(252 211 77 / 0.5);
  background: linear-gradient(180deg, #2563eb 0%, #1e3a8a 100%);
  box-shadow: inset 0 0.3cqw 0 rgb(255 255 255 / 0.15);
  overflow: hidden;
}
.points {
  border-left: 0.25cqw solid rgb(23 37 84 / 0.6);
  background: rgb(23 37 84 / 0.5);
}
.score {
  background: linear-gradient(180deg, rgb(30 58 138 / 0.9), rgb(23 37 84 / 0.9));
}
.duplicate {
  color: #ef4444;
  text-shadow:
    0 0 2cqw rgb(239 68 68 / 0.8),
    0 0.5cqw 0 #7f1d1d;
}
/* Text appears first, then the points (like on TV). */
.flip-enter-active {
  transition: transform 0.5s ease-out;
}
.flip-enter-active .points {
  transition: opacity 0.4s 0.8s;
}
.flip-enter-from {
  transform: rotateX(90deg);
}
.flip-enter-from .points {
  opacity: 0;
}
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.4s;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
