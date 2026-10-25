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
- [x] postup do README: Cloudflare účet, API token s právom na Workers, tajomstvo `CLOUDFLARE_API_TOKEN`
      (a `CLOUDFLARE_ACCOUNT_ID`) v GitHub repe, premenná `SYNC_URL`
- [ ] **jednorazovo (používateľ):** založiť Cloudflare účet + token, nastaviť secrets, po prvom nasadení
      premennú `SYNC_URL`
- [x] workflow: testy servera + `wrangler deploy` pri zmene v `server/` na `master`
- [x] `deploy.yml`: `VITE_SYNC_URL` (premenná repa) pri builde frontendu
- [x] povolené `Origin` pre produkciu (`https://martin-zaruba.github.io`), `null` pre `file://`
- [x] README: ako spustiť server lokálne, ako hrať na viacerých zariadeniach
- [x] aktualizovať `CLAUDE.md` (štruktúra kódu, príkazy) a ADR 0005 (dôsledok o OQ-09)
- [ ] po nasadení: overiť na dvoch zariadeniach v rôznych sieťach (T-018, T-019 – odozva do 1 s,
      odpočet ±200 ms) a aktuálne limity bezplatného plánu

## Akceptačné kritériá
- push do `master` nasadí server aj frontend; verejná stránka sa pripojí na nasadený server
- `npm run build:single` bez `VITE_SYNC_URL` vytvorí súbor, ktorý funguje ako doteraz

## Poznámky / odkazy
- ADR 0005, ADR 0006
- bezplatný plán Workers / Durable Objects (SQLite) – overiť aktuálne limity pri nasadení

## Záznam
- 2026-10-25 – `.github/workflows/server.yml`: pri pushi, ktorý mení `server/` alebo `protocol.ts`, typová
  kontrola a testy servera (aj na feature vetvách); na `master` potom `npm --prefix server run deploy`
  s `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID`. Bez cudzích akcií – wrangler je v `server/package.json`.
  - `deploy.yml`: `VITE_SYNC_URL: ${{ vars.SYNC_URL }}` – kým premenná nie je nastavená, verejná stránka
    funguje ako doteraz (len jeden počítač).
  - Overené lokálne: `wrangler deploy --dry-run` zabalí Worker (11,6 KiB, väzby `ROOMS` + `ALLOWED_ORIGINS`),
    oba workflowy sú platný YAML, `npm run build:single` neobsahuje adresu servera.
  - Ostáva: jednorazové nastavenie účtu a tajomstiev (nedá sa urobiť z repa), merge do `master` a overenie
    na skutočných zariadeniach – až potom úlohu presunúť do `done/`.
