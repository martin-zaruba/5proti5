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
- [ ] kostra `server/` (`package.json`, `wrangler.jsonc`, `tsconfig.json`), skripty `dev` (`wrangler dev`),
      `test`, `deploy`; v koreňovom `package.json` skripty `server:dev`, `server:test`
- [ ] Worker: `POST /rooms` → `{ roomCode, hostToken }`; `GET /rooms/:code/ws` → upgrade na WebSocket
      (rola `host` s tokenom / `board` bez tokenu); 404 pre neexistujúcu miestnosť
- [ ] Durable Object `GameRoom`: Hibernation API (`acceptWebSocket`, tagy podľa roly), SQLite úložisko
      (`session`, `feed`, hash tokenu, `updatedAt`)
- [ ] `host` posiela `feed` / `session`; server ich uloží a `feed` rozošle tabuliam; nový klient dostane
      hneď posledný stav (`host` aj `session`)
- [ ] `board` nesmie meniť stav ani dostať `session`
- [ ] validácia správ (protokol z T-015), limit veľkosti, odmietnutie neznámej verzie
- [ ] kontrola `Origin` (zoznam povolených v konfigurácii)
- [ ] alarm: zmazanie miestnosti po 14 dňoch bez aktivity
- [ ] testy cez `@cloudflare/vitest-pool-workers` (založenie miestnosti, autorizácia, rozoslanie,
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
