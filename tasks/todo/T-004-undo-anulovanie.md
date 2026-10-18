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
- [ ] história stavov → `undo` poslednej akcie (aj viacnásobne)
- [ ] snapshot pred každým kolom → `voidQuestion` (obnoví skóre, načíta rezervnú otázku, rovnaké poradové číslo kola)
- [ ] `adjustScore(team, delta)` – ručná korekcia so záznamom do logu
- [ ] log udalostí hry (čo a kedy) – užitočné aj pri sporoch

## Akceptačné kritériá
- testy: undo vráti presne predchádzajúci stav; anulovanie vráti skóre pred otázkou

## Záznam
