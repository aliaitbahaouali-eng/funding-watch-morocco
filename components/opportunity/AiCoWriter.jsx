'use client';
import { useState } from 'react';

/**
 * AI co-writer — bouton "Aide-moi à rédiger le résumé exécutif".
 * Appelle /api/ai/cowriter qui combine le profil orga + le brief de
 * l'opportunité via Claude. Le brouillon généré est éditable et copiable.
 */
export default function AiCoWriter({ opportunityId }) {
  const [state, setState] = useState('idle'); // idle | loading | done | error
  const [draft, setDraft] = useState('');
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  async function generate() {
    setState('loading');
    setError(null);
    setCopied(false);
    try {
      const res = await fetch('/api/ai/cowriter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ opportunity_id: opportunityId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg =
          data.error === 'ai_unavailable'
            ? "L'assistant IA n'est pas configuré (clé API manquante)."
            : data.error === 'no_org'
            ? 'Complétez le profil de votre organisation pour utiliser le co-writer.'
            : 'La génération a échoué. Réessayez dans un instant.';
        throw new Error(msg);
      }
      setDraft(data.draft || '');
      setState('done');
    } catch (e) {
      setError(e.message);
      setState('error');
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(draft);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard indisponible — l'utilisateur peut sélectionner manuellement */
    }
  }

  return (
    <div>
      <div className="flex items-start gap-2">
        <span className="text-lg">✨</span>
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Assistant IA</p>
          <p className="mt-0.5 text-sm font-bold text-ink">Résumé exécutif de candidature</p>
        </div>
      </div>
      <p className="mt-2 text-xs leading-5 text-slate-500">
        Génère un premier jet à partir du profil de votre organisation et de cet appel. À relire et personnaliser.
      </p>

      {state !== 'done' && (
        <button
          onClick={generate}
          disabled={state === 'loading'}
          className="btn-primary mt-3 w-full text-2xs uppercase tracking-widest disabled:opacity-60"
        >
          {state === 'loading' ? 'Rédaction en cours…' : 'Aide-moi à rédiger →'}
        </button>
      )}

      {state === 'error' && (
        <p className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">
          {error}
        </p>
      )}

      {state === 'done' && (
        <div className="mt-3">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={12}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm leading-6 text-ink focus:border-brand-400 focus:outline-none"
            aria-label="Brouillon du résumé exécutif"
          />
          <div className="mt-2 flex gap-2">
            <button onClick={copy} className="btn-secondary flex-1 text-2xs uppercase tracking-widest">
              {copied ? 'Copié ✓' : 'Copier'}
            </button>
            <button onClick={generate} className="btn-ghost text-2xs uppercase tracking-widest">
              Régénérer
            </button>
          </div>
          <p className="mt-2 text-2xs leading-4 text-slate-400">
            Brouillon généré par IA — vérifiez les faits et les chiffres avant utilisation.
          </p>
        </div>
      )}
    </div>
  );
}
