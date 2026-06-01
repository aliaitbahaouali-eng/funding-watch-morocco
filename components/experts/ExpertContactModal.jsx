'use client';

import { useEffect, useState } from 'react';
import { requestExpertHelp } from '@/app/actions/expert-requests';
import { trackEvent } from '@/lib/analytics';

/**
 * Sprint 4Q — Modal "Demander de l'aide à {expert}".
 *
 * Disabled si l'expert est un placeholder — le bouton affiche un titre
 * explicatif. Sinon : modal avec textarea + phone optionnel → server
 * action requestExpertHelp() qui insère + envoie email à l'expert.
 */
export default function ExpertContactModal({ expert, oppId, disabled = false }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [phone, setPhone] = useState('');
  const [state, setState] = useState('idle'); // idle | sending | success | error
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  if (disabled) {
    return (
      <button
        type="button"
        disabled
        title="Profil exemple — disponible quand on aura recruté un vrai expert sur cette spécialité."
        className="cursor-not-allowed rounded-full border border-slate-200 bg-slate-100 px-3 py-1.5 text-2xs font-bold text-slate-400"
      >
        Indispo (exemple)
      </button>
    );
  }

  async function onSubmit(e) {
    e.preventDefault();
    if (message.trim().length < 20) {
      setError('Décris au moins 20 caractères — l\'expert a besoin de contexte.');
      setState('error');
      return;
    }
    setState('sending');
    setError(null);
    try {
      const result = await requestExpertHelp({
        expert_id: expert.id,
        opp_id: oppId,
        message: message.trim(),
        contact_phone: phone.trim() || null,
      });
      if (result?.ok) {
        setState('success');
        trackEvent('expert_request_sent', { props: { expert_name: expert.name } });
      } else {
        throw new Error(result?.detail || result?.error || 'Erreur inconnue');
      }
    } catch (err) {
      setError(err.message);
      setState('error');
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full bg-indigo-600 px-3 py-1.5 text-2xs font-black uppercase tracking-widest text-white transition hover:bg-indigo-700"
      >
        Demander de l'aide →
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 p-4 backdrop-blur-sm sm:items-center"
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 px-6 py-5 text-white">
              <p className="text-2xs font-black uppercase tracking-widest text-indigo-200">Demande d'accompagnement</p>
              <h2 className="mt-1 font-display text-xl font-black">{expert.name}</h2>
              <p className="mt-1 text-xs text-indigo-100">{expert.title}</p>
            </div>

            {state === 'success' ? (
              <div className="px-6 py-8 text-center">
                <div className="text-5xl">📬</div>
                <h3 className="mt-3 font-display text-lg font-black text-slate-950">Demande envoyée</h3>
                <p className="mt-2 text-sm text-slate-500">
                  {expert.name} a reçu ton message avec le contexte de l'opp. Si la demande l'intéresse, tu recevras une réponse directe par email (réponse → ton adresse).
                </p>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="btn-secondary mt-5 text-2xs uppercase tracking-widest"
                >
                  Fermer
                </button>
              </div>
            ) : (
              <form onSubmit={onSubmit} className="space-y-4 px-6 py-5">
                <div>
                  <label className="text-2xs font-black uppercase tracking-widest text-slate-500">Ton message</label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={6}
                    maxLength={2000}
                    placeholder={`Bonjour ${expert.name},\n\nNotre association [nom] travaille sur [domaine]. On postule à cet AAP et on aimerait ton aide sur :\n- ...\n- ...\n\nQuelle serait ta disponibilité dans les 2-3 prochaines semaines ?`}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm leading-6 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    required
                  />
                  <p className="mt-1 text-2xs text-slate-400">{message.length}/2000 · 20 chars min</p>
                </div>

                <div>
                  <label className="text-2xs font-black uppercase tracking-widest text-slate-500">Téléphone (optionnel)</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+212 6XX XXX XXX"
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  />
                </div>

                {state === 'error' && error && (
                  <p className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">{error}</p>
                )}

                <p className="text-2xs leading-4 text-slate-400">
                  📍 On transmet ton email + le contexte de l'opp à {expert.name}. La réponse arrive directement chez toi (reply-to email).
                </p>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="text-2xs font-bold uppercase tracking-widest text-slate-500 hover:text-slate-700"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={state === 'sending'}
                    className="rounded-full bg-indigo-600 px-5 py-2.5 text-2xs font-black uppercase tracking-widest text-white transition hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {state === 'sending' ? 'Envoi…' : 'Envoyer la demande'}
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
