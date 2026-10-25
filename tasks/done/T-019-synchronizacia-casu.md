---
id: T-019
nazov: Synchronizácia času medzi zariadeniami
priorita: P3
zavisi_od: [T-016, T-017]
---

# T-019 – Synchronizácia času medzi zariadeniami

## Cieľ
Odpočet na tabuli má sedieť s panelom, aj keď hodiny zariadení idú rozdielne (bežne stovky ms, niekedy
sekundy). Dnes `TimerView.endsAt` počíta s `Date.now()` moderátora a tabuľa ho porovnáva so svojím
`Date.now()` – na jednom počítači to stačí, na dvoch nie.

## Rozsah
- [x] server odpovedá na `ping` serverovým časom; klient odhadne posun hodín (`offset`) z niekoľkých
      meraní (najmenšie RTT), priebežne obnovuje
- [x] `TimerView` sa posiela v serverovom čase (moderátor prepočíta `endsAt` cez svoj offset), tabuľa ho
      prepočíta späť cez svoj offset
- [x] pri `BroadcastChannel` transporte je offset 0 (bez zmeny)
- [x] čisté funkcie na odhad offsetu a prepočet + testy

## Akceptačné kritériá
- na dvoch zariadeniach s ručne posunutými hodinami (napr. o 5 s) sa odpočet líši najviac o ~200 ms
- časovač na jednom počítači funguje ako doteraz

## Poznámky / odkazy
- ADR 0003 (časovače mimo enginu), ADR 0006
- `src/shared/timer.ts`, `src/screens/board/TimerBadge.vue`

## Záznam
- 2026-10-25 – `src/shared/sync/clock.ts`: `clockSample` (server čítal hodiny v polovici cesty ping → pong),
  `estimateOffset` (vzorka s najkratšou cestou), `shiftFeed` (posunie `timer.endsAt`).
  - `SyncTransport.clockOffset()` = čas servera − lokálny čas; lokálny transport 0, WebSocket transport
    z posledných 8 vzoriek. Prvý hrubý odhad hneď z `welcome.serverTime`, potom 3 pingy (0 / 0,3 / 0,9 s)
    a ďalej pravidelný ping každých 15 s.
  - `boardSync`: publisher posiela `endsAt` v serverovom čase (+offset), tabuľa ho prevedie na svoj (−offset).
    Ak sa odhad zmení počas bežiaceho odpočtu (prvý feed prišiel pred prvým pongom), moderátor feed pošle
    znova a tabuľa ho prepočíta – opakovaný feed so zhodným obsahom nespustí zvuky.
  - Aj `savedAt` hry (OQ-18) sa medzi zariadeniami posiela v serverovom čase (`hostRoom` – `toServer` /
    `fromServer`, 0 = žiadna hra ostáva 0).
  - Testy: `clock.spec.ts`, `boardSync.spec.ts` (moderátor −5 s, tabuľa +3 s → rovnaký okamih konca;
    oprava bežiaceho odpočtu po lepšom odhade), `webSocketTransport.spec.ts` (odhad z welcome a pongov),
    `hostRoom.spec.ts` (porovnanie `savedAt` pri posunutých hodinách).
  - Ručne v Chrome: karta tabule s `Date.now()` posunutým o +5 s, pripojená cez miestnosť; po štarte 3 s
    odpočtu na paneli tabuľa ukazovala bežiaci odpočet (bez prepočtu by ukázala hneď 0 a zahrala koniec času).
    Presnosť ~200 ms medzi dvoma fyzickými zariadeniami sa dá overiť až po nasadení (T-020).
