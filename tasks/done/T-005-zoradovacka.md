---
id: T-005
nazov: Engine – bonusové kolo Zoraďovačka
priorita: P2
zavisi_od: [T-003]
---

# T-005 – Engine – Zoraďovačka

## Cieľ
Logika bonusového kola podľa `docs/pravidla.md` §4 (len profil 2026).

## Rozsah
- [x] začína družstvo s menej bodmi (OQ-03 pri rovnosti)
- [x] hádanie odspodu (posledná priečka → prvá), rotácia hráčov od kapitána
- [x] chyba → vynulovanie série, prechod kontroly (OQ-04, OQ-05)
- [x] víťaz = dokončí tabuľku bez chyby, získa body svojej série

## Akceptačné kritériá
- testy pre: bezchybné vyriešenie, viac striedaní, víťaz po striedaní

## Záznam
- 2026-10-18 – Logika v `src/engine/ranking.ts`, napojená v `game.ts` (fázy `ranking` → `rankingEnd`), testy `ranking.spec.ts`.
  - Spoločné primitíva (`TeamIndex`, `GameError`, `requireProfile`, …) presunuté do `src/engine/core.ts`,
    aby `game.ts` a `ranking.ts` nemali kruhový import (`game.ts` ich ďalej re-exportuje).
  - Profil 2026: `ranking: { afterRound: 3, tieStarter: 'host' }`. Zoraďovačka sa hrá po 3. kole, ak ju sada obsahuje;
    bez otázky v sade sa preskočí (validátor na to upozorní varovaním). Po nej pokračuje 4. kolo (×2).
  - Začína družstvo s menej bodmi; pri rovnosti vyberie moderátor (akcia `chooseStartingTeam`, OQ-03).
    Alternatíva `tieStarter: 'lastRoundLoser'` je pripravená v profile (testovaná cez `rankingStarter`), v UI sa nenastavuje.
  - Tip = akcia `rankingGuess(rank)`: moderátor klikne na odpoveď, ktorú družstvo povedalo; engine sám vyhodnotí,
    či patrí na práve hľadané (najnižšie neodkryté) miesto. `wrongAnswer` / `timeout` = nesprávny tip.
  - Správny tip: priečka sa odkryje, body ×1 (OQ-06) do série, ďalší hráč (5 → 4 → … → 1 → 5).
    Nesprávny tip: priečka sa neodkryje (OQ-05), séria sa vynuluje (odkryté priečky ostanú, ale už sa nerátajú),
    kontrola prechádza a tipuje kapitán súpera (OQ-04). Kto tabuľku dokončí, získa body svojej neprerušenej série.
  - Na tabuli sú odpovede zoradené abecedne (deterministické, nič neprezrádza), body a priečky iba pre zaradené.
  - `voidQuestion` v Zoraďovačke nejde (sada nemá náhradnú otázku tohto typu) – hláška odkáže na tlačidlo Späť.
  - UI: panel `RankingAnswers.vue` (tipy klikom alebo klávesmi 1–9 podľa poradia v zozname, A/L pri rovnosti),
    tabuľa: zoznam odpovedí + rebríček priečok, pulzujúca hľadaná priečka, stlmené priečky mimo série.
  - Ukážková sada: Zoraďovačka so 6 odpoveďami (reštaurácia) namiesto 4 ročných období.
  - Overené v prehliadači: kolá 1–3 → Zoraďovačka (začína B s menej bodmi) → 2 správne tipy → chybný tip → A dokončí
    a získa 82 b. (262 : 91) → 4. kolo. Pri tom opravené dve chyby tabule: rebríček vytláčal pásik pod rámec 16:9
    a pri zmene pásika boli chvíľu viditeľné oba (`Transition mode="out-in"`).
  - Mutačná kontrola: vypnutie nulovania série → 16 padnutých testov, hádanie zhora namiesto zdola → 9.
