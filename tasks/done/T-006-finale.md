---
id: T-006
nazov: Engine – finále Veľké peniaze
priorita: P2
zavisi_od: [T-003]
---

# T-006 – Engine – finále

## Cieľ
Logika finále podľa `docs/pravidla.md` §6.

## Rozsah
- [x] výber 2 hráčov víťazného družstva
- [x] hráč A: 5 otázok, 20 s, preskočenie a návrat, priradenie odpovede k priečke (alebo 0 b.)
- [x] hráč B: 25 s, označenie duplicity (bez bodov, musí odpovedať znova)
- [x] postupné odkrývanie, súčet, výpočet výhry (≥200 → 1 500 €, 100–199 → Malé peniaze, <100 → 0)
- [ ] profil 2022: limit 5 dielov a 15 000 € → presunuté do T-012 (profil 2022 zatiaľ nie je)

## Akceptačné kritériá
- testy pre všetky tri pásma výhry a duplicitu

## Záznam
- 2026-10-18 – Logika v `src/engine/final.ts`, napojená v `game.ts` (fáza `final` s krokmi `choosePlayers` →
  `playerA` → `playerB` → `done`, potom `nextRound` → `gameOver`), testy `final.spec.ts`.
  - Finále nasleduje po 5. kole (ak nie je remíza a sada má 5 finálových otázok), hrá vedúce družstvo.
    Konfigurácia v profile: 5 otázok, limity 20/25 s, cieľ 200, 1 500 €, Malé peniaze od 100 b.
  - Akcie: `finalChoosePlayers` (2 rôzni hráči, aj kapitán), `finalAnswer(question, text, rank|null)` – moderátor
    priradí odpoveď k priečke prieskumu alebo „iné“ (0 b.); dá sa opraviť, kým nie je odkrytá. Preskočenie a návrat
    = zápis v ľubovoľnom poradí, neodpovedaná otázka ostane prázdna. `finalReveal(question)` postupne odkrýva,
    `finalNextPlayer` až keď sú odkryté všetky odpovede A.
  - Duplicita: ak B povie rovnakú odpoveď ako A (rovnaká priečka, alebo rovnaký text mimo prieskumu), engine ju
    nezapíše a zvýši `duplicateSignal`; moderátor môže duplicitu označiť aj ručne (`finalDuplicate` – rovnaký
    význam inými slovami).
  - Výhra (`finalPrize`): ≥ 200 → 1 500 €, 100–199 → Malé peniaze = konto družstva po 5. kole (**OQ-15**, nová
    otázka – počíta sa aj Zoraďovačka), < 100 → 0 €.
  - Tabuľa: 5 riadkov × hráč A/B, len odkryté odpovede (text, potom body), počas odpovedí B sú odpovede A skryté
    a vrátia sa pri odkrývaní B (štatút hovorí len o odstránení; návrat je prezentačná voľba kvôli súčtu A + B).
    Súčet, cieľ 200, výhra, záblesk „DUPLICITA“, limit času aktuálneho hráča (bez odpočtu – časovače sú T-009).
  - Panel `FinalPanel.vue`: výber hráčov, pri každej otázke tlačidlá s odpoveďami prieskumu, pole „čo povedal“,
    „Iné (0 b.)“, „Duplicita“ (len pre B, ak A odpovedal), „Odkryť“; súčty A/B a výhra.
  - Overené v prehliadači: celý diel kolá 1–3 → Zoraďovačka → kolá 4–5 → finále (A 98 b. vrátane preskočenej
    otázky a odpovede mimo prieskumu, B duplicita „Jablko“ a potom 131 b.) → 229 b. → 1 500 € → koniec hry.
  - Mutačná kontrola: vypnutá detekcia duplicity → 3 padnuté testy, hranica 200 ako „> 200“ → 1.
