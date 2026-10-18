# Pravidlá hry „5 proti 5“ – herná špecifikácia

Tento dokument je **zdroj pravdy pre herný engine**. Vychádza z oficiálnych štatútov STVR/RTVS
(pozri [zdroje/](zdroje/)). Kde je štatút nejednoznačný, je to označené odkazom na
[otvorene-otazky.md](otvorene-otazky.md) (`OQ-xx`).

- **Primárna verzia:** Štatút 2026 (ST 10/2026, STVR) – `zdroje/statut-2026-stvr.pdf`
- **Variant:** Štatút 2022 (RTVS) – `zdroje/statut-2022-rtvs.pdf` – líši sa poradím kôl a obsahuje kolo „1 proti 1“.
  Aplikácia by mala podporovať oba formáty ako konfigurovateľné „profily pravidiel“.

---

## 1. Základy

| Pojem | Hodnota |
|---|---|
| Družstvá | 2 družstvá („rodiny“), každé **5 hráčov** (+ 1 náhradník, ktorý nehrá) |
| Kapitán („hlava rodiny“) | 1 hráč v každom družstve |
| Prieskum | 100 respondentov; **body za odpoveď = počet respondentov**, ktorí ju uviedli |
| Odpovede na tabuli | 2026: **4 až 6** najčastejších odpovedí (2022: 3 až 6). Počet políčok je viditeľný na tabuli ešte pred položením otázky. |
| Konto | Každé družstvo má na tabuli vlastné skóre |
| Životy | 3 „životy“ na kolo, chyba = **X** na tabuli + zvukový signál |
| Limit na odpoveď | **3 sekundy** od vyzvania moderátorom; prekročenie = strata života |
| Platnosť odpovede | Platí iba **prvá** vyslovená odpoveď |

### Postavenie hráčov (2026)
Hráči stoja v rade pozície 1–5. **Pozícia 1 stojí najbližšie k moderátorovi, kapitán je na pozícii 5** (najďalej).
V kole N chodí k pultu hráč na pozícii N (piate kolo = kapitáni).

> Variant 2022: kapitán stojí **najbližšie** k moderátorovi (v čele radu) a do 1. kola idú kapitáni.

---

## 2. Štruktúra dielu (profil 2026)

| # | Kolo | Násobok | Pri pulte |
|---|---|---|---|
| 1 | Prvé kolo – jednoduché počítanie | ×1 | hráči na pozícii 1 |
| 2 | Druhé kolo – jednoduché počítanie | ×1 | hráči na pozícii 2 |
| 3 | Tretie kolo – jednoduché počítanie | ×1 | hráči na pozícii 3 |
| B | **Bonusové kolo – ZORAĎOVAČKA** | ×1 | (nehrá sa pri pulte) |
| 4 | Štvrté kolo – **dvojitá šanca** | ×2 | hráči na pozícii 4 |
| 5 | Piate kolo – **trojitá šanca** | ×3 (+ špeciálne pravidlo krádeže) | kapitáni |
| F | Šieste kolo – **finále „Veľké peniaze“** | – | 2 vybraní hráči víťazov |

### Profil 2022 (variant)
| # | Kolo | Násobok |
|---|---|---|
| 0 | **Štartovacie kolo „1 proti 1“** (o peniaze, nie o body) | – |
| 1 | Prvé kolo | ×1 |
| 2 | Druhé kolo | ×1 |
| 3 | Tretie kolo – dvojitá šanca | ×2 |
| 4 | Štvrté kolo – dvojitá šanca | ×2 |
| 5 | Piate kolo – trojitá šanca | ×3 |
| F | Finále | – |

---

## 3. Bežné kolo (kolá 1–5)

Každé kolo = **jedna otázka**. Body nahraté počas kola sa zbierajú v **banku kola** (`roundBank`),
ktorý sa na konci kola pripíše jednému z družstiev.

### 3.1 Súboj pri pulte (face-off)
1. K pultu s dvoma tlačidlami prídu príslušní hráči oboch družstiev.
2. Moderátor prečíta otázku. **Kto prvý stlačí tlačidlo**, odpovedá.
3. Ak uviedol **najčastejšiu odpoveď (TOP 1)** → súper už neodpovedá, kontrolu získava jeho družstvo.
4. Inak odpovedá hráč druhého družstva. **Kontrolu získava družstvo, ktorého hráč uviedol častejšiu (vyššie
   umiestnenú) odpoveď.** (Ak trafil len jeden z nich, kontrolu má ten.)
5. Ak **ani jeden** netrafí žiadnu odpoveď na tabuli → postupne odpovedajú ďalší členovia oboch družstiev
   v poradí, ako stoja, **začína družstvo, ktoré stlačilo tlačidlo prvé**. Ak netrafí nikto ani po kapitánov,
   **otázka sa anuluje** a nahradí novou; postup sa opakuje.
6. Odpovede trafené v súboji sa odkryjú a ich body idú do banku kola (pozri `OQ-01`).
7. Na rozdiel od americkej verzie **neexistuje voľba „hrať/prenechať“** – kontrolu automaticky získa
   družstvo s častejšou odpoveďou.

### 3.2 Hra družstva s kontrolou
1. Moderátor ide po rade k ďalším členom družstva (za hráčom zo súboja, kapitán posledný; potom sa pokračuje
   znovu od začiatku radu – `OQ-02`). Každý dostane otázku znova.
2. **Trafená odpoveď** → odkryje sa na tabuli, body × násobok kola idú do banku kola.
3. **Netrafená odpoveď alebo prekročenie 3 s** → X (strata života).
4. Hráči družstva s kontrolou **sa nesmú radiť**. Ak sa radia, moderátor môže odobrať **všetky zostávajúce
   životy** v kole (akcia „penalizácia“).
