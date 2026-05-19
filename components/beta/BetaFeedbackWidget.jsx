'use client';

import { useEffect, useRef, useState } from 'react';
import { submitBetaFeedback } from '@/app/actions/beta-feedback';
import { trackEvent } from '@/lib/analytics';

const KIND_OPTIONS = [
  { value: 'bug', label: '🐛 Bug', desc: 'Quelque chose ne fonctionne pas' },
  { value: 'idea', label: '💡 Idée', desc: 'Suggestion / feature request' },
  { value: 'love', label: '❤️ Love', desc: 'Ce que tu aimes / valides' },
  { value: 'question', label: '❓ Question', desc: 'Tu ne comprends pas un truc' },
];

const SEVERITY_OPTIONS = [
  { value: 'low', label: 'Mineur' },
  { value: 'medium', label: 'Modéré' },
  { value: 'high', label: 'Important' },
  { value: 'blocker', label: 'Bloquant' },
];

/**
 * Sprint 4M — Widget feedback flottant bêta.
 *
 * Bouton "💬 Feedback" en bas à droite. Cliquer ouvre une modal légère
 * avec : type (bug/idée/love/question), sévérité (si bug), message,
 * envoi via server action. Capture l'URL courante automatiquement.
 *
 * Affiché seulement sur les pages logged-in (la condition est sur le
 * mount, géré par le wrapper layout côté serveur).
 */
export default function BetaFeedbackWidget() {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState('idea');
  const [severity, setSeverity] = useState('low');
  const [message, setMessage] = useState('');
  const [state, setState] = useState('idle'); // idle | sending | success | error
  const [error, setError] = useState(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    if (open && textareaRef.current) {
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  }, [open]);

  // ESC pour fermer
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') closeModal(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  function closeModal() {
    setOpen(false);
    // Reset après animation
    setTimeout(() => {
      if (state !== 'success') return;
      setMessage('');
      setKind('idea');
      setSeverity('low');
      setState('idle');
      setError(null);
    }, 300);
  }

  async function onSubmit(e) {
    e.preventDefault();
    if (message.trim().length < 5) {
      setError('Au moins 5 caractères, raconte un peu plus.');
      setState('error');
      return;
    }
    setState('sending');
    setError(null);
    try {
      const result = await submitBetaFeedback({
        kind,
        severity: kind === 'bug' ? severity : 'low',
        message: message.trim(),
        page_url: typeof window !== 'undefined' ? window.location.pathname + window.location.search : null,
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
      });
      if (result?.ok) {
        setState('success');
        trackEvent('feedback_sent', { props: { kind, severity: kind === 'bug' ? severity : 'na' } });
      } else {
        throw new Error(result?.error || 'Erreur inconnue');
      }
    } catch (err) {
      setError(err.message || 'Échec de l\'envoi.');
      setState('error');
    }
  }

  return (
    <>
      {/* Bouton flottant */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-20 right-4 z-40 inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2.5 text-xs font-black uppercase tracking-widest text-white shadow-lg ring-1 ring-white/10 transition hover:bg-slate-800 hover:shadow-xl md:bottom-6 md:right-6 md:px-5 md:py-3"
        aria-label="Donner un feedback"
      >
        <span>💬</span>
        <span className="hidden sm:inline">Feedback</span>
      </button>

      {/* Modal */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 p-4 backdrop-blur-sm sm:items-center"
          onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="feedback-title"
        >
          <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 px-6 py-5 text-white">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-2xs font-black uppercase tracking-widest text-emerald-400">Bêta privée · feedback direct</p>
                  <h2 id="feedback-title" className="mt-1 font-display text-xl font-black">Aide-nous à améliorer Funding Watch</h2>
                </div>
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-full p-1.5 text-white/60 transition hover:bg-white/10 hover:text-white"
                  aria-label="Fermer"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {state === 'success' ? (
              <div className="px-6 py-8 text-center">
                <div className="text-5xl">🙏</div>
                <h3 className="mt-3 font-display text-lg font-black text-slate-950">Merci, c'est bien reçu</h3>
                <p className="mt-2 text-sm text-slate-500">
                  Ton feedback file directement dans la backlog. On revient vers toi si on a besoin de détails.
                </p>
                <button
                  type="button"
                  onClick={closeModal}
                  className="btn-secondary mt-5 text-2xs uppercase tracking-widest"
                >
                  Fermer
                </button>
              </div>
            ) : (
              <form onSubmit={onSubmit} className="space-y-4 px-6 py-5">
                {/* Type */}
                <div>
                  <label className="text-2xs font-black uppercase tracking-widest text-slate-500">Type</label>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {KIND_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setKind(opt.value)}
                        className={`rounded-2xl border px-3 py-2 text-left text-xs transition ${
                          kind === opt.value
                            ? 'border-slate-900 bg-slate-50 ring-2 ring-slate-900/10'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                        title={opt.desc}
                      >
                        <div className="font-bold text-slate-950">{opt.label}</div>
                        <div className="mt-0.5 text-2xs text-slate-500">{opt.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sévérité — uniquement si bug */}
                {kind === 'bug' && (
                  <div>
                    <label className="text-2xs font-black uppercase tracking-widest text-slate-500">Sévérité</label>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {SEVERITY_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setSeverity(opt.value)}
                          className={`rounded-full border px-3 py-1 text-2xs font-bold transition ${
                            severity === opt.value
                              ? 'border-rose-400 bg-rose-50 text-rose-700'
                              : 'border-slate-200 text-slate-600 hover:border-slate-300'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Message */}
                <div>
                  <label className="text-2xs font-black uppercase tracking-widest text-slate-500">Ton message</label>
                  <textarea
                    ref={textareaRef}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={5}
                    maxLength={4000}
                    placeholder={
                      kind === 'bug' ? 'Décris ce qui ne marche pas + ce que tu attendais. URL = capturée automatiquement.'
                      : kind === 'idea' ? 'Quelle fonctionnalité tu aimerais voir ? Quel problème ça résout pour toi ?'
                      : kind === 'love' ? 'Qu\'est-ce qui marche bien ? Quel moment t\'a fait dire "oui c\'est exactement ça" ?'
                      : 'Ta question — on répond sous 48h.'
                    }
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm leading-6 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                    required
                  />
                  <p className="mt-1 text-2xs text-slate-400">{message.length}/4000</p>
                </div>

                {state === 'error' && error && (
                  <p className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">{error}</p>
                )}

                <div className="flex items-center justify-between gap-3 pt-2">
                  <p className="text-2xs leading-4 text-slate-400">
                    📍 On capture l'URL & ton compte pour faciliter le debug. Aucune autre donnée.
                  </p>
                  <button
                    type="submit"
                    disabled={state === 'sending'}
                    className="btn-primary shrink-0 text-2xs uppercase tracking-widest disabled:opacity-50"
                  >
                    {state === 'sending' ? 'Envoi…' : 'Envoyer'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
