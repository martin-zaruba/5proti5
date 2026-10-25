---
id: T-015
nazov: Synchronizačný protokol a transport v klientovi
priorita: P3
zavisi_od: [T-008]
---

# T-015 – Synchronizačný protokol a transport v klientovi

## Cieľ
Oddeliť „čo sa posiela“ (protokol) od „ako sa to posiela“ (transport), aby panel a tabuľa vedeli
rovnako fungovať cez `BroadcastChannel` aj cez WebSocket miestnosť (ADR 0006). Bez zmeny správania.

## Rozsah
- [ ] `src/shared/sync/protocol.ts` – typy správ s verziou `v` (napr. `hello`, `feed`, `session`,
      `requestFeed`, `ping`/`pong`, `error`), iba typy + validačné funkcie bez závislosti na Vue/DOM
      (bude ich importovať aj server)
- [ ] rozhranie `SyncTransport` (send, subscribe, stav spojenia, close)
- [ ] dnešný `boardSync.ts` prepísať na `BroadcastChannel` transport (vrátane fallbacku cez `storage` event)
- [ ] `createBoardPublisher` / `subscribeToBoard` prijímajú transport; `gameStore` a `BoardScreen` bez
      zmeny správania
- [ ] testy protokolu (validácia) a BroadcastChannel transportu

## Akceptačné kritériá
- panel + tabuľa v dvoch oknách fungujú ako doteraz (aj `npm run build:single` na `file://`)
- `npm test`, `npm run build` a `npm run lint` prechádzajú
- `protocol.ts` neimportuje nič z Vue ani z DOM

## Poznámky / odkazy
- ADR 0006, ADR 0001 (synchronizácia okien)
- tabuľa dostáva iba `BoardFeed`, nikdy `GameSession`

## Záznam
