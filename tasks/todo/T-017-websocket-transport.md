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
- [ ] `createWebSocketTransport(url, roomCode, role, token?)`
- [ ] opätovné pripojenie s narastajúcim odstupom (napr. 0,5 s → max. 10 s), heartbeat (`ping`/`pong`)
- [ ] stav spojenia (`connecting` / `online` / `offline`) ako reaktívna hodnota pre UI
- [ ] moderátor pri výpadku hrá ďalej; po obnovení spojenia sa pošle posledný `feed` aj `session`
      (nie fronta všetkých zmien)
- [ ] adresa servera z `import.meta.env.VITE_SYNC_URL` (`.env.example`); bez nej je transport nedostupný
- [ ] testy s falošným WebSocketom (pripojenie, reconnect, odoslanie posledného stavu)

## Akceptačné kritériá
- po vypnutí a zapnutí servera sa panel aj tabuľa samé pripoja a tabuľa ukáže aktuálny stav
- pri výpadku sa neposiela zastaraný stav (tabuľa nezahrá znova staré zvuky)
- `npm test` a `npm run build` prechádzajú

## Poznámky / odkazy
- ADR 0006
- pozor na zvuky tabule: `soundCues` porovnávajú predošlý a nový `BoardFeed` – opakovaný alebo starší feed
  nesmie spustiť zvuk znova (pozri komentár vo `boardSync.ts`)

## Záznam
