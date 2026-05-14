# Moteur de collecte — Funding Watch Morocco

Scripts Python qui collectent les opportunités de financement depuis des sources publiques (UNDP, UE, GIZ, AFD, UN Women, FAO, fundsforNGOs, etc.) et les envoient à l'API Next.js `/api/ingest`. Toute opportunité collectée est insérée en `status='draft'` et **doit être validée manuellement** dans le back-office admin avant publication.

## Installation

```bash
cd scrapers
pip install -r requirements.txt
```

Le projet utilise `.env.local` à la racine (voir `.env.example`). Variables nécessaires :
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (lecture seule des sources)
- `CRON_SECRET`
- `NEXT_PUBLIC_APP_URL` (défaut `http://localhost:3000`)

## Lancement

```bash
# Toutes les sources actives en table sources
python scrapers/scraper.py

# Une seule source par parser_key
python scrapers/scraper.py --source undp

# Mode test (n'envoie rien à l'API)
python scrapers/scraper.py --dry-run
```

## Architecture

```
scrapers/
├── scraper.py                # orchestrateur principal
├── sources_config.json       # config de référence (informationnel)
├── requirements.txt
├── collectors/
│   ├── base.py               # BaseCollector (fetch/parse/normalize)
│   ├── rss.py                # générique RSS (feedparser)
│   ├── html.py               # générique HTML (BeautifulSoup)
│   ├── undp.py
│   ├── eu_funding.py
│   ├── giz.py
│   ├── afd.py
│   ├── un_women.py
│   └── registry.py           # parser_key -> Collector
└── utils/
    ├── normalize.py          # dates, montants, Maroc éligible, langue
    ├── dedup.py              # dédoublonnage en mémoire
    ├── supabase_client.py    # lecture table sources (REST)
    └── ingest_client.py      # POST /api/ingest
```

## Workflow

```
sources.active=true
   ↓
get_collector(parser_key)
   ↓
fetch() → parse() → normalize() → dedupe()
   ↓
POST /api/ingest {source_id, items[], run{}}
   ↓
API insère en `opportunities` (status='draft')
   ↓
Validation humaine dans /admin/pending
   ↓
Publication → visible sur /opportunities + email alerts
```

## Ajouter une nouvelle source

1. Insérez une ligne dans la table `sources` (depuis `/admin/sources` ou SQL) avec un `parser_key`.
2. Créez un fichier `collectors/<key>.py` qui hérite de `HtmlCollector` ou `BaseCollector`.
3. Enregistrez-le dans `collectors/registry.py`.
4. Testez : `python scrapers/scraper.py --source <key> --dry-run`.

## Planification

### Cron Linux

```cron
# Tous les jours à 6h
0 6 * * * cd /path/to/project && /usr/bin/python scrapers/scraper.py >> scrapers/logs/cron.log 2>&1
```

### GitHub Actions

```yaml
name: scrape
on:
  schedule:
    - cron: '0 6 * * *'   # 06:00 UTC
  workflow_dispatch:
jobs:
  scrape:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: '3.11' }
      - run: pip install -r scrapers/requirements.txt
      - run: python scrapers/scraper.py
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
          CRON_SECRET: ${{ secrets.CRON_SECRET }}
          NEXT_PUBLIC_APP_URL: ${{ secrets.NEXT_PUBLIC_APP_URL }}
```

## Limites V1

- Les sélecteurs CSS sont volontairement génériques (filtres par mots-clés sur les liens). Pour une qualité production, surcharger `parse()` de chaque collector avec les sélecteurs spécifiques au site.
- Pas encore d'extraction fine de la deadline / du montant — à enrichir avec `lib/ai.py` côté Next.js (LLM summarizeOpportunity).
- Pas d'exécution JavaScript (Playwright à ajouter si une source rend tout en JS).
