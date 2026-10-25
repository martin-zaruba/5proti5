# 5 proti 5

Webová aplikácia na riadenie a prezentovanie rodinnej hry „5 proti 5“ – moderátorský panel + tabuľa pre publikum.

- Pravidlá hry: [docs/pravidla.md](docs/pravidla.md)
- Požiadavky: [docs/poziadavky.md](docs/poziadavky.md)
- Úlohy: [tasks/README.md](tasks/README.md)
- Kontext pre vývoj s Claude Code: [CLAUDE.md](CLAUDE.md)

## Online ukážka
https://martin-zaruba.github.io/5proti5/ – nasadzuje sa automaticky pri pushi do `master`
(GitHub Actions, [ADR 0005](docs/rozhodnutia/0005-github-pages.md)).

## Hra na viacerých zariadeniach (sync server)
Tabuľa môže bežať na inom zariadení (TV, projektor, mobil) ako moderátorský panel – cez **miestnosť** na
malom serveri v Cloudflare Workers ([ADR 0006](docs/rozhodnutia/0006-synchronizacia-cez-cloudflare.md)).
Server je v priečinku `server/` (samostatný npm balík).

**Lokálne:**
```sh
npm --prefix server install   # raz
npm run server:dev            # server na http://127.0.0.1:8787
npm run dev                   # aplikácia; .env.development na server ukazuje
npm run server:test           # testy servera (bežia v runtime Workers)
```
V paneli **Vytvoriť miestnosť** → na tabuli otvor odkaz / QR kód alebo zadaj kód miestnosti.

**Nasadenie (jednorazové nastavenie):**
1. Účet na [Cloudflare](https://dash.cloudflare.com) (stačí bezplatný plán).
2. *My Profile → API Tokens → Create Token* so šablónou **Edit Cloudflare Workers**.
3. V GitHub repe *Settings → Secrets and variables → Actions*:
   - secret `CLOUDFLARE_API_TOKEN` = token z bodu 2 (ak má token prístup k viacerým účtom, aj secret
     `CLOUDFLARE_ACCOUNT_ID`),
   - po prvom nasadení servera premenná (*Variables*) `SYNC_URL` = adresa Workera, napr.
     `https://5proti5-sync.<subdoména>.workers.dev` (vypíše ju krok *deploy* workflowu *Sync server*).
4. Push do `master`: workflow *Sync server* otestuje a nasadí server, *Deploy to GitHub Pages* zostaví
   frontend s `VITE_SYNC_URL`. Bez `SYNC_URL` ostáva verejná stránka v režime jedného počítača.

Povolené adresy stránok, ktoré smú server používať, sú v `server/wrangler.jsonc` (`ALLOWED_ORIGINS`).

## Spustenie bez servera (jeden HTML súbor)
`npm run build:single` vytvorí `dist-single/5proti5.html` – súbor, ktorý sa dá skopírovať na iný počítač
a otvoriť dvojklikom (Chrome/Edge). Návod pre používateľa: [docs/navod-spustenie.md](docs/navod-spustenie.md).
