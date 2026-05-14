# Funding Watch Morocco

Plateforme SaaS de veille intelligente des financements pour les associations marocaines.
Stack : **Next.js 14 (App Router) · Tailwind CSS · Supabase (Auth + Postgres + RLS) · Brevo · Python (BeautifulSoup / feedparser)**.

> MVP opérationnel : connexion Supabase réelle, auth + rôles, dashboard association, back-office admin, moteur de collecte V1 avec 5 sources, workflow de validation humaine, alertes email, scoring de compatibilité, architecture IA légère.

---

## 1. Architecture en un coup d'œil

```
funding-watch-mvp/
├── app/
│   ├── (public)       → page.jsx (home), opportunities, themes, about, pricing, contact
│   ├── login/, register/, api/auth/(callback|signout)
│   ├── dashboard/     → layout + page + profile + preferences + saved + applications + settings
│   ├── admin/         → layout + page + opportunities + pending + donors + sources + themes + users + logs + emails
│   └── api/
│       ├── saved/route.js          # sauvegarder/désauvegarder une opportunité
│       ├── applications/route.js   # changer le statut d'une candidature
│       ├── ingest/route.js         # endpoint des scrapers (auth header x-cron-secret)
│       └── cron/route.js           # tâches quotidiennes (expire + rappels deadline)
├── components/        → Header, Footer, OpportunityCard, ui/, opportunity/, dashboard/, admin/, nav/
├── lib/
│   ├── supabase/{client,server,admin}.js   # 3 clients distincts
│   ├── auth.js, scoring.js, ai.js, email.js, theme-keywords.js, utils.js
├── middleware.js      → protège /dashboard et /admin
├── scrapers/          → moteur Python (voir scrapers/README.md)
├── supabase/
│   ├── schema.sql     # toutes les tables + RLS + triggers + helpers
│   └── seed.sql       # thématiques, bailleurs, sources V1
├── .env.example
├── vercel.json        # cron quotidien
└── .github/workflows/scrape.yml
```

## 2. Installation locale

```bash
cd funding-watch-mvp
npm install
pip install -r scrapers/requirements.txt    # optionnel — pour les scrapers
cp .env.example .env.local
```

## 3. Configurer Supabase

