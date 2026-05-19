# TODO — Funding Watch Morocco

Liste vivante des actions à faire avant le lancement bêta public.
À mettre à jour à chaque sprint.

---

## 🔴 Bloquants avant bêta publique

- [ ] **Exécuter `supabase/migration_v9.sql`** dans Supabase SQL Editor
  — Ajoute les colonnes WhatsApp (`whatsapp_phone`, `whatsapp_alerts_enabled`,
  `whatsapp_threshold`) sur `organizations` + la table `whatsapp_logs` avec
  RLS. Sans v9, le formulaire d'opt-in WhatsApp dans `/dashboard/preferences`
  enregistre dans le vide.

- [ ] **Exécuter `supabase/migration_v10.sql`** dans Supabase SQL Editor
  — Crée les tables `organization_members` + `organization_invitations`
  pour les comptes équipe. Sans v10, `/dashboard/team` affiche l'owner seul,
  les invitations échouent silencieusement et `/invite/[token]` renvoie
  "invitation introuvable".

- [ ] **Exécuter `supabase/migration_v22.sql`** dans Supabase SQL Editor
  — Crée la table `beta_feedback` (Sprint 4M : passage version bêta).
  Sans v22, le widget feedback flottant renvoie "système pas prêt" et
  `/admin/feedback` affiche un warning ambre. Idempotent.

- [ ] **Exécuter `supabase/migration_v21.sql`** dans Supabase SQL Editor
  — Crée la RPC `find_collaborative_recommendations_for_org` (Sprint 4F :
  recommandation collaborative anonymisée). Cosine pgvector entre l'orga
  cible et toutes les autres orgs onboardées → top pairs → aggrège leurs
  saved_opportunities en excluant celles déjà dans son vault. Sans v21,
  la carte « 👥 Ce que regardent les assos comme toi » du dashboard affiche
  un message d'attente. Idempotent (CREATE OR REPLACE).

- [ ] **Exécuter `supabase/migration_v20.sql`** dans Supabase SQL Editor
  — Ajoute `donors.profile_embedding` + index ivfflat + RPC
  `find_similar_donors_for_org`. Puis lance
  `python scripts/backfill_donor_embeddings.py` pour générer les embeddings
  de tous les bailleurs depuis leur nom + description + opps + thématiques.
  Sans v20 + le backfill, le widget "🔭 Bailleurs à explorer" du dashboard
  affiche un message d'attente. Coût OpenAI : ~$0.0001 pour 9 bailleurs.

- [ ] **Exécuter `supabase/migration_v19.sql`** dans Supabase SQL Editor
  — Crée la fonction `semantic_search_opportunities(query_embedding, limit, morocco_only)`
  utilisée par la barre de recherche `/opportunities`. Sans v19, la recherche
  retombe sur l'ancien `.ilike` keyword (qui ne capte rien en arabe ni les
  reformulations). Idempotent (CREATE OR REPLACE).

- [ ] **Exécuter `supabase/migration_v18.sql`** dans Supabase SQL Editor
  — Crée `api_usage_logs` pour tracker précisément chaque appel Claude /
  OpenAI / Brevo / Meta. Sans v18, `/admin/monitoring` continue d'afficher
  les coûts estimés ; avec v18 appliquée + des appels qui passent par
  `lib/usage-tracking.js::logUsage`, la card passe sur des coûts RÉELS
  par appel sur 30j (breakdown par provider/kind).

- [ ] **Exécuter `supabase/migration_v17.sql`** dans Supabase SQL Editor
  — Crée `email_events` qui stocke les webhooks Brevo (opens, clicks, bounces).
  Sans v17, `/admin/emails` affiche un warning ambre et les stats engagement
  restent vides. Puis : configure `BREVO_WEBHOOK_SECRET` dans Vercel + Brevo
  dashboard → Settings → Transactional → Webhooks → URL avec `?secret=`.

