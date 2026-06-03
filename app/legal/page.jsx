import LegalShell from '@/components/legal/LegalShell';

export const metadata = {
  title: 'Mentions légales',
  description: 'Mentions légales de Funding Watch Morocco — éditeur, hébergeur, propriété intellectuelle.',
};

export default function LegalPage() {
  return (
    <LegalShell
      title="Mentions légales"
      subtitle="Qui édite la plateforme, qui l'héberge, et qui contacter."
      lastUpdated="1er juin 2026"
      currentPath="/legal"
    >
      <p className="lead">
        Conformément aux obligations légales marocaines et internationales, voici les informations sur l'éditeur et l'hébergeur de Funding Watch Morocco.
      </p>

      <h2>1. Éditeur du site</h2>
      <p>
        <strong>Funding Watch Morocco</strong> est un projet édité à titre personnel par :
      </p>
      <ul>
        <li><strong>Nom</strong> : Ali Aitbahaouali</li>
        <li><strong>Statut</strong> : entrepreneur individuel <span className="text-amber-700">(à confirmer / mettre à jour avec ton statut juridique réel)</span></li>
        <li><strong>Adresse</strong> : Casablanca, Maroc <span className="text-amber-700">(adresse précise à compléter)</span></li>
        <li><strong>Email contact</strong> : <a href="mailto:contact@fundingwatch.ma">contact@fundingwatch.ma</a></li>
        <li><strong>Directeur de publication</strong> : Ali Aitbahaouali</li>
      </ul>

      <p className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        <strong>⚠ À compléter avant lancement public</strong> : numéro RC (Registre du Commerce), numéro ICE (Identifiant Commun de l'Entreprise), forme juridique exacte, capital social si applicable, taxe professionnelle.
      </p>

      <h2>2. Hébergement</h2>
      <ul>
        <li>
          <strong>Hébergement applicatif</strong> :{' '}
          <a href="https://vercel.com" target="_blank" rel="noopener">Vercel Inc.</a>{' '}
          — 440 N Barranca Ave #4133, Covina, CA 91723, USA
        </li>
        <li>
          <strong>Base de données</strong> :{' '}
          <a href="https://supabase.com" target="_blank" rel="noopener">Supabase Inc.</a>{' '}
          — 970 Toa Payoh North #07-04, Singapore 318992
        </li>
        <li>
          <strong>Email transactionnel</strong> :{' '}
          <a href="https://www.brevo.com" target="_blank" rel="noopener">Sendinblue / Brevo SAS</a>{' '}
          — 7 rue de Madrid, 75008 Paris, France
        </li>
      </ul>

      <h2>3. Propriété intellectuelle</h2>
      <p>
        L'ensemble des éléments composant le site (textes, code source, design, logo, algorithmes de matching, base de données enrichie) est protégé par le droit de la propriété intellectuelle et reste la propriété de l'éditeur.
      </p>
      <ul>
        <li>Les <strong>opportunités scrapées</strong> proviennent de sources publiques (sites institutionnels). On en restitue le contenu en citant la source et avec lien direct vers le site officiel du bailleur.</li>
        <li>Les <strong>noms des bailleurs</strong> (UE, AFD, UNDP, GIZ, etc.) sont des marques déposées de leurs détenteurs respectifs.</li>
        <li>Toute reproduction, représentation, modification, exploitation commerciale du site sans autorisation écrite préalable est interdite.</li>
      </ul>

      <h2>4. Liens vers des sites tiers</h2>
      <p>
        La plateforme contient des liens vers les sites officiels des bailleurs (UE, AFD, UNDP, etc.) ainsi que vers les sites de nos prestataires (Supabase, Vercel, Brevo). On n'est pas responsable du contenu de ces sites tiers ni de leurs politiques de confidentialité.
      </p>

      <h2>5. Crédits et remerciements</h2>
      <p>
        Funding Watch utilise les technologies open source suivantes :
      </p>
      <ul>
        <li><strong>Next.js</strong> (Vercel) — framework React.</li>
        <li><strong>Tailwind CSS</strong> — design system utility-first.</li>
        <li><strong>Supabase</strong> — Postgres + Auth + Storage.</li>
        <li><strong>pgvector</strong> — extension Postgres pour similarité vectorielle.</li>
        <li><strong>OpenAI / Anthropic</strong> — embeddings et modèles de langage.</li>
        <li><strong>Recharts, Framer Motion, lucide-react, unpdf</strong> — composants UI et utilitaires.</li>
      </ul>

      <h2>6. Données personnelles</h2>
      <p>
        Le traitement des données personnelles est détaillé dans notre{' '}
        <a href="/privacy">politique de confidentialité</a>. Pour exercer tes droits d'accès,
        de rectification, de suppression ou de portabilité : <a href="mailto:contact@fundingwatch.ma">contact@fundingwatch.ma</a>.
      </p>

      <h2>7. Conditions d'utilisation</h2>
      <p>
        L'utilisation de la plateforme est soumise aux <a href="/terms">Conditions Générales d'Utilisation</a>.
      </p>

      <h2>Contact</h2>
      <p>
        Pour toute question, signalement, demande presse ou partenariat :{' '}
        <a href="mailto:contact@fundingwatch.ma">contact@fundingwatch.ma</a>.
      </p>

      <p className="mt-12 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        <strong>⚠ Note bêta</strong> : cette page est à <strong>finaliser par toi</strong> avant le lancement public (statut juridique exact, RC, ICE, adresse précise). Le squelette est là, il manque tes informations administratives réelles.
      </p>
    </LegalShell>
  );
}
