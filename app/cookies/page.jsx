import LegalShell from '@/components/legal/LegalShell';

export const metadata = {
  title: 'Politique des cookies',
  description: 'Quels cookies et données locales utilise Funding Watch Morocco.',
};

export default function CookiesPage() {
  return (
    <LegalShell
      title="Politique des cookies"
      subtitle="Ce qu'on stocke dans ton navigateur, et pourquoi."
      lastUpdated="1er juin 2026"
      currentPath="/cookies"
    >
      <p className="lead">
        On a fait le choix d'une plateforme <strong>minimaliste côté tracking</strong>. Aucun cookie publicitaire, aucun pixel Facebook / Google Ads, aucun partage avec des courtiers de données.
      </p>

      <h2>1. Cookies strictement nécessaires</h2>
      <p>Ces cookies font fonctionner la plateforme. Tu ne peux pas les désactiver sans casser le site.</p>
      <ul>
        <li>
          <strong>Cookies d'authentification Supabase</strong> (<code>sb-*-auth-token</code>) — te garde connecté entre les pages. Durée : 1 heure renouvelable automatiquement, max 7 jours sans activité.
        </li>
        <li>
          <strong>Cookie CSRF</strong> — sécurise les formulaires contre les attaques. Session uniquement.
        </li>
      </ul>

      <h2>2. Stockage local (localStorage)</h2>
      <p>Stockés dans <code>window.localStorage</code>, donc <strong>jamais envoyés au serveur</strong>. Restent dans ton navigateur :</p>
      <ul>
        <li>
          <code>fw-theme</code> — ta préférence light/dark mode.
        </li>
        <li>
          <code>fw-beta-banner-dismissed</code> — pour ne plus afficher la bannière bêta une fois qu'on t'a expliqué la phase.
        </li>
        <li>
          <code>fw-seen-perfect-match-{'{opp_id}'}</code> — pour ne pas re-afficher le modal "Match parfait" sur une opp que tu as déjà vue.
        </li>
        <li>
          <code>fw-perfect-match-off</code> — si tu as cliqué "Ne plus m'afficher" sur le modal Match parfait.
        </li>
        <li>
          <code>fw-more-recos-open</code> — état de l'accordion "Voir plus de recommandations" sur le dashboard.
        </li>
      </ul>
      <p>Tu peux vider ces données à tout moment via les paramètres de ton navigateur (Effacer les données du site).</p>

      <h2>3. Analytics — Plausible (si activé)</h2>
      <p>
        Si on a activé Plausible, il enregistre des <strong>statistiques d'usage agrégées</strong> sans poser de cookie :
      </p>
      <ul>
        <li>Pages visitées (URL seule, pas d'identifiant).</li>
        <li>Pays de provenance (basé sur l'IP au moment du hit, jamais stockée).</li>
        <li>Source de trafic (ex: "linkedin.com" → on sait qu'il y a eu un clic depuis LinkedIn).</li>
        <li>Événements custom : <code>signup_completed</code>, <code>feedback_sent</code>, <code>co_submit_interest</code>, etc.</li>
      </ul>
      <p>
        Plausible est <a href="https://plausible.io/data-policy" target="_blank" rel="noopener">privacy-friendly par design</a> : pas de cookie, pas de tracking individuel, pas de profilage. C'est pour ça qu'on n'a pas besoin de bannière de consentement cookies.
      </p>

      <h2>4. Error monitoring — Sentry (si activé)</h2>
      <p>
        Si on a activé Sentry, il enregistre les erreurs JavaScript pour qu'on puisse les corriger. Données envoyées :
      </p>
      <ul>
        <li>Stack trace de l'erreur.</li>
        <li>URL de la page où l'erreur a eu lieu.</li>
        <li>User-Agent du navigateur.</li>
        <li>ID de session anonyme (pour grouper les erreurs d'un même utilisateur).</li>
      </ul>
      <p>
        On ne logue pas le contenu de tes formulaires, ton mot de passe, ton email ou tes données personnelles dans les rapports d'erreur. Conservation : 30 jours.
      </p>

      <h2>5. Pas de cookie publicitaire</h2>
      <p>
        On ne diffuse pas de publicité sur la plateforme. On n'utilise pas Google Ads, Facebook Pixel, TikTok Pixel, ou autres outils de remarketing. On ne loue pas / ne vend pas / ne partage pas tes données avec des annonceurs.
      </p>

      <h2>6. Comment contrôler les cookies</h2>
      <ul>
        <li>
          <strong>Bloquer tous les cookies</strong> : tu peux configurer ton navigateur pour les bloquer. Conséquence : tu ne pourras plus te connecter à ton compte.
        </li>
        <li>
          <strong>Bloquer le localStorage</strong> : idem, certaines fonctionnalités (modal Match parfait, préférence thème) reviendront à l'état par défaut à chaque visite.
        </li>
        <li>
          <strong>Effacer tout</strong> : depuis ton navigateur, paramètres → confidentialité → effacer les données du site <code>funding-watch-morocco.vercel.app</code>.
        </li>
      </ul>

      <h2>Contact</h2>
      <p>
        Question, signalement d'un cookie qu'on aurait oublié dans cette liste : <a href="mailto:contact@fundingwatch.ma">contact@fundingwatch.ma</a>.
      </p>
    </LegalShell>
  );
}
