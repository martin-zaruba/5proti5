# 0004 – Distribúcia ako jeden HTML súbor

- **Stav:** prijaté
- **Dátum:** 2026-10-18

## Kontext
Aplikáciu treba ukázať klientovi (a neskôr používať) na počítači bez Node.js a bez servera.
Najjednoduchšie pre používateľa je jeden súbor, ktorý otvorí dvojklikom.

## Rozhodnutie
- `npm run build:single` (`vite.single.config.ts`, plugin `vite-plugin-singlefile`) vloží JS aj CSS do
  `dist-single/5proti5.html`; `public/` sa do neho nekopíruje.
- Zo súboru (`file://`) nie je server, ktorý by odpovedal na `/moderator`, preto router pri `file:` použije
  hash históriu (`5proti5.html#/moderator`); na serveri ostávajú bežné adresy. Tabuľa sa otvára cez
  `router.resolve()`, takže funguje v oboch režimoch.
- Synchronizácia (`BroadcastChannel`) a ukladanie (`localStorage`) fungujú aj na `file://` – overené
  v Chrome a Edge (vyskakovacie okno tabule aj samostatne otvorená karta).

## Zvažované alternatívy
- Statický build + malý server (`npm run preview`, `npx serve`) – vyžaduje Node.js alebo inštaláciu u klienta.
- Hash routovanie vždy – zbytočne mení adresy aj pri bežnom nasadení na server.

## Dôsledky
- Dáta (rozohraná hra, knižnica sád) sú v `localStorage` daného prehliadača na danom počítači; pri presune
  na iný počítač treba sady exportovať/importovať v editore.
- Firefox nebol overený (iný model pôvodu pre `file://`); odporúčaný je Chrome alebo Edge.
