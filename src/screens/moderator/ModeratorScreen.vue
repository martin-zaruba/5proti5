<script setup lang="ts">
import { useGameStore } from '@/shared/gameStore'

import GamePanel from './GamePanel.vue'
import SetupForm from './SetupForm.vue'

const store = useGameStore()
</script>

<template>
  <main class="min-h-screen">
    <GamePanel v-if="store.state.value" />
    <template v-else>
      <p
        v-if="store.error.value"
        class="mx-auto mt-6 max-w-5xl rounded-lg bg-red-600 px-4 py-2 font-bold"
        role="alert"
      >
        {{ store.error.value }}
      </p>
      <SetupForm />
    </template>
  </main>
</template>
