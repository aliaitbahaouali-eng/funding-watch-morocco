'use client';
import { useRef, useState } from 'react';

const FIELD_LABELS = {
  action_summary: "Résumé d'action",
  intervention_themes_text: 'Thématiques (texte libre)',
  mission_long: 'Mission (long)',
  geographic_scope: "Périmètre géographique",
  city: 'Ville',
  region: 'Région',
  creation_year: 'Année de création',
};

const MAX_FILE_MB = 8;
const ACCEPT = '.pdf,.txt,.md,application/pdf,text/plain,text/markdown';

/**
 * DocumentIntelligence — Sprint 4G.
 *
 * Deux entrées qui convergent vers la même review UI :
 *   1. Upload PDF / TXT / MD → POST /api/ai/extract-document
 *      (extraction unpdf côté serveur + Claude).
 *   2. Paste texte brut → POST /api/ai/extract-profile.
 *
 * Pas de Storage persistant : le fichier upload est parsé en mémoire,
 * jamais écrit. RGPD-friendly par défaut.
 */
export default function DocumentIntelligence({ current = {}, applyAction }) {
  const fileInputRef = useRef(null);
  const [mode, setMode] = useState('upload'); // upload | paste
  const [text, setText] = useState('');
  const [fileMeta, setFileMeta] = useState(null); // { name, sizeKb, charCount, pageCount }
  const [state, setState] = useState('idle'); // idle | extracting | extracted | error | applying | applied
  const [error, setError] = useState(null);
  const [extracted, setExtracted] = useState(null);
  const [accepted, setAccepted] = useState({});
  const [dragOver, setDragOver] = useState(false);

  function resetReview() {
    setExtracted(null);
    setAccepted({});
    setError(null);
    setState('idle');
  }

  function describeError(json, fallback) {
    const map = {
      no_api_key: "L'IA n'est pas configurée côté serveur.",
      no_credit: "Le crédit Anthropic est épuisé. Rechargez sur console.anthropic.com pour relancer l'analyse.",
      too_short: "Le texte extrait est trop court (60 caractères minimum). Si c'est un PDF scanné, l'OCR n'est pas encore supporté.",
      empty_input: "Aucun texte fourni.",
      file_too_large: `Fichier trop volumineux (limite ${MAX_FILE_MB} Mo).`,
      unsupported_mime: "Format non supporté. PDF, TXT ou Markdown uniquement.",
      parse_failed: "Impossible de lire le contenu du fichier. Tu peux essayer en collant le texte à la main.",
      missing_file: "Aucun fichier sélectionné.",
      invalid_form: "Requête invalide.",
    };
    return map[json?.error] || fallback || "Échec de l'analyse. Réessaie dans un instant.";
  }

  function onAcceptDefaults(data) {
    const init = {};
    for (const k of Object.keys(data || {})) {
      const cur = current?.[k];
      const sug = data[k];
      if (sug && JSON.stringify(sug) !== JSON.stringify(cur)) init[k] = true;
    }
    setAccepted(init);
  }

  async function onUpload(file) {
    if (!file) return;
    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      setError(`Fichier trop volumineux (limite ${MAX_FILE_MB} Mo).`);
      setState('error');
      return;
    }
    setState('extracting');
    setError(null);
    setExtracted(null);
    setFileMeta({ name: file.name, sizeKb: Math.round(file.size / 1024), charCount: 0, pageCount: 0 });
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/ai/extract-document', { method: 'POST', body: fd });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(describeError(json));
      setExtracted(json.data || {});
      setFileMeta((m) => ({ ...(m || {}), charCount: json.charCount || 0, pageCount: json.pageCount || 0 }));
      onAcceptDefaults(json.data || {});
      setState('extracted');
    } catch (e) {
      setError(e.message);
      setState('error');
    }
  }

  async function onExtractText() {
    setState('extracting');
    setError(null);
    setExtracted(null);
    setFileMeta(null);
    try {
      const res = await fetch('/api/ai/extract-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(describeError(json));
      setExtracted(json.data || {});
      onAcceptDefaults(json.data || {});
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

  function onDrop(e) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) onUpload(file);
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

  const suggestionFields = extracted ? Object.keys(extracted).filter((k) => k !== 'past_projects' && k !== 'suggested_themes') : [];
  const hasPastProjects = extracted?.past_projects?.length > 0;
  const hasSuggestedThemes = extracted?.suggested_themes?.length > 0;
  const busy = state === 'extracting' || state === 'applying';

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
        Importe un <b>PDF</b> (rapport d'activité, statuts, brochure) ou colle directement le texte. L'IA extrait les champs
        structurés que tu peux valider un par un avant d'écrire sur ton profil.
      </p>

      {/* Switch mode */}
      <div className="mt-4 inline-flex rounded-full border border-slate-200 bg-slate-50 p-1 text-2xs font-bold uppercase tracking-widest">
        <button
          type="button"
          onClick={() => { setMode('upload'); resetReview(); }}
          className={`rounded-full px-3 py-1 ${mode === 'upload' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          📄 Fichier (PDF / TXT)
        </button>
        <button
          type="button"
          onClick={() => { setMode('paste'); resetReview(); }}
          className={`rounded-full px-3 py-1 ${mode === 'paste' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          📋 Coller du texte
        </button>
      </div>

      {/* Mode upload */}
      {mode === 'upload' && (
        <div className="mt-3">
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center transition ${
              dragOver ? 'border-brand-500 bg-brand-50' : 'border-slate-200 bg-slate-50 hover:border-slate-300'
            } ${busy ? 'pointer-events-none opacity-60' : ''}`}
          >
            <span className="text-3xl">📄</span>
            <p className="mt-2 text-sm font-bold text-slate-700">Dépose un fichier ici ou clique pour parcourir</p>
            <p className="mt-1 text-2xs text-slate-400">
              PDF, TXT ou Markdown · max {MAX_FILE_MB} Mo · jamais stocké côté serveur
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPT}
              className="hidden"
              onChange={(e) => onUpload(e.target.files?.[0])}
              disabled={busy}
            />
          </div>
          {fileMeta && (
            <p className="mt-2 text-2xs text-slate-500">
              <b>{fileMeta.name}</b> · {fileMeta.sizeKb} Ko
              {fileMeta.pageCount > 0 && ` · ${fileMeta.pageCount} page${fileMeta.pageCount > 1 ? 's' : ''}`}
              {fileMeta.charCount > 0 && ` · ${fileMeta.charCount.toLocaleString('fr-FR')} caractères extraits`}
            </p>
          )}
          {state === 'extracting' && (
            <p className="mt-2 text-2xs font-bold text-brand-600">⏳ Analyse en cours…</p>
          )}
        </div>
      )}

      {/* Mode paste */}
      {mode === 'paste' && (
        <div className="mt-3">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={6}
            placeholder="Colle ici le texte (rapport d'activité, présentation, statuts…)"
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm leading-6 focus:border-primary focus:outline-none"
            disabled={busy}
          />
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onExtractText}
              disabled={!text.trim() || busy}
              className="btn-primary text-2xs uppercase tracking-widest disabled:opacity-50"
            >
              {state === 'extracting' ? 'Analyse en cours…' : '✨ Analyser le texte'}
            </button>
            <span className="text-2xs text-slate-400">{text.length} caractère(s)</span>
          </div>
        </div>
      )}

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
