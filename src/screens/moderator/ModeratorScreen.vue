<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'

import { useGameStore } from '@/shared/gameStore'
import { useHostRoom } from '@/shared/hostRoom'
import { parseJoinHash } from '@/shared/sync/roomApi'

import GamePanel from './GamePanel.vue'
import RoomPanel from './RoomPanel.vue'
import SetupForm from './SetupForm.vue'

const store = useGameStore()
const host = useHostRoom()

// Opened from „Pokračovať v hre na inom zariadení“: join the room, then drop the token from the address.
const route = useRoute()
const joining = host.available ? parseJoinHash(route.hash) : null
if (joining) {
  host.join(joining)
  void useRouter().replace({ path: route.path, query: route.query, hash: '' })
}
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
      <div v-if="host.available" class="mx-auto max-w-5xl px-6 pt-6">
        <RoomPanel class="max-w-md" />
      </div>
      <SetupForm />
    </template>
  </main>
</template>
