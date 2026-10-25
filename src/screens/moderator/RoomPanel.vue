<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'

import ConfirmButton from '@/shared/ConfirmButton.vue'
import { useHostRoom } from '@/shared/hostRoom'
import QrCode from '@/shared/QrCode.vue'
import { joinHash } from '@/shared/sync/roomApi'

/** Multi-device game (ADR 0006, T-018): room code, links and QR codes for the board and the moderator. */
const host = useHostRoom()
const router = useRouter()

const absolute = (href: string) => new URL(href, location.href).href
/** From a file opened from disk, links are of no use on another device. */
const shareable = location.protocol.startsWith('http')

const boardLink = computed(() =>
  host.room.value
    ? absolute(router.resolve({ path: '/board', query: { room: host.room.value.roomCode } }).href)
    : '',
)
const hostLink = computed(() =>
  host.room.value
    ? absolute(router.resolve({ path: '/moderator', hash: joinHash(host.room.value) }).href)
    : '',
)

const STATUS = {
  online: { text: 'pripojené', dot: 'bg-emerald-400' },
  connecting: { text: 'pripájam sa…', dot: 'bg-amber-400 animate-pulse' },
  offline: { text: 'bez spojenia – pripájam znova…', dot: 'bg-red-500 animate-pulse' },
  closed: { text: 'odpojené', dot: 'bg-slate-500' },
} as const
const status = computed(() => STATUS[host.status.value ?? 'closed'])

const showBoardQr = ref(false)
const copied = ref<string | null>(null)
async function copy(text: string, what: string) {
  try {
    await navigator.clipboard.writeText(text)
    copied.value = what
    setTimeout(() => (copied.value = null), 2000)
  } catch {
    copied.value = null
  }
}

const time = (ms: number) =>
  new Date(ms).toLocaleTimeString('sk-SK', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
</script>

<template>
  <div v-if="host.available" class="space-y-3 rounded-lg bg-slate-800 p-3">
    <h4 class="font-bold">Hra na viacerých zariadeniach</h4>

    <p
      v-if="host.error.value"
      class="flex items-start justify-between gap-2 rounded bg-red-900/70 px-3 py-2 text-sm"
      role="alert"
    >
      {{ host.error.value }}
      <button class="shrink-0 opacity-70 hover:opacity-100" @click="host.clearError()">✕</button>
    </p>

    <template v-if="!host.room.value">
      <p class="text-sm text-slate-400">
        Tabuľu otvoríš na inom zariadení (TV, projektor, mobil) cez kód alebo QR kód. Vyžaduje
        internet.
      </p>
      <button class="btn w-full bg-sky-800" :disabled="host.busy.value" @click="host.create()">
        {{ host.busy.value ? 'Zakladám miestnosť…' : 'Vytvoriť miestnosť' }}
      </button>
    </template>

    <template v-else>
      <div class="flex items-center justify-between gap-3">
        <div>
          <div class="text-xs text-slate-400 uppercase">Kód miestnosti</div>
          <div class="font-mono text-3xl font-black tracking-[0.2em] text-amber-300">
            {{ host.room.value.roomCode }}
          </div>
        </div>
        <div class="flex items-center gap-2 text-sm" :title="host.status.value ?? ''">
          <span class="size-2.5 rounded-full" :class="status.dot" />
          {{ status.text }}
        </div>
      </div>

      <p v-if="host.remoteChangeAt.value" class="rounded bg-amber-900/60 px-3 py-2 text-sm">
        Hru zmenilo iné zariadenie ({{ time(host.remoteChangeAt.value) }}).
      </p>

      <div class="space-y-2 text-sm">
        <p class="text-slate-400">Tabuľa: otvor odkaz alebo na tabuli zadaj kód.</p>
        <div class="flex gap-2">
          <input
            class="input mt-0 font-mono text-xs"
            :value="boardLink"
            readonly
            @focus="($event.target as HTMLInputElement).select()"
          />
          <button class="btn shrink-0 bg-slate-600 px-3" @click="copy(boardLink, 'board')">
            {{ copied === 'board' ? '✓' : 'Kopírovať' }}
          </button>
        </div>
        <button
          v-if="shareable"
          class="text-sky-300 underline-offset-2 hover:underline"
          @click="showBoardQr = !showBoardQr"
        >
          {{ showBoardQr ? 'Skryť QR kód' : 'Zobraziť QR kód tabule' }}
        </button>
        <QrCode v-if="showBoardQr" :value="boardLink" class="mx-auto w-48" />
      </div>

      <details class="text-sm">
        <summary class="cursor-pointer text-sky-300">Pokračovať v hre na inom zariadení</summary>
        <div class="mt-2 space-y-2">
          <p class="text-amber-200">
            Kto má tento odkaz, môže riadiť hru. Pošli ho len sebe. Otvorené zariadenie prevezme hru
            z miestnosti.
          </p>
          <div class="flex gap-2">
            <input
              class="input mt-0 font-mono text-xs"
              :value="hostLink"
              readonly
              @focus="($event.target as HTMLInputElement).select()"
            />
            <button class="btn shrink-0 bg-slate-600 px-3" @click="copy(hostLink, 'host')">
              {{ copied === 'host' ? '✓' : 'Kopírovať' }}
            </button>
          </div>
          <QrCode v-if="shareable" :value="hostLink" class="mx-auto w-48" />
        </div>
      </details>

      <div class="flex gap-2">
        <button
          class="btn flex-1 bg-slate-700 text-sm"
          :disabled="host.busy.value"
          @click="host.leave()"
        >
          Odpojiť toto zariadenie
        </button>
        <ConfirmButton
          class="flex-1 bg-red-900 text-sm"
          :disabled="host.busy.value"
          confirm-label="Ukončiť pre všetkých?"
          @confirm="host.end()"
        >
          Ukončiť miestnosť
        </ConfirmButton>
      </div>
    </template>
  </div>
</template>
