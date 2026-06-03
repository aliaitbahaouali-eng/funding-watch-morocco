# TODO — Funding Watch Morocco

Liste vivante des actions à faire avant le lancement bêta public.
À mettre à jour à chaque sprint.

**Dernière mise à jour** : 2026-06-01 — Sprint 5B (audit + cleanup)

---

## 🔴 Bloquants immédiats (avant 1er beta-testeur)

### Vérifications env vars Vercel

- [ ] **`BREVO_API_KEY`** — sans cette clé, `sendEmail()` simule les envois
  (warning console `[email] BREVO_API_KEY manquant — email simulé`).
  Welcome email, first-matches, co-soumission, expert-request : tous
  silencieux. **Critique.**

- [ ] **`ANTHROPIC_API_KEY` rechargée** — si crédit épuisé, AI co-writer,
  document intelligence, classification taxonomique renvoient `no_credit`.
  Recharger sur https://console.anthropic.com/settings/billing.

- [ ] **`OPENAI_API_KEY`** — pour les embeddings (orgs, opps, donneurs).
  Si quota épuisé, le matching sémantique nouvellement créées orgs
  retombe sur le fallback taxonomy-only.

- [ ] **`SUPABASE_SERVICE_ROLE_KEY`** — sans cette clé, la co-soumission
  ne peut pas récupérer l'email de l'asso cible et n'envoie pas d'email
  de mise en relation. Voir aussi point ⚠ ci-dessous (à roter).

- [ ] **Vercel Production Domain** — Settings → Domains → s'assurer que
  `funding-watch-morocco.vercel.app` est explicitement marqué Production.
  Sinon chaque `vercel --prod` reste invisible (vécu ce matin —
  alias manuel a été nécessaire).

### Migrations Supabase encore en attente

Confirmé appliquées par Cowork ✅ : v17, v18, v19, v20, v21, v22, v23, v24, v25, v26, v27 + backfill donneurs 27/27.

Non confirmées appliquées — vérifier dans le SQL Editor Supabase :

- [ ] **`supabase/migration_v9.sql`** — colonnes WhatsApp sur
  `organizations` + table `whatsapp_logs`. Sans v9, opt-in WhatsApp
  dans `/dashboard/preferences` enregistre dans le vide.

- [ ] **`supabase/migration_v10.sql`** — tables `organization_members` +
  `organization_invitations` (comptes équipe). Sans v10,
  `/dashboard/team` affiche l'owner seul.

- [ ] **`supabase/migration_v11.sql`** — table `ai_response_cache`
  (TTL 30j). Sans v11, chaque clic AI co-writer = nouvel appel facturé
  (pas de cache hit).

- [ ] **`supabase/migration_v12.sql`** — **URGENT P0** — colonne
  `opportunities.is_test`. Si pas appliquée, `/opportunities` et landing
  peuvent retourner 0 opps.

- [ ] **`supabase/migration_v13.sql`** — cross-source dedup (colonne
  `duplicate_of_id` + RPC recréée). Optionnel : `python scripts/dedup_cross_source.py`
  après.

### Test funnel à faire toi-même

- [ ] **Tester le funnel complet** avec ton vrai email perso :
  1. Register sur https://funding-watch-morocco.vercel.app/register
  2. Vérifier réception du welcome email (check spam)
  3. Compléter onboarding (2-3 thèmes, 1 SDG, 1 zone géo)
  4. Vérifier réception du first-matches email
  5. Tester widget feedback flottant
  6. Tester co-soumission sur une opp
  7. Tester l'UI experts marketplace (placeholders)
  8. Vérifier `/admin/feedback` (en admin)
  Documenter les bugs trouvés → driver du prochain sprint code.

---

## 🟠 Important avant lancement public

### Observabilité

- [ ] **Créer compte Sentry** sur https://sentry.io (free tier 5k events/mois).
  Projet "funding-watch-morocco" type Next.js. DSN dans Vercel comme
  `NEXT_PUBLIC_SENTRY_DSN` ET `SENTRY_DSN`. Optionnel :
  `SENTRY_AUTH_TOKEN` + `SENTRY_ORG` + `SENTRY_PROJECT` pour source-maps.

- [ ] **Créer compte Plausible** sur https://plausible.io (9€/mois starter)
  OU self-host gratuit. Variable Vercel
  `NEXT_PUBLIC_PLAUSIBLE_DOMAIN=funding-watch-morocco.vercel.app`.

- [ ] **Définir les Goals Plausible** une fois configuré :
  `signup_completed`, `feedback_sent`, `onboarding_completed`,
  `co_submit_interest`, `expert_request_sent`, `theme_suggestion_sent`.

### Recrutement humain

- [ ] **Recruter 3-5 vrais beta-testeurs** (mix easy / hard mode).
  Sans utilisateurs, la plateforme reste du vapeur. Sourcing LinkedIn /
  WhatsApp / réseau ANSI. Format DM perso, pas mail générique.

- [ ] **Recruter 5-10 vrais experts** pour remplacer les 6 placeholders.
  Cibles : anciens program officers AFD/UE/UNDP, juristes OSBL,
  formateurs réseau ANSI, évaluateurs indépendants. Workflow : créer
  profil dans `/admin/experts` avec status='active', le badge "EXEMPLE"
  disparaît automatiquement.

### Contenu manquant

