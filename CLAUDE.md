# 5 proti 5 – webová aplikácia na riadenie a prezentovanie hry

Web aplikácia na odohranie hry „5 proti 5“ (slovenská verzia formátu Family Feud): dve päťčlenné
družstvá hádajú najčastejšie odpovede zo sto respondentov ankety. Moderátor riadi hru z panela,
publikum sleduje tabuľu na projektore/TV.

## Kde čo nájdeš
| Súbor | Obsah |
|---|---|
| [docs/pravidla.md](docs/pravidla.md) | **Herná špecifikácia – zdroj pravdy pre engine** (podľa štatútu STVR 2026, variant 2022) |
| [docs/otvorene-otazky.md](docs/otvorene-otazky.md) | Nejednoznačnosti v pravidlách a ich rozhodnutia (`OQ-xx`) |
| [docs/poziadavky.md](docs/poziadavky.md) | Obrazovky, roly, funkčné a nefunkčné požiadavky |
| [docs/slovnik.md](docs/slovnik.md) | Slovenské pojmy ↔ anglické identifikátory v kóde |
| [docs/rozhodnutia/](docs/rozhodnutia/) | Architektonické rozhodnutia (ADR) |
| [docs/zdroje/](docs/zdroje/) | Originálne štatúty súťaže (PDF) |
| [tasks/README.md](tasks/README.md) | Backlog úloh, postup práce a prehľad stavu |

## Pravidlá práce
- **Pred implementáciou hernej logiky si prečítaj `docs/pravidla.md`.** Ak kód a špecifikácia nesedia,
  platí špecifikácia; ak je špecifikácia nejasná, zapíš otázku do `docs/otvorene-otazky.md` a opýtaj sa.
- Pracuj po úlohách z `tasks/`: pri začatí presuň úlohu do `tasks/doing/`, priebežne dopĺňaj jej sekciu
  **Záznam**, po dokončení ju presuň do `tasks/done/` a aktualizuj tabuľku v `tasks/README.md`.
- Dôležité technické rozhodnutia zapisuj ako ADR do `docs/rozhodnutia/`.
- **Jazyk:** dokumentácia, úlohy a UI po slovensky; kód (identifikátory, commit správy) po anglicky
  podľa `docs/slovnik.md`.
- Herný engine drž ako čistú logiku bez závislosti na UI a každé pravidlo pokry testom.
- Nepoužívaj originálne logo, grafiku ani zvuky z TV relácie (licencia FremantleMedia).

## Stav projektu
Fáza: **celý diel odohrateľný** (kolá 1–5, Zoraďovačka, finále; panel + tabuľa); časovače, zvuky a editor sád hotové – všetky P1 a P2 úlohy sú hotové; zostávajú P3 (T-010 buzzery, T-012 profil 2022). Hra na viacerých zariadeniach cez
miestnosť na sync serveri (Cloudflare Workers + Durable Objects, ADR 0006, T-015 – T-020). Stack: Vite + Vue 3 + TypeScript + Tailwind v4 (ADR 0001).

## Štruktúra kódu
- `src/engine/` – herný engine (čistý TS, bez Vue/DOM), testy v `src/engine/__tests__/`
- `src/screens/{moderator,board,editor}/` – obrazovky (routy `/moderator`, `/board`, `/editor`)
- `src/shared/` – zdieľané veci UI (persistencia, `gameStore`, `hostRoom`); `src/shared/sync/` – protokol
  a transporty synchronizácie (BroadcastChannel / WebSocket, posun hodín) – `protocol.ts` zdieľa aj server
- `server/` – sync server (Cloudflare Worker + Durable Object `GameRoom`), samostatný npm balík s vlastnými testami
- `data/` – vstavané sady otázok (JSON: ukážková, GLS), registrované v `BUILT_IN_SETS` (`src/shared/questionLibrary.ts`); vlastné sady sú v knižnici editora (`localStorage`)

## Príkazy
| Príkaz | Čo robí |
|---|---|
| `npm run dev` | vývojový server (http://localhost:5173) |
| `npm test` | jednorazový beh testov (Vitest); `npm run test:watch` = sledovanie zmien |
| `npm run build` | typová kontrola (`vue-tsc`) + produkčný build do `dist/` |
| `npm run preview` | spustí produkčný build lokálne |
| `npm run build:single` | jeden HTML súbor `dist-single/5proti5.html` na spustenie bez servera (ADR 0004) |
| `npm run lint` | Oxlint + ESLint (s automatickou opravou) |
| `npm run format` | Prettier nad `src/` a `server/` |
| `npm run server:dev` | lokálny sync server (http://127.0.0.1:8787; najprv `npm --prefix server install`) |
| `npm run server:test` | testy servera v runtime Workers; `npm --prefix server run type-check` = typy |
