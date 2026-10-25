---
id: T-021
nazov: Menšie družstvá (2–5 hráčov)
priorita: P2
zavisi_od: [T-003, T-007]
---

# T-021 – Menšie družstvá (2–5 hráčov)

## Cieľ
Hra sa dá odohrať aj s menšou skupinou: moderátor pri nastavení hry zvolí 2 až 5 hráčov v družstve.

## Rozsah
- [x] pravidlá pre menšie družstvá v `docs/pravidla.md` (§1) a `OQ-20`
- [x] engine: počet hráčov z hry (nie z profilu), profil má rozsah `teamSize { min, max }` a `captain`
- [x] k pultu v kole N hráč na pozícii ((N − 1) mod počet) + 1, súboj bez zásahu končí pri kapitánoch
- [x] rotácia v hre, krádež, Zoraďovačka a finále v kratšom rade
- [x] nastavenie hry: výber počtu hráčov, kapitán a poradie pri pulte podľa počtu
- [x] panel: rad hráčov podľa počtu, kapitán na poslednej pozícii
- [x] testy enginu

## Akceptačné kritériá
- s 2–4 hráčmi sa dá odohrať celá hra (kolá, Zoraďovačka, finále) bez chyby
- s 5 hráčmi sa hra správa ako doteraz (pôvodné testy bez zmeny prechádzajú)

## Poznámky / odkazy
- pravidlá: `docs/pravidla.md` §1 (Menšie družstvá), §3.1, §4, §6; `docs/otvorene-otazky.md` OQ-20

## Záznam
- 2026-10-25 – `RuleProfile.teamSize` je rozsah `{ min: 2, max: 5 }`, `captainPosition` nahradilo `captain:
  'last' | 'first'` (2022 bude mať kapitána v čele radu). Nové funkcie v `core.ts` (exportované z enginu):
  `teamSize(teams)`, `captainPosition(profile, size)`, `nextPosition`, `faceOffPosition(round, size)`.
  - `createGame` vyžaduje rovnaký počet hráčov v oboch družstvách a 2–5 hráčov.
  - Uložené hry sa nemigrujú – počet hráčov sa berie z mien hráčov v hre (staré hry majú 5).
  - Nastavenie hry: výber „Počet hráčov v družstve“ (`setup-team-size` v `localStorage`); formulár drží mená
    pre 5 pozícií, takže zmena počtu nič nezmaže, do hry idú len prvé pozície. Pri menšom počte ukáže poradie
    pri pulte (napr. 1, 2, 3, 1, 2).
  - Panel: rad hráčov v skóre má toľko stĺpcov, koľko je hráčov; kapitán podľa počtu; finále predvolí
    pozíciu 1 a kapitána.
  - Testy: `teamSize.spec.ts` (poradie pri pulte pre 2/3/4 hráčov, rotácia, krádež, súboj bez zásahu,
    Zoraďovačka, finále), `createGame` (2–5, rovnaký počet), `SetupForm.spec.ts` (výber počtu, kapitán,
    spustenie hry s 3 hráčmi, zapamätanie počtu a mien). Ručne v prehliadači neoverené (rozšírenie Chrome
    nebolo pripojené).
