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
- [ ] typy `Question`, `Answer`, `QuestionSet`, typ otázky (`standard` | `ranking` | `final` | `oneOnOne`)
- [ ] validácia: 4–6 odpovedí, body zostupne, súčet ≤ 100, žiadne duplicitné texty
- [ ] voliteľné synonymá odpovedí (`aliases`) – uľahčia moderátorovi vyhľadanie
- [ ] rezervné otázky (anulovanie / remíza po 5. kole / súboj, kde nikto netrafil)
- [ ] vzorová sada `data/ukazkova-sada.json` (5 kôl + Zoraďovačka + 5 finálových + rezervy)

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
