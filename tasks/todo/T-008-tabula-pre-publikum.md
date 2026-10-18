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
- [ ] synchronizácia panel → tabuľa cez `BroadcastChannel` (+ úvodný stav z `localStorage` pri otvorení)
- [ ] tabuľa so 4–6 políčkami, animácia odkrytia (otočenie)
- [ ] skóre, bank kola, kolo + násobok, veľké X
- [ ] časovač
- [ ] obrazovky: úvod, medzi kolami, Zoraďovačka, finále, víťaz
- [ ] tabuľa **nikdy** nedostane skryté odpovede (posielať iba odkryté dáta)

## Akceptačné kritériá
- akcia v paneli sa na tabuli prejaví do 100 ms; čitateľné z 5 m

## Záznam
