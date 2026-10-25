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
- [x] panel: „Hrať na viacerých zariadeniach“ → založí miestnosť (`POST /rooms`), uloží `roomCode` +
      `hostToken` do `localStorage`, prepne publikovanie na WebSocket transport (BroadcastChannel ostáva
      pre tabuľu v okne na tom istom počítači)
- [x] panel: kód miestnosti, odkaz a QR kód na tabuľu (`/board?room=ABCD`), indikátor spojenia,
      „Ukončiť miestnosť“
- [x] tabuľa: `?room=` v adrese, alebo obrazovka na zadanie kódu; indikátor výpadku spojenia (nenápadný)
- [x] pokračovanie na inom zariadení: odkaz / QR kód s tokenom moderátora (token v URL fragmente, nie
      v query), panel si stiahne uloženú `session` zo servera
- [x] po obnovení stránky moderátora: ak má miestnosť, pripojí sa a porovná lokálnu a serverovú `session`
      (novšia vyhrá – OQ-18)
- [x] funguje s hash routovaním (`file://`, ADR 0004) aj s bežnými adresami (GitHub Pages)
- [x] testy komponentov (zadanie kódu, zobrazenie stavu spojenia)

## Akceptačné kritériá
- tabuľa na mobile/TV a panel na notebooku (rôzne siete) – odkrytie odpovede sa na tabuli prejaví do 1 s
- po obnovení tabule aj panela sa zobrazí aktuálny stav hry
- moderátor otvorí panel na inom zariadení cez odkaz s tokenom a pokračuje v hre vrátane undo
- bez `VITE_SYNC_URL` vyzerá a funguje aplikácia ako doteraz

## Poznámky / odkazy
- ADR 0006; `docs/otvorene-otazky.md` OQ-17, OQ-18
- QR kód: malá knižnica (napr. `qrcode`) alebo vlastná implementácia – zapísať do Záznamu

## Záznam
- 2026-10-25 – Moderátor: `src/shared/hostRoom.ts` (`useHostRoom`: create / join / leave / end, stav spojenia,
  chyby), `src/shared/sync/roomApi.ts` (`POST` / `DELETE /rooms`, odkaz `#join=KÓD.TOKEN`),
  `RoomPanel.vue` (kód, stav spojenia, odkaz + QR tabule, „Pokračovať v hre na inom zariadení“, odpojiť /
  ukončiť) v paneli hry aj v nastavení novej hry. QR kódy: knižnica `uqr` (malá, generuje SVG).
  - `gameStore`: k uloženej hre pribudol `savedAt` (čas poslednej zmeny), `feed` a `adoptSession()`;
    `loadSession` → `migrateSession` (doplní `options` aj hre prijatej z iného zariadenia).
  - Pravidlá synchronizácie (OQ-18): panel po pripojení nič nepošle, kým nedostane `session` miestnosti
    (server ju posiela vždy, prázdna = `savedAt: 0`). Potom vyhrá novší `savedAt`; zariadenie otvorené
    z odkazu prevezme hru miestnosti vždy (ak nejakú má). Zmenu z iného panela ukáže „Hru zmenilo iné
    zariadenie“. Porovnáva sa čas zariadení – posun hodín rieši T-019.
  - Token je v URL fragmente (`/moderator#join=…`) – na server (GitHub Pages) sa nedostane; panel ho po
    načítaní z adresy hneď odstráni (`router.replace`). Odkazy sa skladajú cez `router.resolve`, takže
    fungujú aj s hash routovaním; zo súboru (`file://`) sa QR kódy neukazujú (na inom zariadení nemajú zmysel).
  - Miestnosť, ktorá zanikla (vypršala / ukončilo ju iné zariadenie), panel sám zabudne a ukáže hlášku.
  - Tabuľa: `?room=KÓD` → WebSocket transport, inak lokálny. Bez hry formulár na zadanie kódu, pri výpadku
    malý indikátor „Spojenie prerušené – pripájam znova…“ (posledný stav ostáva), pri zániku miestnosti
    červený pruh s „Zadať iný kód“.
  - Bez `VITE_SYNC_URL` sa nič z toho nezobrazí; `npm run build` ani `build:single` adresu lokálneho
    servera neobsahujú (`.env.development` platí len pre `npm run dev`).
  - Testy: `hostRoom.spec.ts` (8 – kto vyhrá, čakanie na session, zánik miestnosti, založenie),
    `roomApi.spec.ts`, `BoardScreen.spec.ts` (zadanie kódu, neexistujúca miestnosť); server: host vždy
    dostane `session`.
  - Ručne v Chrome (`wrangler dev` + `npm run dev`): založenie miestnosti, tabuľa v inej karte cez
    `?room=` (len WebSocket), odkrývanie odpovedí; vypnutie servera → tabuľa ukáže výpadok, moderátor
    odkryje ďalšiu odpoveď, po zapnutí sa obe karty samé pripoja a tabuľa ukáže aj odpoveď z výpadku;
    druhý panel cez odkaz `#join` (token zmizol z adresy) → „Späť“ v ňom sa prejavilo na tabuli aj
    v prvom paneli s upozornením; „Ukončiť miestnosť“ → tabuľa ukáže zánik, druhý panel miestnosť zabudol.
  - Neoverené: dve fyzické zariadenia v rôznych sieťach (až po nasadení – T-020). Karty jedného
    prehliadača zdieľajú `localStorage`, takže prevzatie hry „cudzím“ zariadením pokrývajú unit testy.
