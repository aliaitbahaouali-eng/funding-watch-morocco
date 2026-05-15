import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { formatDate, formatAmount } from '@/lib/utils';

const TYPE_LABELS = {
  multilateral: 'Multilatéral',
  bilateral: 'Bilatéral',
  foundation: 'Fondation',
  ngo: 'ONG',
  government: 'Gouvernement',
  embassy: 'Ambassade',
  private: 'Privé',
};

const COUNTRY_FLAGS = {
  EU: '🇪🇺', FR: '🇫🇷', US: '🇺🇸', DE: '🇩🇪', UK: '🇬🇧', BE: '🇧🇪',
  CH: '🇨🇭', JP: '🇯🇵', KR: '🇰🇷', SE: '🇸🇪', ES: '🇪🇸', MA: '🇲🇦',
  International: '🌍',
};

/**
 * DonorIntelligence — section "À propos de ce bailleur" sur la page opportunité.
 *
 * Agrège ce que la base contient déjà sur le bailleur :
 *   - profil (nom, type, pays, site, description)
 *   - nombre d'appels trackés (total + actifs)
 *   - fourchette de montants
 *   - 3 autres appels du même bailleur
 *
 * MVP sans crawl externe ni IA — version "donor intelligence prédictive"
 * (Sprint 3+ / Phase 2 de l'audit) viendra dans un sprint séparé.
 */
export default async function DonorIntelligence({ donorId, currentOpportunityId }) {
  if (!donorId) return null;

  const supabase = createClient();
  const today = new Date().toISOString().slice(0, 10);

  const [{ data: donor }, { data: allOpps }, { count: activeCount }] = await Promise.all([
    supabase.from('donors').select('*').eq('id', donorId).maybeSingle(),
    supabase
      .from('opportunities')
      .select('id, title, deadline, amount_min, amount_max, currency, status, published_at')
      .eq('donor_id', donorId)
      .order('published_at', { ascending: false, nullsFirst: false })
      .limit(50),
    supabase
      .from('opportunities')
      .select('id', { count: 'exact', head: true })
      .eq('donor_id', donorId)
      .eq('status', 'published')
      .gte('deadline', today),
  ]);

  if (!donor) return null;

  const totalOpps = (allOpps || []).length;
  const amounts = (allOpps || [])
    .map((o) => o.amount_max ?? o.amount_min)
    .filter((v) => typeof v === 'number' && v > 0);
  const avgAmount = amounts.length
    ? Math.round(amounts.reduce((a, b) => a + b, 0) / amounts.length)
    : null;

  const otherOpps = (allOpps || [])
    .filter((o) => o.id !== currentOpportunityId)
    .slice(0, 3);

  const typeLabel = TYPE_LABELS[donor.type] || donor.type || 'Bailleur';
  const flag = COUNTRY_FLAGS[donor.country] || '';

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500">À propos de ce bailleur</p>
          <h2 className="mt-1 font-display text-2xl font-black text-slate-950">
            {donor.name}
          </h2>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full bg-slate-100 px-2.5 py-1 font-bold text-slate-700">{typeLabel}</span>
            {donor.country && (
              <span className="rounded-full bg-slate-100 px-2.5 py-1 font-bold text-slate-700">
                {flag} {donor.country}
              </span>
            )}
            {donor.website && (
              <a
                href={donor.website}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full bg-primary/10 px-2.5 py-1 font-bold text-primary hover:bg-primary/20"
              >
                Site officiel ↗
              </a>
            )}
          </div>
        </div>
      </div>

      {donor.description && (
        <p className="mt-4 text-sm leading-6 text-slate-600">{donor.description}</p>
      )}

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <Stat label="Appels trackés" value={totalOpps} hint="depuis le lancement" />
        <Stat label="Appels actifs" value={activeCount ?? 0} hint="deadline future" />
        <Stat
          label="Montant moyen"
          value={avgAmount ? `~${avgAmount.toLocaleString('fr-FR')} ${(allOpps?.find((o) => o.currency)?.currency) || 'EUR'}` : '—'}
          hint={amounts.length ? `sur ${amounts.length} appel(s)` : 'données insuffisantes'}
        />
      </div>

      {otherOpps.length > 0 ? (
        <div className="mt-6">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Autres appels de ce bailleur</p>
          <ul className="mt-3 divide-y divide-slate-100">
            {otherOpps.map((o) => (
              <li key={o.id}>
                <Link
                  href={`/opportunities/${o.id}`}
                  className="flex items-center justify-between gap-4 py-3 transition hover:text-primary"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-slate-950">{o.title}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {o.deadline ? `Deadline : ${formatDate(o.deadline)}` : 'Sans deadline'}
                      {(o.amount_min || o.amount_max) && ` · ${formatAmount(o)}`}
                    </p>
                  </div>
                  <span className="shrink-0 text-slate-400">→</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
          Aucun autre appel encore tracké pour ce bailleur — la base s'enrichit chaque jour.
        </p>
      )}
    </section>
  );
}

function Stat({ label, value, hint }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
      <p className="text-xs font-bold uppercase tracking-widest text-slate-500">{label}</p>
      <p className="mt-1 font-display text-2xl font-black text-slate-950">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}
