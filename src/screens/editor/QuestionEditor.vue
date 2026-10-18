<script setup lang="ts">
import { computed } from 'vue'

import type { Answer, Question, ValidationIssue } from '@/engine'
import { emptyAnswer, sortAnswers } from '@/shared/questionDrafts'

/** One question with its answers; edits the question in place, issues come from the validator. */
const question = defineModel<Question>({ required: true })
const props = defineProps<{
  title: string
  issues: ValidationIssue[]
  /** Maximum number of answers for this question type. */
  maxAnswers: number
  removable?: boolean
}>()
defineEmits<{ remove: [] }>()

const sum = computed(() =>
  question.value.answers.reduce((total, a) => total + (Number(a.points) || 0), 0),
)
const errors = computed(() => props.issues.filter((i) => i.severity === 'error'))

function move(index: number, by: -1 | 1) {
  const answers = question.value.answers
  const target = index + by
  if (target < 0 || target >= answers.length) return
  ;[answers[index], answers[target]] = [answers[target]!, answers[index]!]
}

function setAliases(answer: Answer, value: string) {
  const aliases = value
    .split(',')
    .map((a) => a.trim())
    .filter(Boolean)
  if (aliases.length) answer.aliases = aliases
  else delete answer.aliases
}
</script>

<template>
  <section
    class="space-y-3 rounded-xl border bg-slate-800/60 p-4"
    :class="errors.length ? 'border-red-500/60' : 'border-slate-700'"
  >
    <header class="flex items-center gap-3">
      <h3 class="font-bold text-amber-400">{{ title }}</h3>
      <span v-if="!errors.length" class="text-sm text-emerald-400">✓ v poriadku</span>
      <button
        v-if="removable"
        class="btn ml-auto bg-slate-700 px-2 py-1 text-sm"
        @click="$emit('remove')"
      >
        Odstrániť otázku
      </button>
    </header>

    <input v-model="question.text" class="input mt-0 text-lg font-bold" placeholder="Text otázky" />

    <table class="w-full text-sm">
      <thead class="text-left text-slate-400">
        <tr>
          <th class="w-8">#</th>
          <th>Odpoveď</th>
          <th class="w-24">Body</th>
          <th>Synonymá (oddelené čiarkou)</th>
          <th class="w-28"></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(answer, i) in question.answers" :key="i">
          <td class="font-black text-amber-400">{{ i + 1 }}</td>
          <td class="pr-2"><input v-model="answer.text" class="input mt-0 py-1" /></td>
          <td class="pr-2">
            <input
              v-model.number="answer.points"
              type="number"
              min="1"
              max="100"
              class="input mt-0 py-1 tabular-nums"
            />
          </td>
          <td class="pr-2">
            <input
              :value="answer.aliases?.join(', ') ?? ''"
              class="input mt-0 py-1"
              @change="setAliases(answer, ($event.target as HTMLInputElement).value)"
            />
          </td>
          <td class="space-x-1 text-right whitespace-nowrap">
            <button class="btn bg-slate-700 px-2 py-1" title="Vyššie" @click="move(i, -1)">
              ↑
            </button>
            <button class="btn bg-slate-700 px-2 py-1" title="Nižšie" @click="move(i, 1)">↓</button>
            <button
              class="btn bg-slate-700 px-2 py-1"
              title="Odstrániť odpoveď"
              @click="question.answers.splice(i, 1)"
            >
              ✕
            </button>
          </td>
        </tr>
      </tbody>
    </table>

    <footer class="flex flex-wrap items-center gap-2 text-sm">
      <button
        class="btn bg-slate-700 px-3 py-1"
        :disabled="question.answers.length >= maxAnswers"
        @click="question.answers.push(emptyAnswer())"
      >
        + Odpoveď
      </button>
      <button class="btn bg-slate-700 px-3 py-1" @click="question.answers = sortAnswers(question)">
        Zoradiť podľa bodov
      </button>
      <span
        class="ml-auto tabular-nums"
        :class="sum > 100 ? 'font-bold text-red-400' : 'text-slate-400'"
      >
        súčet {{ sum }} / 100 respondentov
      </span>
    </footer>

    <ul v-if="errors.length" class="space-y-1 text-sm text-red-400">
      <li v-for="issue in errors" :key="issue.path + issue.message">{{ issue.message }}</li>
    </ul>
  </section>
</template>
