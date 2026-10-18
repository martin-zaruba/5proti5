---
id: T-007
nazov: UI – moderátorský panel
priorita: P1
zavisi_od: [T-003, T-004]
---

# T-007 – Moderátorský panel

## Cieľ
Obrazovka `/moderator` na riadenie hry – pozri `docs/poziadavky.md` „Moderátorský panel“.

## Rozsah
- [x] nastavenie hry: názvy družstiev, mená hráčov, kapitán, načítanie sady otázok, profil
- [x] priebeh kola: otázka, všetky odpovede (aj skryté), tlačidlá Odkryť / X / Čas vypršal / Penalizácia
- [x] zvýraznenie, kto je na rade; stav X, bank kola, skóre
- [x] krádež, koniec kola, odkrytie zvyšku
- [x] Undo, Anulovať otázku, Ručná korekcia
- [x] klávesové skratky pre rýchle ovládanie
- [x] tlačidlo „Otvoriť tabuľu“ (nové okno)

## Akceptačné kritériá
- celý diel (kolá 1–5) sa dá odohrať len z panela bez reloadu

## Záznam
- 2026-10-18 – Panel v `src/screens/moderator/` (`SetupForm`, `GamePanel`, `ConfirmButton`), stav v `src/shared/gameStore.ts`
  (relácia z enginu + uloženie do `localStorage` + publikovanie pohľadu pre tabuľu).
  - Nastavenie: názvy družstiev, mená hráčov po pozíciách (kapitán = poz. 5), ukážková sada alebo import JSON
    s výpisom chýb/varovaní validátora; posledná platná sada a mená sa pamätajú.
  - Hra: skóre, bank, X, kto je na rade (zvýraznený hráč), všetky odpovede aj so synonymami, tlačidlá podľa fázy
    (Prvý stlačil / Trafil·Odkryť / Nesprávne / Čas vypršal / Penalizácia / Odkryť zvyšné / Ďalšie kolo).
    Undo, Anulovať otázku a Penalizácia/Nová hra vyžadujú druhý klik (`ConfirmButton`). Ručná korekcia, log hry,
    prepínač „Otázka na tabuli“, „Otvoriť tabuľu“ (nové okno). Chyby z enginu sa zobrazia ako hláška.
  - Skratky: `A`/`L` buzzer, `1`–`6` odkryť, `X`, `T`, `R`, `N`, `Ctrl+Z`.
  - Overené v prehliadači (Edge headless cez playwright-core): celý diel kolá 1–5 len z klávesnice panela
    až po víťaza (441 : 287, sedí s ručným výpočtom), krádež, undo, anulovanie, obnovenie po reloade, bez chýb v konzole.
