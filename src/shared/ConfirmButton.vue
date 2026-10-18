<script setup lang="ts">
import { onUnmounted, ref } from 'vue'

/** Button that needs a second click within a few seconds – for actions that are hard to take back. */
defineProps<{ confirmLabel?: string }>()
const emit = defineEmits<{ confirm: [] }>()

const armed = ref(false)
let timer: ReturnType<typeof setTimeout> | undefined

function click() {
  if (armed.value) {
    disarm()
    emit('confirm')
    return
  }
  armed.value = true
  timer = setTimeout(disarm, 3000)
}

function disarm() {
  armed.value = false
  clearTimeout(timer)
}

onUnmounted(disarm)
</script>

<template>
  <button class="btn" :class="armed && 'ring-2 ring-red-400'" @click="click">
    <template v-if="armed">{{ confirmLabel ?? 'Naozaj? Klikni znova' }}</template>
    <slot v-else />
  </button>
</template>
