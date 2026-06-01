'use client';

import { useState } from 'react';

/**
 * CurationForm — formulaire client pour curer une URL via Claude.
 *
 * Sprint 6 / Option A. Soumet à POST /api/admin/curate, affiche
 * le résultat (succès/duplicate/erreur) et propose un lien direct
 * vers /admin/validation pour valider l'opp pré-remplie.
 */
export default function CurationForm() {
  const [url, setUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!url.trim() || loading) return;

    setLoading(true);
    setResult(null);

    try {
      const res = await fetch('/api/admin/curate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim(), notes: notes.trim() }),
      });
      const data = await res.json();
      setResult({ status: res.status, ...data });

      if (data.ok) {
        setUrl('');
        setNotes('');
        // Auto-refresh stats au bout de 2s
        setTimeout(() => window.location.reload(), 2500);
      }
    } catch (err) {
      setResult({ ok: false, error: 'Erreur réseau: ' + err.message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="url" className="block text-sm font-bold text-slate-900">
            URL de l'opportunité
          </label>
          <input
            id="url"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.afd.fr/fr/appel-a-projet-osc-maroc-2026"
            required
            disabled={loading}
            className="mt-2 block w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm shadow-sm transition focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-200 disabled:opacity-50"
          />
          <p className="mt-1 text-xs text-slate-500">
            Page directe de l'opportunité (pas un listing). Domaines supportés : tous (HTTPS).
          </p>
        </div>

        <div>
          <label htmlFor="notes" className="block text-sm font-bold text-slate-900">
            Notes pour l'admin <span className="font-normal text-slate-500">(optionnel)</span>
          </label>
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            disabled={loading}
            placeholder="Ex: trouvé via newsletter Devex du 28/05, deadline urgente"
            className="mt-2 block w-full rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-sm shadow-sm transition focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-200 disabled:opacity-50"
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={loading || !url.trim()}
            className="rounded-2xl bg-rose-600 px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? 'Analyse en cours...' : 'Curer cette opportunité'}
          </button>
          {loading && (
            <p className="text-xs text-slate-500">
              Fetch de la page + analyse Claude (15-30 secondes)...
            </p>
          )}
        </div>
      </form>

      {/* Résultat */}
      {result && (
        <div className="mt-6">
          {result.ok && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
              <p className="font-bold text-emerald-900">✓ Opportunité curatée avec succès</p>
              <p className="mt-2 text-sm text-emerald-900/90">
                <strong>{result.title}</strong>
              </p>
              <div className="mt-2 flex flex-wrap gap-3 text-xs text-emerald-900/80">
                <span>Maroc-éligibilité : <strong>{result.morocco_eligibility}</strong></span>
                {result.deadline && <span>Deadline : {result.deadline}</span>}
                {result.usage?.input_tokens && (
                  <span>{result.usage.input_tokens} tokens in / {result.usage.output_tokens} out</span>
                )}
                {result.duration_ms && <span>{(result.duration_ms / 1000).toFixed(1)}s</span>}
              </div>
              <a
                href={result.redirect_to}
                className="mt-3 inline-block rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700"
              >
                Aller valider dans /admin/validation →
              </a>
            </div>
          )}

          {!result.ok && result.duplicate && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
              <p className="font-bold text-amber-900">⚠ Doublon détecté</p>
              <p className="mt-2 text-sm text-amber-900/90">
                Cette URL est déjà en base sous le titre « <strong>{result.title}</strong> » (statut : {result.status}).
              </p>
              {result.opportunity_id && (
                <a
                  href={`/admin/validation#${result.opportunity_id}`}
                  className="mt-3 inline-block rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white hover:bg-amber-700"
                >
                  Voir l'opportunité existante →
                </a>
              )}
            </div>
          )}

          {!result.ok && !result.duplicate && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5">
              <p className="font-bold text-rose-900">✗ Échec de la curation</p>
              <p className="mt-2 text-sm text-rose-900/90">
                {result.error || 'Erreur inconnue'}
              </p>
              {result.stage && (
                <p className="mt-1 text-xs text-rose-700">
                  Étape : <strong>{result.stage}</strong>
                </p>
              )}
              <p className="mt-3 text-xs text-rose-700">
                Conseils : essayez une URL alternative (page mobile, version cache Google),
                vérifiez que la page n'est pas un SPA qui charge en JS,
                ou ajoutez manuellement l'opp via /admin/opportunities/new.
              </p>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
