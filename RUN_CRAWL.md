# 🕷 Guide Crawl Massif — Sprint 2A.2

**Objectif** : passer de ~110 opps en base à **500+ opps vivantes** (Audit Phase 1, item #4).

---

## Étape 1 — Crawl prioritaire (30 min, ~$1 Claude)

Cible : les sources priority=1 (UNDP, AFD, EU NDICI, Tanmia, INDH, USAID, EU Funding, UN Women, Drosos).

```cmd
cd C:\Users\HP\Downloads\funding-watch-claude-continuation-package\funding-watch-mvp
python scrapers/crawler.py --priority 1 --max 50
```

Résultat attendu : ~300-450 nouvelles opps draft en base.

---

## Étape 2 — Crawl complet (2-4h, ~$3-5)

Cible : les 49 sources actives, 30 items chacune, avec lecture des PDFs joints (EU/AFD).

```cmd
python scrapers/crawler.py --max 30 --with-pdf
```

Lance plutôt en soirée/nuit (long).

---

## Étape 3 — Backfill embeddings + taxonomies sur les nouvelles opps

```cmd
python scrapers/backfill_embeddings.py --opps
python scrapers/backfill_taxonomy.py --opps
```

Coût : ~$0.10 OpenAI + ~$0.50 Claude Haiku (avec prompt caching).

---

## Étape 4 — Bulk-publish les nouveautés (côté Ali via Cowork)

Une fois le crawl terminé, ping-moi avec un screenshot du log final.
Je relance en SQL :
- liaison NULL donors
- bulk-publish élargi (sauf UNDP procurement non-Maroc)
- nettoyage titres pourris
- vérification embeddings/taxonomies

---

## Commandes utiles

```cmd
# Crawl 1 seule source pour test
python scrapers/crawler.py --source tanmia --max 5

# Crawl sources d'une catégorie
python scrapers/crawler.py --category foundation --max 20

# Dry-run (ne rien insérer en base, juste voir ce qui serait collecté)
python scrapers/crawler.py --priority 1 --max 5 --dry-run
```

---

## Coût total estimé

| Étape | Durée | Coût |
|-------|-------|------|
| Crawl prioritaire | 30 min | ~$1 |
| Crawl complet | 2-4h | ~$3-5 |
| Backfill embeddings | 5 min | ~$0.05 |
| Backfill taxonomies | 10 min | ~$0.50 |
| **Total** | **3-5h** | **~$5-7** |

---

## Résultat final attendu

- **500-800 opps vivantes** en base (vs 110 actuellement)
- **80%+ avec embeddings** → matching IA opérationnel
- **80%+ avec SDG/DAC tags** → matching taxonomique fin
- Page `/opportunities` riche, dashboard Top Matches IA pertinent

---

*Document généré 2026-05-15 · Sprint 2A.2 · Cowork → Ali handoff*
