import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getCurrentOrganization } from '@/lib/auth';

const COUNTRY_FLAGS = {
  EU: '🇪🇺', FR: '🇫🇷', US: '🇺🇸', DE: '🇩🇪', UK: '🇬🇧', BE: '🇧🇪',
  CH: '🇨🇭', JP: '🇯🇵', KR: '🇰🇷', SE: '🇸🇪', ES: '🇪🇸', MA: '🇲🇦',
  International: '🌍',
};

const TYPE_LABELS = {
  multilateral: 'Multilatéral',
  bilateral: 'Bilatéral',
  foundation: 'Fondation',
  ngo: 'ONG',
  government: 'Gouvernement',
  embassy: 'Ambassade',
  private: 'Privé',
};

/**
 * Recommande à l'organisation des bailleurs sémantiquement proches de
 * son profil, en excluant ceux déjà financiers (fuzzy match sur
 * `organizations.funding_history[*].donor` côté JS).
 *
 * Sprint 4E — audit Phase 3 §4 "Donor intelligence prédictive".
 */
export default async function DonorRecommendations({ limit = 5 }) {
  const supabase = createClient();
  const org = await getCurrentOrganization();
  if (!org || !org.onboarding_completed) return null;

  // Récupère plus large que `limit` pour pouvoir filtrer les déjà-financiers
  const { data: rawDonors, error } = await supabase.rpc('find_similar_donors_for_org', {
    p_org_id: org.id,
    p_limit: limit * 3,
  });

  if (error || !rawDonors || rawDonors.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-6">
        <p className="eyebrow">🔭 Bailleurs à explorer</p>
        <p className="mt-2 text-sm text-slate-500">
          {error
            ? "Le moteur de recommandation n'est pas encore prêt — exécute la migration v20 et le backfill des embeddings donneurs."
            : "Aucune recommandation pour le moment. Complète ton profil association pour activer les suggestions."}
        </p>
      </div>
    );
  }

  // Exclut les bailleurs déjà mentionnés dans funding_history (fuzzy)
  const fundedNames = new Set(
    (org.funding_history || [])
      .map((f) => (f?.donor || '').toString().toLowerCase().trim())
      .filter(Boolean)
  );
  const filtered = rawDonors
    .filter((d) => {
      const name = (d.name || '').toLowerCase().trim();
      return !Array.from(fundedNames).some((funded) => name.includes(funded) || funded.includes(name));
    })
    .slice(0, limit);

  if (filtered.length === 0) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-6">
        <p className="eyebrow">🔭 Bailleurs à explorer</p>
        <p className="mt-2 text-sm text-slate-500">
          Aucun nouveau bailleur à recommander — les plus proches de ton profil sont déjà dans ton historique de financement.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-amber-200/40 bg-gradient-to-br from-amber-50/40 to-white p-6">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <p className="eyebrow text-amber-700">🔭 Bailleurs à explorer</p>
          <h3 className="mt-1 font-display text-xl font-black text-slate-950">
            {filtered.length} bailleur{filtered.length > 1 ? 's' : ''} qui ressemble{filtered.length > 1 ? 'nt' : ''} à ton profil
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            Sélectionnés par similarité sémantique avec ton organisation. Exclut ceux déjà dans ton historique de financement.
          </p>
        </div>
      </div>

      <ul className="space-y-2">
        {filtered.map((d) => {
          const sim = Math.round((Number(d.similarity) || 0) * 100);
          const flag = COUNTRY_FLAGS[d.country] || '';
          const typeLabel = TYPE_LABELS[d.type] || d.type || 'Bailleur';
          return (
            <li key={d.donor_id} className="group rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-amber-300 hover:shadow-md">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-display text-base font-black text-slate-950 group-hover:text-amber-700">{d.name}</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {typeLabel}{d.country ? ` · ${flag} ${d.country}` : ''}
                    {Number(d.active_opp_count) > 0 && (
                      <span className="ml-2 inline-block rounded-full bg-emerald-50 px-2 py-0.5 text-2xs font-bold text-emerald-700">
                        {d.active_opp_count} appel{Number(d.active_opp_count) > 1 ? 's' : ''} actif{Number(d.active_opp_count) > 1 ? 's' : ''}
                      </span>
                    )}
                  </p>
                  {d.description && (
                    <p className="mt-2 text-xs leading-5 text-slate-600 line-clamp-2">{d.description}</p>
                  )}
                </div>
                <div className="shrink-0 text-right">
                  <div className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-2xs font-black text-amber-700">
                    🔗 {sim}%
                  </div>
                  {d.website && (
                    <a
                      href={d.website}
                      target="_blank"
                      rel="noopener"
                      className="mt-2 block text-2xs font-bold text-amber-700 hover:underline"
                    >
                      Site officiel ↗
                    </a>
                  )}
                </div>
              </div>
              {Number(d.active_opp_count) > 0 && (
                <Link
                  href={`/opportunities?donor=${d.donor_id}`}
                  className="mt-3 inline-flex text-2xs font-black uppercase tracking-widest text-amber-700 hover:underline"
                >
                  Voir ses {d.active_opp_count} appel{Number(d.active_opp_count) > 1 ? 's' : ''} →
                </Link>
              )}
            </li>
          );
        })}
      </ul>

      <p className="mt-4 text-2xs leading-4 text-slate-400">
        Méthodo : embedding cosine de ton profil orga vs profil de chaque bailleur (nom + description + opps passées + thématiques dominantes).
      </p>
    </div>
  );
}
