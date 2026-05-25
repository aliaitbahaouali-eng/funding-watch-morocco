import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export const metadata = {
  title: 'Merci pour votre avis',
  description: 'Votre score NPS a été enregistré.',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

/**
 * Sprint 4P — Page de capture NPS depuis email J+14.
 *
 * URL : /nps?score=N (N entre 0 et 10)
 *
 * Flow :
 *   - Récupère le score depuis le query param
 *   - Insert dans beta_feedback (kind='other', message='NPS: N — <commentaire optionnel>')
 *   - Si user non authentifié : redirige vers login avec callback
 *   - Affiche un thank-you + champ pour commentaire optionnel
 */
export default async function NpsPage({ searchParams }) {
  const score = parseInt(searchParams?.score, 10);
  const validScore = !isNaN(score) && score >= 0 && score <= 10;

  if (!validScore) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-20 text-center">
        <h1 className="font-display text-3xl font-black text-slate-950">Score invalide</h1>
        <p className="mt-4 text-slate-600">Le lien est cassé. Réessayez depuis l'email reçu.</p>
        <Link href="/dashboard" className="mt-8 inline-block rounded-2xl bg-rose-600 px-6 py-3 font-bold text-white hover:bg-rose-700">
          Retour au dashboard
        </Link>
      </main>
    );
  }

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/nps?score=${score}`)}`);
  }

  // Vérifier si on a déjà un score NPS récent (< 7 jours) pour cet user
  // pour éviter les doublons si l'utilisateur clique 2 fois
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
  const { data: existing } = await supabase
    .from('beta_feedback')
    .select('id, message')
    .eq('user_id', user.id)
    .gte('created_at', sevenDaysAgo)
    .ilike('message', 'NPS: %')
    .order('created_at', { ascending: false })
    .limit(1);

  let alreadySubmitted = false;
  let storedScore = null;
  if (existing?.length) {
    alreadySubmitted = true;
    const m = existing[0].message.match(/^NPS:\s*(\d+)/);
    storedScore = m ? parseInt(m[1], 10) : null;
  }

  // Enregistrer le NEW score si pas déjà fait (ou si l'utilisateur change d'avis)
  if (!alreadySubmitted) {
    // Récupère organization_id si dispo
    let organizationId = null;
    try {
      const { data: org } = await supabase
        .from('organizations')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      organizationId = org?.id || null;
    } catch {}

    await supabase.from('beta_feedback').insert({
      user_id: user.id,
      organization_id: organizationId,
      kind: 'other',
      severity: 'low',
      page_url: '/nps',
      message: `NPS: ${score}`,
      user_agent: 'email-link-onboarding-d14',
    });
  }

  const finalScore = alreadySubmitted ? storedScore : score;
  const isPromoter = finalScore >= 9;
  const isPassive = finalScore >= 7 && finalScore <= 8;
  const isDetractor = finalScore <= 6;

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="mx-auto max-w-2xl px-6 py-20">
        <div className="rounded-3xl border border-slate-200 bg-white p-10 shadow-sm">
          {/* Score visuel */}
          <div className="text-center">
            <div
              className="mx-auto flex h-24 w-24 items-center justify-center rounded-full text-4xl font-black text-white shadow-lg"
              style={{
                background: isPromoter ? '#10b981' : isPassive ? '#f59e0b' : '#ef4444',
                boxShadow: `0 8px 32px ${isPromoter ? '#10b98140' : isPassive ? '#f59e0b40' : '#ef444440'}`,
              }}
            >
              {finalScore}
            </div>
            <h1 className="mt-6 font-display text-3xl font-black text-slate-950">
              {alreadySubmitted ? 'Votre score est enregistré' : 'Merci pour votre note !'}
            </h1>
            <p className="mt-2 text-slate-600">
              {alreadySubmitted
                ? `Vous avez déjà voté ${storedScore}/10 cette semaine. Pas la peine de revoter.`
                : `Vous avez noté Funding Watch ${score}/10. Votre avis compte vraiment.`}
            </p>
          </div>

          {/* Message contextuel selon le score */}
          <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-5">
            {isPromoter && (
              <div>
                <p className="font-bold text-emerald-700">🎉 Merci, vous êtes un Promoteur !</p>
                <p className="mt-2 text-sm text-slate-600">
                  Vous appréciez vraiment Funding Watch. Auriez-vous 30 secondes pour partager le lien à 2-3 collègues ?
                  Ça nous aide énormément à grandir.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <a
                    href="https://www.linkedin.com/sharing/share-offsite/?url=https%3A%2F%2Ffunding-watch-morocco.vercel.app"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-2xl bg-[#0a66c2] px-4 py-2 text-xs font-bold text-white hover:opacity-90"
                  >
                    Partager LinkedIn
                  </a>
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent('Je viens de découvrir Funding Watch Morocco, une plateforme qui scanne automatiquement 38 sources de financement pour les associations marocaines. https://funding-watch-morocco.vercel.app')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-2xl bg-[#25D366] px-4 py-2 text-xs font-bold text-white hover:opacity-90"
                  >
                    Partager WhatsApp
                  </a>
                </div>
              </div>
            )}
            {isPassive && (
              <div>
                <p className="font-bold text-amber-700">👋 Merci pour votre retour</p>
                <p className="mt-2 text-sm text-slate-600">
                  Vous êtes plutôt satisfait, mais il y a sûrement des choses à améliorer. Qu'est-ce qui vous a le plus
                  manqué cette semaine ? Utilisez le bouton 💬 en bas à droite pour nous le dire en 30 secondes.
                </p>
                <Link
                  href="/dashboard"
                  className="mt-3 inline-block rounded-2xl bg-amber-600 px-4 py-2 text-xs font-bold text-white hover:bg-amber-700"
                >
                  Retour au dashboard
                </Link>
              </div>
            )}
            {isDetractor && (
              <div>
                <p className="font-bold text-rose-700">😔 On peut mieux faire — on veut comprendre</p>
                <p className="mt-2 text-sm text-slate-600">
                  Votre score nous montre qu'il y a un vrai problème. Pourriez-vous nous écrire directement à{' '}
                  <a href="mailto:ali@fundingwatch.ma" className="font-semibold text-rose-700 hover:underline">
                    ali@fundingwatch.ma
                  </a>{' '}
                  pour nous expliquer ce qui ne va pas ? On répond personnellement à chaque détracteur, et on adapte
                  le produit en conséquence.
                </p>
              </div>
            )}
          </div>

          {/* CTA standard */}
          <div className="mt-8 flex justify-center">
            <Link
              href="/dashboard"
              className="rounded-2xl border border-slate-300 bg-white px-6 py-3 font-bold text-slate-700 hover:border-slate-400"
            >
              Retour au dashboard
            </Link>
          </div>
        </div>

        {/* Légende NPS pour pédagogie */}
        <p className="mt-6 text-center text-xs text-slate-500">
          NPS = Net Promoter Score. Scores 9-10 = Promoteurs · 7-8 = Passifs · 0-6 = Détracteurs.
        </p>
      </div>
    </main>
  );
}
