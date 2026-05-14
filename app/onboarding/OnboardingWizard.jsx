'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { completeOnboarding } from './actions';

const STEPS = [
  { id: 1, title: 'Bienvenue', subtitle: 'Construisons votre profil' },
  { id: 2, title: 'Votre organisation', subtitle: 'Les bases' },
  { id: 3, title: 'Structure & budget', subtitle: 'Capacité et taille' },
  { id: 4, title: 'Thématiques SDG', subtitle: 'Les objectifs ONU sur lesquels vous agissez' },
  { id: 5, title: 'Populations cibles', subtitle: 'Qui bénéficie de vos actions' },
  { id: 6, title: "Zone d'action", subtitle: 'Où intervenez-vous' },
  { id: 7, title: 'Projets passés', subtitle: 'Aidez l\'IA à comprendre votre track record' },
];

const REGIONS_MA = [
  'Tanger-Tétouan-Al Hoceïma', "L'Oriental", 'Fès-Meknès', 'Rabat-Salé-Kénitra',
  'Béni Mellal-Khénifra', 'Casablanca-Settat', 'Marrakech-Safi', 'Drâa-Tafilalet',
  'Souss-Massa', 'Guelmim-Oued Noun', 'Laâyoune-Sakia El Hamra', 'Dakhla-Oued Ed-Dahab'
];

const BUDGET_RANGES = [
  { v: '<50k', l: 'Moins de 50 000 MAD' },
  { v: '50k-200k', l: '50k – 200k MAD' },
  { v: '200k-500k', l: '200k – 500k MAD' },
  { v: '500k-1M', l: '500k – 1M MAD' },
  { v: '1M-5M', l: '1M – 5M MAD' },
  { v: '>5M', l: 'Plus de 5M MAD' },
];

const TEAM_SIZES = [
  { v: '1-5', l: '1 à 5 personnes' },
  { v: '6-20', l: '6 à 20 personnes' },
  { v: '21-50', l: '21 à 50 personnes' },
  { v: '51-200', l: '51 à 200 personnes' },
  { v: '200+', l: 'Plus de 200 personnes' },
];

