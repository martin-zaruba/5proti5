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
- [x] `src/shared/sync/protocol.ts` – typy správ s verziou `v` (napr. `hello`, `feed`, `session`,
      `requestFeed`, `ping`/`pong`, `error`), iba typy + validačné funkcie bez závislosti na Vue/DOM
      (bude ich importovať aj server)
- [x] rozhranie `SyncTransport` (send, subscribe, stav spojenia, close)
- [x] dnešný `boardSync.ts` prepísať na `BroadcastChannel` transport (vrátane fallbacku cez `storage` event)
- [x] `createBoardPublisher` / `subscribeToBoard` prijímajú transport; `gameStore` a `BoardScreen` bez
      zmeny správania
- [x] testy protokolu (validácia) a BroadcastChannel transportu

## Akceptačné kritériá
- panel + tabuľa v dvoch oknách fungujú ako doteraz (aj `npm run build:single` na `file://`)
- `npm test`, `npm run build` a `npm run lint` prechádzajú
- `protocol.ts` neimportuje nič z Vue ani z DOM

## Poznámky / odkazy
- ADR 0006, ADR 0001 (synchronizácia okien)
- tabuľa dostáva iba `BoardFeed`, nikdy `GameSession`

## Záznam
- 2026-10-25 – `src/shared/sync/`: `protocol.ts` (typ `SyncMessage` s poľom `v`, `message()`, `parseMessage()`
  – kontrola tvaru, nie obsahu feedu/session; `encodeMessage` / `decodeMessage` pre textové rámce WebSocketu;
  `MAX_MESSAGE_BYTES`), `transport.ts` (rozhranie `SyncTransport` + `createListeners`), `localTransport.ts`
  (BroadcastChannel, kópia feedu v `localStorage`, fallback cez `storage` event).
  - `BoardFeed` sa presunul do `protocol.ts`; `boardSync.ts` ho re-exportuje, takže `gameStore` a `BoardScreen`
    sa nemenili. `createBoardPublisher` / `subscribeToBoard` majú voliteľný transport (predvolene lokálny).
  - Lokálny transport pri `subscribe` najprv pošle posledný uložený feed – rovnako, ako to bude robiť server pri
    pripojení; tabuľa preto už nevolá `loadJson` sama.
  - Správy sa zmenili z `{ type: 'board' }` na `{ v: 1, type: 'feed' }`; staré otvorené okno (predošlá verzia)
    sa s novým nezosynchronizuje, kým sa neobnoví.
  - Testy: `protocol.spec.ts`, `localTransport.spec.ts` (Node `BroadcastChannel` v jsdom), `boardSync.spec.ts`
    (pamäťový hub). `npm test`, `npm run build`, `npm run lint` prechádzajú.
  - Ručné overenie panel + tabuľa v prehliadači sa spraví spolu s T-018 (oba transporty naraz).
