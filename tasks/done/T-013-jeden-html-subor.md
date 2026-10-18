---
id: T-013
nazov: Zostavenie do jedného HTML súboru (ukážka u klienta)
priorita: P2
zavisi_od: [T-007, T-008, T-011]
---

# T-013 – Zostavenie do jedného HTML súboru

## Cieľ
Aplikáciu ukázať klientovi na inom počítači bez inštalácie a bez servera: jeden HTML súbor,
ktorý sa otvorí dvojklikom v prehliadači.

## Rozsah
- [x] príkaz `npm run build:single` → `dist-single/5proti5.html` (JS aj CSS vložené do HTML)
- [x] routovanie funguje aj z `file://` (hash routy), tabuľa sa otvára z panela
- [x] synchronizácia panel → tabuľa a ukladanie (`localStorage`) fungujú zo súboru
- [x] návod na spustenie pre klienta

## Akceptačné kritériá
- súbor otvorený z disku: nastavenie hry, odohranie kola, tabuľa v druhom okne, editor

## Záznam
- 2026-10-18 – `npm run build:single` (`vite.single.config.ts` + `vite-plugin-singlefile`) → `dist-single/5proti5.html`
  (≈ 229 kB, gzip ≈ 78 kB, bez externých odkazov). Rozhodnutie v ADR 0004.
  - Router pri `file:` používa hash históriu; „Otvoriť tabuľu“ cez `router.resolve()`. Odstránený odkaz
    na `/favicon.ico` z `index.html` (absolútna cesta zo súboru nefunguje).
  - Overené zo súboru v headless Edge aj Chrome: úvod → panel (`#/moderator`), štart hry, tabuľa ako vyskakovacie
    okno (`#/board`) aj samostatná karta, synchronizácia pri odkrývaní, obnovenie hry po reloade, editor.
    Firefox neoverený (nie je k dispozícii na automatizáciu) – v návode odporúčaný Chrome/Edge.
  - Návod pre klienta `docs/navod-spustenie.md`, odkaz v `README.md`, príkaz v `CLAUDE.md`.
