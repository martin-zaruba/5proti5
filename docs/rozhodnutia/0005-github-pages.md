# 0005 – Ukážková verzia na GitHub Pages

- **Stav:** prijaté
- **Dátum:** 2026-10-25

## Kontext
MVP treba ukázať ďalším ľuďom bez inštalácie – stačí odkaz. Aplikácia je čisto statická (žiadny server,
dáta v `localStorage`), takže ju zvládne akýkoľvek bezplatný statický hosting. Repo je na GitHube.

## Rozhodnutie
- GitHub Pages, nasadzuje workflow `.github/workflows/deploy.yml` pri každom pushi do `master`
  (testy → `npm run build` → Pages). Adresa: `https://martin-zaruba.github.io/5proti5/`.
- Stránka beží v podadresári `/5proti5/`: workflow nastaví `BASE_PATH`, `vite.config.ts` ho použije ako `base`
  (lokálne ostáva `/`).
- Pages nemá presmerovanie pre SPA – po obnovení `/5proti5/board` by vrátil 404. Workflow preto skopíruje
  `index.html` aj ako `404.html`, takže aplikácia sa načíta a router zobrazí správnu obrazovku.
- Jednorazovo v nastaveniach repa: **Settings → Pages → Source: GitHub Actions**.

## Zvažované alternatívy
- Netlify / Cloudflare Pages – vedia SPA presmerovanie a súkromné repo, ale vyžadujú ďalší účet a prepojenie
  cez web.
- Hash routovanie aj na serveri (bez `404.html`) – škaredšie adresy, len kvôli jednému hostingu.

## Dôsledky
- Zadarmo len pre verejné repo (pri súkromnom treba platený GitHub alebo iný hosting).
- `404.html` vracia HTTP stav 404 aj pre platné obrazovky – prehliadaču to nevadí, len nástroje to vidia ako chybu.
- Synchronizácia panel → tabuľa ostáva v rámci jedného prehliadača (OQ-09); každý návštevník má vlastné dáta
  vo svojom prehliadači. Doplnené 2026-10-25: s premennou repa `SYNC_URL` sa stránka vie pripojiť na sync server
  a hrať na viacerých zariadeniach (ADR 0006).
