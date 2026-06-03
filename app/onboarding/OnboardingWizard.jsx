'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { completeOnboarding } from './actions';

/**
 * Sprint 5D — Onboarding "delete-first" : 7 étapes / 655 lignes → 3 étapes.
 * On ne demande à l'inscription QUE ce qui pilote réellement le matching :
 *   1. Identité + résumé d'action (texte libre = signal sémantique principal)
 *   2. Thématiques ODD (obligatoire pour le scoring)
 *   3. Zone d'action (+ populations cibles, optionnel)
 * Tout le reste (budget, équipe, statut juridique, projets passés, secteurs DAC,
 * téléphone, site…) est désormais éditable plus tard dans /dashboard/profile,
 * pour ne pas bloquer l'activation du compte derrière un formulaire de 5 minutes.
 */

const STEPS = [
  { id: 1, eyebrow: 'Les bases', title: 'Votre organisation' },
  { id: 2, eyebrow: 'Vos objectifs', title: 'Sur quoi agissez-vous ?' },
  { id: 3, eyebrow: 'Le terrain', title: 'Où intervenez-vous ?' },
];

const REGIONS_MA = [
  'Tanger-Tétouan-Al Hoceïma', "L'Oriental", 'Fès-Meknès', 'Rabat-Salé-Kénitra',
  'Béni Mellal-Khénifra', 'Casablanca-Settat', 'Marrakech-Safi', 'Drâa-Tafilalet',
  'Souss-Massa', 'Guelmim-Oued Noun', 'Laâyoune-Sakia El Hamra', 'Dakhla-Oued Ed-Dahab',
];

