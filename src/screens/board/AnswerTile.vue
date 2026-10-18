<script setup lang="ts">
import type { BoardSlot } from '@/engine'

/** `compact` = smaller text for the Zoraďovačka ladder; `highlight` = the rank being guessed. */
defineProps<{ tile: BoardSlot; compact?: boolean; highlight?: boolean }>()
</script>

<template>
  <div class="h-full perspective-distant">
    <div
      class="relative h-full transition-transform duration-700 ease-out transform-3d"
      :class="tile.answer && 'rotate-x-180'"
    >
      <!-- Hidden side: rank number -->
      <div
        class="tile absolute inset-0 flex items-center justify-center backface-hidden"
        :class="highlight && 'target'"
      >
        <span
          class="flex aspect-square h-[70%] items-center justify-center rounded-full border-[0.25cqw] border-amber-300/70 bg-blue-950 font-black text-amber-300"
          :class="compact ? 'text-[2.2cqw]' : 'text-[3.4cqw]'"
        >
          {{ tile.rank }}
        </span>
      </div>
      <!-- Revealed side: answer and points -->
      <div
        class="tile absolute inset-0 flex rotate-x-180 items-center backface-hidden"
        :class="tile.answer && !tile.answer.scored && 'opacity-60 saturate-50'"
      >
        <span
          class="min-w-0 flex-1 truncate px-[1.5cqw] font-black uppercase"
          :class="compact ? 'text-[2.2cqw]' : 'text-[3cqw]'"
        >
          {{ tile.answer?.text }}
        </span>
        <span
          class="flex h-full w-[18%] items-center justify-center border-l-[0.25cqw] border-blue-950/60 bg-blue-950/50 font-black tabular-nums text-amber-300"
          :class="compact ? 'text-[2.4cqw]' : 'text-[3.4cqw]'"
        >
          {{ tile.answer?.points }}
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tile {
  border-radius: 0.6cqw;
  border: 0.25cqw solid rgb(252 211 77 / 0.5);
  background: linear-gradient(180deg, #2563eb 0%, #1e3a8a 100%);
  box-shadow:
    inset 0 0.3cqw 0 rgb(255 255 255 / 0.15),
    0 0.4cqw 1.2cqw rgb(0 0 0 / 0.45);
}
.target {
  border-color: #fcd34d;
  animation: pulse-target 1.4s ease-in-out infinite;
}
@keyframes pulse-target {
  50% {
    box-shadow:
      0 0 0 0.3cqw rgb(252 211 77 / 0.7),
      0 0 2cqw rgb(252 211 77 / 0.5);
  }
}
</style>
