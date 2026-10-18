<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import {
  canPlayFinal,
  currentTurns,
  finalTotal,
  isLastRound,
  isTieAfterLastRound,
  leadsToRanking,
  MAX_STRIKES,
  otherTeam,
  prizeLabel,
  requireProfile,
  type GameAction,
  type GameState,
  type TeamIndex,
} from '@/engine'
import { useGameStore } from '@/shared/gameStore'

import ConfirmButton from '@/shared/ConfirmButton.vue'
import FinalPanel from './FinalPanel.vue'
import RankingAnswers from './RankingAnswers.vue'
import TimerControl from './TimerControl.vue'

const store = useGameStore()
const router = useRouter()
// The panel is only rendered while a game exists.
const state = computed(() => store.state.value as GameState)
const round = computed(() => state.value.round)
const ranking = computed(() => state.value.ranking)
const profile = computed(() => requireProfile(state.value.profileId))
const turns = computed(() => currentTurns(state.value))
const phase = computed(() => state.value.phase)
const act = (action: GameAction) => store.act(action)

const TEAM_TEXT = ['text-sky-400', 'text-orange-400'] as const
const TEAM_BG = ['bg-sky-500', 'bg-orange-500'] as const
const TEAM_BORDER = ['border-sky-500', 'border-orange-500'] as const

const teamName = (team: TeamIndex) => state.value.teams[team].name
const player = (team: TeamIndex, position: number) =>
  `${state.value.teams[team].players[position - 1]} (poz. ${position}${position === profile.value.captainPosition ? ', kapitán' : ''})`
const isOnTurn = (team: TeamIndex, position: number) =>
  turns.value.some((t) => t.team === team && t.position === position)
const isActiveTeam = (team: TeamIndex) => turns.value.length === 1 && turns.value[0]!.team === team

const status = computed(() => {
  const r = round.value
  const turn = turns.value[0]
  switch (phase.value) {
    case 'intro':
      return 'Hra je pripravená. Spusti 1. kolo.'
    case 'faceOff':
      return r?.buzzed === null
        ? 'Súboj pri pulte – prečítaj otázku a zaznač, kto stlačil tlačidlo prvý.'
        : `Súboj – odpovedá ${teamName(turn!.team)}: ${player(turn!.team, turn!.position)}`
    case 'play':
      return `Hrá ${teamName(turn!.team)} – odpovedá ${player(turn!.team, turn!.position)}`
    case 'steal':
      return `Krádež – odpovedá kapitán družstva ${teamName(turn!.team)}, súper sa smie radiť`
    case 'roundEnd': {
      const outcome = {
        cleared: 'odkryli všetky odpovede',
        stolen: 'úspešná krádež',
        stealFailed: 'neúspešná krádež',
      }[r!.outcome!]
      return `Kolo získava ${teamName(r!.winner!)} (+${r!.bank} b.) – ${outcome}`
    }
    case 'ranking':
      return turn
        ? `Zoraďovačka – tipuje ${teamName(turn.team)}: ${player(turn.team, turn.position)}, séria ${ranking.value!.bank} b.`
        : 'Zoraďovačka – skóre je rovnaké, vyber družstvo, ktoré začína.'
    case 'rankingEnd':
      return `Zoraďovačka je kompletná – ${teamName(ranking.value!.winner!)} získava ${ranking.value!.bank} b.`
    case 'final': {
      const f = state.value.final!
      if (f.step === 'choosePlayers')
        return `Finále – kapitán družstva ${teamName(f.team)} vyberá dvoch hráčov`
      if (f.step === 'done') return `Finále skončilo – ${prizeLabel(f.prize!)}`
      return `Finále – odpovedá ${player(turn!.team, turn!.position)}`
    }
    default:
      return `Koniec hry – vyhráva ${teamName(state.value.winner!)}`
  }
})

