# 0001 – Technologický stack

- **Stav:** navrhnuté (čaká na potvrdenie – úloha T-001)
- **Dátum:** 2026-10-13

## Kontext
Aplikácia beží v prehliadači, offline, typicky na jednom počítači s dvoma oknami (moderátorský panel
a tabuľa na projektore). Herné pravidlá sú zložité → logika musí byť oddelená a dobre testovateľná.

## Návrh
- **Vite + React + TypeScript** – SPA, routy `/moderator`, `/board`, `/editor`.
- **Herný engine** ako čistý TypeScript modul (`src/engine/`): `state + action → newState` (reducer),
  bez závislosti na UI. Umožňuje undo (história stavov), snapshoty pred kolom a jednoduché testy.
- **Vitest** na unit testy enginu.
- **Synchronizácia okien:** `BroadcastChannel` (panel je zdroj pravdy, tabuľa iba zobrazuje).
  Neskôr možné rozšírenie o malý WebSocket server (mobilné buzzery, viac zariadení).
- **Persistencia:** `localStorage` (stav hry + sady otázok).
- **Štýly:** CSS moduly alebo Tailwind (rozhodnúť v T-001).
- **Zvuky:** Web Audio / `<audio>` s vlastnými (nie TV) zvukmi.

## Zvažované alternatívy
- Čisté HTML/JS bez frameworku – menej závislostí, ale horšie sa udržiava zložitý stav a viac obrazoviek.
- Next.js / server od začiatku – zbytočná komplexita pre offline použitie na jednom PC.
- Svelte/Vue – rovnocenné; React zvolený pre rozšírenosť (rozhodne používateľ).

## Dôsledky
- Na spustenie stačí `npm run dev` / statický build; žiadna databáza.
- Viac-zariadeniový režim si neskôr vyžiada server – engine to neovplyvní.
