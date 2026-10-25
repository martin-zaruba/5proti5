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
- [ ] server odpovedá na `ping` serverovým časom; klient odhadne posun hodín (`offset`) z niekoľkých
      meraní (najmenšie RTT), priebežne obnovuje
- [ ] `TimerView` sa posiela v serverovom čase (moderátor prepočíta `endsAt` cez svoj offset), tabuľa ho
      prepočíta späť cez svoj offset
- [ ] pri `BroadcastChannel` transporte je offset 0 (bez zmeny)
- [ ] čisté funkcie na odhad offsetu a prepočet + testy

## Akceptačné kritériá
- na dvoch zariadeniach s ručne posunutými hodinami (napr. o 5 s) sa odpočet líši najviac o ~200 ms
- časovač na jednom počítači funguje ako doteraz

## Poznámky / odkazy
- ADR 0003 (časovače mimo enginu), ADR 0006
- `src/shared/timer.ts`, `src/screens/board/TimerBadge.vue`

## Záznam
