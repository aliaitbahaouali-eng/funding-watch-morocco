import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getCurrentOrganization } from '@/lib/auth';
import { formatDate, daysUntil } from '@/lib/utils';

const STATUS_TONE = {
  saved: { label: 'sauvegardé', cls: 'bg-slate-100 text-slate-700' },
  analyzing: { label: 'analyse', cls: 'bg-sky-100 text-sky-700' },
  preparing: { label: 'préparation', cls: 'bg-amber-100 text-amber-700' },
  submitted: { label: 'soumis', cls: 'bg-violet-100 text-violet-700' },
  won: { label: 'gagné', cls: 'bg-emerald-100 text-emerald-700' },
};

/**
 * Sprint 4F — Recommandation collaborative.
 *
 * « X associations au profil proche du tien ont aussi sauvegardé / postulé
 * sur cette opportunité. » → signal social anonymisé, format e-commerce.
 *
 * Source : RPC find_collaborative_recommendations_for_org (migration v21).
 * Anonymat : on n'affiche jamais les noms des orgs pairs, seulement le
 * compteur agrégé et la similarité moyenne (en %) avec ton profil.
 */
export default async function CollaborativeRecommendations({ limit = 5 }) {
  const supabase = createClient();
  const org = await getCurrentOrganization();
  if (!org || !org.onboarding_completed) return null;

  const { data: recs, error } = await supabase.rpc('find_collaborative_recommendations_for_org', {
    p_org_id: org.id,
    p_limit: limit,
  });

  // Si la migration n'est pas appliquée → message d'attente discret
  if (error) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-6">
        <p className="eyebrow">👥 Ce que regardent les assos comme toi</p>
        <p className="mt-2 text-sm text-slate-500">
          Le moteur collaboratif n'est pas encore prêt — exécute la migration v21.
        </p>
      </div>
    );
  }

  if (!recs || recs.length === 0) {
    return null; // pas d'empty state intrusif si zéro signal
  }

  return (
    <div className="rounded-3xl border border-violet-200/40 bg-gradient-to-br from-violet-50/40 to-white p-6">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <p className="eyebrow text-violet-700">👥 Ce que regardent les assos comme toi</p>
          <h3 className="mt-1 font-display text-xl font-black text-slate-950">
            {recs.length} opportunité{recs.length > 1 ? 's' : ''} suivie{recs.length > 1 ? 's' : ''} par des assos au profil proche
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            Signal social anonymisé : on agrège les sauvegardes des organisations sémantiquement proches de la tienne. Les noms ne sont jamais divulgués.
          </p>
        </div>
      </div>

      <ul className="space-y-2">
        {recs.map((r) => {
          const days = daysUntil(r.deadline);
          const avgSim = Math.round((Number(r.avg_peer_similarity) || 0) * 100);
          const peerCount = Number(r.peer_count) || 0;
          const statuses = Array.isArray(r.peer_statuses) ? r.peer_statuses : [];
          const hasSubmitted = statuses.includes('submitted') || statuses.includes('won');
          return (
            <li key={r.opportunity_id} className="group rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-violet-300 hover:shadow-md">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/opportunities/${r.opportunity_id}`}
                    className="block font-display text-base font-black text-slate-950 hover:text-violet-700"
                  >
                    {r.title || 'Sans titre'}
                  </Link>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {r.donor_name || 'Bailleur'}
                    {r.deadline && (
                      <>
                        {' · '}
                        <span className={days <= 7 ? 'font-bold text-rose-600' : days <= 30 ? 'font-bold text-amber-600' : ''}>
                          deadline {formatDate(r.deadline)} {days >= 0 ? `(${days}j)` : '(expirée)'}
                        </span>
                      </>
                    )}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    {statuses.slice(0, 4).map((s) => {
                      const tone = STATUS_TONE[s];
                      if (!tone) return null;
                      return (
                        <span key={s} className={`rounded-full px-2 py-0.5 text-2xs font-bold ${tone.cls}`}>
                          {tone.label}
                        </span>
                      );
                    })}
                    {hasSubmitted && (
                      <span className="rounded-full bg-violet-100 px-2 py-0.5 text-2xs font-black uppercase tracking-widest text-violet-700">
                        ⚡ déjà soumis par un pair
                      </span>
                    )}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2.5 py-1 text-2xs font-black text-violet-700">
                    👥 {peerCount} pair{peerCount > 1 ? 's' : ''}
                  </div>
                  <p className="mt-1 text-2xs text-slate-400">~{avgSim}% similaire</p>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <p className="mt-4 text-2xs leading-4 text-slate-400">
        Méthodo : cosine entre ton embedding orga (profil + thématiques + historique) et celui des autres assos onboardées. Top {limit} opps suivies par les plus proches, excluant ce que tu suis déjà.
      </p>
    </div>
  );
}