5. Ak družstvo odkryje **všetky** odpovede → bank kola získava toto družstvo. Koniec kola.
6. Ak stratí **3 životy** pred odkrytím všetkého → **krádež** (3.3).

### 3.3 Krádež bodov
- Súper sa **smie radiť od 2. X** súpera.
- Po 3. X moderátor vyzve **kapitána súperovho družstva** – jedna odpoveď.
- **Trafí** → súper získa **celý bank kola** (body nahraté súperom), ale **nie body za svoju odpoveď**
  (tá sa odkryje). Pôvodné družstvo v kole nezíska nič.
- **Netrafí** → bank kola zostáva pôvodnému družstvu.
- **Výnimka – 5. kolo (trojitá šanca):** pri úspešnej krádeži sa pripíšu **aj body za odpoveď kapitána**
  (×3).

### 3.4 Koniec kola
- Bank kola sa pripíše víťazovi kola.
- Neodkryté odpovede sa zvyčajne na záver odkryjú bez bodov (prezentačná konvencia, nie pravidlo štatútu).

---

## 4. Bonusové kolo – Zoraďovačka (len profil 2026)

- Na tabuli sa zobrazia **všetky** odpovede prieskumu (bez poradia). Úlohou je zoradiť ich podľa
  počtu respondentov, **odspodu** – najprv sa hľadá **posledná (najmenej početná)** priečka, potom predposledná atď.
- Nehrá sa pri pulte. **Začína družstvo s menej bodmi** po kolách 1–3 (pri rovnosti – `OQ-03`).
- Odpovedá najprv **kapitán**; po ňom pokračuje hráč stojaci vedľa kapitána atď. (rotácia v rámci družstva).
- **Správny tip** → priečka sa odkryje, družstvo získa jej body (×1) do svojej série a pokračuje.
- **Nesprávny tip** → všetky body nahraté v bonusovom kole sa **vynulujú**, kontrola prechádza na
  druhé družstvo, ktoré začína od nuly (u nich tiež najprv kapitán – `OQ-04`).
- Odkryté priečky zostávajú odkryté (`OQ-05`).
- **Víťaz:** družstvo, ktoré bez chyby dokončí tabuľku až po 1. priečku. Získa body za priečky odkryté
  vo svojej neprerušenej sérii.

---

## 5. Remíza po 5. kole

Ak majú po 5. kole obe družstvá rovnako bodov: **5. kolo sa anuluje vrátane jeho bodov** a hrá sa znova
s novou otázkou. Opakuje sa, kým nie je jasný víťaz.

---

## 6. Finále – „Veľké peniaze“

1. Kapitán víťazného družstva určí **2 hráčov** (môže byť aj kapitán).
2. Hráč B odchádza do zákulisia (nesmie počuť otázky ani odpovede).
3. **Hráč A:** moderátor číta **5 otázok**, limit **20 s** spolu (od položenia 1. otázky).
   - Môže povedať „ďalej“ (preskočiť) a ak zostane čas, vrátiť sa k preskočenej otázke.
   - Platí prvá odpoveď.
4. Po uplynutí času sa odpovede postupne odkryjú s bodmi. Body sa získajú, ak je odpoveď medzi
   **6 najčastejšími**, inak 0.
5. Odpovede hráča A sa z tabule **skryjú**, hráč B príde k moderátorovi (na požiadanie sa dozvie skóre A).
6. **Hráč B:** rovnakých 5 otázok, limit **25 s**. Ak zopakuje odpoveď hráča A → zvukový signál
   („duplicita“) a musí povedať inú (za duplicitu body nie sú).
7. Odkryjú sa odpovede B, sčíta sa celkové skóre A + B.

### Výhry (2026)
| Skóre A + B | Výhra | Šampión |
|---|---|---|
| **≥ 200** | **1 500 €** | áno |
| 100 – 199 | „Malé peniaze“ = súčet bodov družstva z kôl 1–5 v € | áno |
| < 100 | 0 € | áno |

Šampióni sa môžu zúčastniť **neobmedzeného** počtu ďalších dielov.

> Variant 2022: maximálne 5 dielov za sebou; ak v 5. diele získajú ≥ 200, vyhrávajú špeciálnych **15 000 €**,
> ale prichádzajú o predošlé výhry. Pri neúspechu v 5. diele si predošlé výhry ponechávajú.

---

## 7. Štartovacie kolo „1 proti 1“ (len profil 2022)

- Postupne prichádzajú k pultu dvojice hráčov stojacich oproti sebe, **od pozície 5 po kapitána**.
- Každej dvojici jedna otázka; kto prvý stlačí, odpovedá. Cieľom je trafiť **TOP odpoveď**.
- Trafí → jeho družstvo získa sumu podľa pozície: **5 → 10 €, 4 → 20 €, 3 → 30 €, 2 → 40 €, kapitán → 50 €**
  (spolu 150 €).
- Peniaze sa vyplatia hneď; hlavná hra začína so skóre **0 : 0**.

---

## 8. Opravy a anulovanie (dôležité pre aplikáciu)

Zo štatútu (čl. 3) vyplývajú požiadavky na funkcie moderátorského panelu:

- **3.1** Softvérová chyba / nejednoznačná odpoveď uznaná ako správna → **anulovať otázku vrátane bodov**
  a pokračovať novou otázkou rovnakej úrovne.
- **3.2** Správna odpoveď nesprávne vyhodnotená ako chybná → otázka sa anuluje, pokračuje sa otázkou
  s **rovnakým poradovým číslom** a **so skóre obnoveným na stav pred touto otázkou**.
- **3.4** Technické problémy → možnosť zopakovať kolo s novou otázkou.

⇒ Engine musí uchovávať **snapshot stavu pred každým kolom** a podporovať **undo** posledných akcií.
