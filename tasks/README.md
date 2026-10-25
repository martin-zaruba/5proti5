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
| T-009 | [Časovače a zvuky](done/T-009-casovace-a-zvuky.md) | P2 | T-007, T-008 | done |
| T-010 | [Buzzery](todo/T-010-buzzery.md) | P3 | T-007 | todo |
| T-011 | [Editor otázok](done/T-011-editor-otazok.md) | P2 | T-002 | done |
| T-012 | [Profil 2022 a 1 proti 1](todo/T-012-profil-2022-1proti1.md) | P3 | T-003, T-006 | todo |
| T-013 | [Zostavenie do jedného HTML súboru](done/T-013-jeden-html-subor.md) | P2 | T-007, T-008, T-011 | done |
| T-014 | [Skrátená hra – voľba Zoraďovačky a finále](done/T-014-skratena-hra.md) | P2 | T-005, T-006, T-007 | done |
| T-015 | [Synchronizačný protokol a transport v klientovi](done/T-015-protokol-a-transport.md) | P3 | T-008 | done |
| T-016 | [Server – Cloudflare Worker a miestnosť](done/T-016-server-cloudflare.md) | P3 | T-015 | done |
| T-017 | [WebSocket transport v klientovi](done/T-017-websocket-transport.md) | P3 | T-015, T-016 | done |
| T-018 | [Miestnosti v UI – hra na viacerých zariadeniach](done/T-018-miestnosti-v-ui.md) | P3 | T-017 | done |
| T-019 | [Synchronizácia času medzi zariadeniami](done/T-019-synchronizacia-casu.md) | P3 | T-016, T-017 | done |
| T-020 | [Nasadenie servera na Cloudflare a CI](doing/T-020-nasadenie-servera.md) | P3 | T-016 | doing |
| T-021 | [Menšie družstvá (2–5 hráčov)](done/T-021-velkost-druzstva.md) | P2 | T-003, T-007 | done |

**MVP** = T-001 až T-004 + T-007 + T-008 (odohrateľné kolá 1–5 s panelom a tabuľou).

**Viac zariadení** (vetva `feature/web-socket`, ADR 0006) = T-015 → T-016 → T-017 → T-018, k tomu T-019 (čas)
a T-020 (nasadenie).
