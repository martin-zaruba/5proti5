<script setup lang="ts">
import { computed } from 'vue'
import { renderSVG } from 'uqr'

/** QR code of a link, drawn as SVG (dark modules on white – phones read it best that way). */
const props = defineProps<{ value: string }>()

const svg = computed(() => renderSVG(props.value, { border: 2 }))
</script>

<template>
  <!-- eslint-disable-next-line vue/no-v-html -- SVG generated locally from our own link -->
  <div class="aspect-square rounded bg-white [&>svg]:h-full [&>svg]:w-full" v-html="svg" />
</template>
