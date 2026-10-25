---
id: T-017
nazov: WebSocket transport v klientovi
priorita: P3
zavisi_od: [T-015, T-016]
---

# T-017 – WebSocket transport v klientovi

## Cieľ
Implementácia `SyncTransport` cez WebSocket na server z T-016, odolná voči výpadkom spojenia
(Wi-Fi, uspaný mobil, reštart servera).

## Rozsah
- [x] `createWebSocketTransport(url, roomCode, role, token?)`
- [x] opätovné pripojenie s narastajúcim odstupom (napr. 0,5 s → max. 10 s), heartbeat (`ping`/`pong`)
- [x] stav spojenia (`connecting` / `online` / `offline`) ako reaktívna hodnota pre UI
- [x] moderátor pri výpadku hrá ďalej; po obnovení spojenia sa pošle posledný `feed` aj `session`
      (nie fronta všetkých zmien)
- [x] adresa servera z `import.meta.env.VITE_SYNC_URL` (`.env.example`); bez nej je transport nedostupný
- [x] testy s falošným WebSocketom (pripojenie, reconnect, odoslanie posledného stavu)

## Akceptačné kritériá
- po vypnutí a zapnutí servera sa panel aj tabuľa samé pripoja a tabuľa ukáže aktuálny stav
- pri výpadku sa neposiela zastaraný stav (tabuľa nezahrá znova staré zvuky)
- `npm test` a `npm run build` prechádzajú

## Poznámky / odkazy
- ADR 0006
- pozor na zvuky tabule: `soundCues` porovnávajú predošlý a nový `BoardFeed` – opakovaný alebo starší feed
  nesmie spustiť zvuk znova (pozri komentár vo `boardSync.ts`)

## Záznam
- 2026-10-25 – `src/shared/sync/webSocketTransport.ts`: `createWebSocketTransport({ serverUrl, roomCode, role, token })`
  implementuje `SyncTransport`; `roomSocketUrl` prevedie `http(s)` na `ws(s)`.
  - Po `open` pošle `hello`; `online` je až po `welcome`. Správy `feed` a `session` si transport pamätá
    (len poslednú z každého typu) a po každom `welcome` ich pošle znova – pri výpadku sa nič nehromadí,
    ostatné správy sa mimo `online` zahodia (tabuľa aj tak dostane feed od servera hneď po `welcome`).
  - Reconnect: 0,5 s · 2^n, max. 10 s, ±20 % náhodne (aby sa po reštarte servera nepripojili všetci naraz);
    hneď pri udalosti `online` prehliadača a pri návrate karty do popredia (`visibilitychange`).
  - Heartbeat: `ping` každých 15 s; ak 35 s nepríde nič, spojenie sa považuje za mŕtve a otvorí sa nové
    (prehliadač si stratu Wi-Fi často nevšimne).
  - Stav spojenia pribudol `closed` (+ `closedReason`): server zavrel s kódom z `CLOSE_CODES` (neexistujúca
    miestnosť, zlý token, stará verzia) – transport sa už nepripája. Reaktívnu hodnotu pre UI z `onStatus`
    robí až T-018.
  - `VITE_SYNC_URL`: typ v `env.d.ts`, `src/shared/sync/config.ts` (`syncServerUrl`); `.env.development`
    ukazuje na `npm run server:dev` (`http://127.0.0.1:8787`), produkčný build ho dostane z CI (T-020).
  - Zvuky: po reconnecte tabuľa dostane posledný feed zo servera; ak sa nezmenil, `soundCues` nič nezahrá.
  - Testy s falošným WebSocketom (`webSocketTransport.spec.ts`, 10 testov, falošné časovače). Skutočné
    vypnutie/zapnutie servera s panelom a tabuľou v prehliadači sa overí v T-018.
