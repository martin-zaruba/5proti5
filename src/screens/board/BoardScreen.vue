<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'

import { subscribeToBoard, type BoardFeed } from '@/shared/boardSync'
import { soundCues } from '@/shared/soundCues'
import { createSoundPlayer } from '@/shared/sounds'
import { viewRemainingMs } from '@/shared/timer'

import AnswerTile from './AnswerTile.vue'
import FinalBoard from './FinalBoard.vue'
import TimerBadge from './TimerBadge.vue'

const feed = ref<BoardFeed | null>(null)
const view = computed(() => feed.value?.view ?? null)
const round = computed(() => view.value?.round ?? null)
const ranking = computed(() => view.value?.ranking ?? null)

/** Common header data for a standard round and Zoraďovačka. */
const stage = computed(() => {
  const r = round.value ?? ranking.value
  if (!r) return null
  return {
    label: r.label,
    bank: r.bank,
    strikes: round.value?.strikes ?? 0,
    activeTeam: r.activeTeam,
    question: r.question,
  }
})

/* Big X flash – only for strikes that happen while the board is open. */
const strikeFlash = ref(0)
let flashTimer: ReturnType<typeof setTimeout> | undefined
watch(
  () => view.value?.strikeSignal.seq,
  (seq, previous) => {
    if (seq === undefined || previous === undefined || seq <= previous) return
    strikeFlash.value = view.value!.strikeSignal.count
    clearTimeout(flashTimer)
    flashTimer = setTimeout(() => (strikeFlash.value = 0), 1400)
  },
)

/* ---------- sounds: only the board window plays them (T-009) ---------- */
const sounds = createSoundPlayer()
const muted = computed(() => feed.value?.muted ?? false)
const audioReady = ref(false)
/** Browsers allow audio only after a click or key press in this window. */
async function unlockAudio() {
  await sounds.unlock()
  audioReady.value = sounds.ready
}
watch(view, (next, prev) => {
  if (muted.value) return
  for (const cue of soundCues(prev, next)) sounds.play(cue)
})

/* ---------- countdown ---------- */
const timer = computed(() => feed.value?.timer ?? null)
const now = ref(Date.now())
let frame = 0
let expiredAt: number | null = null
function tick() {
  now.value = Date.now()
  const t = timer.value
  if (
    t?.running &&
    t.endsAt !== null &&
    viewRemainingMs(t, now.value) === 0 &&
    expiredAt !== t.endsAt
  ) {
    expiredAt = t.endsAt
    if (!muted.value) sounds.play('timeUp')
  }
  frame = requestAnimationFrame(tick)
}
/** Answer timer shows only once started; the final timer is always visible during answers. */
const showTimer = computed(() => {
  const t = timer.value
  if (!t) return false
  return t.kind === 'final' || t.running || viewRemainingMs(t, now.value) < t.durationMs
})

const isFullscreen = ref(false)
const onFullscreenChange = () => (isFullscreen.value = document.fullscreenElement !== null)
const toggleFullscreen = () =>
  document.fullscreenElement
    ? document.exitFullscreen()
    : document.documentElement.requestFullscreen()

let unsubscribe = () => {}
onMounted(() => {
  unsubscribe = subscribeToBoard((f) => (feed.value = f))
  document.addEventListener('fullscreenchange', onFullscreenChange)
  window.addEventListener('pointerdown', unlockAudio)
  window.addEventListener('keydown', unlockAudio)
  frame = requestAnimationFrame(tick)
})
onUnmounted(() => {
  unsubscribe()
  clearTimeout(flashTimer)
  cancelAnimationFrame(frame)
  document.removeEventListener('fullscreenchange', onFullscreenChange)
  window.removeEventListener('pointerdown', unlockAudio)
  window.removeEventListener('keydown', unlockAudio)
})

/** Ranks 1–3 in the left column, 4–6 in the right (like the TV board). */
const rows = computed(() => Math.ceil((round.value?.slots.length ?? 0) / 2))

const banner = computed(() => {
  const v = view.value
  const k = ranking.value
  if (v && k) {
    if (v.phase === 'rankingEnd') return `${v.teams[k.winner!]!.name} získava ${k.bank} bodov`
    if (k.activeTeam === null) return 'Začínajúce družstvo určí moderátor'
    return `Hľadá sa ${k.target}. miesto – tipuje ${v.teams[k.activeTeam]!.name}`
  }
  const r = round.value
  if (!v || !r) return null
  if (v.phase === 'roundEnd') {
    if (r.tie) return `Remíza – ${r.number}. kolo sa opakuje s novou otázkou`
    const verb = r.outcome === 'stolen' ? 'kradne' : 'získava'
    return `${v.teams[r.winner!]!.name} ${verb} ${r.bank} bodov`
  }
  if (v.phase === 'steal') return `Krádež! Odpovedá kapitán – ${v.teams[r.activeTeam!]!.name}`
  if (v.phase === 'faceOff' && r.replay) return 'Nová otázka'
  return null
})

