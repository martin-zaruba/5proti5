# Otvorené otázky a nejednoznačnosti

Miesta, kde štatút nie je jednoznačný alebo kde treba rozhodnúť o správaní aplikácie.
Keď sa otázka vyrieši, doplň **Rozhodnutie** a prípadne uprav [pravidla.md](pravidla.md).

| ID | Otázka | Predbežný návrh | Rozhodnutie |
|---|---|---|---|
| OQ-01 | Idú body za odpovede trafené v súboji pri pulte do banku kola (aj tie súperove)? | Áno, všetky odkryté odpovede v súboji idú do banku kola; bank získa víťaz kola. | – |
| OQ-02 | Čo ak družstvo s kontrolou prejde celý rad (5 hráčov) a stále má životy? | Pokračuje sa znovu od prvého hráča za hráčom zo súboja (cyklicky). | – |
| OQ-03 | Kto začína Zoraďovačku pri rovnosti bodov po 3. kole? | Družstvo, ktoré vyhralo posledné kolo, **nezačína** (t. j. začína druhé); alebo voľba moderátora. Konfigurovateľné. | – |
| OQ-04 | Pri prechode kontroly v Zoraďovačke – odpovedá u nového družstva vždy kapitán, alebo pokračuje rotácia? | Prvý tip po prevzatí kontroly dáva kapitán, ďalej rotácia. | – |
| OQ-05 | Odkryje sa v Zoraďovačke správna priečka po nesprávnom tipe? | Nie, priečka zostáva skrytá, kontrola prechádza. | – |
| OQ-06 | Násobí sa v Zoraďovačke a vo finále? | Nie (×1). Finále má vlastné bodovanie bez násobku. | – |
| OQ-07 | Má byť podporovaný profil 2022 od začiatku, alebo len 2026? | MVP = 2026; engine navrhnúť tak, aby profil bol konfigurácia. | – |
| OQ-08 | Ako sa budú zadávať stlačenia tlačidiel (buzzer)? Klávesnica, mobil, USB/HW? | MVP: moderátor zadá v paneli; potom klávesnica (2 klávesy); neskôr mobilné buzzery. | – |
| OQ-09 | Na koľkých zariadeniach beží aplikácia? (1 PC + projektor vs. viac zariadení v sieti) | MVP: 1 počítač, 2 okná (panel + tabuľa) cez `BroadcastChannel`. | – |
| OQ-10 | Odkiaľ sa berú otázky a odpovede (vlastný prieskum, import CSV/JSON, editor)? | JSON import + jednoduchý editor v aplikácii. | – |
| OQ-11 | Je potrebná správa výhier v € (šampióni, viac dielov za sebou), alebo stačí 1 diel? | MVP: 1 diel, výhra sa iba zobrazí. | – |
| OQ-12 | Ako presne sa určuje „častejšia odpoveď“ pri súboji, ak súper trafí odpoveď s rovnakým počtom bodov? | Vyššie umiestnenie na tabuli (poradie v dátach) rozhoduje. | – |