- [ ] **Page `/about` honnête** — qui tu es (vrai nom, vrai parcours),
  pourquoi tu construis ça, état actuel (bêta privée), contact direct.

- [ ] **Page `/pricing` honnête** — modèle économique transparent même
  si "à définir". Mieux qu'un placeholder.

- [ ] **Pages légales** (Sprint 5B en cours) :
  - `/privacy` — politique de confidentialité
  - `/terms` — conditions générales d'utilisation
  - `/cookies` — politique cookies
  - `/legal` — mentions légales (à compléter avec tes infos perso)

### Data quality

- [ ] **Reclassifier les opps existantes** avec la taxonomie v24 étendue.
  Opps publiées avant 2026-05-19 n'ont pas les 9 nouveaux tags. Coût
  ~$0.01/100 opps via Haiku 4.5.

- [ ] **Améliorer la qualité de scraping** : 2/3 opportunités actuelles
  n'ont pas de `summary`/`description` exploitable. Inspecter les
  sélecteurs des sources concernées.

- [ ] **Reclasser `ngo_relevant`** sur les 3 opportunités actuelles à
  `NULL` (invisibles au matching). Via `/admin/pending` ou batch SQL.

- [ ] **Nettoyer fixtures de test E2E** créées le 2026-05-15 :
  ```sql
  delete from organizations where id = '313fe86d-470c-4e57-abde-cc0826691d7d';
  delete from opportunities where external_id = 'test-e2e-fwm-fixture';
  -- supprimer aussi le user test-e2e-fwm@test.local via Supabase Auth UI
  ```

### Sécurité

- [ ] **Régénérer la `SUPABASE_SERVICE_ROLE_KEY`** par précaution
  (elle était en clair dans un commit local non poussé, GitHub l'a
  bloquée au push initial — n'a jamais fuité publiquement, mais autant
  la roter).

---

## 🟡 Polish & croissance (post-bêta)

- [ ] **Sprint 5C — Page opp simplifiée** : appliquer "delete first" à
  `/opportunities/[id]` (8 sections aside → 3 + accordion).

- [ ] **Sprint 5D — Onboarding 3 étapes** : `OnboardingWizard.jsx`
  passe de 654 lignes à ~150. SDG/DAC/géographies → différés en profil.

- [ ] **Sprint 5E — `/api/health` + smoke tests** : endpoint health
  + script `npm run smoke` qui call les routes critiques.

- [ ] **Sprint 5F — Refonte palette** : 7 couleurs sémantiques → 4
  (rouge brand, vert success, ambre warning, slate neutral).

- [ ] **Sprint 3c — WhatsApp Business alerts** (matches >90%).

- [ ] **Sprint 4 — Comptes équipe** (UI à activer puisque v10 appliquée).

- [ ] **Dashboard admin ops** étoffé (taux extraction, coût Claude réel).

- [ ] **Cookie banner GDPR** si visiteurs EU.

---

## ✅ Récemment fait

- 2026-06-01 — Sprint 5A.5 : nav purgée (Actualités / Ressources / Insights / Formations retirés)
- 2026-06-01 — Sprint 5A : dashboard minimaliste (12 → 3 sections + accordion, -42% bundle)
- 2026-05-31 — Sprint 4P : co-soumission matchmaking (v27)
- 2026-05-31 — Sprint 6 (Cowork) : Strict Morocco NGO targeting (v23)
- 2026-05-31 — Sprint 6 (Cowork) : Manual curation assisted by Claude (v25)
- 2026-05-31 — Sprint 4Q : experts marketplace + 6 profils placeholder (v26)
- 2026-05-31 — Sprint 4O : thématiques étendues (v24)
- 2026-05-20 — Sprint 4N : Sentry + Plausible env-gated
- 2026-05-20 — Sprint 4M : passage bêta — feedback widget + BETA pill (v22)
- 2026-05-20 — Sprint 4L : welcome email + first-matches email
- 2026-05-20 — Sprint 4K : OG image dynamique + sitemap + skeleton
- 2026-05-19 — Sprint 4I : de-fakening dashboard
- 2026-05-19 — Sprint 4J : de-fakening landing
- 2026-05-19 — Sprint 4H : success probability TopMatches
- 2026-05-19 — Sprint 4G : document intelligence upload PDF (`/api/ai/extract-document`)
- 2026-05-19 — Sprint 4F : recommandation collaborative (v21)
- 2026-05-18 — Sprint 4E : donor intelligence prédictive (v20)
- 2026-05-18 — Sprint 4C : timeline deadlines + modal match parfait
- 2026-05-18 — Sprint 4B : recherche sémantique multilingue FR/AR/EN (v19)
- 2026-05-18 — Sprint 4A : beta hardening — onboarding embed + api_usage_logs (v18)
- 2026-05-18 — Sprint 2B.3 : Brevo webhook tracking (v17)
- 2026-05-15 — Sprint 3a : donor intelligence sur la page opportunité
- 2026-05-15 — Backfill donneurs : 27/27 embeddings (Cowork)
- 2026-05-15 — Recharge quota OpenAI : tous les opps + orgs re-embeddés
- 2026-05-14 — Sprint 2 livré (Kanban, AI co-writer, digest matin, mobile, trust signals)
- 2026-05-14 — Sprint 1 déployé en prod (migrations v4 + seed taxonomies + sources v3)
