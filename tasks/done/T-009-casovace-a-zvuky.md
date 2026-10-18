---
id: T-009
nazov: Časovače a zvukové efekty
priorita: P2
zavisi_od: [T-007, T-008]
---

# T-009 – Časovače a zvuky

## Rozsah
- [x] časovač 3 s na odpoveď (po vypršaní X až po potvrdení moderátorom)
- [x] časovače finále 20 s / 25 s
- [x] zvuky: správne, X, buzzer, koniec času, duplicita, víťaz – vlastné alebo voľne licencované
- [x] stlmenie zvuku; zvuk hrá iba okno tabule

## Záznam
- 2026-10-18 – Architektúra v ADR 0003. Engine: `timeLimit(state)` (`src/engine/timing.ts`) + `answerTimeLimit: 3`
  v profile; časovač `src/shared/timer.ts`, výber zvukov `src/shared/soundCues.ts`, syntéza `src/shared/sounds.ts`.
  Testy: `timing.spec.ts`, `src/shared/__tests__/timer.spec.ts`, `soundCues.spec.ts`.
  - Časovač 3 s: moderátor ho spustí medzerníkom po vyzvaní hráča (opakovaný stisk = znova od 3 s); po každej
    hernej akcii sa vynuluje. Po vypršaní: na tabuli červené „ČAS!“ + zvuk, v paneli výzva „potvrď X (T)“ –
    X sa nepridá samo.
  - Finále: 20 s / 25 s podľa hráča, medzerník = štart/pauza, tabuľa ukazuje odpočet pri súčte.
  - Zvuky (vlastné, syntetizované, bez súborov): buzzer, správna odpoveď, odkrytie bez bodov, X, koniec času,
    duplicita, 0 bodov vo finále, výhra kola, víťaz/veľká výhra. Hrá ich iba tabuľa; stlmenie v paneli.
    Tabuľa vyzve na klik/kláves, kým prehliadač zvuk nepovolí.
  - Synchronizácia: `BoardFeed { view, timer, muted }`; záloha cez `storage` sa už nepoužíva súčasne
    s BroadcastChannel (riziko dvojitého prehratia zvukov).
  - Overené v prehliadači (Edge headless, zvuk zaznamenaný obalom okolo `AudioContext`): výzva na zapnutie zvuku,
    buzzer, odpočet 3 s → „ČAS!“ + zvuk (raz) → výzva v paneli → T = X a odpočet zmizne; správna odpoveď, X,
    krádež + výhra kola, odkrytie zvyšku; stlmenie = ticho. Finále: 20 → 19 po štarte, v pauze stojí;
    duplicita, 0 b., pri návrate odpovedí A len zvuk B, fanfára pri 1 500 € raz.
  - Pri testoch odhalené a opravené: v Zoraďovačke by nesprávny tip okrem X spustil aj zvuk odkrytia;
    vo finále by návrat odpovedí A spustil ich zvuky znova.