- [ ] **Exécuter `supabase/migration_v13.sql`** dans Supabase SQL Editor
  — Cross-source dedup : ajoute `opportunities.duplicate_of_id` +
  `seen_on_source_ids` + index + function `find_similar_opportunities()`
  et **recrée** `match_opportunities_for_org` pour exclure dups + test
  fixtures (incorporé). Une fois v13 appliqué, lance
  `python scripts/dedup_cross_source.py` (dry-run d'abord avec `--dry-run`
  pour voir ce qu'il marquerait) pour scanner les opps existantes.

- [ ] **Exécuter `supabase/migration_v12.sql`** dans Supabase SQL Editor — **URGENT P0**
  — Ajoute la colonne `opportunities.is_test` (boolean, default false) et
  marque l'opp [TEST E2E] is_test=true. Sans v12, le listing `/opportunities`
  et la landing renvoient **0 opps** (la query `.or('is_test.is.null,is_test.eq.false')`
  échoue silencieusement → null → page affiche "Aucun résultat"). Le ticker
  Header fait fallback sur "Veille active".

- [ ] **Exécuter `supabase/migration_v11.sql`** dans Supabase SQL Editor
  — Crée la table `ai_response_cache` (TTL 30 jours sur résultats IA).
  Sans v11, les appels au co-writer génèrent un draft mais ne le cachent
  pas → chaque clic refait un appel Claude facturé. Une fois v11 appliqué,
  le 2e clic sur la même opp est gratuit (cache hit).

- [ ] **Recharger le crédit Anthropic** sur https://console.anthropic.com/settings/billing
  — La clé `ANTHROPIC_API_KEY` renvoie `invalid_request_error: credit balance too low`
  → la classification taxonomique des nouvelles opps, l'AI co-writer (résumé exécutif)
  et le document intelligence (auto-complétion profil depuis texte) renvoient tous
  une erreur. Le code surface un message `no_credit` explicite à l'utilisateur.

- [x] ~~Recharger le quota OpenAI~~ — fait le 2026-05-15. Tous les opps + orgs
  re-embeddés via `openai/text-embedding-3-small`, matching sémantique opérationnel.

- [ ] **Nettoyer les fixtures de test E2E** créées le 2026-05-15 :
  ```sql
  delete from organizations where id = '313fe86d-470c-4e57-abde-cc0826691d7d';
  delete from opportunities where external_id = 'test-e2e-fwm-fixture';
  -- supprimer aussi le user test-e2e-fwm@test.local via Supabase Auth UI
  ```

- [ ] **Reclasser ngo_relevant** sur les 3 opportunités existantes
  ("Achat plants d'olivier" et "Creative Hubs" sont à `ngo_relevant=NULL` →
  invisibles au matching). Décider via `/admin/pending` ou batch SQL.

- [ ] **Recruter 5 partenaires bêta** pour remplacer les placeholders
  `BETA_PARTNERS` dans `app/page.jsx` (cf. AUDIT §3.4 — Faiblesse #4).

---

## 🔵 Observabilité bêta (Sprint 4N)

- [ ] **Créer compte Sentry** sur https://sentry.io (free tier 5k events/mois).
  Créer un projet "funding-watch-morocco" type Next.js. Récupérer le DSN
  et l'ajouter dans Vercel comme `NEXT_PUBLIC_SENTRY_DSN` (visible côté
  client) ET `SENTRY_DSN` (côté serveur). Optionnel pour source-maps :
  `SENTRY_AUTH_TOKEN` + `SENTRY_ORG` + `SENTRY_PROJECT`. Sans ces vars,
  tout est no-op (zéro overhead).

- [ ] **Créer compte Plausible** sur https://plausible.io (9€/mois starter)
  OU self-host gratuit. Ajouter le domaine de prod, puis configurer la
  variable Vercel `NEXT_PUBLIC_PLAUSIBLE_DOMAIN=funding-watch-morocco.vercel.app`
  (ou ton custom domain). Si self-host : aussi `NEXT_PUBLIC_PLAUSIBLE_SRC`.
  Sans cette variable, aucun script tracker n'est injecté.

- [ ] **Définir le funnel critique** dans Plausible dashboard une fois
  configuré : Goals → Custom event → `signup_completed`, `feedback_sent`,
  `onboarding_completed` (à wire-up dans completeOnboarding si besoin).

---

## 🟡 Important avant bêta

- [ ] **BREVO_API_KEY** : sans cette clé `sendEmail()` simule les envois
  (warning `[email] BREVO_API_KEY manquant — email simulé`). Aucun email
  réel n'est envoyé. Le digest matin restera muet tant qu'elle n'est pas
  configurée sur Vercel + GitHub Actions secrets.

- [ ] **Régénérer la `SUPABASE_SERVICE_ROLE_KEY`** par précaution
  (elle était en clair dans un commit local non poussé, GitHub l'a bloquée
  au push initial — n'a jamais fuité publiquement, mais autant la roter).

- [ ] **Améliorer la qualité de scraping** : 2/3 opportunités actuelles n'ont
  pas de `summary`/`description` exploitable (Claude ne peut pas les
  classifier). Inspecter pourquoi le crawler ne récupère pas le contenu sur
  ces sources et améliorer les sélecteurs.

---

## 🟢 Améliorations post-bêta

- [ ] Sprint 3b — Probabilité de réussite (modèle naïf sur outcomes)
- [ ] Sprint 3c — WhatsApp Business alerts (matches >90%)
- [ ] Sprint 4 — Comptes équipe (rôles admin/contributeur/viewer)
- [ ] Dashboard ops admin (monitoring sources / taux d'extraction / coût Claude)

---

## ✅ Récemment fait (à dater)

- 2026-05-19 — Sprint 4G : document intelligence upload PDF/TXT/MD via
  `/api/ai/extract-document` (unpdf côté serveur, Claude Haiku 4.5,
  logUsage tracké). Pas de Storage persistant : parsé en mémoire, jamais écrit.
- 2026-05-19 — Sprint 4F : recommandation collaborative anonymisée (RPC v21)
- 2026-05-18 — Sprint 4E : donor intelligence prédictive (RPC v20)
- 2026-05-18 — Sprint 4C : timeline deadlines + modal match parfait
- 2026-05-18 — Sprint 4B : recherche sémantique multilingue FR/AR/EN
- 2026-05-15 — Sprint 3a : donor intelligence sur la page opportunité
- 2026-05-15 — Test e2e matching validé (score 45 sur opp test, fallback path OK)
- 2026-05-15 — Migration v8 : RPC `match_opportunities_for_org` opérationnelle
- 2026-05-14 — Sprint 2 livré (Kanban, AI co-writer, digest matin, mobile, trust signals)
- 2026-05-14 — Sprint 1 déployé en prod (migrations v4 + seed taxonomies + sources v3)
