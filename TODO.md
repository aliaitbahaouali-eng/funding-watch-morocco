# TODO — Funding Watch Morocco

Liste vivante des actions à faire avant le lancement bêta public.
À mettre à jour à chaque sprint.

---

## 🔴 Bloquants avant bêta publique

- [ ] **Recharger le quota OpenAI (~10 $)** sur https://platform.openai.com/account/billing
  — La clé `OPENAI_API_KEY` renvoie actuellement `insufficient_quota` ; tous les
  embeddings tombent en fallback hash (non sémantique). Le score `semantic` reste
  à 0 sur tous les matches → la composante 40% du scoring final est neutralisée.
  Une fois rechargé, relancer `python scrapers/backfill_embeddings.py --force`
  pour ré-embeddifier les opportunités existantes (≈ $0.01 pour 100 opps).

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
