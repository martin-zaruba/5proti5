---
id: T-003
nazov: Herný engine – bežné kolo (súboj, kontrola, X, krádež)
priorita: P1
zavisi_od: [T-002]
---

# T-003 – Herný engine – bežné kolo

## Cieľ
Čistá TS logika (reducer `state + action → state`) pre kolá 1–5 podľa `docs/pravidla.md` §3 a §5.

## Rozsah
- [x] stav hry: družstvá, hráči, pozície, skóre, aktuálne kolo, násobok, bank kola, X, kontrola, kto je na rade
- [x] akcie: `startRound`, `buzz(team)`, `revealAnswer(rank)`, `wrongAnswer`, `timeout`, `penaltyConferring`,
      `stealResult(correct, rank?)`, `endRound`, `revealRemaining`
- [x] súboj: kto získa kontrolu (TOP 1 / častejšia odpoveď), striedanie hráčov pri netrafení, anulovanie keď netrafí nikto
- [x] rotácia hráčov družstva s kontrolou (OQ-02)
- [x] krádež vrátane špeciálneho pravidla 5. kola
- [x] násobky podľa profilu pravidiel
- [x] remíza po 5. kole → anulovať 5. kolo a hrať znovu
- [x] testy pre každý hraničný prípad z pravidiel

## Akceptačné kritériá
- engine nemá závislosť na React/DOM; testy pokrývajú všetky body §3 a §5

## Záznam
- 2026-10-18 – Engine v `src/engine/game.ts` (architektúra: ADR 0002), testy `game.spec.ts`.
  - Akcie podľa návrhu s úpravami: `startRound` → `nextRound` (spúšťa aj prvé kolo a vyhodnocuje koniec hry);
    `stealResult(correct, rank?)` nahradené `revealAnswer(rank)` / `wrongAnswer` / `timeout` počas fázy `steal`;
    `endRound` netreba – bank sa pripíše automaticky, keď je kolo rozhodnuté. Pribudlo `setShowQuestion`.
  - Súboj: TOP 1 hneď končí súboj; inak rozhoduje vyššia priečka; ďalšie dvojice (pozície N+1…5) podľa
    **OQ-13** (nová otázka, implementovaný návrh); keď netrafí nikto ani po kapitánov, otázka sa anuluje
    a načíta sa rezervná (bez rezervy → chyba, **OQ-14**).
  - Rotácia družstva s kontrolou cyklicky od hráča za tým, kto vybojoval kontrolu (OQ-02).
  - Krádež: kapitán súpera (pozícia 5); úspech = bank bez bodov za jeho odpoveď, v 5. kole aj s nimi (×3).
  - Remíza po 5. kole: `nextRound` obnoví skóre spred 5. kola a 5. kolo sa hrá znova s rezervnou otázkou.
  - Kolo 4 ×2, kolo 5 ×3 podľa profilu 2026 (`profiles.ts`). Zoraďovačka a finále zatiaľ nie sú (T-005, T-006):
    po 5. kole hra končí fázou `gameOver`.
  - Mutačná kontrola: zmena pravidla krádeže / TOP 1 v kóde → 3, resp. 9 padnutých testov.