1. Créez un projet sur [supabase.com](https://supabase.com).
2. Récupérez **Project URL**, **anon public key** et **service_role key**.
3. Remplissez `.env.local` :
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   SUPABASE_SERVICE_ROLE_KEY=...            # ⚠ jamais côté browser
   BREVO_API_KEY=...                        # optionnel — sans, les emails sont simulés
   BREVO_SENDER_EMAIL=alerts@fundingwatch.ma
   BREVO_SENDER_NAME=Funding Watch Morocco
   CRON_SECRET=...                          # chaîne aléatoire longue
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```
4. Dans l'éditeur SQL Supabase, exécutez **dans l'ordre** :
   - `supabase/schema.sql` — crée toutes les tables, les triggers, les fonctions helpers et active RLS partout.
   - `supabase/seed.sql` — insère 12 thématiques, 9 bailleurs, 7 sources V1.
5. Créez votre premier compte sur `/register`, puis dans l'éditeur SQL Supabase :
   ```sql
   update profiles set role='admin' where email='votre@email.com';
   ```

## 4. Lancer le projet

```bash
npm run dev
# ouvert sur http://localhost:3000
```

Pages utiles :
- `/` — accueil
- `/opportunities` — base d'opportunités (filtres, tri, pagination)
- `/login`, `/register` — auth
- `/dashboard` — espace association
- `/admin` — back-office (admin/veille uniquement)
- `/admin/pending` — opportunités collectées à valider

## 5. Lancer la collecte (scrapers)

```bash
# Toutes les sources actives :
python scrapers/scraper.py

# Une seule :
python scrapers/scraper.py --source undp

# Test sans envoi :
python scrapers/scraper.py --dry-run
```

Les items collectés arrivent **toujours en `status='draft'`** et apparaissent dans `/admin/pending` pour validation humaine.

Détails dans [`scrapers/README.md`](scrapers/README.md).

## 6. Déployer sur Vercel

1. Créez un repo Git et poussez ce dossier.
2. Importez sur [vercel.com](https://vercel.com/new) → framework détecté : Next.js.
3. Ajoutez **toutes les variables d'environnement** dans Project Settings → Environment Variables.
   - ⚠ `SUPABASE_SERVICE_ROLE_KEY`, `BREVO_API_KEY`, `CRON_SECRET` doivent être **"Server"** (pas exposées au client).
4. Le fichier `vercel.json` planifie déjà le cron quotidien `/api/cron`.
5. Pour le scraping périodique, deux options :
   - **GitHub Actions** : workflow déjà fourni dans `.github/workflows/scrape.yml`. Ajoutez les mêmes secrets dans Settings → Secrets.
   - **Vercel Cron** ne peut pas exécuter Python : la collecte tourne via GH Actions, et seul `/api/cron` (expiration + rappels) s'exécute via Vercel Cron.

## 7. Sécurité

- `SUPABASE_SERVICE_ROLE_KEY` n'est **jamais** importée dans un composant client. Seuls `lib/supabase/admin.js`, `/api/ingest`, `/api/cron` et les scrapers l'utilisent.
- RLS actif sur toutes les tables (voir `supabase/schema.sql`) : les associations ne voient que leurs propres données ; les opportunités publiques sont filtrées par `status='published'` ; les routes admin sont protégées par `is_admin()`.
- `middleware.js` redirige les non-connectés vers `/login` et bloque l'accès admin aux non-admins.
- Les endpoints `/api/ingest` et `/api/cron` requièrent le header `x-cron-secret`.

## 8. Scoring

Algorithme déterministe dans `lib/scoring.js` (sur 100) :
- Thématique commune : **30 pts**
- Maroc éligible : **25 pts**
- Type d'organisation compatible : **15 pts**
- Deadline > 15 jours : **10 pts**
- Langue compatible : **5 pts**
- Budget renseigné : **10 pts**
- Opportunité vérifiée : **5 pts**

Tiers : 90-100 très compatible / 70-89 compatible / 50-69 à analyser / <50 faible.

## 9. Architecture IA (à brancher)

`lib/ai.js` expose les hooks suivants (heuristiques aujourd'hui, prêts pour LLM) :
- `summarizeOpportunity(text)`
- `classifyThemes(text, themes)`
- `detectCountries(text)`
- `generateChecklist(opportunity)`
- `estimateDifficulty(opportunity)`
- `computeCompatibility(opp, org)` *(implémenté)*

Pour brancher Claude/OpenAI plus tard : remplacez le corps des fonctions, ajoutez la clé API dans `.env.local`, ne jamais l'importer côté client.

## 10. Roadmap

- [ ] Brancher un LLM dans `lib/ai.js` pour résumés FR + classification automatique.
- [ ] Améliorer chaque collector source par source (sélecteurs CSS spécifiques).
- [ ] Ajouter Playwright pour les sources rendues en JS.
- [ ] Newsletter hebdomadaire automatique (template `tplWeeklyDigest` déjà prêt).
- [ ] Tableau de bord analytics admin (graphiques par bailleur, thématique, conversion).
- [ ] Support multilingue FR / AR / EN du front.
- [ ] Mode paiement Stripe pour le plan Pro.
- [ ] Auth Magic Link / OAuth Google.

## 11. Commandes utiles

```bash
npm run dev               # serveur Next.js
npm run build             # build production
npm run lint              # eslint
npm run scrape            # alias python scrapers/scraper.py
npm run scrape:install    # pip install -r scrapers/requirements.txt
```

---

Plateforme construite pour les associations marocaines. Contributions et signalements de sources : `contact@fundingwatch.ma`.