export default function OnboardingWizard({ taxonomies, initial }) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState(null);

  const [data, setData] = useState({
    name: initial.name || '',
    org_type: 'association',
    city: '',
    region: '',
    action_summary: '',
    sdg_ids: [],
    population_slugs: [],
    geography_slugs: [],
  });

  const update = (key, value) => setData(prev => ({ ...prev, [key]: value }));
  const toggle = (key, value) => setData(prev => {
    const arr = prev[key] || [];
    return { ...prev, [key]: arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value] };
  });

  function next() {
    setError(null);
    if (step === 1) {
      if (!data.name.trim()) return setError("Le nom de l'organisation est requis.");
      if (data.action_summary.trim().length < 30) return setError("Décrivez votre action en quelques mots (au moins une phrase) — c'est ce qui alimente le matching.");
    }
    if (step === 2 && data.sdg_ids.length === 0) {
      return setError('Sélectionnez au moins un objectif pour que le matching fonctionne.');
    }
    setStep(s => Math.min(3, s + 1));
  }
  function back() { setError(null); setStep(s => Math.max(1, s - 1)); }

  function submit() {
    setError(null);
    if (data.geography_slugs.length === 0) return setError("Indiquez au moins une zone d'action.");
    startTransition(async () => {
      // description ← action_summary : un seul champ libre alimente à la fois
      // l'affichage profil et l'embedding sémantique.
      const res = await completeOnboarding({ ...data, description: data.action_summary });
      if (res?.error) setError(res.error);
      else { router.push('/dashboard?onboarded=1'); router.refresh(); }
    });
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-4xl flex-col px-6 py-12">
      {/* Progress */}
      <div className="mb-12">
        <div className="mb-3 flex items-center justify-between text-xs uppercase tracking-widest text-red-200">
          <span>Étape {step} / 3</span>
          <span>{Math.round((step / 3) * 100)}%</span>
        </div>
        <div className="flex gap-1.5">
          {STEPS.map(s => (
            <div key={s.id} className={`h-1 flex-1 rounded-full transition-all duration-500 ${
              s.id <= step ? 'bg-red-500 shadow-[0_0_12px_rgba(239,68,68,.5)]' : 'bg-white/10'
            }`} />
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1">
        <div className="mb-2 text-sm font-bold uppercase tracking-widest text-red-400">{STEPS[step - 1].eyebrow}</div>
        <h1 className="mb-10 text-4xl font-black tracking-tight md:text-5xl">{STEPS[step - 1].title}</h1>

        {step === 1 && (
          <div className="grid max-w-3xl gap-6 md:grid-cols-2">
            <Field label="Nom de l'organisation *">
              <input value={data.name} onChange={e => update('name', e.target.value)} placeholder="Ex. Association Avenir pour l'éducation" className={inputCls} />
            </Field>
            <Field label="Type d'organisation">
              <select value={data.org_type} onChange={e => update('org_type', e.target.value)} className={inputCls}>
                <option value="association">Association</option>
                <option value="ong">ONG</option>
                <option value="cooperative">Coopérative</option>
                <option value="fondation">Fondation</option>
                <option value="autre">Autre</option>
              </select>
            </Field>
            <Field label="Ville">
              <input value={data.city} onChange={e => update('city', e.target.value)} placeholder="Ex. Casablanca" className={inputCls} />
            </Field>
            <Field label="Région">
              <select value={data.region} onChange={e => update('region', e.target.value)} className={inputCls}>
                <option value="">— Sélectionner —</option>
                {REGIONS_MA.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </Field>
            <div className="md:col-span-2">
              <Field label="Que fait votre association ? * (2-3 phrases)">
                <textarea
                  value={data.action_summary}
                  onChange={e => update('action_summary', e.target.value)}
                  rows={4}
                  placeholder="Ex. Nous formons des femmes rurales à l'agriculture biologique et facilitons l'accès aux marchés via des coopératives. Notre approche combine renforcement de capacités, finance solidaire et plaidoyer."
                  className={inputCls}
                />
                <div className="mt-2 text-xs text-white/40">💡 C'est le champ le plus important : notre IA s'en sert pour vous matcher. Plus c'est concret, mieux c'est.</div>
              </Field>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="max-w-5xl">
            <p className="mb-8 text-white/70">Sélectionnez les <strong className="text-white">3 à 5 ODD</strong> les plus alignés avec votre mission.</p>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {taxonomies.sdg.map(s => {
                const active = data.sdg_ids.includes(s.id);
                return (
                  <button key={s.id} onClick={() => toggle('sdg_ids', s.id)}
                    className={`relative overflow-hidden rounded-2xl border p-4 text-left transition ${
                      active ? 'border-red-500 bg-red-500/10 shadow-[0_8px_32px_-12px_rgba(239,68,68,.6)]'
                             : 'border-white/10 bg-white/[0.02] hover:border-white/25 hover:bg-white/5'}`}>
                    <div className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full border transition"
                         style={{ background: active ? s.color_hex : 'transparent', borderColor: active ? s.color_hex : 'rgba(255,255,255,.2)' }}>
                      {active && <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path d="M5 13l4 4L19 7" /></svg>}
                    </div>
                    <div className="mb-2 text-xs font-bold uppercase tracking-wider" style={{ color: s.color_hex }}>{s.code}</div>
                    <div className="text-sm font-bold leading-tight text-white">{s.name_fr}</div>
                  </button>
                );
              })}
            </div>
            <div className="mt-6 text-sm text-white/50">
              {data.sdg_ids.length === 0 && '→ Sélectionnez au moins un objectif.'}
              {data.sdg_ids.length > 0 && data.sdg_ids.length < 3 && `→ ${3 - data.sdg_ids.length} de plus pour un matching optimal.`}
              {data.sdg_ids.length >= 3 && '✓ Profil thématique solide.'}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="max-w-5xl space-y-10">
            <div>
              <h3 className="mb-4 text-lg font-bold">🇲🇦 Régions du Maroc *</h3>
              <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                {taxonomies.geographies.filter(g => g.parent_slug === 'morocco').map(g => {
                  const active = data.geography_slugs.includes(g.slug);
                  return (
                    <button key={g.slug} onClick={() => toggle('geography_slugs', g.slug)}
                      className={`rounded-xl border px-3 py-2 text-left text-sm transition ${
                        active ? 'border-red-500 bg-red-500/10 text-white' : 'border-white/10 text-white/70 hover:border-white/25 hover:bg-white/5'}`}>
                      {g.name_fr}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <h3 className="mb-4 text-lg font-bold">🌍 Au-delà du Maroc</h3>
              <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                {taxonomies.geographies.filter(g => g.level === 'subregion' || g.level === 'continent' || g.level === 'global').map(g => {
                  const active = data.geography_slugs.includes(g.slug);
                  return (
                    <button key={g.slug} onClick={() => toggle('geography_slugs', g.slug)}
                      className={`rounded-xl border px-3 py-2 text-left text-sm transition ${
                        active ? 'border-red-500 bg-red-500/10 text-white' : 'border-white/10 text-white/70 hover:border-white/25 hover:bg-white/5'}`}>
                      {g.name_fr}
                    </button>
                  );
                })}
              </div>
            </div>
            {taxonomies.populations?.length > 0 && (
              <div>
                <h3 className="mb-1 text-lg font-bold">👥 Populations cibles <span className="text-sm font-normal text-white/40">(optionnel)</span></h3>
                <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-3">
                  {taxonomies.populations.map(p => {
                    const active = data.population_slugs.includes(p.slug);
                    return (
                      <button key={p.slug} onClick={() => toggle('population_slugs', p.slug)}
                        className={`rounded-xl border px-3 py-2 text-left text-sm transition ${
                          active ? 'border-red-500 bg-red-500/10 text-white' : 'border-white/10 text-white/70 hover:border-white/25 hover:bg-white/5'}`}>
                        {p.name_fr}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="mt-6 rounded-2xl border border-red-500/40 bg-red-500/10 px-5 py-3 text-sm text-red-100">{error}</div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-12 flex items-center justify-between">
        <button onClick={back} disabled={step === 1}
          className="rounded-full border border-white/15 px-6 py-3 text-sm font-bold uppercase tracking-widest transition hover:bg-white/5 disabled:opacity-30">
          ← Précédent
        </button>
        <div className="hidden text-xs text-white/40 sm:block">
          {step === 3 ? 'Dernière étape' : `Encore ${3 - step} étape${3 - step > 1 ? 's' : ''}`}
        </div>
        {step < 3 ? (
          <button onClick={next}
            className="rounded-full bg-gradient-to-r from-red-600 to-red-700 px-8 py-3 text-sm font-bold uppercase tracking-widest text-white shadow-[0_10px_40px_-10px_rgba(220,38,38,.6)] transition hover:from-red-500 hover:to-red-600">
            Continuer →
          </button>
        ) : (
          <button onClick={submit} disabled={pending}
            className="rounded-full bg-gradient-to-r from-red-600 to-red-700 px-8 py-3 text-sm font-bold uppercase tracking-widest text-white shadow-[0_10px_40px_-10px_rgba(220,38,38,.6)] transition hover:from-red-500 hover:to-red-600 disabled:opacity-50">
            {pending ? 'Sauvegarde…' : 'Activer mon matching ⚡'}
          </button>
        )}
      </div>

      <p className="mt-6 text-center text-xs text-white/30">
        Budget, équipe, projets passés… vous pourrez compléter votre profil plus tard depuis votre tableau de bord.
      </p>
    </div>
  );
}

/* helpers */
const inputCls =
  'w-full rounded-2xl border border-white/15 bg-white/[0.03] px-4 py-3 text-sm text-white placeholder-white/30 outline-none transition focus:border-red-500/60 focus:bg-white/[0.05]';

function Field({ label, children }) {
  return (
    <div>
      <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-white/60">{label}</label>
      {children}
    </div>
  );
}
