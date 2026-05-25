import Link from 'next/link';

export const metadata = {
  title: 'Centre d\'aide',
  description: 'FAQ, guide de démarrage rapide et tutoriels pour utiliser Funding Watch Morocco.',
};

const FAQ_SECTIONS = [
  {
    title: '🚀 Démarrage',
    questions: [
      {
        q: 'Comment créer mon compte ?',
        a: (
          <>
            Cliquez sur <Link href="/register" className="font-semibold text-rose-600 hover:underline">S'inscrire</Link> en haut à droite. Renseignez le nom de votre association, votre email et un mot de passe. Vous serez automatiquement redirigé vers le wizard d'onboarding (7 écrans, ~3 min).
          </>
        ),
      },
      {
        q: 'Pourquoi compléter mon profil ?',
        a: (
          <>
            Le matching IA fonctionne en comparant votre profil aux opportunités. Plus votre profil est précis (thématiques, zones d'intervention, budget annuel, populations ciblées), plus les recommandations sont pertinentes. Un profil à 100% multiplie par 3 la qualité du matching.
          </>
        ),
      },
      {
        q: 'Combien de temps pour finir l\'onboarding ?',
        a: (
          <>
            3 à 5 minutes en moyenne. Vous pouvez sauvegarder et reprendre plus tard depuis <Link href="/dashboard/profile" className="font-semibold text-rose-600 hover:underline">votre profil</Link>. Astuce : uploadez le PDF de présentation de votre association, l'IA analyse le texte et pré-remplit automatiquement la majorité des champs.
          </>
        ),
      },
    ],
  },
  {
    title: '🎯 Opportunités',
    questions: [
      {
        q: 'D\'où viennent les opportunités ?',
        a: (
          <>
            Nous scannons automatiquement 38 sources actives : Commission européenne (NDICI, EuropeAid), agences ONU (UNDP, UN Women, UNICEF), coopération bilatérale (AFD, GIZ, USAID, Enabel), bailleurs marocains (INDH, Tanmia), fondations privées, et plateformes spécialisées (fundsforNGOs). Chaque opportunité est vérifiée par un humain avant publication.
          </>
        ),
      },
      {
        q: 'Pourquoi un score de compatibilité ?',
        a: (
          <>
            Le score (0-100) combine 5 critères : alignement thématique (50%), langue de candidature (10%), adéquation budget/difficulté (15%), badge vérifié (10%), et marge avant deadline (15%). Un score ≥70 indique un excellent match.
          </>
        ),
      },
      {
        q: 'Comment savoir si je suis éligible ?',
        a: (
          <>
            Chaque fiche affiche les pays éligibles + un badge "🇲🇦 Maroc éligible" quand c'est confirmé. Lisez aussi le bloc "Éligibilité" qui détaille les critères du bailleur (type d'organisation, taille, expérience requise). En cas de doute, contactez le bailleur via le lien officiel.
          </>
        ),
      },
      {
        q: 'Comment sauvegarder une opportunité ?',
        a: (
          <>
            Cliquez sur le cœur ❤️ sur n'importe quelle fiche. Elle apparaitra dans <Link href="/dashboard/saved" className="font-semibold text-rose-600 hover:underline">Mes sauvegardes</Link>. Vous pouvez ensuite suivre votre candidature en changeant son statut (saved → analyzing → preparing → submitted → won/lost).
          </>
        ),
      },
      {
        q: 'Je ne trouve pas le type d\'opportunité que je cherche',
        a: (
          <>
            Vérifiez vos filtres dans <Link href="/opportunities" className="font-semibold text-rose-600 hover:underline">Toutes les opportunités</Link>. Si rien ne correspond, c'est peut-être qu'aucun bailleur n'a publié récemment pour votre niche. Utilisez le bouton 💬 en bas à droite pour nous signaler la thématique manquante — on peut ajouter des sources sur demande.
          </>
        ),
      },
    ],
  },
  {
    title: '📧 Alertes & emails',
    questions: [
      {
        q: 'Comment configurer mes alertes ?',
        a: (
          <>
            Allez dans <Link href="/dashboard/preferences" className="font-semibold text-rose-600 hover:underline">Préférences</Link>. Vous pouvez choisir : fréquence (quotidien / hebdomadaire / désactivé), heure d'envoi (par défaut 7h UTC), jours de la semaine, score minimum (par défaut 50), et langue.
          </>
        ),
      },
      {
        q: 'Je ne reçois pas les emails',
        a: (
          <>
            Vérifiez : 1) vos préférences ne sont pas sur "désactivé", 2) votre dossier spam, 3) que votre score minimum n'est pas trop élevé (essayez 30). Si toujours rien après 48h, signalez-le via le bouton 💬.
          </>
        ),
      },
      {
        q: 'Comment me désabonner ?',
        a: (
          <>
            Chaque email a un lien "Se désabonner" en bas (RFC 8058, 1 clic). Vous pouvez aussi modifier votre fréquence dans <Link href="/dashboard/preferences" className="font-semibold text-rose-600 hover:underline">vos préférences</Link>.
          </>
        ),
      },
    ],
  },
  {
    title: '🤖 IA & Cowriter',
    questions: [
      {
        q: 'Comment fonctionne le matching IA ?',
        a: (
          <>
            Nous utilisons des embeddings sémantiques (OpenAI text-embedding-3-small, dimension 1536) pour comparer votre profil aux opportunités via similarité cosinus. C'est combiné avec un score basé sur des règles métier (thématiques, langue, budget, deadline).
          </>
        ),
      },
      {
        q: 'C\'est quoi le AI Cowriter ?',
        a: (
          <>
            Sur chaque opportunité sauvegardée, vous pouvez générer en 30 secondes un brouillon de résumé exécutif (executive summary) adapté à votre association. Claude (IA d'Anthropic) combine votre profil + le contenu de l'appel à projets pour produire un point de départ rédactionnel. Vous l'adaptez ensuite à votre voix.
          </>
        ),
      },
      {
        q: 'Mes données sont-elles utilisées pour entraîner l\'IA ?',
        a: (
          <>
            Non. Nous utilisons l'API d'Anthropic (Claude) qui s'engage contractuellement à ne pas utiliser les données client pour l'entraînement. Vos données restent dans notre base Supabase (hébergée en Europe) et ne sont jamais partagées.
          </>
        ),
      },
    ],
  },
  {
    title: '💳 Tarifs',
    questions: [
      {
        q: 'C\'est payant ?',
        a: (
          <>
            Pendant la bêta privée (mai-juin 2026), tout est gratuit pour les associations sélectionnées. À partir de juillet : formule Gratuite (5 opportunités sauvegardées/mois) et formule Pro (~199 MAD/mois) avec accès illimité. Les bêta-testeurs auront 6 mois de Pro offerts.
          </>
        ),
      },
      {
        q: 'Vous prenez une commission sur les fonds obtenus ?',
        a: (
          <>
            Non, jamais. Notre modèle économique est l'abonnement mensuel uniquement.
          </>
        ),
      },
      {
        q: 'Comment obtenir une facture ?',
        a: (
          <>
            Pour les abonnements payants (à partir de juillet), chaque paiement génère automatiquement une facture PDF envoyée par email. Disponible aussi dans votre espace facturation.
          </>
        ),
      },
    ],
  },
  {
    title: '🔒 Confidentialité & sécurité',
    questions: [
      {
        q: 'Où sont stockées mes données ?',
        a: (
          <>
            Base de données Supabase (PostgreSQL) hébergée en Europe (eu-west-3, Paris). Application hébergée sur Vercel (USA pour l'edge, Europe pour les fonctions). Conformité RGPD. Aucune revente de données.
          </>
        ),
      },
      {
        q: 'Qui peut voir mon profil et mes candidatures ?',
        a: (
          <>
            Vous uniquement. Les politiques RLS (Row Level Security) de Supabase garantissent que personne ne peut accéder à vos données — pas même les autres associations. Seuls les administrateurs Funding Watch (Ali, en l'occurrence) peuvent voir les feedbacks que vous envoyez via le bouton 💬.
          </>
        ),
      },
      {
        q: 'Comment supprimer mon compte ?',
        a: (
          <>
            Envoyez un email à ali@fundingwatch.ma avec votre demande. Suppression sous 48h, y compris toutes vos données (profil, candidatures, préférences). Conformément au RGPD.
          </>
        ),
      },
    ],
  },
  {
    title: '🐛 Bugs & feedback',
    questions: [
      {
        q: 'J\'ai trouvé un bug, comment le signaler ?',
        a: (
          <>
            Cliquez sur le bouton flottant 💬 en bas à droite de n'importe quelle page. Décrivez le bug, choisissez la sévérité, envoyez. Ali (le fondateur) lit personnellement chaque retour et répond en général sous 24h.
          </>
        ),
      },
      {
        q: 'J\'ai une idée de feature',
        a: (
          <>
            Même bouton 💬, type "💡 Idée". Les idées sont triées et publiées dans une roadmap publique. Les meilleures sont implémentées dans les 2-4 semaines.
          </>
        ),
      },
    ],
  },
];

const QUICK_START_STEPS = [
  {
    n: 1,
    title: 'Créer votre compte',
    desc: 'Inscription en 30 secondes avec email + mot de passe.',
    href: '/register',
    cta: 'S\'inscrire →',
  },
  {
    n: 2,
    title: 'Compléter votre profil (3-5 min)',
    desc: 'Le wizard guidé vous demande : nom de l\'asso, type, zones, thématiques, populations, budget. Vous pouvez aussi uploader un PDF pour pré-remplir.',
    href: '/onboarding',
    cta: 'Onboarding →',
  },
  {
    n: 3,
    title: 'Découvrir vos opportunités matchées',
    desc: 'Votre dashboard affiche les top 4 opportunités les mieux scorées + tendances + deadlines proches.',
    href: '/dashboard',
    cta: 'Mon dashboard →',
  },
  {
    n: 4,
    title: 'Sauvegarder ce qui vous intéresse',
    desc: 'Cliquez sur le cœur ❤️ sur les fiches qui vous intéressent. Elles passent dans "Mes sauvegardes".',
    href: '/opportunities',
    cta: 'Toutes les opportunités →',
  },
  {
    n: 5,
    title: 'Suivre vos candidatures',
    desc: 'Changez le statut de chaque opportunité (saved → analyzing → preparing → submitted → won/lost) pour suivre votre pipeline.',
    href: '/dashboard/applications',
    cta: 'Mes candidatures →',
  },
  {
    n: 6,
    title: 'Configurer les alertes email',
    desc: 'Fréquence, heure, jours, score minimum, langue. Vous recevez un récap quotidien ou hebdo des nouvelles opportunités.',
    href: '/dashboard/preferences',
    cta: 'Mes préférences →',
  },
];

export default function HelpPage() {
  return (
    <main className="bg-gradient-to-b from-slate-50 to-white">
      {/* Hero */}
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-6 py-16">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-rose-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-rose-700">
            <span>📚</span> Centre d'aide
          </div>
          <h1 className="font-display text-4xl font-black text-slate-950 sm:text-5xl">
            On répond à vos questions
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-slate-600">
            Guide de démarrage rapide, FAQ détaillée et raccourcis vers les fonctionnalités clés.
            Une question pas couverte ? Cliquez sur le bouton <span className="font-bold text-rose-600">💬 Feedback</span> en bas à droite.
          </p>
        </div>
      </section>

      {/* Quick start */}
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-6 py-12">
          <h2 className="font-display text-2xl font-black text-slate-950">⚡ Démarrage rapide en 6 étapes</h2>
          <p className="mt-2 text-sm text-slate-500">De l'inscription aux premières candidatures suivies, en ~15 minutes.</p>
          <ol className="mt-8 space-y-4">
            {QUICK_START_STEPS.map((step) => (
              <li key={step.n} className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-rose-300 hover:shadow-sm">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-rose-600 font-bold text-white">
                  {step.n}
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-slate-950">{step.title}</h3>
                  <p className="mt-1 text-sm text-slate-600">{step.desc}</p>
                  <Link href={step.href} className="mt-2 inline-block text-sm font-semibold text-rose-600 hover:underline">
                    {step.cta}
                  </Link>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-5xl px-6 py-16">
        <h2 className="font-display text-2xl font-black text-slate-950">❓ Questions fréquentes</h2>
        <p className="mt-2 text-sm text-slate-500">Triées par catégorie. Cliquez pour développer.</p>

        <div className="mt-8 space-y-10">
          {FAQ_SECTIONS.map((section) => (
            <div key={section.title}>
              <h3 className="mb-4 text-lg font-bold text-slate-900">{section.title}</h3>
              <div className="space-y-3">
                {section.questions.map((item, i) => (
                  <details key={i} className="group rounded-2xl border border-slate-200 bg-white open:border-rose-300 open:shadow-sm">
                    <summary className="flex cursor-pointer items-center justify-between gap-4 p-5 font-semibold text-slate-900 marker:hidden">
                      <span>{item.q}</span>
                      <span className="flex-shrink-0 text-slate-400 transition group-open:rotate-45">+</span>
                    </summary>
                    <div className="px-5 pb-5 text-sm leading-relaxed text-slate-600">
                      {item.a}
                    </div>
                  </details>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Contact CTA */}
      <section className="border-t border-slate-200 bg-gradient-to-br from-rose-50 via-white to-amber-50">
        <div className="mx-auto max-w-5xl px-6 py-16 text-center">
          <h2 className="font-display text-2xl font-black text-slate-950">Une question pas couverte ?</h2>
          <p className="mt-3 text-slate-600">
            Cliquez sur le bouton <span className="font-bold text-rose-600">💬 Feedback</span> en bas à droite,
            ou écrivez directement à{' '}
            <a href="mailto:ali@fundingwatch.ma" className="font-semibold text-rose-600 hover:underline">
              ali@fundingwatch.ma
            </a>
            . Réponse sous 24h en général.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/dashboard" className="rounded-2xl bg-rose-600 px-6 py-3 font-bold text-white shadow-lg shadow-rose-600/20 transition hover:bg-rose-700">
              Retour au dashboard
            </Link>
            <Link href="/opportunities" className="rounded-2xl border border-slate-300 bg-white px-6 py-3 font-bold text-slate-700 transition hover:border-slate-400">
              Voir les opportunités
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
