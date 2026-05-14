import Link from 'next/link';
import ScoreRing from './ScoreRing';
import { formatDate, daysUntil, formatAmount, truncate, opportunityStatus } from '@/lib/utils';

/** Carte d'opportunité premium type Devex/LinkedIn. */
export default function OpportunityCardPremium({ item, variant = 'default' }) {
  const status = opportunityStatus(item.deadline, item.status);
  const days = daysUntil(item.deadline);

  const statusPill =
    status === 'urgent' ? { label: `🔥 ${days}j restants`, classes: 'bg-amber-50 text-amber-700' } :
    status === 'expired' ? { label: 'Expiré', classes: 'bg-ink-100 text-ink-500' } :
    { label: 'Ouvert', classes: 'bg-emerald-50 text-emerald-700' };

  return (
    <article className={`group relative lift overflow-hidden rounded-3xl border border-ink-100 bg-white p-6 shadow-card ${variant === 'highlight' ? 'border-gradient' : ''}`}>
      {/* Halo en hover */}
      <div className="pointer-events-none absolute inset-0 opacity-0 transition group-hover:opacity-100" style={{ background: 'radial-gradient(60% 60% at 100% 0%, rgba(207,37,53,0.08), transparent)' }} />

      <div className="relative flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-2xs font-black uppercase tracking-widest ${statusPill.classes}`}>{statusPill.label}</span>
            {item.morocco_eligible && <span className="chip-brand">🇲🇦 Maroc</span>}
            {item.verified && <span className="chip-success">✓ Vérifié</span>}
            {item.type && <span className="chip">{item.type}</span>}
          </div>

          {item.donors?.name && (
            <p className="mt-3 text-2xs font-black uppercase tracking-widest text-brand-700">{item.donors.name}</p>
          )}

          <h3 className="mt-1 font-display text-xl font-black leading-tight text-ink">
            <Link href={`/opportunities/${item.id}`} className="transition group-hover:text-brand-700">
              {item.title}
            </Link>
          </h3>

          {item.summary && (
            <p className="mt-3 text-sm leading-6 text-ink-500">{truncate(item.summary, 160)}</p>
          )}

          {item.opportunity_themes?.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {item.opportunity_themes.slice(0, 4).map((ot) => (
                <span key={ot.theme_id} className="chip">{ot.themes?.name_fr}</span>
              ))}
            </div>
          )}
        </div>

        {item.score != null && <ScoreRing value={item.score} size={80} stroke={8} />}
      </div>

      <div className="relative mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-ink-100 pt-4">
        <div className="flex flex-wrap items-center gap-4 text-xs text-ink-500">
          {item.deadline && (
            <span className="flex items-center gap-1.5"><span className="text-base">📅</span> {formatDate(item.deadline)}</span>
          )}
          {(item.amount_min || item.amount_max) && (
            <span className="flex items-center gap-1.5"><span className="text-base">💰</span> {formatAmount(item)}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {item.official_url && (
            <a href={item.official_url} target="_blank" rel="noopener noreferrer" className="text-2xs font-black uppercase tracking-widest text-ink-500 hover:text-brand-700">
              Source ↗
            </a>
          )}
          <Link href={`/opportunities/${item.id}`} className="btn-primary text-2xs uppercase tracking-widest">Détails →</Link>
        </div>
      </div>
    </article>
  );
}
