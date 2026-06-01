import { createClient } from '@/lib/supabase/server';
import ExpertContactModal from './ExpertContactModal';

const HELP_LABELS = {
  redaction: '✍️ Rédaction',
  budget: '💰 Budget',
  legal: '⚖️ Juridique',
  consultance: '🎯 Consultance',
  formation: '🎓 Formation',
  strategy: '🧭 Stratégie',
  evaluation: '📊 Évaluation',
};

const LANG_FLAGS = { fr: '🇫🇷', ar: '🇲🇦', en: '🇬🇧', es: '🇪🇸' };

const COUNTRY_FLAGS = { MA: '🇲🇦', FR: '🇫🇷', CH: '🇨🇭', BE: '🇧🇪', TN: '🇹🇳', DZ: '🇩🇿', EU: '🇪🇺' };

/**
 * Sprint 4Q — Section "Experts qui peuvent t'aider" sur la page opp.
 *
 * Matching simple côté JS (overlap thématiques + langue). On préfère
 * la précision à la complexité ici : 3-5 résultats max, pas de RPC.
 *
 * Tri : (1) status='active' d'abord, (2) overlap thématiques desc,
 *       (3) match langue, (4) display_order, (5) years_experience desc.
 *
 * Placeholders (status='placeholder') affichés en bout de liste avec
 * badge "EXEMPLE — bêta" et bouton de contact désactivé. Disparaissent
 * dès qu'on a ≥3 experts 'active' qui matchent.
 */
