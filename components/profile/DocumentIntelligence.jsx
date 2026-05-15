'use client';
import { useState } from 'react';

const FIELD_LABELS = {
  action_summary: "Résumé d'action",
  intervention_themes_text: 'Thématiques (texte libre)',
  mission_long: 'Mission (long)',
  geographic_scope: "Périmètre géographique",
  city: 'Ville',
  region: 'Région',
  creation_year: 'Année de création',
};

/**
 * DocumentIntelligence — paste de texte → extraction structurée Claude →
 * revue par l'utilisateur → application au profil organisation.
 *
 * Volontairement MVP sans Storage : pas d'upload PDF. L'utilisateur colle
 * son rapport d'activité ou copie son site web. Sprint suivant : ingestion
 * PDF via Supabase Storage + pdf-parse côté server.
 */
export default function DocumentIntelligence({ current = {}, applyAction }) {
  const [text, setText] = useState('');
  const [state, setState] = useState('idle'); // idle | extracting | extracted | error | applying | applied
  const [error, setError] = useState(null);
  const [extracted, setExtracted] = useState(null);
  const [accepted, setAccepted] = useState({}); // { field: boolean }

  async function onExtract() {
    setState('extracting');
    setError(null);
    try {
      const res = await fetch('/api/ai/extract-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = json.error === 'no_api_key' ? "L'IA n'est pas configurée côté serveur."
          : json.error === 'no_credit' ? "Le crédit Anthropic est épuisé. Rechargez sur console.anthropic.com pour relancer l'analyse."
          : json.error === 'too_short' ? "Le texte est trop court (60 caractères minimum)."
          : json.error === 'empty_input' ? "Aucun texte fourni."
          : "Échec de l'analyse. Réessaie dans un instant.";
        throw new Error(msg);
      }
      setExtracted(json.data || {});
      // Default: accept all fields where the IA returned something different from current
      const init = {};
      for (const k of Object.keys(json.data || {})) {
        const cur = current?.[k];
        const sug = json.data[k];
        if (sug && JSON.stringify(sug) !== JSON.stringify(cur)) init[k] = true;
      }
      setAccepted(init);
      setState('extracted');
    } catch (e) {
      setError(e.message);
      setState('error');
    }
  }

  async function onApply() {
    setState('applying');
    const payload = {};
    for (const k of Object.keys(accepted)) {
      if (accepted[k]) payload[k] = extracted[k];
    }
    const fd = new FormData();
    fd.append('payload', JSON.stringify(payload));
    try {
      await applyAction(fd);
      setState('applied');
    } catch (e) {
      setError(e?.message || "Échec de l'application.");
      setState('error');
    }
  }

  function toggle(field) {
    setAccepted((a) => ({ ...a, [field]: !a[field] }));
  }

  function renderValue(v) {
    if (Array.isArray(v)) {
      return (
        <ul className="mt-1 list-disc pl-4 text-xs text-slate-600">
          {v.slice(0, 3).map((it, i) => (
            <li key={i}>
              {typeof it === 'string' ? it : `${it.title || ''} (${it.year || '?'})${it.donor ? ' · ' + it.donor : ''}`}
            </li>
          ))}
        </ul>
      );
    }
    if (typeof v === 'object' && v !== null) return <code className="text-2xs">{JSON.stringify(v).slice(0, 80)}</code>;
    return <p className="mt-1 text-sm text-slate-700">{String(v || '—')}</p>;
  }

  const suggestionFields = extracted ? Object.keys(extracted).filter(k => k !== 'past_projects' && k !== 'suggested_themes') : [];
  const hasPastProjects = extracted?.past_projects?.length > 0;
  const hasSuggestedThemes = extracted?.suggested_themes?.length > 0;

  return (
    <div>
      <div className="flex items-start gap-2">
        <span className="text-lg">🪄</span>
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Assistant IA</p>
          <p className="mt-0.5 text-sm font-bold text-ink">Auto-compléter mon profil depuis un document</p>
        </div>
      </div>
      <p className="mt-2 text-xs leading-5 text-slate-500">
        Colle ici le contenu de ton <b>rapport d'activité</b>, de tes <b>statuts</b>, de la page "À propos" de ton site,
        ou tout document décrivant ton organisation. L'IA extrait les champs structurés que tu peux ensuite valider un par un.
      </p>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={6}
        placeholder="Colle ici le texte (rapport d'activité, présentation, statuts...)"
        className="mt-3 w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm leading-6 focus:border-primary focus:outline-none"
        disabled={state === 'extracting' || state === 'applying'}
      />

      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onExtract}
          disabled={!text.trim() || state === 'extracting' || state === 'applying'}
          className="btn-primary text-2xs uppercase tracking-widest disabled:opacity-50"
        >
          {state === 'extracting' ? 'Analyse en cours…' : '✨ Analyser le document'}
        </button>
        <span className="text-2xs text-slate-400">{text.length} caractère(s)</span>
      </div>

      {state === 'error' && error && (
        <p className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">{error}</p>
      )}

      {state === 'applied' && (
        <p className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">
          ✓ Profil mis à jour. Recharge la page pour voir les nouvelles valeurs.
        </p>
      )}

      {extracted && (state === 'extracted' || state === 'applying' || state === 'applied') && (
        <div className="mt-5">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
            Suggestions IA — coche celles à appliquer
          </p>

          <ul className="mt-3 space-y-2">
            {suggestionFields.map((field) => {
              const cur = current?.[field];
              const sug = extracted[field];
              return (
                <li key={field} className="rounded-2xl border border-slate-200 p-3">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!accepted[field]}
                      onChange={() => toggle(field)}
                      className="mt-1 h-4 w-4"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-700">{FIELD_LABELS[field] || field}</p>
                      <div className="mt-1 grid gap-2 sm:grid-cols-2">
                        <div className="text-2xs text-slate-400">
                          Actuel :
                          {renderValue(cur)}
                        </div>
                        <div className="text-2xs text-emerald-600">
                          Suggestion IA :
                          {renderValue(sug)}
                        </div>
                      </div>
                    </div>
                  </label>
                </li>
              );
            })}

            {hasPastProjects && (
              <li className="rounded-2xl border border-slate-200 p-3">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!accepted.past_projects}
                    onChange={() => toggle('past_projects')}
                    className="mt-1 h-4 w-4"
                  />
                  <div>
                    <p className="text-xs font-bold text-slate-700">Projets passés détectés ({extracted.past_projects.length})</p>
                    {renderValue(extracted.past_projects)}
                  </div>
                </label>
              </li>
            )}

            {hasSuggestedThemes && (
              <li className="rounded-2xl border border-slate-200 p-3">
                <p className="text-xs font-bold text-slate-700">Thématiques suggérées (à ajouter manuellement dans /dashboard/preferences)</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {extracted.suggested_themes.map((t) => (
                    <span key={t} className="rounded-full bg-slate-100 px-2.5 py-1 text-2xs font-bold text-slate-700">{t}</span>
                  ))}
                </div>
              </li>
            )}
          </ul>

          <button
            type="button"
            onClick={onApply}
            disabled={state === 'applying' || !Object.values(accepted).some(Boolean)}
            className="btn-primary mt-4 text-2xs uppercase tracking-widest disabled:opacity-50"
          >
            {state === 'applying' ? 'Application…' : 'Appliquer les suggestions cochées'}
          </button>
        </div>
      )}
    </div>
  );
}
