---
id: T-014
nazov: Skrátená hra – voľba Zoraďovačky a finále
priorita: P2
zavisi_od: [T-005, T-006, T-007]
---

# T-014 – Skrátená hra – voľba Zoraďovačky a finále

## Cieľ
Moderátor pri nastavení hry rozhodne, či sa hrá Zoraďovačka (a s ňou kolá 4–5) a finále, aby sa dala
odohrať aj krátka hra len s kolami 1–3.

## Rozsah
- [x] engine: `GameOptions` v stave hry, `createGame(teams, set, options)`, koniec hry podľa volieb
- [x] remíza: skrátená hra bez finále končí nerozhodne, inak sa posledné kolo opakuje (`OQ-16`)
- [x] nastavenie hry: checkboxy „Zoraďovačka a kolá 4–5“ a „Finále“, náhľad priebehu
- [x] panel a tabuľa: koniec hry s remízou, texty remízy s číslom kola
- [x] uložená rozohratá hra zo staršej verzie sa načíta ako plná hra
- [x] testy enginu

## Akceptačné kritériá
- bez Zoraďovačky a finále hra po 3. kole skončí vyhlásením víťaza (alebo remízou)
- bez Zoraďovačky s finále ide víťaz 3. kola do finále; remíza po 3. kole sa opakuje
- so Zoraďovačkou bez finále hra skončí po 5. kole

## Poznámky / odkazy
- pravidlá: `docs/pravidla.md` §2 (Skrátená hra), §5; `docs/otvorene-otazky.md` OQ-16

## Záznam
- 2026-10-24 – `GameOptions { ranking, final }` v `GameState.options`; `resolveOptions` vypne finále, ak sada
  nemá finálové otázky. `roundCount` / `isLastRound` skracujú hru na kolá 1–3 bez Zoraďovačky,
  `allowsDraw` povoľuje remízu (`winner: null`) len v skrátenej hre bez finále.
  - Nastavenie hry: voľby sa pamätajú v `localStorage` (`setup-options`); finále sa nedá zapnúť, ak ho sada
    nemá. Sada otázok musí mať aj tak 5 bežných kôl (validácia sady sa nemenila).
  - `gameStore` dopĺňa `options` do uloženej hry zo staršej verzie (aj do histórie undo).
- 2026-10-25 – Nové nastavenie hry má predvolene vypnutú Zoraďovačku aj finále (len kolá 1–3); uložená voľba
  moderátora v `setup-options` má prednosť. Engine (`createGame`) má naďalej predvolene celý diel.
