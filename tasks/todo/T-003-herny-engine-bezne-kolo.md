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
- [ ] stav hry: družstvá, hráči, pozície, skóre, aktuálne kolo, násobok, bank kola, X, kontrola, kto je na rade
- [ ] akcie: `startRound`, `buzz(team)`, `revealAnswer(rank)`, `wrongAnswer`, `timeout`, `penaltyConferring`,
      `stealResult(correct, rank?)`, `endRound`, `revealRemaining`
- [ ] súboj: kto získa kontrolu (TOP 1 / častejšia odpoveď), striedanie hráčov pri netrafení, anulovanie keď netrafí nikto
- [ ] rotácia hráčov družstva s kontrolou (OQ-02)
- [ ] krádež vrátane špeciálneho pravidla 5. kola
- [ ] násobky podľa profilu pravidiel
- [ ] remíza po 5. kole → anulovať 5. kolo a hrať znovu
- [ ] testy pre každý hraničný prípad z pravidiel

## Akceptačné kritériá
- engine nemá závislosť na React/DOM; testy pokrývajú všetky body §3 a §5

## Záznam
