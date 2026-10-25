---
id: T-016
nazov: Server – Cloudflare Worker a miestnosť (Durable Object)
priorita: P3
zavisi_od: [T-015]
---

# T-016 – Server – Cloudflare Worker a miestnosť (Durable Object)

## Cieľ
Malý server, ktorý drží miestnosti hry: prijíma stav od moderátora, ukladá ho a rozosiela tabuliam
(ADR 0006). Server nespúšťa engine – je relé a úložisko.

## Rozsah
- [x] kostra `server/` (`package.json`, `wrangler.jsonc`, `tsconfig.json`), skripty `dev` (`wrangler dev`),
      `test`, `deploy`; v koreňovom `package.json` skripty `server:dev`, `server:test`
- [x] Worker: `POST /rooms` → `{ roomCode, hostToken }`; `GET /rooms/:code/ws` → upgrade na WebSocket
      (rola `host` s tokenom / `board` bez tokenu); 404 pre neexistujúcu miestnosť
- [x] Durable Object `GameRoom`: Hibernation API (`acceptWebSocket`, tagy podľa roly), SQLite úložisko
      (`session`, `feed`, hash tokenu, `updatedAt`)
- [x] `host` posiela `feed` / `session`; server ich uloží a `feed` rozošle tabuliam; nový klient dostane
      hneď posledný stav (`host` aj `session`)
- [x] `board` nesmie meniť stav ani dostať `session`
- [x] validácia správ (protokol z T-015), limit veľkosti, odmietnutie neznámej verzie
- [x] kontrola `Origin` (zoznam povolených v konfigurácii)
- [x] alarm: zmazanie miestnosti po 14 dňoch bez aktivity
- [x] testy cez `@cloudflare/vitest-pool-workers` (založenie miestnosti, autorizácia, rozoslanie,
      obnovenie stavu po pripojení, žiadna `session` pre tabuľu)

## Akceptačné kritériá
- `npm run server:dev` spustí lokálny server; dva klienti (napr. `websocat`) si cez miestnosť posielajú stav
- tabuľa bez tokenu nevie zmeniť stav a nikdy nedostane `session`
- po reštarte servera (`wrangler dev`) sa stav miestnosti načíta z úložiska
- testy servera prechádzajú

## Poznámky / odkazy
- ADR 0006; protokol `src/shared/sync/protocol.ts` (T-015)
- `roomCode`: 6 znakov bez `0/O/1/I/L`; `hostToken`: 128 bitov, ukladá sa len hash (SHA-256)

## Záznam
- 2026-10-25 – `server/` = samostatný npm balík (`wrangler` 4, `@cloudflare/vitest-plugin`, `vitest`, `typescript`);
  inštalácia `npm --prefix server install`. Koreňový Vitest `server/**` vynecháva, koreňové skripty
  `server:dev`, `server:test`.
  - `src/index.ts` (Worker): `POST /rooms`, `GET /rooms/:code/ws`, `DELETE /rooms/:code` (Bearer token –
    pre „Ukončiť miestnosť“ v T-018), `GET /` (kontrola, že server beží), CORS + kontrola `Origin`
    (`ALLOWED_ORIGINS` vo `wrangler.jsonc`; požiadavka bez `Origin` prejde – nie je to prehliadač a nie sú
    cookies). `src/room.ts` (Durable Object `GameRoom`), `src/rooms.ts` (kód, token, hash, origin).
  - Rola sa neposiela pri upgrade, ale v prvej správe `hello` (token nie je v URL, teda ani v logoch). Rola je
    v `serializeAttachment` – tagy pri `acceptWebSocket` sa nedajú zmeniť po `hello`.
  - Prehliadač nevidí HTTP stav odmietnutého upgradu, preto server socket prijme a zavrie s kódom z
    `CLOSE_CODES` (4001 zlý token, 4002 stará verzia protokolu, 4004 miestnosť neexistuje) – klient (T-017)
    sa po nich znova nepripája. Do `protocol.ts` pribudli aj `CreatedRoom` a `normalizeRoomCode`.
  - Úložisko: KV API SQLite Durable Objectu (`tokenHash`, `feed`, `session`, `updatedAt`). Pri `session`
    vyhráva posledná prijatá (server neporovnáva `savedAt`, hodiny zariadení sa líšia) a pošle sa ostatným
    panelom miestnosti – riešenie konfliktu na klientovi je v T-018 (OQ-18).
  - Veľkosť: uložená hra s plnou históriou undo (200 stavov) má ~220 kB (test `sessionSize.spec.ts`),
    `MAX_MESSAGE_BYTES` = 1 MB.
  - `@cloudflare/vitest-pool-workers` je premenovaný na `@cloudflare/vitest-plugin` (plugin `cloudflareTest`).
  - Typy Workera generuje `wrangler types` do `worker-configuration.d.ts` (~600 kB, v `.gitignore`);
    `npm --prefix server run type-check` ich vygeneruje a spustí `tsc`.
  - Testy: 16 (pomocné funkcie + integrácia cez `SELF.fetch` a WebSocket v Miniflare, alarm cez
    `runDurableObjectAlarm`). Ručne cez `wrangler dev`: založenie miestnosti, host → tabuľa, po reštarte
    `wrangler dev` dostane tabuľa feed a moderátor aj `session` z úložiska.
