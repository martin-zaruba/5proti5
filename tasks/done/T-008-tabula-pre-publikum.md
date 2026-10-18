---
id: T-008
nazov: UI – tabuľa pre publikum + synchronizácia
priorita: P1
zavisi_od: [T-003]
---

# T-008 – Tabuľa pre publikum

## Cieľ
Obrazovka `/board` (fullscreen, 16:9) zobrazujúca stav hry, synchronizovaná s panelom.

## Rozsah
- [x] synchronizácia panel → tabuľa cez `BroadcastChannel` (+ úvodný stav z `localStorage` pri otvorení)
- [x] tabuľa so 4–6 políčkami, animácia odkrytia (otočenie)
- [x] skóre, bank kola, kolo + násobok, veľké X
- [ ] časovač → presunuté do T-009 (časovače zatiaľ neexistujú)
- [x] obrazovky: úvod, medzi kolami (výsledok kola na tabuli), víťaz
- [ ] obrazovky Zoraďovačka a finále → spolu s T-005 a T-006
- [x] tabuľa **nikdy** nedostane skryté odpovede (posielať iba odkryté dáta)

## Akceptačné kritériá
- akcia v paneli sa na tabuli prejaví do 100 ms; čitateľné z 5 m

## Záznam
- 2026-10-18 – Tabuľa v `src/screens/board/` (`BoardScreen`, `AnswerTile`), synchronizácia `src/shared/boardSync.ts`.
  - Panel posiela iba `BoardView` (`toBoardView` z enginu) cez `BroadcastChannel` + kópiu do `localStorage`;
    novo otvorená tabuľa si vyžiada aktuálny stav, záložne počúva aj `storage` udalosť.
    Overené: skrytá odpoveď sa nenachádza ani v DOM, ani v `localStorage` tabule.
  - Rámec 16:9 škálovaný cez container query jednotky (`cqw`), políčka 1–3 vľavo / 4–6 vpravo s otočením (3D flip),
    odpovede odkryté bez bodov sú stlmené. Skóre so zvýraznením hrajúceho družstva, bank, názov kola s násobkom,
    malé X + veľký blikajúci X (1–3) pri chybe, pásik (krádež / výsledok kola / nová otázka / remíza).
  - Obrazovky: úvod (názvy družstiev), kolo, víťaz. Zoraďovačka a finále pribudnú s T-005/T-006.
  - Tlačidlo „Celá obrazovka“ (skryje sa vo fullscreene). Vlastný vizuál, žiadne prvky z TV relácie.
  - Latencia panel → tabuľa nameraná 10–52 ms vrátane réžie Playwrightu (cieľ < 100 ms).
  - Čitateľnosť z 5 m nebola fyzicky overená; text odpovedí má ~3 % šírky obrazovky (≈ 58 px na Full HD).
  - Časovač nie je – rieši T-009.
