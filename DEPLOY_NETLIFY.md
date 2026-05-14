# Déploiement Netlify — Funding Watch Morocco

> ⚠️ **Recommandation** : Vercel reste la meilleure plateforme pour Next.js 14 App Router (Server Actions, middleware, API routes). Netlify fonctionne via le plugin officiel `@netlify/plugin-nextjs` mais peut nécessiter quelques ajustements.

## Méthode recommandée — Git (Netlify ↔ GitHub)

Netlify ne peut **pas** déployer une app Next.js via simple drag-and-drop : il y a du code serveur (Server Components, Server Actions, API routes). Il faut passer par un repo Git.

### 1. Créer un repo GitHub

1. Va sur [github.com/new](https://github.com/new)
2. Nom du repo : `funding-watch-morocco`
3. Choisis **Private** (ton `.env.local` ne sera pas commit, mais le code reste sensible)
4. **Ne coche pas** "Add README", "Add .gitignore", "Add license" — on a déjà les fichiers
5. **Create repository**

### 2. Push ton code (depuis le CMD Windows)

```cmd
cd C:\Users\HP\Downloads\funding-watch-claude-continuation-package\funding-watch-mvp
git init
git add .
git commit -m "Initial commit — Funding Watch Morocco MVP"
git branch -M main
git remote add origin https://github.com/TON_USERNAME/funding-watch-morocco.git
git push -u origin main
```

Remplace `TON_USERNAME` par ton nom d'utilisateur GitHub. Git te demandera tes identifiants la première fois (token GitHub recommandé, pas mot de passe).

### 3. Connecter Netlify

1. Va sur [app.netlify.com/start](https://app.netlify.com/start)
2. Clique **Import from Git**
3. Choisis **GitHub**, autorise Netlify à voir tes repos
4. Sélectionne `funding-watch-morocco`
5. Netlify détecte automatiquement Next.js. Garde les valeurs par défaut :
   - **Branch** : `main`
   - **Build command** : `npm run build`
   - **Publish directory** : `.next`
6. **Avant de cliquer Deploy**, va dans **Show advanced** → **New variable** et ajoute :

### 4. Variables d'environnement à entrer dans Netlify

| Variable | Valeur |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://ohuxiwqsypgeaxqrmsew.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `sb_publishable_7iFgwT4iv188VDfyjUR4Hg_eKPuU8Qv` |
| `SUPABASE_SERVICE_ROLE_KEY` | (ta clé secrète Supabase) |
| `CRON_SECRET` | (la chaîne aléatoire de ton `.env.local`) |
| `BREVO_API_KEY` | (laisse vide si pas encore configuré) |
| `BREVO_SENDER_EMAIL` | `alerts@fundingwatch.ma` |
| `BREVO_SENDER_NAME` | `Funding Watch Morocco` |
| `ANTHROPIC_API_KEY` | (laisse vide si pas configuré) |
| `ANTHROPIC_MODEL` | `claude-haiku-4-5-20251001` |
| `NEXT_PUBLIC_APP_URL` | `https://TON-SITE.netlify.app` (Netlify te donne l'URL après le premier déploiement, tu peux mettre à jour après) |
| `NEXT_PUBLIC_APP_NAME` | `Funding Watch Morocco` |

7. **Deploy site**

### 5. Récupère ton URL publique

Au bout de 3-5 minutes, ton site est en ligne sur une URL du type :
```
https://funding-watch-morocco-abc123.netlify.app
```

Tu peux ensuite :
- **Renommer** : Site settings → Change site name
- **Connecter un domaine custom** : Domain management → Add custom domain

### 6. Mettre à jour `NEXT_PUBLIC_APP_URL` et Supabase

1. Dans Netlify : Site settings → Environment variables → édite `NEXT_PUBLIC_APP_URL` avec ton vraie URL
2. Re-déploie : Deploys → Trigger deploy → Clear cache and deploy
3. Dans Supabase : Authentication → URL Configuration → ajoute `https://TON-SITE.netlify.app/**` aux **Redirect URLs**

## Pour le scraping périodique

Netlify n'a **pas de cron natif** comme Vercel. Deux options :

### A. GitHub Actions (recommandé, déjà configuré)

Le workflow `.github/workflows/scrape.yml` est déjà prêt. Dans ton repo GitHub :

1. Settings → Secrets and variables → Actions → **New repository secret**
2. Ajoute les mêmes variables que dans Netlify :
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `CRON_SECRET`
   - `NEXT_PUBLIC_APP_URL`
3. Le workflow tournera automatiquement chaque jour à 6h UTC.

### B. Netlify Scheduled Functions (alternative)

Plus complexe à mettre en place — il faut convertir `/api/cron` en Scheduled Function Netlify. Documentation : https://docs.netlify.com/functions/scheduled-functions/

## Comparaison rapide Netlify vs Vercel pour Next.js

| | **Vercel** | **Netlify** |
|---|---|---|
| App Router | ✅ Natif | ⚠️ Via plugin |
| Server Actions | ✅ Natif | ✅ OK avec plugin |
| Middleware | ✅ Edge | ✅ Edge Functions |
| API Routes | ✅ Natif | ✅ Auto-convertit en Functions |
| Cron jobs | ✅ Vercel Cron natif | ❌ Manuel (Scheduled Functions) |
| Streaming | ✅ Natif | ⚠️ Partiel |
| Build cache | ✅ Fluide | ⚠️ Peut nécessiter clear cache |
| Plan gratuit | 100 GB-h | 300 build min/mois |

## Si tu changes d'avis et veux Vercel

Le `vercel.json` est déjà prêt. Démarche en 2 minutes :

1. Push sur GitHub (même étapes que ci-dessus)
2. Va sur [vercel.com/new](https://vercel.com/new)
3. Import le repo → Vercel détecte tout → ajoute les variables d'env → Deploy
4. Le cron `/api/cron` et `/api/cron/weekly` s'activent automatiquement

---

**Si tu veux que je crée le repo GitHub et configure tout à ta place via Claude in Chrome**, dis-moi :
- Ton nom d'utilisateur GitHub
- Si tu as déjà un compte Netlify
- Si tu préfères que je tente Netlify ou Vercel
