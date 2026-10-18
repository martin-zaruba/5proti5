# Úlohy (backlog)

Každá úloha je samostatný Markdown súbor. **Stav = priečinok**, v ktorom súbor leží:

| Priečinok | Význam |
|---|---|
| `todo/` | naplánované, ešte sa nezačalo |
| `doing/` | rozpracované (ideálne max. 1–2 naraz) |
| `done/` | hotové a overené (akceptačné kritériá splnené) |

## Postup
1. Novú úlohu vytvor zo šablóny [_sablona.md](_sablona.md) ako `todo/T-0XX-kratky-nazov.md` (ďalšie voľné číslo).
2. Pri začatí presuň súbor do `doing/`.
3. Počas práce odškrtávaj `[x]` v sekcii **Rozsah** a dopĺňaj sekciu **Záznam** (čo sa urobilo, čo sa zistilo).
4. Po splnení akceptačných kritérií presuň do `done/` a aktualizuj tabuľku nižšie.
5. Ak sa počas práce objaví nejasnosť v pravidlách, zapíš ju do `docs/otvorene-otazky.md`.

Priority: **P1** = potrebné pre MVP, **P2** = kompletná hra, **P3** = rozšírenia.

## Prehľad

| ID | Názov | Priorita | Závisí od | Stav |
|---|---|---|---|---|
| T-001 | [Potvrdiť stack a inicializovať projekt](done/T-001-technologicky-stack.md) | P1 | – | done |
| T-002 | [Dátový model a formát sady otázok](done/T-002-datovy-model-otazok.md) | P1 | T-001 | done |
| T-003 | [Herný engine – bežné kolo](done/T-003-herny-engine-bezne-kolo.md) | P1 | T-002 | done |
| T-004 | [Undo, anulovanie, ručná korekcia](done/T-004-undo-anulovanie.md) | P1 | T-003 | done |
| T-005 | [Engine – Zoraďovačka](done/T-005-zoradovacka.md) | P2 | T-003 | done |
| T-006 | [Engine – finále](done/T-006-finale.md) | P2 | T-003 | done |
| T-007 | [UI – moderátorský panel](done/T-007-moderatorsky-panel.md) | P1 | T-003, T-004 | done |
| T-008 | [UI – tabuľa pre publikum](done/T-008-tabula-pre-publikum.md) | P1 | T-003 | done |
| T-009 | [Časovače a zvuky](todo/T-009-casovace-a-zvuky.md) | P2 | T-007, T-008 | todo |
| T-010 | [Buzzery](todo/T-010-buzzery.md) | P3 | T-007 | todo |
| T-011 | [Editor otázok](todo/T-011-editor-otazok.md) | P2 | T-002 | todo |
| T-012 | [Profil 2022 a 1 proti 1](todo/T-012-profil-2022-1proti1.md) | P3 | T-003, T-006 | todo |

**MVP** = T-001 až T-004 + T-007 + T-008 (odohrateľné kolá 1–5 s panelom a tabuľou).
