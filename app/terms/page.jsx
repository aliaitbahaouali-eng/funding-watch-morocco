import LegalShell from '@/components/legal/LegalShell';

export const metadata = {
  title: 'Conditions générales d\'utilisation',
  description: 'Conditions générales d\'utilisation de Funding Watch Morocco.',
};

export default function TermsPage() {
  return (
    <LegalShell
      title="Conditions générales d'utilisation"
      subtitle="Le contrat entre toi et nous, sans novlangue juridique."
      lastUpdated="1er juin 2026"
      currentPath="/terms"
    >
      <p className="lead">
        Bienvenue dans la bêta de Funding Watch Morocco. En créant un compte ou en utilisant la plateforme, tu acceptes ces conditions. On les a rédigées court et clair.
      </p>

      <h2>1. Le service</h2>
      <p>
        Funding Watch Morocco est une plateforme de veille des opportunités de financement international destinée aux associations, ONG, coopératives et fondations marocaines. Le service inclut :
      </p>
      <ul>
        <li>Détection automatisée d'opportunités via scrapers et soumissions manuelles.</li>
        <li>Matching IA entre ton profil et les opportunités (scoring sur 100).</li>
        <li>Outils d'accompagnement : co-writer IA, document intelligence PDF, mise en relation experts, co-soumission.</li>
        <li>Alertes par email (digest, deadlines, matchs).</li>
      </ul>
      <p>
        Le service est actuellement en <strong>bêta privée</strong>, gratuit pour les associations marocaines participantes.
      </p>

      <h2>2. Compte utilisateur</h2>
      <ul>
        <li>Tu dois être majeur·e et représenter légalement une organisation à but non lucratif marocaine ou intervenant au Maroc.</li>
        <li>Tu fournis des informations exactes et tu les maintiens à jour.</li>
        <li>Tu es responsable de ton mot de passe et des actions effectuées depuis ton compte.</li>
        <li>Un compte = une organisation. Pas de multi-comptes pour scraper la base.</li>
      </ul>

      <h2>3. Usage acceptable</h2>
      <p>Tu peux :</p>
      <ul>
        <li>Consulter, sauvegarder et suivre les opportunités pour ton association.</li>
        <li>Utiliser l'AI co-writer pour rédiger tes propositions de financement.</li>
        <li>Contacter des experts et autres associations via les fonctions de mise en relation.</li>
        <li>Donner ton feedback sur la plateforme.</li>
      </ul>
      <p>Tu ne peux pas :</p>
      <ul>
        <li>Revendre ou redistribuer le contenu de la plateforme (le matching IA et les données enrichies sont notre travail).</li>
        <li>Spammer les autres assos ou les experts via les outils de mise en relation.</li>
        <li>Utiliser des bots ou scrapers pour aspirer la base.</li>
        <li>Te faire passer pour une autre organisation.</li>
        <li>Utiliser le service à des fins illégales ou contre l'intérêt général.</li>
      </ul>

      <h2>4. Co-soumission et mise en relation experts</h2>
      <ul>
        <li>Quand tu actives le toggle co-soumission, ton nom d'orga + ton pitch sont visibles aux autres assos opt-in sur la même opp.</li>
        <li>Quand tu demandes la mise en relation, ton email est transmis à la partie ciblée pour qu'elle puisse te répondre directement.</li>
        <li>Tu peux retirer ton opt-in à tout moment.</li>
        <li>On ne garantit pas l'acceptation par la partie cible — c'est à elle de répondre ou ignorer.</li>
      </ul>

      <h2>5. AI et limitations</h2>
      <p>
        Les outils IA (matching, scoring, co-writer, classification) sont des <strong>aides à la décision</strong>. Les résultats peuvent être imparfaits, biaisés, ou ne pas refléter l'éligibilité réelle de ton organisation pour un appel donné. <strong>Vérifie toujours</strong> les critères d'éligibilité directement auprès du bailleur avant de soumettre une candidature.
      </p>
      <p>
        On ne garantit pas que tu obtiendras un financement. La plateforme améliore tes chances, pas tes droits.
      </p>

      <h2>6. Disponibilité du service</h2>
      <p>
        En bêta, on fait de notre mieux pour maintenir le service disponible 24/7 mais on ne garantit pas un uptime contractuel. Maintenance planifiée annoncée par email. Incident technique imprévu : on prévient via la bannière in-app dès qu'on peut.
      </p>

      <h2>7. Propriété intellectuelle</h2>
      <ul>
        <li><strong>Notre travail</strong> (code, design, algorithmes de matching, données enrichies par notre IA) reste notre propriété.</li>
        <li><strong>Ton contenu</strong> (profil orga, candidatures, pitches, brouillons co-writer) reste ta propriété. On a juste le droit de l'utiliser pour faire fonctionner le service.</li>
        <li>Les opportunités scrapées proviennent de sources publiques (sites institutionnels des bailleurs). On en restitue le contenu avec lien vers la source originale.</li>
      </ul>

      <h2>8. Modification du service</h2>
      <p>
        On peut ajouter, modifier, supprimer des fonctionnalités. Les changements substantiels (ex: suppression d'une feature que tu utilisais) sont annoncés par email 14 jours avant.
      </p>

      <h2>9. Résiliation</h2>
      <ul>
        <li><strong>Par toi</strong> : à tout moment, depuis ton dashboard ou par email à <code>contact@fundingwatch.ma</code>. Suppression de compte sous 7 jours.</li>
        <li><strong>Par nous</strong> : si tu enfreins ces conditions de manière répétée ou grave (spam, fraude, comportement malveillant). On te prévient avant et on te laisse exporter tes données.</li>
      </ul>

      <h2>10. Limitation de responsabilité</h2>
      <p>
        Funding Watch fournit un service "tel quel" en bêta. Notre responsabilité est limitée au montant payé pour le service sur les 12 derniers mois (donc 0€ en bêta gratuite). On n'est pas responsable :
      </p>
      <ul>
        <li>D'un rejet de candidature par un bailleur.</li>
        <li>D'une erreur dans le scoring qui aurait pu te faire louper une opp.</li>
        <li>De la qualité de l'accompagnement par un expert tiers.</li>
        <li>D'une mise en relation qui ne donne rien.</li>
      </ul>

      <h2>11. Droit applicable</h2>
      <p>
        Ces conditions sont régies par le droit marocain. En cas de litige, on essaie d'abord de régler à l'amiable (écris-nous), puis devant les tribunaux compétents de Casablanca.
      </p>

      <h2>Contact</h2>
      <p>
        Question, signalement, demande spécifique : <a href="mailto:contact@fundingwatch.ma">contact@fundingwatch.ma</a>.
      </p>

      <p className="mt-12 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        <strong>⚠ Note bêta</strong> : ces CGU sont un cadre de travail honnête mais n'ont pas été validées par un avocat. Une version définitive sera publiée avant le lancement public.
      </p>
    </LegalShell>
  );
}
