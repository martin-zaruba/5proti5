# 0006 – Synchronizácia viacerých zariadení cez Cloudflare Durable Objects

- **Stav:** prijaté
- **Dátum:** 2026-10-25

## Kontext
Doteraz panel a tabuľa bežia v jednom prehliadači na jednom počítači (`BroadcastChannel` + `localStorage`,
OQ-09, ADR 0001). Chceme otvoriť tabuľu na jednom zariadení (TV, projektor) a hru riadiť z iného
(notebook, mobil) – aj keď nie sú v tej istej sieti. Rozohraná hra sa má ukladať tak, aby moderátor mohol
po obnovení stránky alebo na inom zariadení pokračovať.

Obmedzenia:
- Frontend ostáva na GitHub Pages (ADR 0005) – je statický, server musí bežať inde a stránka z `https`
  sa smie pripojiť len cez `wss://`.
- Tabuľa nesmie dostať skryté odpovede – posiela sa jej iba `BoardFeed`.
- Režim bez servera (jeden počítač, jeden HTML súbor – ADR 0004) musí ostať funkčný; server je voliteľný.
- Bez ďalších mesačných nákladov; bez potreby „budiť“ uspaný server pred hrou.

## Rozhodnutie
**Server: Cloudflare Workers + Durable Objects** (TypeScript, priečinok `server/` v tomto repe, nástroj
`wrangler`).
- Jedna hra = jedna **miestnosť** (`room`) = jeden Durable Object (`idFromName(roomCode)`). Durable Object je
  jediná inštancia na celom svete, takže všetky zariadenia miestnosti hovoria s tým istým objektom a nie je
  treba riešiť zdieľaný stav medzi servermi.
- WebSockety cez **Hibernation API** (`ctx.acceptWebSocket`) – objekt sa medzi správami uspí a neplatí sa
  za čas pripojenia; spojenia ostávajú otvorené.
- Úložisko: **SQLite v Durable Objecte** (dostupné aj na bezplatnom pláne). Miestnosť drží uloženú hru
  moderátora (`session`), poslednú tabuľu (`feed`) a hash moderátorského tokenu. Neaktívna miestnosť sa po
  14 dňoch zmaže (alarm).
- Worker má tri cesty: `POST /rooms` (založí miestnosť, vráti `roomCode` + `hostToken`),
  `GET /rooms/:code/ws` (upgrade na WebSocket, rola `host` alebo `board` v prvej správe `hello`) a
  `DELETE /rooms/:code` (moderátor ukončí miestnosť).

**Autorita: zdrojom pravdy je moderátorský panel**, server je relé a úložisko.
- Engine beží ďalej v prehliadači moderátora (`gameStore`); server engine nespúšťa, kontroluje len tvar
  a veľkosť správ.
- Moderátor posiela `feed` (pre tabule) a `session` (na uloženie). Server rozošle `feed` všetkým tabuliam
  a nového klienta hneď pri pripojení pošle posledný stav.
- `session` (obsahuje skryté odpovede) dostane len klient s rolou `host`.
- Ak by neskôr bolo treba, aby stav menili aj iní (mobilné buzzery T-010), engine je čistý TS a dá sa
  spustiť aj v Durable Objecte – zmení sa len to, kto volá `dispatch`.

**Prístup:**
- `roomCode` – 6 znakov bez zameniteľných (`0/O`, `1/I/L`); stačí na pripojenie tabule (iba čítanie).
- `hostToken` – náhodný 128-bitový token; server si ukladá len jeho hash. Moderátor ho má v `localStorage`;
  na iné zariadenie ho prenesie odkazom / QR kódom.
- Worker overuje hlavičku `Origin` (GitHub Pages, `localhost`, `null` pre `file://`).

**Klient:**
- Synchronizácia ide cez rozhranie transportu (`SyncTransport`) s dvomi implementáciami:
  `BroadcastChannel` (dnešný režim, bez servera) a `WebSocket` (miestnosť). Panel aj tabuľa fungujú
  rovnako bez ohľadu na transport.
- Typy protokolu (`src/shared/sync/protocol.ts`) zdieľa klient aj server; správy majú pole `v` (verzia).
- Adresa servera v builde: `VITE_SYNC_URL`; bez nej sa voľba „viac zariadení“ v UI nezobrazí.
- Čas: časovač na tabuli počíta s `endsAt` v čase moderátora. Klienti si cez server odhadnú posun hodín
  (ping/pong so serverovým časom), aby odpočet sedel aj medzi zariadeniami.

## Zvažované alternatívy
- **Node.js server (`ws`) na Render.com** – free tier sa po 15 min uspí, prvé pripojenie trvá ~1 min.
  Na VPS / Fly.io beží stále, ale stojí peniaze a treba ho spravovať. Výhoda by bola hra v lokálnej sieti bez
  internetu – to však z GitHub Pages aj tak nejde (stránka z `https` nesmie volať `ws://`).
- **Supabase Realtime / Firebase** – bez vlastného servera, ale viazanosť na dodávateľa, SDK vo frontende
  a oddelenie skrytých odpovedí od tabule cez bezpečnostné pravidlá je ťažšie ustrážiť.
- **WebRTC (PeerJS)** – priame spojenie bez vlastného servera, ale závisí od verejného signalizačného
  servera bez záruky dostupnosti a cez niektoré siete (firemné Wi-Fi, mobilné dáta) sa nespojí bez TURN.
- **PartyKit / `partyserver`** – knižnica nad Durable Objects, ktorá šetrí pár desiatok riadkov; zvolili sme
  priame API Durable Objects (menej závislostí, protokol máme jednoduchý).
- **Engine na serveri (server ako zdroj pravdy)** – pripravené na buzzery a viac moderátorov, ale väčší
  prepis `gameStore`, undo a časovačov; zatiaľ netreba.

## Dôsledky
- Hra na viacerých zariadeniach vyžaduje internet a Cloudflare účet (bezplatný plán stačí); nasadzuje sa
  `wrangler deploy` z GitHub Actions s tajomstvom `CLOUDFLARE_API_TOKEN`.
- Režim na jednom počítači a jeden HTML súbor fungujú bez zmeny a bez servera.
- Rozohraná hra (vrátane otázok sady) je v miestnosti uložená v Cloudflare, kým miestnosť nevyprší.
- Server je ďalší deploy a ďalší `package.json` (`server/`); jeho testy bežia cez
  `@cloudflare/vitest-plugin`.
- Pri výpadku spojenia moderátor hrá ďalej (stav má lokálne) a po obnovení spojenia sa odošle posledný stav.
- Mení OQ-09: popri jednom počítači je podporovaný aj režim viacerých zariadení cez miestnosť.