const revealLabel = computed(() => {
  switch (phase.value) {
    case 'faceOff':
      return 'Trafil'
    case 'steal':
      return 'Krádež trafil'
    case 'roundEnd':
      return 'Ukázať'
    default:
      return 'Odkryť'
  }
})
const canReveal = computed(
  () =>
    (phase.value === 'faceOff' && round.value?.buzzed !== null) ||
    ['play', 'steal', 'roundEnd'].includes(phase.value),
)
const canMiss = computed(
  () =>
    (phase.value === 'faceOff' && round.value?.buzzed !== null) ||
    phase.value === 'play' ||
    phase.value === 'steal' ||
    (phase.value === 'ranking' && ranking.value?.control !== null),
)
const canAdvance = computed(
  () =>
    ['intro', 'roundEnd', 'rankingEnd'].includes(phase.value) ||
    (phase.value === 'final' && state.value.final?.step === 'done'),
)
const tie = computed(() => isTieAfterLastRound(state.value))
const nextLabel = computed(() => {
  if (phase.value === 'intro') return 'Spustiť 1. kolo'
  if (phase.value === 'rankingEnd') return `Spustiť ${profile.value.ranking!.afterRound + 1}. kolo`
  if (phase.value === 'final') return 'Ukončiť hru'
  if (tie.value) return 'Remíza – opakovať 5. kolo'
  const set = store.session.value!.questionSet
  if (round.value && leadsToRanking(state.value, round.value, set)) return 'Spustiť Zoraďovačku'
  if (round.value && isLastRound(state.value, round.value)) {
    return canPlayFinal(profile.value, set.final) ? 'Spustiť finále' : 'Ukončiť hru'
  }
  return `Spustiť ${(round.value?.number ?? 0) + 1}. kolo`
})

/* ---------- manual score correction ---------- */
const correctionTeam = ref<TeamIndex>(0)
const correctionAmount = ref(10)
function correct(sign: 1 | -1) {
  act({ type: 'adjustScore', team: correctionTeam.value, delta: sign * correctionAmount.value })
}

/* ---------- board window ---------- */
function openBoard() {
  // Through the router, so it works with web and hash (file://) URLs alike.
  window.open(router.resolve('/board').href, '5proti5-board', 'popup,width=1280,height=720')
}

/* ---------- keyboard shortcuts ---------- */
function onKey(event: KeyboardEvent) {
  const target = event.target as HTMLElement
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
    event.preventDefault()
    store.undo()
    return
  }
  if (event.ctrlKey || event.metaKey || event.altKey) return
  if (event.key === ' ') {
    event.preventDefault()
    store.toggleTimer()
    return
  }
  const key = event.key.toLowerCase()
  const digit = Number(key)
  if (phase.value === 'ranking' && ranking.value) {
    // Digits pick answers in board order; A / L choose the starting team on a tie.
    const rank = ranking.value.displayOrder[digit - 1]
    if (digit >= 1 && rank !== undefined && canMiss.value) act({ type: 'rankingGuess', rank })
    else if ((key === 'a' || key === 'l') && ranking.value.control === null)
      act({ type: 'chooseStartingTeam', team: key === 'a' ? 0 : 1 })
    else if (key === 'x' && canMiss.value) act({ type: 'wrongAnswer' })
    else if (key === 't' && canMiss.value) act({ type: 'timeout' })
    else return
    event.preventDefault()
    return
  }
  if (digit >= 1 && digit <= 6 && canReveal.value) act({ type: 'revealAnswer', rank: digit })
  else if (key === 'a' && phase.value === 'faceOff') act({ type: 'buzz', team: 0 })
  else if (key === 'l' && phase.value === 'faceOff') act({ type: 'buzz', team: 1 })
  else if (key === 'x' && canMiss.value) act({ type: 'wrongAnswer' })
  else if (key === 't' && canMiss.value) act({ type: 'timeout' })
  else if (key === 'r' && phase.value === 'roundEnd') act({ type: 'revealRemaining' })
  else if (key === 'n' && canAdvance.value) act({ type: 'nextRound' })
  else return
  event.preventDefault()
}
onMounted(() => window.addEventListener('keydown', onKey))
onUnmounted(() => window.removeEventListener('keydown', onKey))