const TEAM_TEXT = ['text-sky-300', 'text-orange-300'] as const
</script>

<template>
  <main
    class="flex h-screen w-screen items-center justify-center overflow-hidden bg-black select-none"
  >
    <div
      class="board @container relative aspect-video w-[min(100vw,177.78vh)] overflow-hidden text-white"
    >
      <!-- Intro / waiting -->
      <div
        v-if="!view || view.phase === 'intro'"
        class="flex h-full flex-col items-center justify-center gap-[3cqw]"
      >
        <h1 class="logo text-[11cqw] leading-none font-black">5 proti 5</h1>
        <p v-if="view" class="text-[3.5cqw] font-bold">
          <span :class="TEAM_TEXT[0]">{{ view.teams[0]!.name }}</span>
          <span class="mx-[2cqw] text-amber-300">vs.</span>
          <span :class="TEAM_TEXT[1]">{{ view.teams[1]!.name }}</span>
        </p>
        <p v-else class="text-[2cqw] text-blue-200">Čaká sa na moderátora…</p>
      </div>

      <!-- Game over -->
      <div
        v-else-if="view.phase === 'gameOver'"
        class="flex h-full flex-col items-center justify-center gap-[2cqw] text-center"
      >
        <h1 v-if="view.winner === null" class="logo text-[9cqw] leading-none font-black">Remíza</h1>
        <template v-else>
          <p class="text-[3cqw] font-bold text-blue-200 uppercase">Víťazom sa stáva</p>
          <h1 class="logo text-[9cqw] leading-none font-black">
            {{ view.teams[view.winner]!.name }}
          </h1>
        </template>
        <p class="text-[4cqw] font-black tabular-nums">
          {{ view.teams[0]!.score }} : {{ view.teams[1]!.score }}
        </p>
        <p v-if="view.final?.prize" class="text-[3cqw] font-bold text-amber-300">
          Finále {{ view.final.total }} b. ·
          {{
            view.final.prize.kind === 'none'
              ? 'bez výhry'
              : `výhra ${view.final.prize.euros.toLocaleString('sk-SK')} €`
          }}
        </p>
      </div>

      <!-- Final -->
      <FinalBoard
        v-else-if="view.phase === 'final' && view.final"
        :final="view.final"
        :team-name="view.teams[view.final.team]!.name"
        :timer="showTimer ? timer : null"
        :now="now"
      />

      <!-- Round or Zoraďovačka -->
      <div v-else-if="stage" class="flex h-full flex-col gap-[1.5cqw] p-[2.5cqw]">
        <header class="grid grid-cols-[1fr_auto_1fr] items-center gap-[2cqw]">
          <div
            v-for="t in [0, 1] as const"
            :key="t"
            class="score rounded-[1cqw] px-[2cqw] py-[1cqw] transition"
            :class="[stage.activeTeam === t && 'active-team', t === 1 ? 'order-3 text-right' : '']"
          >
            <div class="truncate text-[2.2cqw] font-bold" :class="TEAM_TEXT[t]">
              {{ view.teams[t]!.name }}
            </div>
            <div class="text-[5.5cqw] leading-none font-black tabular-nums">
              {{ view.teams[t]!.score }}
            </div>
          </div>
          <div class="order-2 flex min-w-[30cqw] flex-col items-center">
            <div class="text-[1.8cqw] font-bold text-blue-200 uppercase">{{ stage.label }}</div>
            <div
              class="score relative rounded-[1cqw] px-[3cqw] py-[0.6cqw] text-[5.5cqw] leading-none font-black text-amber-300 tabular-nums"
            >
              {{ stage.bank }}
              <TimerBadge
                v-if="showTimer && timer"
                :timer="timer"
                :now="now"
                class="absolute top-0 left-full ml-[1.5cqw] text-[3cqw]"
              />
            </div>
            <div
              class="mt-[0.5cqw] flex h-[3cqw] gap-[0.8cqw] text-[3cqw] leading-none font-black text-red-500"
            >
              <span v-for="i in stage.strikes" :key="i">✗</span>
            </div>
          </div>
        </header>

        <p v-if="stage.question" class="text-center text-[2.6cqw] leading-tight font-bold">
          {{ stage.question }}
        </p>

        <section
          v-if="round"
          class="grid min-h-0 flex-1 grid-flow-col grid-cols-2 gap-x-[2cqw] gap-y-[1.2cqw] rounded-[1.5cqw] bg-blue-950/60 p-[1.5cqw]"
          :style="{ gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))` }"
        >
          <AnswerTile v-for="tile in round.slots" :key="tile.rank" :tile="tile" />
        </section>

        <!-- Zoraďovačka: all answers (left) are placed on the ladder (right) from the bottom -->
        <section
          v-else-if="ranking"
          class="grid min-h-0 flex-1 grid-cols-[2fr_3fr] gap-x-[2cqw] gap-y-[0.8cqw] rounded-[1.5cqw] bg-blue-950/60 p-[1.5cqw]"
          :style="{ gridTemplateRows: `repeat(${ranking.slots.length}, minmax(0, 1fr))` }"
        >
          <ul class="col-start-1 row-span-full grid grid-rows-subgrid">
            <li
              v-for="answer in ranking.answers"
              :key="answer.text"
              class="flex min-h-0 items-center truncate rounded-[0.6cqw] border-[0.2cqw] px-[1.2cqw] text-[2.2cqw] font-black uppercase transition duration-500"
              :class="
                answer.placed
                  ? 'border-transparent text-blue-300/40 line-through'
                  : 'border-amber-300/50 bg-blue-900/70'
              "
            >
              {{ answer.text }}
            </li>
          </ul>
          <div class="col-start-2 row-span-full grid grid-rows-subgrid">
            <AnswerTile
              v-for="tile in ranking.slots"
              :key="tile.rank"
              :tile="tile"
              :highlight="tile.rank === ranking.target && view.phase === 'ranking'"
              compact
            />
          </div>
        </section>

        <div class="flex h-[5cqw] items-center justify-center">
          <Transition name="fade" mode="out-in">
            <p
              v-if="banner"
              :key="banner"
              class="rounded-full bg-amber-300 px-[3cqw] py-[0.6cqw] text-[2.4cqw] font-black text-blue-950 uppercase"
            >
              {{ banner }}
            </p>
          </Transition>
        </div>
      </div>

      <!-- Big X flash -->
      <Transition name="strike">
        <div
          v-if="strikeFlash"
          class="absolute inset-0 flex items-center justify-center gap-[3cqw] bg-black/40"
        >
          <span
            v-for="i in strikeFlash"
            :key="i"
            class="strike text-[24cqw] leading-none font-black"
            >✗</span
          >
        </div>
      </Transition>

      <button
        v-if="!muted && !audioReady"
        class="absolute bottom-[1cqw] left-[1cqw] rounded bg-white/15 px-3 py-1 text-sm transition hover:bg-white/30"
      >
        🔈 Klikni sem (alebo stlač kláves) pre zapnutie zvuku
      </button>

      <button
        v-if="!isFullscreen"
        class="absolute top-[1cqw] right-[1cqw] rounded bg-white/10 px-3 py-1 text-sm opacity-40 transition hover:opacity-100"
        @click="toggleFullscreen"
      >
        Celá obrazovka
      </button>
    </div>
  </main>
