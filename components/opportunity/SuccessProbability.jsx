import { createClient } from '@/lib/supabase/server';
import { computeSuccessProbability } from '@/lib/probability';

/**
 * SuccessProbability — estimation honnête de la probabilité de réussite.
 *
 * MVP : heuristique basée sur match score + completeness + budget fit + donor
 * familiarity. Affiché avec un indicateur de confiance et la taille
 * d'échantillon de candidatures similaires (0 au début → "estimation
 * initiale", se calibre au fil du temps).
 *
 * Sera remplacé par un vrai modèle entraîné quand on aura suffisamment
 * d'outcomes (Sprint 3+ ou 4).
 */
export default async function SuccessProbability({ org, opp }) {
  if (!org || !opp) return null;
  if (!org.onboarding_completed) return null;

  const supabase = createClient();
  const result = await computeSuccessProbability(supabase, org, opp);
  const { probability, confidence, sampleSize, breakdown, weights, matchScoreAvailable } = result;

  // Static class maps — Tailwind JIT can't resolve template-string class names.
  const TIERS = {
    favorable: { label: 'Estimation favorable', bg: 'bg-emerald-50', text: 'text-emerald-700', ring: 'ring-emerald-200' },
    moderate:  { label: 'Estimation modérée',   bg: 'bg-amber-50',   text: 'text-amber-700',   ring: 'ring-amber-200' },
    cautious:  { label: 'Estimation prudente',  bg: 'bg-slate-100',  text: 'text-slate-700',   ring: 'ring-slate-200' },
  };
  const tier = probability >= 55 ? TIERS.favorable
             : probability >= 35 ? TIERS.moderate
             : TIERS.cautious;

  const confidenceCopy = {
    low: sampleSize === 0
      ? 'Aucune candidature similaire trackée — estimation initiale, à affiner avec le temps.'
      : `Basé sur ${sampleSize} candidature(s) similaire(s) — confiance limitée, l'estimation se précisera.`,
    medium: `Basé sur ${sampleSize} candidatures similaires — confiance modérée.`,
    high: `Basé sur ${sampleSize} candidatures similaires — bonne confiance.`,
  }[confidence];

  const factorRows = [
    { key: 'match', label: 'Compatibilité IA', value: breakdown.match, weight: weights.match },
    { key: 'completeness', label: 'Profil orga complet', value: breakdown.completeness, weight: weights.completeness },
    { key: 'budget_fit', label: 'Adéquation budgétaire', value: breakdown.budget_fit, weight: weights.budget_fit },
    { key: 'donor_familiarity', label: 'Antériorité bailleur', value: breakdown.donor_familiarity, weight: weights.donor_familiarity },
  ];

  return (
    <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start gap-4">
        <div className={`flex h-20 w-20 shrink-0 items-center justify-center rounded-full ${tier.bg} ring-4 ${tier.ring}`}>
          <div className="text-center">
            <div className={`font-display text-2xl font-black ${tier.text} leading-none`}>{probability}%</div>
            <div className="mt-0.5 text-2xs font-bold uppercase tracking-widest text-slate-400">prob.</div>
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Probabilité de réussite</p>
          <p className={`mt-1 font-display text-lg font-black ${tier.text}`}>{tier.label}</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">{confidenceCopy}</p>
        </div>
      </div>

      <div className="mt-5">
        <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Facteurs pris en compte</p>
        <ul className="mt-2 space-y-1.5">
          {factorRows.map((f) => (
            <li key={f.key} className="flex items-center gap-3 text-sm">
              <span className="flex-1 text-slate-700">{f.label}</span>
              <span className="inline-flex h-2 w-24 overflow-hidden rounded-full bg-slate-100">
                <span
                  className="h-full rounded-full bg-slate-700"
                  style={{ width: `${f.value}%` }}
                />
              </span>
              <span className="w-12 text-right text-xs font-bold tabular-nums text-slate-600">{f.value}%</span>
              <span className="w-10 text-right text-2xs text-slate-400">×{f.weight}%</span>
            </li>
          ))}
        </ul>
      </div>

      <p className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-2xs leading-4 text-slate-500">
        Estimation MVP basée sur des facteurs observables (matching, profil, budget, antériorité).
        Elle deviendra un vrai modèle prédictif au fur et à mesure des candidatures suivies sur la plateforme.
      </p>

      {!matchScoreAvailable && (
        <p className="mt-2 text-2xs italic text-slate-400">
          Match score IA indisponible — le matching vectoriel n'a pas encore été calculé pour cette opportunité.
        </p>
      )}
    </div>
  );
}
