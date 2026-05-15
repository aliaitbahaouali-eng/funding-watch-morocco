import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * /unsubscribe?token=<uuid>
 *
 * Page publique (pas de login requis — conforme RGPD).
 * Le token est passé en query string et matché contre organizations.unsubscribe_token.
 * Si valide → email_frequency='none', log RGPD inséré, page de confirmation.
 *
 * Spam-safe : pas d'info révélée si token invalide (juste "lien expiré").
 */
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata = {
  title: 'Désinscription — Funding Watch Morocco',
  robots: { index: false, follow: false },
};

async function processUnsubscribe(token) {
  if (!token) return { status: 'no_token' };

  // UUID v4 sanity check
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(token)) return { status: 'invalid' };

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase.rpc('unsubscribe_org_by_token', { p_token: token });
    if (error) {
      console.error('[unsubscribe] RPC error:', error);
      return { status: 'error' };
    }
    if (!data || data.length === 0) return { status: 'invalid' };
    return { status: 'ok', orgName: data[0].org_name, wasSubscribed: data[0].was_subscribed };
  } catch (err) {
    console.error('[unsubscribe] exception:', err);
    return { status: 'error' };
  }
}

export default async function UnsubscribePage({ searchParams }) {
  const token = searchParams?.token;
  const result = await processUnsubscribe(token);

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-white px-4 py-12">
      <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-8 shadow-xl sm:p-12">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500 to-red-700 font-display text-lg font-black text-white">
            F
          </div>
          <div>
            <div className="font-display text-lg font-black text-slate-900">Funding Watch</div>
            <div className="text-xs font-bold uppercase tracking-widest text-red-600">Morocco · Intelligence</div>
          </div>
        </div>

        {result.status === 'ok' && (
          <>
            <h1 className="font-display text-3xl font-black text-slate-900">
              {result.wasSubscribed ? 'Désinscription confirmée' : 'Vous êtes déjà désinscrit'}
            </h1>
            <p className="mt-4 text-slate-600">
              {result.wasSubscribed ? (
                <>
                  L'organisation <b>{result.orgName}</b> ne recevra plus d'emails de Funding Watch.
                  Nous sommes désolés de vous voir partir.
                </>
              ) : (
                <>L'organisation <b>{result.orgName}</b> est déjà désinscrite. Aucune action requise.</>
              )}
            </p>
            <div className="mt-8 rounded-2xl bg-slate-50 p-5">
              <p className="text-sm text-slate-700">
                <b>Vous changez d'avis ?</b> Vous pouvez réactiver les notifications quand vous voulez depuis vos préférences.
              </p>
              <Link
                href="/dashboard/profile"
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-gradient-to-br from-red-500 to-red-700 px-6 py-3 text-xs font-bold uppercase tracking-widest text-white shadow-lg shadow-red-200 transition hover:shadow-xl"
              >
                Modifier mes préférences →
              </Link>
            </div>
          </>
        )}

        {result.status === 'invalid' && (
          <>
            <h1 className="font-display text-3xl font-black text-slate-900">Lien expiré ou invalide</h1>
            <p className="mt-4 text-slate-600">
              Ce lien de désinscription n'est plus valide. Vous pouvez modifier vos préférences directement depuis votre tableau de bord.
            </p>
            <Link
              href="/dashboard/profile"
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-gradient-to-br from-red-500 to-red-700 px-6 py-3 text-xs font-bold uppercase tracking-widest text-white shadow-lg shadow-red-200"
            >
              Accéder à mes préférences →
            </Link>
          </>
        )}

        {result.status === 'no_token' && (
          <>
            <h1 className="font-display text-3xl font-black text-slate-900">Lien incomplet</h1>
            <p className="mt-4 text-slate-600">
              Le lien que vous avez suivi est incomplet. Veuillez utiliser le lien exact reçu par email.
            </p>
            <Link
              href="/"
              className="mt-8 inline-flex items-center gap-2 rounded-full border-2 border-slate-200 bg-white px-6 py-3 text-xs font-bold uppercase tracking-widest text-slate-700 transition hover:border-red-300"
            >
              Retour à l'accueil
            </Link>
          </>
        )}

        {result.status === 'error' && (
          <>
            <h1 className="font-display text-3xl font-black text-slate-900">Une erreur est survenue</h1>
            <p className="mt-4 text-slate-600">
              Nous n'avons pas pu traiter votre demande pour le moment. Merci de réessayer dans quelques minutes, ou contactez-nous à <a href="mailto:contact@fundingwatch.ma" className="font-bold text-red-600 hover:underline">contact@fundingwatch.ma</a>.
            </p>
          </>
        )}

        <p className="mt-10 border-t border-slate-200 pt-6 text-center text-xs text-slate-400">
          Conformément au RGPD, vos données restent stockées tant que votre compte est actif. Pour supprimer définitivement votre compte, contactez-nous.
        </p>
      </div>
    </main>
  );
}
