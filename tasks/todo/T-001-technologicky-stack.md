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
- [ ] potvrdiť / upraviť ADR 0001 (framework, štýly) a nastaviť stav `prijaté`
- [ ] `git init`, `.gitignore`
- [ ] inicializovať Vite + React + TS, Vitest, ESLint/Prettier
- [ ] adresárová štruktúra `src/engine`, `src/screens/{moderator,board,editor}`, `src/shared`
- [ ] routy `/moderator`, `/board`, `/editor` (zatiaľ prázdne stránky)
- [ ] doplniť príkazy (dev, test, build) do `CLAUDE.md`

## Akceptačné kritériá
- `npm run dev` spustí aplikáciu, `npm test` prejde (aspoň 1 vzorový test)

## Záznam
