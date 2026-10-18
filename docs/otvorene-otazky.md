# Otvorené otázky a nejednoznačnosti

Miesta, kde štatút nie je jednoznačný alebo kde treba rozhodnúť o správaní aplikácie.
Keď sa otázka vyrieši, doplň **Rozhodnutie** a prípadne uprav [pravidla.md](pravidla.md).

| ID | Otázka | Predbežný návrh | Rozhodnutie |
|---|---|---|---|
| OQ-01 | Idú body za odpovede trafené v súboji pri pulte do banku kola (aj tie súperove)? | Áno, všetky odkryté odpovede v súboji idú do banku kola; bank získa víťaz kola. | Áno – prijatý návrh (2026-10-18). |
| OQ-02 | Čo ak družstvo s kontrolou prejde celý rad (5 hráčov) a stále má životy? | Pokračuje sa znovu od prvého hráča za hráčom zo súboja (cyklicky). | Áno, cyklicky po celom rade: N+1, …, 5, 1, …, N, N+1, … – prijatý návrh (2026-10-18). |
| OQ-03 | Kto začína Zoraďovačku pri rovnosti bodov po 3. kole? | Družstvo, ktoré vyhralo posledné kolo, **nezačína** (t. j. začína druhé); alebo voľba moderátora. Konfigurovateľné. | Konfigurovateľné; predvolene volí moderátor – prijatý návrh (2026-10-18). |
| OQ-04 | Pri prechode kontroly v Zoraďovačke – odpovedá u nového družstva vždy kapitán, alebo pokračuje rotácia? | Prvý tip po prevzatí kontroly dáva kapitán, ďalej rotácia. | Kapitán, potom rotácia – prijatý návrh (2026-10-18). |
| OQ-05 | Odkryje sa v Zoraďovačke správna priečka po nesprávnom tipe? | Nie, priečka zostáva skrytá, kontrola prechádza. | Nie – prijatý návrh (2026-10-18). |
| OQ-06 | Násobí sa v Zoraďovačke a vo finále? | Nie (×1). Finále má vlastné bodovanie bez násobku. | Nie – prijatý návrh (2026-10-18). |
| OQ-07 | Má byť podporovaný profil 2022 od začiatku, alebo len 2026? | MVP = 2026; engine navrhnúť tak, aby profil bol konfigurácia. | MVP = 2026, profil je konfigurácia – prijatý návrh (2026-10-18). |
| OQ-08 | Ako sa budú zadávať stlačenia tlačidiel (buzzer)? Klávesnica, mobil, USB/HW? | MVP: moderátor zadá v paneli; potom klávesnica (2 klávesy); neskôr mobilné buzzery. | Prijatý návrh (2026-10-18). MVP: moderátor v paneli + klávesy `A` / `L`. |
| OQ-09 | Na koľkých zariadeniach beží aplikácia? (1 PC + projektor vs. viac zariadení v sieti) | MVP: 1 počítač, 2 okná (panel + tabuľa) cez `BroadcastChannel`. | Prijatý návrh (2026-10-18). |
| OQ-10 | Odkiaľ sa berú otázky a odpovede (vlastný prieskum, import CSV/JSON, editor)? | JSON import + jednoduchý editor v aplikácii. | Prijatý návrh (2026-10-18). |
| OQ-11 | Je potrebná správa výhier v € (šampióni, viac dielov za sebou), alebo stačí 1 diel? | MVP: 1 diel, výhra sa iba zobrazí. | Prijatý návrh (2026-10-18). |
| OQ-12 | Ako presne sa určuje „častejšia odpoveď“ pri súboji, ak súper trafí odpoveď s rovnakým počtom bodov? | Vyššie umiestnenie na tabuli (poradie v dátach) rozhoduje. | Rozhoduje priečka (poradie v dátach) – prijatý návrh (2026-10-18). |
| OQ-13 | Súboj pri pulte, keď netrafí ani jeden z prvej dvojice (§3.1 bod 5): ako sa vyhodnocujú ďalšie dvojice (pozície N+1 … 5)? | Každá ďalšia dvojica rovnako ako prvá: najprv hráč družstva, ktoré stlačilo prvé; ak trafí TOP 1, získa kontrolu, inak odpovedá súper a kontrolu má vyššia priečka. Družstvo s kontrolou potom pokračuje hráčom za tým, kto kontrolu vybojoval. | Implementovaný návrh (2026-10-18), čaká na potvrdenie. |
| OQ-14 | Čo ak nikto netrafí ani po kapitánov a došli rezervné otázky? | Engine akciu odmietne s hláškou; nastavenie hry upozorní na chýbajúce rezervy. | Implementovaný návrh (2026-10-18), čaká na potvrdenie. |
| OQ-15 | „Malé peniaze“ = „súčet získaných bodov za prvých 5 kôl“ (štatút 2026) – počítajú sa aj body zo Zoraďovačky? | Áno – berie sa konto víťazného družstva po 5. kole (vrátane Zoraďovačky), t. j. skóre zobrazené na tabuli. | Implementovaný návrh (2026-10-18), čaká na potvrdenie. |