</template>

<style scoped>
.board {
  background:
    radial-gradient(ellipse at 50% 0%, rgb(59 130 246 / 0.45), transparent 60%),
    radial-gradient(ellipse at 50% 100%, rgb(245 158 11 / 0.18), transparent 55%),
    linear-gradient(180deg, #0b1a4a 0%, #050b24 100%);
}
.score {
  background: linear-gradient(180deg, rgb(30 58 138 / 0.9), rgb(23 37 84 / 0.9));
  box-shadow: inset 0 0.2cqw 0 rgb(255 255 255 / 0.12);
}
/* Team on turn: thick green frame with a glow (Tailwind's ring would lose to the box-shadow above). */
.score.active-team {
  box-shadow:
    inset 0 0.2cqw 0 rgb(255 255 255 / 0.12),
    0 0 0 0.6cqw #34d399,
    0 0 3cqw 0.6cqw rgb(52 211 153 / 0.55);
}
.logo {
  background: linear-gradient(180deg, #fde68a, #f59e0b);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  filter: drop-shadow(0 0.4cqw 0 rgb(0 0 0 / 0.5));
}
.strike {
  color: #ef4444;
  text-shadow:
    0 0 2cqw rgb(239 68 68 / 0.8),
    0 0.5cqw 0 #7f1d1d;
}
.strike-enter-active {
  transition: all 0.15s ease-out;
}
.strike-leave-active {
  transition: opacity 0.4s ease-in;
}
.strike-enter-from {
  opacity: 0;
  transform: scale(1.4);
}
.strike-leave-to {
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
