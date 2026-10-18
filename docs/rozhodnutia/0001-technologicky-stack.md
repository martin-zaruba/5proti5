# 0001 – Technologický stack

- **Stav:** prijaté
- **Dátum:** 2026-10-13 (návrh), 2026-10-18 (prijaté s úpravou – úloha T-001)

## Kontext
Aplikácia beží v prehliadači, offline, typicky na jednom počítači s dvoma oknami (moderátorský panel
a tabuľa na projektore). Herné pravidlá sú zložité → logika musí byť oddelená a dobre testovateľná.

## Rozhodnutie
- **Vite + Vue 3 (Composition API, `<script setup>`) + TypeScript** – SPA, routy `/moderator`, `/board`,
  `/editor` cez `vue-router`. Kostra vygenerovaná cez `create-vue` (Vitest, ESLint + Oxlint, Prettier).
- **Herný engine** ako čistý TypeScript modul (`src/engine/`): `state + action → newState` (reducer),
  bez závislosti na Vue/DOM. Umožňuje undo (história stavov), snapshoty pred kolom a jednoduché testy.
- **Vitest** na unit testy enginu (aj komponentov cez `@vue/test-utils`).
- **Štýly: Tailwind CSS v4** (plugin `@tailwindcss/vite`); vlastné CSS len tam, kde utility nestačia
  (napr. animácie tabule).
- **Synchronizácia okien:** `BroadcastChannel` (panel je zdroj pravdy, tabuľa iba zobrazuje).
  Neskôr možné rozšírenie o malý WebSocket server (mobilné buzzery, viac zariadení).
- **Persistencia:** `localStorage` (stav hry + sady otázok).
- **Zvuky:** Web Audio / `<audio>` s vlastnými (nie TV) zvukmi.
- Stav aplikácie drží jednoduchý composable nad enginom (bez Pinie) – engine je jediný zdroj logiky.
- `vite-plugin-vue-devtools` je odstránený – jeho plávajúce tlačidlo by v dev režime prekážalo na projektore.

## Zvažované alternatívy
- **React** – pôvodný návrh tohto ADR; používateľ zvolil Vue.
- Svelte – rovnocenné, menej rozšírené.
- Čisté HTML/JS bez frameworku – menej závislostí, ale horšie sa udržiava zložitý stav a viac obrazoviek.
- Next.js / server od začiatku – zbytočná komplexita pre offline použitie na jednom PC.
- CSS moduly / scoped štýly namiesto Tailwindu – používateľ zvolil Tailwind.

## Dôsledky
- Na spustenie stačí `npm run dev` / statický build; žiadna databáza.
- Viac-zariadeniový režim si neskôr vyžiada server – engine to neovplyvní.
- `create-vue` vyžaduje Node `^22.18 || >=24.12` (pri 22.17 iba varovanie, build aj testy fungujú).
