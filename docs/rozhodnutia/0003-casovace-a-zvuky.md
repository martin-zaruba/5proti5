# 0003 – Časovače a zvuky mimo herného enginu

- **Stav:** prijaté
- **Dátum:** 2026-10-18

## Kontext
Pravidlá majú časové limity (3 s na odpoveď, 20 s / 25 s vo finále) a hra potrebuje zvukové efekty.
Engine je čistý reducer s históriou na undo (ADR 0002) a tabuľa beží v inom okne ako panel.

## Rozhodnutie
- **Engine iba povie, aký limit platí** (`timeLimit(state)` v `src/engine/timing.ts`, hodnoty v profile).
  Samotný odpočet je mimo enginu: čisté funkcie v `src/shared/timer.ts`, stav drží `gameStore`.
  Časovač nie je v histórii hry ani v logu – Späť (Ctrl+Z) vracia herné akcie, nie štart časovača.
- **Vypršanie času nedáva X automaticky** – panel aj tabuľa ukážu „čas vypršal“ a moderátor X potvrdí
  (moderátor môže uznať odpoveď vyslovenú tesne pred koncom).
- Časovač na odpoveď sa po každej hernej akcii vynuluje (ďalší hráč dostane celé 3 s); časovač finále
  beží ďalej, kým ho moderátor nepozastaví, a pripraví sa nanovo pri zmene hráča.
- **Tabuľa dostáva `BoardFeed`** = `{ view, timer, muted }`. Časovač sa posiela ako čas konca (`endsAt`),
  nie každý tik – tabuľa odpočítava sama podľa vlastných hodín (rovnaký počítač).
- **Zvuky hrá iba tabuľa.** Čistá funkcia `soundCues(predošlý pohľad, nový pohľad)` (`src/shared/soundCues.ts`)
  určí, čo zaznie; zvuky sa syntetizujú cez Web Audio (`src/shared/sounds.ts`) – žiadne súbory, žiadna licencia,
  nič z TV relácie. Stlmenie ovláda moderátor v paneli.
- Záložná synchronizácia cez udalosť `storage` sa používa len bez `BroadcastChannel` – pri súbehu oboch by
  oneskorená udalosť so starším stavom spôsobila opakované prehratie zvukov.

## Zvažované alternatívy
- Časovač v stave enginu (akcie `startTimer`, `stopTimer`) – zaplnil by históriu undo a log, engine by
  potreboval čas z akcií; nič z pravidiel by tým nezískal.
- Zvukové súbory (MP3) – treba ich zohnať/licencovať; syntéza stačí a nič nestojí.
- Zvuky v paneli – moderátor má notebook, publikum počúva projektor/TV; zvuky patria k tabuli.

## Dôsledky
- Po obnovení stránky panela sa časovač vynuluje (nie je uložený) – vedome, je to krátkodobý stav.
- Prehliadač povolí zvuk až po kliknutí alebo stlačení klávesu v okne tabule; tabuľa na to vyzve.