export default async function ExpertsForOpp({ opp }) {
  if (!opp?.id) return null;
  const supabase = createClient();

  // 1. Thématiques de l'opportunité
  const oppThemeSlugs = (opp.opportunity_themes || [])
    .map((t) => t.themes?.slug)
    .filter(Boolean);
  const oppLang = (opp.language || 'fr').toLowerCase().split(/[,\s]+/).filter(Boolean);

  // 2. Récupère TOUS les experts visibles, on score côté JS
  const { data: experts, error } = await supabase
    .from('experts')
    .select('*')
    .in('status', ['active', 'placeholder'])
    .order('display_order', { ascending: true });

  if (error || !experts || experts.length === 0) {
    // Pas d'experts en base = migration v26 pas appliquée. Empty state discret.
    return (
      <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-6">
        <p className="eyebrow">💼 Experts qui peuvent t'aider</p>
        <p className="mt-2 text-sm text-slate-500">
          La marketplace d'experts est en cours de constitution. Reviens bientôt — ou si tu veux faire partie des premiers experts référencés, contacte-nous.
        </p>
      </div>
    );
  }

  // 3. Score chaque expert
  const scored = experts.map((e) => {
    const themeOverlap = (e.specialty_slugs || []).filter((s) => oppThemeSlugs.includes(s)).length;
    const langMatch = (e.languages || []).some((l) => oppLang.includes(l)) ? 1 : 0;
    const statusBonus = e.status === 'active' ? 100 : 0; // les vrais toujours d'abord
    const score = statusBonus + themeOverlap * 10 + langMatch * 5;
    return { ...e, _score: score, _themeOverlap: themeOverlap };
  });

  // 4. Filtre : si overlap thématique = 0 ET status=placeholder, on peut le garder
  // pour montrer la feature, mais on évite les profils complètement hors-sujet
  const activeMatches = scored.filter((e) => e.status === 'active' && e._themeOverlap > 0)
    .sort((a, b) => b._score - a._score);
  const placeholderMatches = scored.filter((e) => e.status === 'placeholder')
    .sort((a, b) => b._score - a._score);

  // 5. Stratégie d'affichage :
  //   - Si on a ≥3 vrais experts qui matchent → on n'affiche QUE des vrais (max 5)
  //   - Sinon → vrais d'abord + complétion placeholders jusqu'à 4 max
  const display = activeMatches.length >= 3
    ? activeMatches.slice(0, 5)
    : [...activeMatches, ...placeholderMatches.slice(0, Math.max(0, 4 - activeMatches.length))];

  if (display.length === 0) {
    return null; // pas une seule reco — on cache la section plutôt qu'un empty state laid
  }

  const hasPlaceholders = display.some((e) => e.status === 'placeholder');

  return (
    <div className="rounded-3xl border border-indigo-200/40 bg-gradient-to-br from-indigo-50/40 to-white p-6">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="eyebrow text-indigo-700">💼 Experts qui peuvent t'aider</p>
          <h3 className="mt-1 font-display text-xl font-black text-slate-950">
            {display.length} expert{display.length > 1 ? 's' : ''} dispo pour cet appel
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            Matching sur ta thématique + langue. Tu peux les contacter directement, on transmet ton message + le contexte de l'opp.
          </p>
        </div>
      </div>

      <ul className="grid gap-3 md:grid-cols-2">
        {display.map((e) => {
          const isPlaceholder = e.status === 'placeholder';
          const rate = (e.hourly_rate_min || e.hourly_rate_max)
            ? `${e.hourly_rate_min || ''}${e.hourly_rate_max ? '-' + e.hourly_rate_max : ''} ${e.currency || 'EUR'}/h`
            : null;
          const flag = COUNTRY_FLAGS[e.country] || '';
          return (
            <li
              key={e.id}
              className={`relative rounded-2xl border bg-white p-4 transition ${
                isPlaceholder
                  ? 'border-slate-200 bg-slate-50/40'
                  : 'border-indigo-200 hover:border-indigo-300 hover:shadow-md'
              }`}
            >
              {isPlaceholder && (
                <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-amber-700" title="Profil exemple — bêta. Remplacé par un vrai expert avant lancement public.">
                  Exemple
                </span>
              )}

              <div className="flex items-start gap-3">
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl font-display text-lg font-black ${
                  isPlaceholder ? 'bg-slate-200 text-slate-500' : 'bg-indigo-100 text-indigo-700'
                }`}>
                  {e.name.split(' ').map((w) => w[0]).join('').slice(0, 2)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`font-display text-base font-black ${isPlaceholder ? 'text-slate-700' : 'text-slate-950'}`}>{e.name}</p>
                  <p className="text-xs text-slate-500">{e.title}</p>
                  <p className="mt-0.5 text-2xs text-slate-400">
                    {flag} {e.city || e.country || '—'}
                    {e.years_experience ? ` · ${e.years_experience} ans d'exp.` : ''}
                    {' · '}
                    {(e.languages || []).map((l) => LANG_FLAGS[l] || l).join(' ')}
                  </p>
                </div>
              </div>

              {e.bio_short && (
                <p className="mt-3 text-xs leading-5 text-slate-600 line-clamp-3">{e.bio_short}</p>
              )}

              <div className="mt-3 flex flex-wrap gap-1.5">
                {(e.help_kinds || []).slice(0, 4).map((k) => (
                  <span key={k} className="rounded-full bg-slate-100 px-2 py-0.5 text-2xs font-bold text-slate-700">
                    {HELP_LABELS[k] || k}
                  </span>
                ))}
              </div>

              <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
                <p className="text-2xs font-bold text-slate-500">
                  {e.pro_bono ? <span className="text-emerald-700">✓ Pro bono (sous conditions)</span> : rate || 'Tarif sur demande'}
                </p>
                <ExpertContactModal expert={e} oppId={opp.id} disabled={isPlaceholder} />
              </div>
            </li>
          );
        })}
      </ul>

      {hasPlaceholders && (
        <p className="mt-4 rounded-2xl border border-amber-100 bg-amber-50/40 px-3 py-2 text-2xs leading-4 text-amber-700">
          ⚠️ Les profils marqués <b>EXEMPLE</b> illustrent la feature pendant la bêta. Les vrais experts sont en cours de recrutement — tu veux en faire partie ? Écris-nous.
        </p>
      )}
    </div>
  );
}
