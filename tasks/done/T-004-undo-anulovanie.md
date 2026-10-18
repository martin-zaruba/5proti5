---
id: T-004
nazov: Undo, anulovanie otázky, ručná korekcia
priorita: P1
zavisi_od: [T-003]
---

# T-004 – Undo, anulovanie otázky, ručná korekcia

## Cieľ
Moderátor musí vedieť opraviť chybu (štatút čl. 3.1, 3.2, 3.4 – `docs/pravidla.md` §8).

## Rozsah
- [x] história stavov → `undo` poslednej akcie (aj viacnásobne)
- [x] snapshot pred každým kolom → `voidQuestion` (obnoví skóre, načíta rezervnú otázku, rovnaké poradové číslo kola)
- [x] `adjustScore(team, delta)` – ručná korekcia so záznamom do logu
- [x] log udalostí hry (čo a kedy) – užitočné aj pri sporoch

## Akceptačné kritériá
- testy: undo vráti presne predchádzajúci stav; anulovanie vráti skóre pred otázkou

## Záznam
- 2026-10-18 – Relácia v `src/engine/session.ts`, testy `session.spec.ts` (spolu s projekciou pre tabuľu).
  - `dispatch(session, action, now)` uloží predošlý stav do `past` (max. 200) a zapíše do logu slovenský popis
    akcie aj jej následkov (kontrola, krádež, výsledok kola); `undo` vráti presne predošlý stav (aj opakovane)
    a do logu pridá „↶ Vrátené: …“.
  - `voidQuestion` (fázy súboj/hra/krádež/koniec kola) obnoví `round.scoreBefore`, načíta ďalšiu rezervnú otázku,
    rovnaké číslo kola (štatút čl. 3.1, 3.2, 3.4).
  - `adjustScore(team, delta)` – nenulové celé číslo, zapisuje sa do logu.
  - Pri anulovaní sa stratí aj ručná korekcia urobená počas toho kola (zapísané v ADR 0002).