export default function OnboardingWizard({ taxonomies, initial }) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState(null);

  const [data, setData] = useState({
    name: initial.name || '',
    org_type: 'association',
    legal_status: '',
    city: '',
    region: '',
    creation_year: '',
    website: '',
    phone: '',
    description: '',
    action_summary: '',
    intervention_themes_text: '',
    annual_budget_range: '',
    team_size: '',
    volunteers_count: '',
    members_count: '',
    target_amount_min: '',
    target_amount_max: '',
    work_languages: ['fr', 'ar'],
    preferred_language: 'fr',
    sdg_ids: [],
    dac_sector_ids: [],
    population_slugs: [],
    geography_slugs: [],
    past_projects: [],
    funding_history: [],
  });

  const update = (key, value) => setData(prev => ({ ...prev, [key]: value }));

  const toggle = (key, value) => {
    setData(prev => {
      const arr = prev[key] || [];
      return {
        ...prev,
        [key]: arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value],
      };
    });
  };

  function next() {
    setError(null);
    if (step === 2 && !data.name.trim()) {
      setError("Le nom de l'organisation est requis.");
      return;
    }
    if (step === 4 && data.sdg_ids.length === 0) {
      setError("Sélectionnez au moins un SDG pour que le matching fonctionne.");
      return;
    }
    if (step === 6 && data.geography_slugs.length === 0) {
      setError("Indiquez au moins une zone d'action.");
      return;
    }
    setStep(s => Math.min(7, s + 1));
  }
  function back() { setError(null); setStep(s => Math.max(1, s - 1)); }

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await completeOnboarding(data);
      if (res?.error) {
        setError(res.error);
      } else {
        router.push('/dashboard?onboarded=1');
        router.refresh();
      }
    });
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-5xl flex-col px-6 py-12">
      {/* Header progress */}
      <div className="mb-12">
        <div className="mb-3 flex items-center justify-between text-xs uppercase tracking-widest text-red-200">
          <span>Étape {step} / 7</span>
          <span>{Math.round((step / 7) * 100)}%</span>
        </div>
        <div className="flex gap-1.5">
          {STEPS.map(s => (
            <div key={s.id}
              className={`h-1 flex-1 rounded-full transition-all duration-500 ${
                s.id <= step ? 'bg-red-500 shadow-[0_0_12px_rgba(239,68,68,.5)]' : 'bg-white/10'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1">
        <div className="mb-2 text-sm font-bold uppercase tracking-widest text-red-400">
          {STEPS[step - 1].subtitle}
        </div>
        <h1 className="mb-10 text-4xl font-black tracking-tight md:text-6xl">
          {STEPS[step - 1].title}
        </h1>

        {step === 1 && <Step1 data={data} update={update} />}
        {step === 2 && <Step2 data={data} update={update} />}
        {step === 3 && <Step3 data={data} update={update} />}
        {step === 4 && <Step4 data={data} toggle={toggle} sdgs={taxonomies.sdg} />}
        {step === 5 && <Step5 data={data} toggle={toggle} populations={taxonomies.populations} />}
        {step === 6 && <Step6 data={data} toggle={toggle} geos={taxonomies.geographies} />}
        {step === 7 && <Step7 data={data} update={update} />}

        {error && (
          <div className="mt-6 rounded-2xl border border-red-500/40 bg-red-500/10 px-5 py-3 text-sm text-red-100">
            {error}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-12 flex items-center justify-between">
        <button
          onClick={back}
          disabled={step === 1}
          className="rounded-full border border-white/15 px-6 py-3 text-sm font-bold uppercase tracking-widest transition hover:bg-white/5 disabled:opacity-30"
        >
          ← Précédent
        </button>
        <div className="text-xs text-white/40">
          {step === 7 ? 'Dernière étape' : `Encore ${7 - step} étape${7 - step > 1 ? 's' : ''}`}
        </div>
        {step < 7 ? (
          <button
            onClick={next}
            className="rounded-full bg-gradient-to-r from-red-600 to-red-700 px-8 py-3 text-sm font-bold uppercase tracking-widest text-white shadow-[0_10px_40px_-10px_rgba(220,38,38,.6)] transition hover:from-red-500 hover:to-red-600"
          >
            Continuer →
          </button>
        ) : (
          <button
            onClick={submit}
            disabled={pending}
            className="rounded-full bg-gradient-to-r from-red-600 to-red-700 px-8 py-3 text-sm font-bold uppercase tracking-widest text-white shadow-[0_10px_40px_-10px_rgba(220,38,38,.6)] transition hover:from-red-500 hover:to-red-600 disabled:opacity-50"
          >
            {pending ? 'Sauvegarde…' : 'Activer mon matching ⚡'}
          </button>
        )}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   ÉCRANS
   ════════════════════════════════════════════════════════════ */

function Step1({ data, update }) {
  return (
    <div className="max-w-2xl space-y-6">
      <p className="text-lg leading-relaxed text-white/80">
        Funding Watch est plus qu'un catalogue d'opportunités —
        c'est un <strong className="text-red-400">moteur de matching intelligent</strong> qui
        analyse votre profil et vous propose uniquement les financements où vous avez de vraies chances.
      </p>
      <p className="text-base leading-relaxed text-white/60">
        Les 5 prochaines minutes vont structurer votre profil pour que notre IA puisse :
      </p>
      <ul className="space-y-2 text-sm text-white/70">
        <li className="flex gap-3"><span className="text-red-500">●</span> trouver les bailleurs qui financent des organisations comme la vôtre</li>
        <li className="flex gap-3"><span className="text-red-500">●</span> calculer un score de compatibilité réel pour chaque appel</li>
        <li className="flex gap-3"><span className="text-red-500">●</span> vous alerter en priorité sur les opportunités à fort potentiel</li>
        <li className="flex gap-3"><span className="text-red-500">●</span> apprendre de vos choix au fil du temps</li>
      </ul>
      <div className="mt-8 rounded-3xl border border-red-500/20 bg-gradient-to-br from-red-950/40 to-black/40 p-6">
        <div className="mb-2 text-xs uppercase tracking-widest text-red-400">Votre confidentialité</div>
        <p className="text-sm text-white/70">
          Les données de votre profil restent privées. Nous ne les partageons avec aucun bailleur sans
          votre autorisation explicite, et vous pouvez les modifier ou les supprimer à tout moment.
        </p>
      </div>
    </div>
  );
}

function Step2({ data, update }) {
  return (
    <div className="grid max-w-3xl gap-6 md:grid-cols-2">
      <Field label="Nom de l'organisation *" required>
        <input
          value={data.name}
          onChange={e => update('name', e.target.value)}
          placeholder="Ex. Association Avenir pour l'éducation"
          className={inputCls}
        />
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
      <Field label="Statut juridique">
        <input
          value={data.legal_status}
          onChange={e => update('legal_status', e.target.value)}
          placeholder="Ex. Association loi 1958, Reconnue d'utilité publique"
          className={inputCls}
        />
      </Field>
      <Field label="Année de création">
        <input
          type="number" min="1900" max={new Date().getFullYear()}
          value={data.creation_year}
          onChange={e => update('creation_year', e.target.value)}
          placeholder="Ex. 2015"
          className={inputCls}
        />
      </Field>
      <Field label="Ville">
        <input
          value={data.city}
          onChange={e => update('city', e.target.value)}
          placeholder="Ex. Casablanca"
          className={inputCls}
        />
      </Field>
      <Field label="Région">
        <select value={data.region} onChange={e => update('region', e.target.value)} className={inputCls}>
          <option value="">— Sélectionner —</option>
          {REGIONS_MA.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
      </Field>
      <Field label="Site web">
        <input
          type="url"
          value={data.website}
          onChange={e => update('website', e.target.value)}
          placeholder="https://"
          className={inputCls}
        />
      </Field>
      <Field label="Téléphone">
        <input
          value={data.phone}
          onChange={e => update('phone', e.target.value)}
          placeholder="+212 ..."
          className={inputCls}
        />
      </Field>
      <div className="md:col-span-2">
        <Field label="Description de l'organisation (3-5 phrases)">
          <textarea
            value={data.description}
            onChange={e => update('description', e.target.value)}
            placeholder="Notre association œuvre depuis 2015 pour..."
            rows={4}
            className={inputCls}
          />
        </Field>
      </div>
      <div className="md:col-span-2">
        <Field label="Résumé de votre action (en 2 phrases — utilisé par l'IA pour le matching)">
          <textarea
            value={data.action_summary}
            onChange={e => update('action_summary', e.target.value)}
            placeholder="Ex. Nous formons des femmes rurales à l'agriculture biologique et facilitons l'accès aux marchés via des coopératives. Notre approche combine renforcement de capacités, finance solidaire et plaidoyer politique."
            rows={3}
            className={inputCls}
          />
          <div className="mt-2 text-xs text-white/40">
            💡 Plus c'est concret, mieux notre IA comprendra votre positionnement.
          </div>
        </Field>
      </div>
    </div>
  );
}

function Step3({ data, update }) {
  return (
    <div className="max-w-3xl space-y-8">
      <Field label="Budget annuel de l'organisation">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {BUDGET_RANGES.map(b => (
            <button
              key={b.v}
              onClick={() => update('annual_budget_range', b.v)}
              className={`rounded-2xl border px-4 py-3 text-sm font-medium transition ${
                data.annual_budget_range === b.v
                  ? 'border-red-500 bg-red-500/10 text-white'
                  : 'border-white/15 text-white/70 hover:border-white/30 hover:bg-white/5'
              }`}
            >
              {b.l}
            </button>
          ))}
        </div>
      </Field>

      <Field label="Taille de l'équipe permanente (salariés)">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          {TEAM_SIZES.map(t => (
            <button
              key={t.v}
              onClick={() => update('team_size', t.v)}
              className={`rounded-2xl border px-4 py-3 text-sm font-medium transition ${
                data.team_size === t.v
                  ? 'border-red-500 bg-red-500/10 text-white'
                  : 'border-white/15 text-white/70 hover:border-white/30 hover:bg-white/5'
              }`}
            >
              {t.l}
            </button>
          ))}
        </div>
      </Field>

      <div className="grid grid-cols-2 gap-6">
        <Field label="Bénévoles actifs">
          <input
            type="number" min="0"
            value={data.volunteers_count}
            onChange={e => update('volunteers_count', e.target.value)}
            placeholder="0"
            className={inputCls}
          />
        </Field>
        <Field label="Adhérents / membres">
          <input
            type="number" min="0"
            value={data.members_count}
            onChange={e => update('members_count', e.target.value)}
            placeholder="0"
            className={inputCls}
          />
        </Field>
      </div>

      <Field label="Montants de subvention recherchés (optionnel)">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-xs text-white/50">Min (EUR)</label>
            <input
              type="number"
              value={data.target_amount_min}
              onChange={e => update('target_amount_min', e.target.value)}
              placeholder="5000"
              className={inputCls}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-white/50">Max (EUR)</label>
            <input
              type="number"
              value={data.target_amount_max}
              onChange={e => update('target_amount_max', e.target.value)}
              placeholder="100000"
              className={inputCls}
            />
          </div>
        </div>
      </Field>
    </div>
  );
}

function Step4({ data, toggle, sdgs }) {
  return (
    <div className="max-w-5xl">
      <p className="mb-8 text-white/70">
        Sélectionnez les <strong className="text-white">3 à 5 ODD</strong> les plus alignés avec votre mission.
        L'IA pondère ces objectifs pour calculer la pertinence des opportunités.
      </p>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {sdgs.map(s => {
          const active = data.sdg_ids.includes(s.id);
          return (
            <button
              key={s.id}
              onClick={() => toggle('sdg_ids', s.id)}
              className={`group relative overflow-hidden rounded-2xl border p-4 text-left transition ${
                active
                  ? 'border-red-500 bg-red-500/10 shadow-[0_8px_32px_-12px_rgba(239,68,68,.6)]'
                  : 'border-white/10 bg-white/[0.02] hover:border-white/25 hover:bg-white/5'
              }`}
            >
              <div className="absolute right-3 top-3 h-6 w-6 rounded-full flex items-center justify-center border transition"
                   style={{ background: active ? s.color_hex : 'transparent', borderColor: active ? s.color_hex : 'rgba(255,255,255,.2)' }}>
                {active && <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path d="M5 13l4 4L19 7"/></svg>}
              </div>
              <div className="mb-2 text-xs font-bold uppercase tracking-wider" style={{ color: s.color_hex }}>
                {s.code}
              </div>
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
  );
}

function Step5({ data, toggle, populations }) {
  return (
    <div className="max-w-4xl">
      <p className="mb-8 text-white/70">
        Quelles populations sont au cœur de vos actions ? Sélectionnez toutes celles qui s'appliquent.
      </p>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {populations.map(p => {
          const active = data.population_slugs.includes(p.slug);
          return (
            <button
              key={p.slug}
              onClick={() => toggle('population_slugs', p.slug)}
              className={`flex items-start gap-3 rounded-2xl border p-4 text-left transition ${
                active
                  ? 'border-red-500 bg-red-500/10'
                  : 'border-white/10 bg-white/[0.02] hover:border-white/25 hover:bg-white/5'
              }`}
            >
              <div className={`mt-0.5 h-5 w-5 shrink-0 rounded border-2 transition ${
                active ? 'border-red-500 bg-red-500' : 'border-white/30'
              }`}>
                {active && (
                  <svg className="h-full w-full p-0.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                    <path d="M5 13l4 4L19 7"/>
                  </svg>
                )}
              </div>
              <div className="flex-1">
                <div className="text-sm font-bold text-white">{p.name_fr}</div>
                {p.description && (
                  <div className="mt-0.5 text-xs text-white/50">{p.description}</div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Step6({ data, toggle, geos }) {
  const regions = geos.filter(g => g.parent_slug === 'morocco');
  const subregions = geos.filter(g => g.level === 'subregion' || g.level === 'continent' || g.level === 'global');

  return (
    <div className="max-w-5xl space-y-10">
      <div>
        <h3 className="mb-4 text-lg font-bold">🇲🇦 Régions du Maroc</h3>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {regions.map(g => {
            const active = data.geography_slugs.includes(g.slug);
            return (
              <button
                key={g.slug}
                onClick={() => toggle('geography_slugs', g.slug)}
                className={`rounded-xl border px-3 py-2 text-left text-sm transition ${
                  active
                    ? 'border-red-500 bg-red-500/10 text-white'
                    : 'border-white/10 text-white/70 hover:border-white/25 hover:bg-white/5'
                }`}
              >
                {g.name_fr}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <h3 className="mb-4 text-lg font-bold">🌍 Au-delà du Maroc</h3>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {subregions.map(g => {
            const active = data.geography_slugs.includes(g.slug);
            return (
              <button
                key={g.slug}
                onClick={() => toggle('geography_slugs', g.slug)}
                className={`rounded-xl border px-3 py-2 text-left text-sm transition ${
                  active
                    ? 'border-red-500 bg-red-500/10 text-white'
                    : 'border-white/10 text-white/70 hover:border-white/25 hover:bg-white/5'
                }`}
              >
                {g.name_fr}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Step7({ data, update }) {
  const addProject = () => {
    update('past_projects', [
      ...data.past_projects,
      { title: '', donor: '', amount: '', year: '', summary: '' },
    ]);
  };
  const updateProject = (idx, key, value) => {
    const arr = [...data.past_projects];
    arr[idx] = { ...arr[idx], [key]: value };
    update('past_projects', arr);
  };
  const removeProject = (idx) => {
    update('past_projects', data.past_projects.filter((_, i) => i !== idx));
  };

  return (
    <div className="max-w-3xl space-y-8">
      <p className="text-white/70">
        Décrivez vos 1 à 3 projets les plus représentatifs. Notre IA s'en sert pour
        détecter les opportunités <strong className="text-white">qui ressemblent à ce que vous avez déjà mené</strong>.
      </p>

      <Field label="Thématiques d'intervention (texte libre)">
        <textarea
          value={data.intervention_themes_text}
          onChange={e => update('intervention_themes_text', e.target.value)}
          rows={4}
          placeholder="Ex. Nous travaillons sur l'agroécologie, la souveraineté alimentaire et l'autonomisation économique des femmes en milieu rural, avec un focus sur le développement de coopératives féminines productrices d'huile d'argan dans la région de Souss-Massa."
          className={inputCls}
        />
        <div className="mt-2 text-xs text-white/40">
          💡 Plus c'est précis et concret, plus le matching sera fin (les keywords trop génériques comme "social" affaiblissent le signal).
        </div>
      </Field>

      <div>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold">Projets passés (optionnel mais recommandé)</h3>
          <button
            onClick={addProject}
            className="rounded-full border border-white/15 px-4 py-2 text-xs font-bold uppercase tracking-widest hover:bg-white/5"
          >
            + Ajouter
          </button>
        </div>
        {data.past_projects.length === 0 && (
          <div className="rounded-2xl border border-dashed border-white/15 p-8 text-center text-sm text-white/40">
            Aucun projet ajouté. Cliquez sur "Ajouter" pour décrire un projet emblématique.
          </div>
        )}
        <div className="space-y-4">
          {data.past_projects.map((p, idx) => (
            <div key={idx} className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
              <div className="mb-3 flex items-center justify-between">
                <div className="text-xs uppercase tracking-widest text-red-400">Projet #{idx + 1}</div>
                <button onClick={() => removeProject(idx)} className="text-xs text-white/40 hover:text-red-400">Supprimer</button>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <input
                  value={p.title} onChange={e => updateProject(idx, 'title', e.target.value)}
                  placeholder="Titre du projet" className={inputCls}
                />
                <input
                  value={p.donor} onChange={e => updateProject(idx, 'donor', e.target.value)}
                  placeholder="Bailleur (ex. UE NDICI, AFD, USAID)" className={inputCls}
                />
                <input
                  type="number" value={p.amount} onChange={e => updateProject(idx, 'amount', e.target.value)}
                  placeholder="Montant (EUR)" className={inputCls}
                />
                <input
                  type="number" value={p.year} onChange={e => updateProject(idx, 'year', e.target.value)}
                  placeholder="Année (ex. 2023)" min="2000" max={new Date().getFullYear()} className={inputCls}
                />
              </div>
              <textarea
                value={p.summary} onChange={e => updateProject(idx, 'summary', e.target.value)}
                placeholder="Résumé en 1-2 phrases : objectifs, bénéficiaires, résultats."
                rows={2} className={`${inputCls} mt-3`}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-3xl border border-red-500/20 bg-gradient-to-br from-red-950/30 to-black/40 p-6">
        <div className="mb-2 text-xs uppercase tracking-widest text-red-400">⚡ Prêt pour le matching</div>
        <p className="text-sm text-white/70">
          En cliquant sur <strong className="text-white">"Activer mon matching"</strong>, votre profil sera
          analysé et indexé sémantiquement. Les premières opportunités matchées apparaîtront dans votre
          dashboard dans les secondes qui suivent.
        </p>
      </div>
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
