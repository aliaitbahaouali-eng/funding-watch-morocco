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

- 2026-05-15 — Sprint 3a : donor intelligence sur la page opportunité
- 2026-05-15 — Test e2e matching validé (score 45 sur opp test, fallback path OK)
- 2026-05-15 — Migration v8 : RPC `match_opportunities_for_org` opérationnelle
- 2026-05-14 — Sprint 2 livré (Kanban, AI co-writer, digest matin, mobile, trust signals)
- 2026-05-14 — Sprint 1 déployé en prod (migrations v4 + seed taxonomies + sources v3)
