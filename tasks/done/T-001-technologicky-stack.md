---
id: T-001
nazov: Potvrdiť stack a inicializovať projekt
priorita: P1
zavisi_od: []
---

# T-001 – Potvrdiť stack a inicializovať projekt

## Cieľ
Rozhodnúť o technológiách (návrh v `docs/rozhodnutia/0001-technologicky-stack.md`) a založiť kostru projektu.

## Rozsah
- [x] potvrdiť / upraviť ADR 0001 (framework, štýly) a nastaviť stav `prijaté`
- [x] `git init`, `.gitignore`
- [x] inicializovať Vite + React + TS, Vitest, ESLint/Prettier
- [x] adresárová štruktúra `src/engine`, `src/screens/{moderator,board,editor}`, `src/shared`
- [x] routy `/moderator`, `/board`, `/editor` (zatiaľ prázdne stránky)
- [x] doplniť príkazy (dev, test, build) do `CLAUDE.md`

## Akceptačné kritériá
- `npm run dev` spustí aplikáciu, `npm test` prejde (aspoň 1 vzorový test)

## Záznam
- 2026-10-18 – Stack potvrdený s úpravou: **Vue 3** namiesto Reactu, štýly **Tailwind v4** (ADR 0001 → prijaté).
  Kostra z `create-vue` (TS, router, Vitest, ESLint+Oxlint, Prettier), Tailwind cez `@tailwindcss/vite`.
  Odstránený `vite-plugin-vue-devtools` (plávajúce tlačidlo by prekážalo na projektore).
  Routy `/`, `/moderator`, `/board`, `/editor` (prázdne stránky), vzorový test `HomeScreen.spec.ts`.
  `npm run dev`, `npm test`, `npm run build`, `npm run lint` prechádzajú. Príkazy doplnené do `CLAUDE.md`.
  Git repo už existovalo; práca prebieha na vetve `feature/mvp`.
- Rozhodnutia OQ-01 až OQ-12 zapísané (prijaté predbežné návrhy).
