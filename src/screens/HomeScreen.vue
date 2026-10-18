<script setup lang="ts"></script>

<template>
  <main
    class="flex min-h-screen flex-col items-center justify-center gap-8 bg-slate-900 text-white"
  >
    <h1 class="text-5xl font-black tracking-tight">5 proti 5</h1>
    <nav class="flex flex-wrap justify-center gap-4">
      <RouterLink
        class="rounded-lg bg-amber-400 px-6 py-3 font-bold text-slate-900"
        to="/moderator"
      >
        Moderátorský panel
      </RouterLink>
      <RouterLink class="rounded-lg bg-sky-500 px-6 py-3 font-bold text-slate-900" to="/board">
        Tabuľa pre publikum
      </RouterLink>
      <RouterLink class="rounded-lg bg-slate-600 px-6 py-3 font-bold" to="/editor">
        Editor otázok
      </RouterLink>
    </nav>
  </main>
</template>
