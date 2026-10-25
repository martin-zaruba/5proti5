---
id: T-020
nazov: Nasadenie servera na Cloudflare a CI
priorita: P3
zavisi_od: [T-016]
---

# T-020 – Nasadenie servera na Cloudflare a CI

## Cieľ
Server sa nasadzuje automaticky z `master` rovnako ako frontend (ADR 0005) a frontend na GitHub Pages
vie, kam sa pripojiť.

## Rozsah
- [ ] jednorazovo: Cloudflare účet, API token s právom na Workers, tajomstvo `CLOUDFLARE_API_TOKEN`
      (a `CLOUDFLARE_ACCOUNT_ID`) v GitHub repe – postup do README
- [ ] workflow: testy servera + `wrangler deploy` pri zmene v `server/` na `master`
- [ ] `deploy.yml`: `VITE_SYNC_URL` (premenná repa) pri builde frontendu
- [ ] povolené `Origin` pre produkciu (`https://martin-zaruba.github.io`), `null` pre `file://`
- [ ] README: ako spustiť server lokálne, ako hrať na viacerých zariadeniach
- [ ] aktualizovať `CLAUDE.md` (štruktúra kódu, príkazy) a ADR 0005 (dôsledok o OQ-09)

## Akceptačné kritériá
- push do `master` nasadí server aj frontend; verejná stránka sa pripojí na nasadený server
- `npm run build:single` bez `VITE_SYNC_URL` vytvorí súbor, ktorý funguje ako doteraz

## Poznámky / odkazy
- ADR 0005, ADR 0006
- bezplatný plán Workers / Durable Objects (SQLite) – overiť aktuálne limity pri nasadení

## Záznam
