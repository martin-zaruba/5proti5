# Požiadavky na aplikáciu

## Cieľ
Webová aplikácia na **riadenie a prezentovanie** hry „5 proti 5“ (slovenská verzia Family Feud) –
napr. na firemnú akciu, rodinnú oslavu alebo školskú súťaž. Moderátor ovláda hru z panela, publikum
sleduje tabuľu na projektore/TV.

## Roly a obrazovky

### 1. Moderátorský panel (`/moderator`)
Vidí všetko vrátane skrytých odpovedí. Ovládanie:
- výber/načítanie sady otázok, nastavenie názvov družstiev a mien hráčov, voľba kapitána, profil pravidiel (2026/2022),
- priebeh hry: Zoraďovačka (s kolami 4–5) a finále sa dajú vypnúť – skrátená hra len s kolami 1–3,
- spustenie kola, zobrazenie otázky, zaznamenanie, kto stlačil buzzer prvý,
- **klik na odpoveď = odkrytie** (správna odpoveď), tlačidlo **X** (nesprávna), **čas vypršal**,
- indikácia, kto je na rade (družstvo + hráč), stav životov, bank kola, skóre,
- krádež: výsledok tipu kapitána súpera,
- penalizácia za radenie sa (strata všetkých životov),
- časovače (3 s odpoveď, 20 s / 25 s finále) – štart/stop/reset,
- **undo** poslednej akcie, **anulovanie otázky** a návrat skóre (štatút čl. 3.1, 3.2),
- ručná korekcia skóre (záchranná brzda),
- odkrytie zvyšných odpovedí na konci kola,
- finále: zápis odpovedí hráča A/B, priradenie k odpovedi z prieskumu (alebo 0), označenie duplicity.

### 2. Tabuľa pre publikum (`/board`)
Na celú obrazovku (projektor/TV), len zobrazuje stav:
- tabuľa s 4–6 políčkami (číslo priečky → po odkrytí text + body), animácia odkrytia,
- skóre oboch družstiev, bank kola, označenie kola a násobku,
- veľké **X** (1–3) pri chybe,
- časovač,
- Zoraďovačka: zoznam odpovedí a postupne vypĺňané priečky,
- finále: 5 riadkov × 2 hráči, súčet, cieľ 200, výsledná výhra,
- úvodná / medzikolová / záverečná obrazovka (víťaz, výhra).

### 3. (Voliteľné) Buzzery
- MVP: klávesnica na počítači tabule/panela (napr. `A` / `L`), alebo zadanie moderátorom.
- Neskôr: mobilný buzzer (`/buzzer`) cez sieť – vyžaduje server (WebSocket).

### 4. Správa otázok (`/editor`)
- vytvorenie/úprava sady otázok: text otázky, 4–6 odpovedí s počtom respondentov (súčet ≤ 100),
  typ (bežné kolo / zoraďovačka / finále / 1 proti 1),
- import/export JSON (prípadne CSV),
- validácia (počty, poradie, duplicity).

## Nefunkčné požiadavky
- Beží **offline** v prehliadači na jednom počítači (žiadna povinná cloudová služba).
- Voliteľne **viac zariadení** (tabuľa na TV, panel na notebooku/mobile) cez miestnosť na serveri – vyžaduje
  internet (ADR 0006); bez servera aplikácia funguje ako na jednom počítači.
- Stav hry prežije obnovenie stránky (persistencia v `localStorage`/IndexedDB).
- Tabuľa čitateľná z diaľky: veľké písmo, vysoký kontrast, 16:9.
- Zvukové efekty (správna odpoveď, X, buzzer, koniec času, duplicita vo finále) – s možnosťou stlmiť.
- UI v **slovenčine**.
- Herná logika oddelená od UI a **pokrytá testami** (pravidlá sú zložité a plné hraničných prípadov).

## Mimo rozsahu (zatiaľ)
- Online hra viacerých rodín cez internet (súťažiaci na vlastných zariadeniach), účty používateľov, platby.
- Používanie originálnej grafiky, loga či zvukov z TV relácie (licencia FremantleMedia) – vytvoriť vlastný vizuál.
