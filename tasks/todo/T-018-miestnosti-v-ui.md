---
id: T-018
nazov: Miestnosti v UI – hra na viacerých zariadeniach
priorita: P3
zavisi_od: [T-017]
---

# T-018 – Miestnosti v UI – hra na viacerých zariadeniach

## Cieľ
Moderátor jedným klikom zapne hru na viacerých zariadeniach, tabuľu otvorí na inom zariadení podľa kódu
alebo QR kódu a môže pokračovať v rozohratej hre aj z iného zariadenia.

## Rozsah
- [ ] panel: „Hrať na viacerých zariadeniach“ → založí miestnosť (`POST /rooms`), uloží `roomCode` +
      `hostToken` do `localStorage`, prepne publikovanie na WebSocket transport (BroadcastChannel ostáva
      pre tabuľu v okne na tom istom počítači)
- [ ] panel: kód miestnosti, odkaz a QR kód na tabuľu (`/board?room=ABCD`), indikátor spojenia,
      „Ukončiť miestnosť“
- [ ] tabuľa: `?room=` v adrese, alebo obrazovka na zadanie kódu; indikátor výpadku spojenia (nenápadný)
- [ ] pokračovanie na inom zariadení: odkaz / QR kód s tokenom moderátora (token v URL fragmente, nie
      v query), panel si stiahne uloženú `session` zo servera
- [ ] po obnovení stránky moderátora: ak má miestnosť, pripojí sa a porovná lokálnu a serverovú `session`
      (novšia vyhrá – OQ-18)
- [ ] funguje s hash routovaním (`file://`, ADR 0004) aj s bežnými adresami (GitHub Pages)
- [ ] testy komponentov (zadanie kódu, zobrazenie stavu spojenia)

## Akceptačné kritériá
- tabuľa na mobile/TV a panel na notebooku (rôzne siete) – odkrytie odpovede sa na tabuli prejaví do 1 s
- po obnovení tabule aj panela sa zobrazí aktuálny stav hry
- moderátor otvorí panel na inom zariadení cez odkaz s tokenom a pokračuje v hre vrátane undo
- bez `VITE_SYNC_URL` vyzerá a funguje aplikácia ako doteraz

## Poznámky / odkazy
- ADR 0006; `docs/otvorene-otazky.md` OQ-17, OQ-18
- QR kód: malá knižnica (napr. `qrcode`) alebo vlastná implementácia – zapísať do Záznamu

## Záznam
