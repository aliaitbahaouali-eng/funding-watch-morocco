import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getCurrentOrganization } from '@/lib/auth';

/**
 * Widget Top Matches — appelle la fonction SQL match_opportunities_for_org
 * et affiche les 5 meilleures correspondances avec scoring expliqué.
 */
export default async function TopMatches({ limit = 5 }) {
  const supabase = createClient();
  const org = await getCurrentOrganization();

  if (!org || !org.onboarding_completed) {
    return (
      <div className="rounded-3xl border border-dashed border-red-300/40 bg-gradient-to-br from-red-50 to-white p-8">
        <div className="text-xs font-bold uppercase tracking-widest text-primary">Matching IA</div>
        <h3 className="mt-2 text-xl font-black text-slate-900">Complétez votre profil</h3>
        <p className="mt-2 text-sm text-slate-600">
          Pour activer le matching intelligent, finalisez votre profil organisation.
        </p>
        <Link
          href="/onboarding"
          className="mt-5 inline-flex rounded-full bg-primary px-6 py-3 text-xs font-bold uppercase tracking-widest text-white shadow-lg"
        >
          Compléter mon profil →
        </Link>
      </div>
    );
  }

  const { data: matches, error } = await supabase.rpc('match_opportunities_for_org', {
    p_org_id: org.id,
    p_limit: limit,
  });

  if (error || !matches?.length) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center">
        <div className="text-xs font-bold uppercase tracking-widest text-slate-500">Top Matches</div>
        <p className="mt-3 text-sm text-slate-600">
          {error ? 'Le moteur de matching n\'est pas encore prêt — exécute la migration v4 et le backfill embeddings.' : 'Aucune opportunité matchée pour le moment. Reviens dans 24h.'}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-red-200/40 bg-gradient-to-br from-red-50/40 to-white p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="text-xs font-bold uppercase tracking-widest text-primary">⚡ Matching IA</div>
          <h3 className="mt-1 text-xl font-black text-slate-950">Top {matches.length} opportunités pour vous</h3>
        </div>
        <Link href="/opportunities?matched=1" className="text-xs font-bold uppercase tracking-widest text-primary hover:underline">
          Voir tout →
        </Link>
      </div>
      <div className="space-y-3">
        {matches.map((m, idx) => {
          const tier = m.final_score >= 80 ? 'excellent' : m.final_score >= 60 ? 'good' : m.final_score >= 40 ? 'fair' : 'low';
          const tierStyles = {
            excellent: 'bg-emerald-500',
            good: 'bg-primary',
            fair: 'bg-amber-500',
            low: 'bg-slate-400',
          };
          return (
            <Link
              key={m.opportunity_id}
              href={`/opportunities/${m.opportunity_id}`}
              className="group flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-primary/30 hover:shadow-md"
            >
              <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-slate-50">
                <div className="font-display text-lg font-black text-slate-900">{Math.round(m.final_score)}</div>
                <div className={`absolute -bottom-1 right-0 h-3 w-3 rounded-full ring-2 ring-white ${tierStyles[tier]}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="truncate font-bold text-slate-950 group-hover:text-primary">
                  {m.title}
                </div>
                <div className="mt-0.5 flex items-center gap-3 text-xs text-slate-500">
                  {m.donor_name && <span>{m.donor_name}</span>}
                  {m.deadline && (
                    <span>
                      Deadline : {new Date(m.deadline).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                    </span>
                  )}
                  {m.morocco_eligible && (
                    <span className="rounded-full bg-red-50 px-2 py-0.5 font-bold text-primary">🇲🇦 Maroc</span>
                  )}
                </div>
                <div className="mt-1 text-xs text-slate-400">{m.reason}</div>
              </div>
              <svg className="h-5 w-5 shrink-0 text-slate-300 group-hover:text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
              </svg>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
