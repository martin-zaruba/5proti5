<script setup lang="ts">
import { computed } from 'vue'

import { viewRemainingMs, type TimerView } from '@/shared/timer'

/** Round countdown: whole seconds inside a shrinking ring, red „ČAS!“ when it runs out. */
const props = defineProps<{ timer: TimerView; now: number }>()

const remaining = computed(() => viewRemainingMs(props.timer, props.now))
const expired = computed(() => remaining.value === 0)
const fraction = computed(() => remaining.value / props.timer.durationMs)
const seconds = computed(() => Math.ceil(remaining.value / 1000))
</script>

<template>
  <div
    class="ring-badge flex aspect-square h-full items-center justify-center rounded-full font-black tabular-nums"
    :class="expired ? 'expired text-white' : 'text-amber-300'"
    :style="{ '--fraction': fraction }"
  >
    <span class="inner flex aspect-square h-[82%] items-center justify-center rounded-full">
      {{ expired ? 'ČAS!' : seconds }}
    </span>
  </div>
</template>

<style scoped>
.ring-badge {
  background: conic-gradient(#fcd34d calc(var(--fraction) * 360deg), rgb(23 37 84 / 0.8) 0);
}
.inner {
  background: linear-gradient(180deg, #1e3a8a, #172554);
}
.expired {
  background: #ef4444;
  animation: pulse-expired 0.6s ease-in-out infinite alternate;
}
.expired .inner {
  background: #b91c1c;
}
@keyframes pulse-expired {
  to {
    transform: scale(1.08);
  }
}
</style>