const log = computed(() => [...(store.session.value?.log ?? [])].reverse())
const time = (iso: string) => new Date(iso).toLocaleTimeString('sk-SK')
</script>

<template>
  <div class="mx-auto flex max-w-7xl flex-col gap-4 p-4">
    <!-- Scoreboard -->
    <section class="grid grid-cols-[1fr_auto_1fr] items-stretch gap-4">
      <div
        v-for="t in [0, 1] as const"
        :key="t"
        class="rounded-xl border-2 bg-slate-800 p-3 transition"
        :class="[isActiveTeam(t) ? TEAM_BORDER[t] : 'border-transparent', t === 1 && 'order-3']"
      >
        <div class="flex items-baseline justify-between gap-2">
          <h2 class="truncate text-xl font-black" :class="TEAM_TEXT[t]">{{ teamName(t) }}</h2>
          <span class="text-4xl font-black tabular-nums">{{ state.teams[t].score }}</span>
        </div>
        <ol class="mt-2 grid grid-cols-5 gap-1 text-center text-xs">
          <li
            v-for="(name, p) in state.teams[t].players"
            :key="p"
            class="truncate rounded px-1 py-1"
            :class="
              isOnTurn(t, p + 1) ? [TEAM_BG[t], 'font-bold text-slate-900'] : 'bg-slate-700/60'
            "
            :title="name"
          >
            {{ p + 1 }}. {{ name }}
          </li>
        </ol>
      </div>
      <div
        class="order-2 flex min-w-48 flex-col items-center justify-center rounded-xl bg-slate-800 px-4"
      >
        <template v-if="round">
          <div class="text-sm text-slate-400">
            {{ profile.standardRounds[round.index]!.label }}
          </div>
          <div class="text-sm font-bold text-amber-400">násobok ×{{ round.multiplier }}</div>
          <div class="text-3xl font-black tabular-nums">bank {{ round.bank }}</div>
          <div class="flex gap-1 text-2xl font-black">
            <span
              v-for="i in MAX_STRIKES"
              :key="i"
              :class="i <= round.strikes ? 'text-red-500' : 'text-slate-600'"
              >✗</span
            >
          </div>
        </template>
        <template v-else-if="ranking">
          <div class="text-sm text-slate-400">Bonusové kolo</div>
          <div class="text-sm font-bold text-amber-400">Zoraďovačka ×1</div>
          <div class="text-3xl font-black tabular-nums">séria {{ ranking.bank }}</div>
        </template>
        <template v-else-if="state.final">
          <div class="text-sm text-slate-400">Finále</div>
          <div class="text-sm font-bold text-amber-400">Veľké peniaze</div>
          <div class="text-3xl font-black tabular-nums">
            {{ finalTotal(state.final) }} / {{ profile.final!.target }}
          </div>
        </template>
        <div v-else class="text-slate-400">Úvod</div>
      </div>
    </section>

    <!-- Status line -->
    <p
      class="rounded-lg px-4 py-3 text-lg font-bold"
      :class="
        phase === 'steal'
          ? 'bg-red-900/60'
          : phase === 'roundEnd' || phase === 'rankingEnd' || state.final?.step === 'done'
            ? 'bg-emerald-900/60'
            : 'bg-slate-800'
      "
    >
      {{ status }}
      <span
        v-if="round?.replay && phase === 'faceOff' && !round.attempts.length"
        class="ml-2 text-amber-400"
      >
        (náhradná otázka{{ round.replay === 'tie' ? ' – remíza po 5. kole' : '' }})
      </span>
    </p>

    <p
      v-if="store.error.value"
      class="flex items-center justify-between rounded-lg bg-red-600 px-4 py-2 font-bold"
      role="alert"
    >
      {{ store.error.value }}
      <button class="btn bg-red-800 py-1" @click="store.clearError()">OK</button>
    </p>

    <div class="grid gap-4 lg:grid-cols-[2fr_1fr]">
      <!-- Question and answers -->
      <section class="space-y-3">
        <template v-if="round">
          <h3 class="text-2xl font-bold">{{ round.question.text }}</h3>
          <ol class="space-y-2">
            <li
              v-for="(answer, i) in round.question.answers"
              :key="i"
              class="flex items-center gap-3 rounded-lg border px-3 py-2"
              :class="
                round.revealed[i]
                  ? round.revealed[i]!.by === null
                    ? 'border-slate-700 bg-slate-800/40 text-slate-400'
                    : ['bg-slate-800', TEAM_BORDER[round.revealed[i]!.by!]]
                  : 'border-slate-600 bg-slate-800'
              "
            >
              <span class="w-6 text-center text-xl font-black text-amber-400">{{ i + 1 }}</span>
              <span class="flex-1">
                <span class="text-lg font-bold">{{ answer.text }}</span>
                <span v-if="answer.aliases?.length" class="ml-2 text-sm text-slate-400">
                  ({{ answer.aliases.join(', ') }})
                </span>
              </span>
              <span class="w-20 text-right tabular-nums">
                {{ answer.points }}
                <span v-if="round.multiplier > 1" class="text-sm text-amber-400"
                  >×{{ round.multiplier }}</span
                >
              </span>
              <span v-if="round.revealed[i]" class="w-28 text-right text-sm">
                <template v-if="round.revealed[i]!.by !== null">
                  <span :class="TEAM_TEXT[round.revealed[i]!.by!]">{{
                    teamName(round.revealed[i]!.by!)
                  }}</span>
                  +{{ round.revealed[i]!.points }}
                </template>
                <template v-else>bez bodov</template>
              </span>
              <button
                v-else
                class="btn w-28 bg-emerald-500 text-slate-900"
                :disabled="!canReveal"
                @click="act({ type: 'revealAnswer', rank: i + 1 })"
              >
                {{ revealLabel }} <span class="kbd">{{ i + 1 }}</span>
              </button>
            </li>
          </ol>
        </template>
        <RankingAnswers v-else-if="ranking" />
        <FinalPanel v-else-if="state.final && phase === 'final'" />

        <!-- Main controls -->
        <div class="flex flex-wrap gap-2 pt-2">
          <template v-if="phase === 'faceOff' && round?.buzzed === null">
            <button
              class="btn bg-sky-500 py-4 text-lg text-slate-900"
              @click="act({ type: 'buzz', team: 0 })"
            >
              Prvý stlačil: {{ teamName(0) }} <span class="kbd">A</span>
            </button>
            <button
              class="btn bg-orange-500 py-4 text-lg text-slate-900"
              @click="act({ type: 'buzz', team: 1 })"
            >
              Prvý stlačil: {{ teamName(1) }} <span class="kbd">L</span>
            </button>
          </template>
          <template v-if="canMiss">
            <button class="btn bg-red-600 py-4 text-lg" @click="act({ type: 'wrongAnswer' })">
              ✗ Nesprávne <span class="kbd">X</span>
            </button>
            <button class="btn bg-red-800 py-4 text-lg" @click="act({ type: 'timeout' })">
              Čas vypršal <span class="kbd">T</span>
            </button>
          </template>
          <ConfirmButton
            v-if="phase === 'play'"
            class="bg-red-950 py-4 text-lg"
            @confirm="act({ type: 'penaltyConferring' })"
          >
            Penalizácia za radenie sa
          </ConfirmButton>
          <template v-if="phase === 'roundEnd'">
            <button
              class="btn bg-slate-600 py-4 text-lg"
              :disabled="round!.revealed.every((r) => r)"
              @click="act({ type: 'revealRemaining' })"
            >
              Odkryť zvyšné <span class="kbd">R</span>
            </button>
          </template>
          <button
            v-if="canAdvance"
            class="btn bg-amber-400 py-4 text-lg text-slate-900"
            @click="act({ type: 'nextRound' })"
          >
            {{ nextLabel }} <span class="kbd">N</span>
          </button>
          <template v-if="phase === 'gameOver'">
            <p class="text-2xl font-black text-amber-400">
              Víťaz: {{ teamName(state.winner!) }} ({{ state.teams[state.winner!].score }} :
              {{ state.teams[otherTeam(state.winner!)].score }})
            </p>
            <p v-if="state.final?.prize" class="text-xl font-bold">
              Finále: {{ finalTotal(state.final) }} b. – {{ prizeLabel(state.final.prize) }}
            </p>
          </template>
        </div>
      </section>

      <!-- Tools -->
      <aside class="space-y-4">
        <div class="flex flex-wrap gap-2">
          <button class="btn bg-slate-600" :disabled="!store.canUndo.value" @click="store.undo()">
            ↶ Späť <span class="kbd">Ctrl+Z</span>
          </button>
          <button class="btn bg-sky-800" @click="openBoard">Otvoriť tabuľu</button>
          <label class="btn cursor-pointer bg-slate-700 font-normal">
            <input
              type="checkbox"
              :checked="state.showQuestion"
              @change="
                act({ type: 'setShowQuestion', show: ($event.target as HTMLInputElement).checked })
              "
            />
            Otázka na tabuli
          </label>
        </div>

        <TimerControl />

        <div v-if="round && phase !== 'gameOver'" class="rounded-lg bg-slate-800 p-3">
          <ConfirmButton class="w-full bg-red-900" @confirm="act({ type: 'voidQuestion' })">
            Anulovať otázku (skóre spred kola + nová otázka)
          </ConfirmButton>
        </div>

        <div class="space-y-2 rounded-lg bg-slate-800 p-3">
          <h4 class="font-bold">Ručná korekcia skóre</h4>
          <div class="flex gap-2">
            <select v-model.number="correctionTeam" class="input mt-0">
              <option :value="0">{{ teamName(0) }}</option>
              <option :value="1">{{ teamName(1) }}</option>
            </select>
            <input
              v-model.number="correctionAmount"
              type="number"
              min="1"
              class="input mt-0 w-24"
            />
            <button class="btn bg-slate-600" @click="correct(1)">+</button>
            <button class="btn bg-slate-600" @click="correct(-1)">−</button>
          </div>
        </div>

        <div class="rounded-lg bg-slate-800 p-3">
          <h4 class="mb-2 font-bold">Priebeh hry</h4>
          <ol class="max-h-80 space-y-1 overflow-y-auto text-sm">
            <li v-for="(entry, i) in log" :key="log.length - i" class="flex gap-2">
              <span class="shrink-0 text-slate-500 tabular-nums">{{ time(entry.at) }}</span>
              <span>{{ entry.text }}</span>
            </li>
          </ol>
        </div>

        <ConfirmButton
          class="w-full bg-slate-700"
          confirm-label="Zahodiť hru? Klikni znova"
          @confirm="store.endGame()"
        >
          Nová hra
        </ConfirmButton>

        <details class="text-sm text-slate-400">
          <summary class="cursor-pointer">Klávesové skratky</summary>
          <ul class="mt-2 space-y-1">
            <li>
              <span class="kbd">A</span> / <span class="kbd">L</span> – tlačidlo stlačilo 1. / 2.
              družstvo
            </li>
            <li>
              <span class="kbd">1</span>–<span class="kbd">6</span> – trafená odpoveď (odkryť)
            </li>
            <li><span class="kbd">X</span> nesprávne, <span class="kbd">T</span> čas vypršal</li>
            <li>
              <span class="kbd">R</span> odkryť zvyšné, <span class="kbd">N</span> ďalšie kolo
            </li>
            <li>
              Zoraďovačka: <span class="kbd">1</span>–<span class="kbd">9</span> tip podľa poradia v
              zozname, <span class="kbd">A</span> / <span class="kbd">L</span> začínajúce družstvo
              pri rovnosti
            </li>
            <li>
              <span class="kbd">Medzera</span> časovač (odpoveď 3 s: štart od začiatku; finále:
              štart / pauza)
            </li>
            <li><span class="kbd">Ctrl+Z</span> späť</li>
          </ul>
        </details>
      </aside>
    </div>
  </div>
</template>
