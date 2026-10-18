---
id: T-002
nazov: Dátový model a formát sady otázok
priorita: P1
zavisi_od: [T-001]
---

# T-002 – Dátový model a formát sady otázok

## Cieľ
Definovať TS typy a JSON formát sady otázok na jeden diel + vzorovú sadu na testovanie.

## Rozsah
- [x] typy `Question`, `Answer`, `QuestionSet`, typ otázky (`standard` | `ranking` | `final` | `oneOnOne`)
- [x] validácia: 4–6 odpovedí, body zostupne, súčet ≤ 100, žiadne duplicitné texty
- [x] voliteľné synonymá odpovedí (`aliases`) – uľahčia moderátorovi vyhľadanie
- [x] rezervné otázky (anulovanie / remíza po 5. kole / súboj, kde nikto netrafil)
- [x] vzorová sada `data/ukazkova-sada.json` (5 kôl + Zoraďovačka + 5 finálových + rezervy)

## Návrh formátu (draft)
```json
{
  "name": "Ukážková sada",
  "ruleProfile": "2026",
  "rounds": [
    { "type": "standard", "text": "Čo si berieme na dovolenku k moru?",
      "answers": [
        { "text": "Plavky", "points": 38, "aliases": ["kúpačky"] },
        { "text": "Opaľovací krém", "points": 24 }
      ] }
  ],
  "ranking": { "type": "ranking", "text": "...", "answers": [] },
  "final": [ { "type": "final", "text": "...", "answers": [] } ],
  "reserve": []
}
```

## Akceptačné kritériá
- typy + validátor s testami; vzorová sada prejde validáciou

## Záznam
- 2026-10-18 – Typy a validátor v `src/engine/questions.ts`, profil pravidiel v `src/engine/profiles.ts`.
  - `parseQuestionSet(json)` overí štruktúru aj obsah a vráti `{ set?, issues[] }`; `issues` majú `severity`
    (`error` blokuje použitie sady, `warning` nie), `path` (napr. `rounds[1].answers[1].points`) a slovenskú správu.
  - Pravidlá: počet odpovedí podľa typu (bežná 4–6 podľa profilu, Zoraďovačka 3–10, finále 1–6, 1 proti 1 3–6),
    body celé 1–100 a zostupne (pri rovnosti rozhoduje poradie – OQ-12; v Zoraďovačke ostro zostupne),
    súčet ≤ 100, žiadne duplicitné texty ani synonymá (bez ohľadu na veľkosť písmen).
  - Sada musí mať presne 5 bežných kôl; chýbajúca Zoraďovačka, finále (≠ 5 otázok) a rezervy sú len varovania.
  - `type` pri otázke je v JSON nepovinný (určí sa podľa miesta v sade), ak je uvedený, musí sedieť.
  - Profil 2022 parser zatiaľ odmietne (T-012).
- Ukážková sada `data/ukazkova-sada.json` (vymyslené dáta): 5 kôl, Zoraďovačka, 5 finálových, 4 rezervné. Testy: `questions.spec.ts`.
