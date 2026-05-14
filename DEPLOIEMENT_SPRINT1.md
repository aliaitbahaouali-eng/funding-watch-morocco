# Déploiement Sprint 1 — Funding Intelligence & Matching System

> Ce document décrit les étapes à exécuter dans l'ordre pour activer le matching vectoriel réel.

---

## Vue d'ensemble

Le Sprint 1 transforme Funding Watch de **"agrégateur avec score cosmétique"** en **"plateforme de matching IA réel"**. Les changements incluent :

- ✅ Schéma SQL étendu (pgvector, profil orga structuré, taxonomies fermées)
- ✅ 4 référentiels : 17 SDG, 47 secteurs DAC, 17 populations, 24 géographies
- ✅ Onboarding wizard 7 écrans qui capture le vrai profil de l'organisation
- ✅ Pipeline d'embeddings (OpenAI text-embedding-3-small, fallback Voyage, fallback heuristique)
- ✅ Fonction SQL `match_opportunities_for_org()` qui combine semantic + taxonomy + geo + deadline
- ✅ Widget `<TopMatches />` sur le dashboard
- ✅ API `GET /api/match` pour usage externe

---

## Étape 1 — Migration de la base Supabase

**Dans Supabase Dashboard → SQL Editor → New query :**

1. Copier-coller le contenu de `supabase/migration_v4.sql` → **Run**
2. Copier-coller le contenu de `supabase/seed_taxonomies.sql` → **Run**

À la fin du seed, tu dois voir :
```
✓ Taxonomies seedées : 17 SDG, 47 secteurs DAC, 17 populations, 24 géographies
```

**Vérification :**
```sql
select count(*) from sdg_goals;            -- 17
select count(*) from dac_sectors;          -- 47
select count(*) from target_populations;   -- 17
select count(*) from action_geographies;   -- 24
```

---

## Étape 2 — Ajouter une clé d'embeddings dans `.env.local`

Choix recommandé : **OpenAI text-embedding-3-small** (qualité/prix imbattable, $0.02/1M tokens).

Récupère ta clé sur https://platform.openai.com/api-keys puis ajoute :

```bash
OPENAI_API_KEY=sk-proj-...
```

Sans clé, le script fonctionne en **fallback heuristique** (hash déterministe) — l'app ne plante pas mais le matching sémantique sera dégradé.

Alternative : `VOYAGE_API_KEY` (Voyage AI, modèle voyage-2).

---

## Étape 3 — Lancer le backfill

Sur ta machine Windows, depuis `funding-watch-mvp/` :

```cmd
backfill-all.bat
```

Le script fait dans l'ordre :
1. **Taxonomy** — Claude classe chaque opportunité publiée sur SDG + DAC + populations
2. **Embeddings** — Chaque org + chaque opportunité reçoit son vecteur 1536 dimensions

Pour limiter en test :
```cmd
backfill-all.bat --limit 20
```

Coût estimé : ~$0.01 pour 100 opportunités (Claude Haiku + OpenAI embeddings combinés).

---

## Étape 4 — Tester le matching

1. Si tu as déjà un compte, va sur `/onboarding` et complète les 7 étapes
2. Retourne sur `/dashboard` → le widget **⚡ Matching IA** doit afficher tes 5 meilleurs matches
3. Sinon : `GET /api/match` retourne le JSON directement

```bash
curl -H "Cookie: <ton-cookie-sb>" https://funding-watch-morocco.vercel.app/api/match
```

Tu devrais voir :
```json
{
  "matches": [
    {
      "opportunity_id": "uuid",
      "title": "...",
      "donor_name": "...",
      "deadline": "2026-06-30",
      "semantic_score": 0.8421,
      "taxonomy_score": 0.6667,
      "final_score": 78.5,
      "reason": "Forte correspondance thématique"
    },
    ...
  ]
}
```

---

## Étape 5 — Déploiement Vercel

```cmd
cd funding-watch-mvp
git add .
git commit -m "Sprint 1 — Funding Intelligence & Matching System"
git push
```

Vercel redéploie automatiquement.

**Important** : ajouter `OPENAI_API_KEY` dans les variables d'environnement Vercel (Settings → Environment Variables), sinon le backfill en production utilisera le fallback heuristique.

---

## Étape 6 — Cron quotidien des embeddings (Sprint 2)

À configurer plus tard (Sprint 2) : un GitHub Actions ou cron Vercel qui :
- Lance `backfill_taxonomy.py --limit 100` toutes les nuits
- Lance `backfill_embeddings.py --limit 200` toutes les nuits
- Re-embeddifie les orgs dont `updated_at > embedding_updated_at`

---

## Architecture finale

```
┌──────────────────────────────────────────────────────────┐
│   USER signs up  →  /onboarding (7 steps)                │
│                       ↓                                    │
│   organizations + org_sdg_goals + org_dac_sectors +      │
│   org_target_populations + org_action_geographies         │
│                       ↓                                    │
│   backfill_embeddings.py → organizations.embedding        │
│                                                            │
│   SCRAPERS → opportunities (status='draft')                │
│                       ↓                                    │
│   admin /admin/pending validates → status='published'      │
│                       ↓                                    │
│   backfill_taxonomy.py → opp_sdg_goals + opp_dac_sectors  │
│                       ↓                                    │
│   backfill_embeddings.py → opportunities.embedding        │
│                                                            │
│   USER ouvre /dashboard                                    │
│                       ↓                                    │
│   <TopMatches /> appelle match_opportunities_for_org()    │
│   → semantic (40%) + taxonomy (30%) + geo (15%)            │
│   + deadline (10%) + donor fam (5%) = final_score          │
└──────────────────────────────────────────────────────────┘
```

---

## Sprint suivant : volume data + cron

Quand le Sprint 1 tourne (≥20 opportunités tagguées + embeddées + matching visible dans le dashboard), on passe au **Sprint 2** :

1. Ajouter 15 sources prioritaires (UNDP, AFD, EU NDICI, Drosos, Bosch, Mott, Ford, Aga Khan, OSI, Fond. Mohammed V, INDH, AECID, OIT, FAO, KOICA)
2. Cron GitHub Actions quotidien (crawler + backfill embeddings)
3. Email digest matin (3 meilleurs matches/jour)
4. Mobile responsive complet
5. Trust signals sur landing (5 logos partenaires)

---

## Checklist d'acceptance Sprint 1

- [ ] `migration_v4.sql` passe sans erreur
- [ ] `seed_taxonomies.sql` insère les 4 référentiels
- [ ] `OPENAI_API_KEY` dans `.env.local` + Vercel
- [ ] `backfill-all.bat` termine sans erreur
- [ ] Sur `/onboarding`, les 7 étapes fonctionnent et sauvegardent
- [ ] Sur `/dashboard`, le widget Top Matches affiche au moins 3 opportunités avec score
- [ ] Les scores sont cohérents (>60 pour les matches évidents, <40 pour les éloignés)
- [ ] `GET /api/match` répond avec un JSON propre
