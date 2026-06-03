import LegalShell from '@/components/legal/LegalShell';

export const metadata = {
  title: 'Politique de confidentialité',
  description: 'Comment Funding Watch Morocco collecte, utilise et protège vos données personnelles.',
};

export default function PrivacyPage() {
  return (
    <LegalShell
      title="Politique de confidentialité"
      subtitle="Comment on collecte, utilise et protège tes données."
      lastUpdated="1er juin 2026"
      currentPath="/privacy"
    >
      <p className="lead">
        Funding Watch Morocco est en <strong>bêta privée</strong>. On collecte le strict minimum pour faire fonctionner le service. Voici exactement ce qu'on a, pourquoi, et avec qui on le partage.
      </p>

      <h2>1. Qui on est</h2>
      <p>
        Funding Watch Morocco est un projet édité par <strong>Ali Aitbahaouali</strong>, fondateur indépendant basé à Casablanca, Maroc. Contact : <a href="mailto:contact@fundingwatch.ma">contact@fundingwatch.ma</a>.
      </p>

      <h2>2. Données qu'on collecte</h2>
      <p>Quand tu crées un compte et utilises la plateforme, on stocke :</p>
      <ul>
        <li><strong>Identifiants</strong> : nom complet, email, mot de passe (hashé via Supabase Auth).</li>
        <li><strong>Profil association</strong> : nom de l'orga, ville, région, type, thématiques d'intervention, budget annuel, langues de travail, projets passés, historique de financement.</li>
        <li><strong>Activité</strong> : opportunités sauvegardées, candidatures suivies, opt-in co-soumission, demandes d'experts, feedbacks bêta.</li>
        <li><strong>Métadonnées techniques</strong> : User-Agent, URL des pages visitées au moment d'un feedback, timestamp de création/dernière connexion.</li>
      </ul>
      <p>
        On <strong>ne collecte pas</strong> : ta géolocalisation précise, ta liste de contacts, ton carnet d'adresses, ton activité hors plateforme.
      </p>

      <h2>3. Pourquoi on collecte ces données</h2>
      <ul>
        <li><strong>Faire fonctionner le matching</strong> : ton profil thématique + budget alimente l'algorithme de scoring qui te propose des opportunités pertinentes.</li>
        <li><strong>T'envoyer les alertes</strong> : welcome email, first-matches après onboarding, digest hebdomadaire si activé, rappels deadlines.</li>
        <li><strong>Connecter avec experts / autres assos</strong> : co-soumission et expert request transmettent ton email à la partie ciblée (avec ton consentement explicite à chaque demande).</li>
        <li><strong>Améliorer le produit</strong> : agrégats anonymisés (nombre d'orgs, distribution thématiques, taux de clic) pour guider la roadmap.</li>
      </ul>

      <h2>4. Avec qui on partage</h2>
      <p>On utilise des prestataires techniques tiers. Chacun a un rôle précis :</p>
      <ul>
        <li><strong>Supabase</strong> (USA) — hébergement base de données et authentification. <a href="https://supabase.com/privacy" target="_blank" rel="noopener">Privacy policy</a>.</li>
        <li><strong>Vercel</strong> (USA) — hébergement applicatif. <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener">Privacy policy</a>.</li>
        <li><strong>Brevo</strong> (France) — envoi des emails transactionnels (welcome, alertes, mises en relation). <a href="https://www.brevo.com/fr/legal/privacypolicy/" target="_blank" rel="noopener">Privacy policy</a>.</li>
        <li><strong>OpenAI</strong> (USA) — génération d'embeddings vectoriels pour le matching sémantique. Les données envoyées sont anonymisées (slug thématiques, type d'orga) — pas ton nom ni ton email.</li>
        <li><strong>Anthropic</strong> (USA) — classification taxonomique des opportunités, AI co-writer, document intelligence PDF. Idem : pas d'identifiants personnels dans les prompts.</li>
        <li><strong>Sentry</strong> (USA — si activé) — collecte des erreurs JavaScript pour debugger. Pas de données personnelles dans les stack traces.</li>
        <li><strong>Plausible</strong> (UE — si activé) — analytics sans cookies, sans tracking individuel, sans IP stockée.</li>
      </ul>
      <p>
        On <strong>ne vend jamais</strong> tes données et on ne les partage pas avec des annonceurs ou des courtiers.
      </p>

      <h2>5. Durée de conservation</h2>
      <ul>
        <li>Compte actif : tant que tu utilises la plateforme.</li>
        <li>Compte inactif : on conserve 12 mois après ta dernière connexion, puis on te propose de réactiver ou on supprime.</li>
        <li>Logs techniques (Sentry, Plausible) : 30 jours.</li>
        <li>Emails (logs Brevo) : 30 jours pour les stats engagement.</li>
        <li>Beta feedback : conservés tant que la bêta dure (utiles pour la roadmap).</li>
      </ul>

      <h2>6. Tes droits</h2>
      <p>Tu peux à tout moment :</p>
      <ul>
        <li><strong>Accéder</strong> à tes données : depuis <code>/dashboard/profile</code> tu vois tout ce qu'on a.</li>
        <li><strong>Rectifier</strong> : édite ton profil et ça met à jour la base.</li>
        <li><strong>Supprimer ton compte</strong> : écris-nous à contact@fundingwatch.ma, suppression sous 7 jours ouvrés (incluant tous les services tiers).</li>
        <li><strong>Exporter</strong> tes données : sur demande email, on te renvoie un JSON propre dans les 30 jours.</li>
        <li><strong>T'opposer aux emails</strong> : chaque email a un lien unsubscribe 1-clic.</li>
      </ul>

      <h2>7. Cookies et stockage local</h2>
      <p>
        Voir notre <a href="/cookies">politique cookies</a>. En résumé : on utilise un cookie de session (pour te garder connecté) + quelques flags localStorage (préférence theme, bannière bêta dismissée). Pas de tracking publicitaire.
      </p>

      <h2>8. Sécurité</h2>
      <ul>
        <li>Mots de passe hashés via bcrypt côté Supabase.</li>
        <li>Communication chiffrée TLS 1.3 partout.</li>
        <li>Row Level Security (RLS) strictes côté base : tu ne vois que tes propres données.</li>
        <li>Service role key réservée aux opérations admin, jamais exposée côté client.</li>
      </ul>
      <p>
        En cas d'incident de sécurité affectant tes données, on te notifie sous 72h avec ce qu'on sait + les actions correctives.
      </p>

      <h2>9. Mineurs</h2>
      <p>
        Funding Watch est destiné à des associations / ONG / coopératives, donc à des représentants légaux adultes. On ne collecte pas sciemment de données de mineurs.
      </p>

      <h2>10. Modifications</h2>
      <p>
        On met à jour cette page quand on change quelque chose (nouveau prestataire, nouvelle data, etc.) et on te prévient par email pour les changements substantiels.
      </p>

      <h2>Contact</h2>
      <p>
        Question, demande d'accès, suppression de compte : <a href="mailto:contact@fundingwatch.ma">contact@fundingwatch.ma</a>.
      </p>

      <p className="mt-12 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        <strong>⚠ Note bêta</strong> : ce document est un cadre de travail honnête mais n'a pas été validé par un juriste. Il sera révisé avant le lancement public et l'opening aux utilisateurs en UE (RGPD strict).
      </p>
    </LegalShell>
  );
}
