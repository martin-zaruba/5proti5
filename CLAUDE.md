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
Fáza: **príprava** – kód ešte neexistuje. Stack je navrhnutý (ADR 0001, Vite + React + TypeScript),
čaká na potvrdenie v úlohe T-001.

## Príkazy
<!-- Doplniť v T-001 (dev, test, build). -->
