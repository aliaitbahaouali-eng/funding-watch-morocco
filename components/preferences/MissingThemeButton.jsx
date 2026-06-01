'use client';

import { useState } from 'react';
import { submitBetaFeedback } from '@/app/actions/beta-feedback';
import { trackEvent } from '@/lib/analytics';

/**
 * Sprint 4O — Bouton "Je ne trouve pas ma thématique".
 * Permet aux utilisateurs de signaler une lacune dans la taxonomie. Le
 * feedback va dans la même table beta_feedback (kind="other", message
 * préfixé "[taxonomy-suggestion]") pour que les admins le triagent
 * depuis /admin/feedback.
 */
export default function MissingThemeButton() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [state, setState] = useState('idle'); // idle | sending | success | error
  const [error, setError] = useState(null);

  async function onSubmit(e) {
    e.preventDefault();
    if (text.trim().length < 5) {
      setError('Au moins 5 caractères, sois précis(e).');
      return;
    }
    setState('sending');
    setError(null);
    try {
      const result = await submitBetaFeedback({
        kind: 'other',
        severity: 'low',
        message: `[taxonomy-suggestion] ${text.trim()}`,
        page_url: typeof window !== 'undefined' ? window.location.pathname : null,
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
      });
      if (result?.ok) {
        setState('success');
        trackEvent('theme_suggestion_sent');
      } else {
        throw new Error(result?.error || 'Erreur inconnue');
      }
    } catch (err) {
      setError(err.message || 'Échec de l\'envoi.');
      setState('error');
    }
  }

  if (state === 'success') {
    return (
      <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
        <p className="font-bold">🙏 Merci, c'est noté.</p>
        <p className="mt-1 text-xs text-emerald-700">
          Ta suggestion arrive dans la file de triage admin. Si elle représente un vrai besoin partagé, on l'ajoute dans la prochaine itération.
        </p>
      </div>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-4 inline-flex items-center gap-2 rounded-full border border-dashed border-slate-300 px-4 py-2 text-xs font-bold text-slate-600 transition hover:border-slate-400 hover:bg-slate-50"
      >
        <span>＋</span> Je ne trouve pas ma thématique
      </button>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <label className="text-2xs font-black uppercase tracking-widest text-slate-500">
        Quelle thématique manque ?
      </label>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        maxLength={500}
        placeholder="Ex : 'Droits LGBTQ+ Maroc' / 'Mères célibataires' / 'Médias indépendants' — précise le contexte pour qu'on comprenne ton besoin."
        className="mt-2 w-full rounded-2xl border border-slate-200 bg-white p-3 text-sm leading-6 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
        autoFocus
      />
      <p className="mt-1 text-2xs text-slate-400">{text.length}/500</p>
      {error && (
        <p className="mt-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700">{error}</p>
      )}
      <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => { setOpen(false); setText(''); setError(null); }}
          className="text-2xs font-bold uppercase tracking-widest text-slate-500 hover:text-slate-700"
        >
          Annuler
        </button>
        <button
          type="submit"
          disabled={state === 'sending'}
          className="btn-primary text-2xs uppercase tracking-widest disabled:opacity-50"
        >
          {state === 'sending' ? 'Envoi…' : 'Envoyer la suggestion'}
        </button>
      </div>
    </form>
  );
}
