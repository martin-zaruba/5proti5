# Slovník pojmov

Dokumentácia a UI sú po slovensky, **kód (identifikátory) po anglicky**. Táto tabuľka drží konzistentné názvy.

| Slovensky (UI / docs) | Anglicky (kód) | Význam |
|---|---|---|
| družstvo, rodina | `team` | jedno z dvoch súťažiacich družstiev |
| hráč, člen | `player` | člen družstva |
| pozícia | `position` | poradie hráča v rade (1–5) |
| kapitán, hlava rodiny | `captain` | hráč na pozícii 5 (profil 2026) |
| moderátor | `host` | ovláda hru |
| tabuľa | `board` | obrazovka pre publikum |
| otázka | `question` | otázka z prieskumu |
| odpoveď (z prieskumu) | `answer` | jedna položka na tabuli: `text`, `points` |
| priečka | `rank` | poradie odpovede na tabuli (1 = najčastejšia) |
| body | `points` | počet respondentov × násobok |
| násobok | `multiplier` | 1 / 2 / 3 |
| kolo | `round` | jedna otázka v hre |
| súboj pri pulte | `faceOff` | úvod kola, buzzer |
| tlačidlo | `buzzer` | |
| kontrola (právo odpovedať) | `control` / `controllingTeam` | družstvo, ktoré práve hrá |
| život, X | `strike` | chyba; 3 = koniec |
| bank kola | `roundBank` | body nahraté v aktuálnom kole |
| krádež bodov | `steal` | pokus súpera po 3 X |
| konto, skóre | `score` | celkové body družstva |
| Zoraďovačka | `ranking` (fázy `ranking`, `rankingEnd`) | bonusové kolo zoraďovania |
| tip (v Zoraďovačke) | `rankingGuess` | odpoveď, ktorú družstvo zaraďuje na hľadané miesto |
| séria | `bank` v `RankingState`, `counted` | body družstva v Zoraďovačke od jeho posledného prevzatia kontroly |
| dvojitá / trojitá šanca | `double` / `triple` | kolá s násobkom 2 / 3 |
| finále, Veľké peniaze | `finalRound` / `fastMoney` | záverečné kolo dvoch hráčov |
| Malé peniaze | `smallMoney` | výhra pri 100–199 bodoch vo finále |
| duplicita | `duplicate` (`finalDuplicate`, `duplicateSignal`) | rovnaká odpoveď hráča B ako A vo finále |
| hráč A / hráč B (finále) | `positions[0]` / `positions[1]`, kroky `playerA` / `playerB` | dvaja hráči víťazného družstva vo finále |
| výhra | `prize` (`big` / `small` / `none`) | výsledok finále v € |
| 1 proti 1 | `oneOnOne` | štartovacie kolo (profil 2022) |
| profil pravidiel | `ruleProfile` | `2026` / `2022` |
| anulovanie otázky | `voidQuestion` | zrušenie otázky vrátane bodov |
| sada otázok | `questionSet` | súbor otázok na jeden diel |
| časovač, limit | `timer`, `timeLimit` | odpočet 3 s na odpoveď, 20 s / 25 s vo finále |
| zvukový signál | `SoundCue` | zvuk, ktorý zahrá tabuľa (buzzer, X, správne, koniec času …) |
| stlmiť | `muted` | vypnutie zvukov tabule z panela |
