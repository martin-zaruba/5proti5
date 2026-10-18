# 0002 – Architektúra herného enginu

- **Stav:** prijaté
- **Dátum:** 2026-10-18

## Kontext
Pravidlá (`docs/pravidla.md`) majú veľa prechodov stavov a moderátor musí vedieť kedykoľvek vrátiť
akciu alebo anulovať otázku (§8). Tabuľa nesmie dostať skryté odpovede. Stav musí prežiť obnovenie stránky.

## Rozhodnutie
- **`gameReducer(state, action, questionSet) → state`** (`src/engine/game.ts`) – čistá funkcia nad
  nemenným (immutable) stavom. Fázy: `intro → faceOff → play → steal → roundEnd → … → gameOver`.
  Nepovolená akcia vyhodí `GameError` so slovenskou hláškou pre moderátora; stav sa nezmení.
- **Akcie sú „čo sa stalo pri pulte“**, nie „ktoré pravidlo použiť“: `buzz`, `revealAnswer`, `wrongAnswer`,
  `timeout`, `penaltyConferring`, `revealRemaining`, `nextRound`, `voidQuestion`, `adjustScore`,
  `setShowQuestion`. Význam určí engine podľa fázy – napr. `revealAnswer` počas krádeže = úspešná krádež,
  na konci kola = odkrytie bez bodov. UI tak má rovnaké tlačidlá v každej fáze.
- **Automatické následky** (zisk kontroly, prechod na krádež, pripísanie banku, anulovanie otázky keď v súboji
  nikto netrafí, opakovanie 5. kola pri remíze) sa dejú v rámci jednej akcie → jedno undo ich vráti celé.
- **Relácia** (`src/engine/session.ts`) = `{ questionSet, state, past[], log[] }`. Undo = návrat na predošlý
  stav z `past` (max. 200 krokov). Log je len na pridávanie (aj vrátené akcie zostávajú, pribudne „↶ Vrátené“).
  Sada otázok je v relácii raz, nie v každom stave histórie (menej dát v `localStorage`).
- **Snapshot pred kolom** = `round.scoreBefore`; `voidQuestion` z neho obnoví skóre a načíta ďalšiu rezervnú
  otázku s rovnakým číslom kola.
- **Projekcia pre tabuľu** `toBoardView(state)` (`src/engine/boardView.ts`) – jediné dáta, ktoré odchádzajú
  na tabuľu; skryté odpovede obsahujú len číslo priečky.
- Časové pečiatky logu dodáva volajúci (`now`), engine nečíta hodiny → deterministické testy.

## Zvažované alternatívy
- Event sourcing (stav = prehratie všetkých akcií) – elegantné undo, ale pri zmene pravidiel by sa staré
  uložené hry prehrali inak; história stavov je jednoduchšia.
- Samostatné akcie pre každý prípad (`stealResult`, `faceOffResult` …) – viac tlačidiel a viac možností
  poslať akciu v nesprávnej fáze.
- Pinia store s logikou v akciách – miešalo by pravidlá s UI.

## Dôsledky
- Nové časti hry (Zoraďovačka T-005, finále T-006) pribudnú ako ďalšie fázy a akcie v rovnakom reduceri.
- Undo nevráti log (zámerne – log slúži pri sporoch).
- Ručná korekcia skóre počas kola sa pri anulovaní otázky stratí (obnoví sa skóre spred kola).
