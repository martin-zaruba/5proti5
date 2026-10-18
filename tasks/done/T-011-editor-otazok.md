---
id: T-011
nazov: Editor a import/export sád otázok
priorita: P2
zavisi_od: [T-002]
---

# T-011 – Editor otázok

## Rozsah
- [x] zoznam sád, vytvorenie, úprava, mazanie (uložené v `localStorage`)
- [x] formulár otázky s odpoveďami a bodmi, priebežná validácia
- [x] import/export JSON (prípadne CSV)

## Záznam
- 2026-10-18 – Editor `/editor` (`src/screens/editor/EditorScreen.vue`, `QuestionEditor.vue`), logika v `src/shared/`:
  `questionLibrary.ts` (knižnica v `localStorage`), `questionDrafts.ts` (koncepty, šablóny, export),
  `questionCsv.ts` (CSV), `download.ts`, `plural.ts`. Testy v `src/shared/__tests__/`.
  - Knižnica: zoznam sád so stavom (✓ / počet chýb) a časom zmeny; nová sada, import, duplikovanie, mazanie
    (s potvrdením), „+ Ukážková sada“. Pri prvom spustení sa vloží ukážková sada a sada, ktorú mal používateľ
    načítanú v nastavení hry pred zavedením knižnice (kľúč `question-set`).
  - Editor: názov, 5 bežných kôl, Zoraďovačka (pridať/odobrať), finále (max. 5), rezervné otázky; pri každej
    otázke text, odpovede (text, body, synonymá oddelené čiarkou), posun ↑↓, mazanie, „Zoradiť podľa bodov“,
    priebežný súčet respondentov. Validácia (`parseQuestionSet`) beží pri každej zmene, chyby sa ukazujú pri
    príslušnej otázke, varovania pri sade. Ukladá sa automaticky.
  - Rozpracovaná sada môže mať chyby; hrať sa dá iba bezchybná („Použiť v hre“ je inak vypnuté).
  - Import JSON aj nevalidný (opraví sa v editore, `toDraft`), import CSV; export JSON (rovnaký formát ako
    `data/ukazkova-sada.json` – overené testom aj v prehliadači) a CSV s BOM pre Excel.
  - CSV: `sekcia;otázka;odpoveď;body;synonymá`, sekcia = kolo | zoradovacka | finale | rezerva, synonymá
    oddelené `|`; import akceptuje aj `,`, hlavičku nevyžaduje, chyby hlási s číslom riadku.
  - Nastavenie hry vyberá sadu z knižnice (+ „Upraviť v editore“, import JSON pridá sadu do knižnice).
    Úprava sady počas rozohranej hry hru neovplyvní (relácia má vlastnú kópiu).
  - Overené v prehliadači: migrácia starej sady, nová sada (45 chýb → po vyplnení 1. kola 36), súčet 110 → chyba,
    synonymá a obnovenie po reloade, export JSON/CSV, reimport CSV → bezchybná sada, chybný súbor → hláška,
    duplikovanie, mazanie, „Použiť v hre“ → nastavenie hry → hra sa spustí.
    Sťahovanie súborov v headless prehliadači tu sandbox ruší (aj obyčajné HTTP sťahovanie), preto som obsah
    exportu overil zachytením `Blob` v stránke; skutočné uloženie súboru v bežnom prehliadači som neoveril.
