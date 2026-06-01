'use client';

import { useState, useTransition } from 'react';
import { toggleCoSubmitIntent, requestCoSubmissionConnection } from '@/app/actions/co-submission';
import { trackEvent } from '@/lib/analytics';

/**
 * Sprint 4P — Panneau co-soumission.
 *
 * Props :
 *   oppId         — uuid de l'opp
 *   isOwnerOptIn  — l'utilisateur a-t-il déjà opté in ?
 *   ownerMessage  — message court de l'utilisateur (pitch)
 *   peers         — autres orgs opted-in (id, name, city, themes, message)
 *                   Si user pas opted-in, on passe juste { count, can_see_details: false }
 *                   Sinon { peers: [...] }
 */
export default function CoSubmissionPanel({ oppId, isOwnerOptIn, ownerMessage, peers, peersCount }) {
  const [optIn, setOptIn] = useState(!!isOwnerOptIn);
  const [pitch, setPitch] = useState(ownerMessage || '');
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState(null);

  // Modal contact pour demande de mise en relation
  const [contactTarget, setContactTarget] = useState(null);
  const [contactMessage, setContactMessage] = useState('');
  const [contactState, setContactState] = useState('idle'); // idle | sending | success | error
  const [contactError, setContactError] = useState(null);

  async function onToggle() {
    setError(null);
    const next = !optIn;
    startTransition(async () => {
      const result = await toggleCoSubmitIntent({ opp_id: oppId, on: next, message: pitch });
      if (!result?.ok) {
        setError(result?.detail || result?.error || 'Erreur');
        return;
      }
      setOptIn(next);
      if (next) {
        trackEvent('co_submit_interest', { props: { state: 'on' } });
      } else {
        trackEvent('co_submit_interest', { props: { state: 'off' } });
      }
    });
  }

  async function onSavePitch(e) {
    e?.preventDefault?.();
    setError(null);
    startTransition(async () => {
      const result = await toggleCoSubmitIntent({ opp_id: oppId, on: true, message: pitch });
      if (!result?.ok) {
        setError(result?.detail || result?.error || 'Erreur');
        return;
      }
      setEditing(false);
    });
  }

  async function onSendConnection(e) {
    e.preventDefault();
    if (!contactTarget) return;
    if (contactMessage.trim().length < 30) {
      setContactError('Au moins 30 caractères — présente ton orga et explique ce que tu cherches dans le partenariat.');
      setContactState('error');
      return;
    }
    setContactState('sending');
    setContactError(null);
    const result = await requestCoSubmissionConnection({
      opp_id: oppId,
      target_org_id: contactTarget.id,
      message: contactMessage.trim(),
    });
    if (result?.ok) {
      setContactState('success');
      trackEvent('co_submit_match', { props: { target_org_id: contactTarget.id } });
    } else {
      setContactError(result?.detail || result?.error || 'Erreur');
      setContactState('error');
    }
  }

  function closeContact() {
    setContactTarget(null);
    setContactMessage('');
    setContactState('idle');
    setContactError(null);
  }

  return (
    <div className="rounded-3xl border border-violet-200/40 bg-gradient-to-br from-violet-50/40 to-white p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="eyebrow text-violet-700">🤝 Co-soumission</p>
          <h3 className="mt-1 font-display text-xl font-black text-slate-950">
            Candidater en consortium
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            Les bailleurs (UE, AFD, UNDP) privilégient souvent les consortiums. Opte in pour signaler que tu cherches un partenaire.
          </p>
        </div>
      </div>

      {/* Toggle opt-in */}
      <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="font-bold text-slate-950">
              {optIn ? '✓ Tu es intéressé(e) à co-soumettre' : 'Intérêt à co-soumettre ?'}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {optIn
                ? 'Tu apparais maintenant aux autres assos opted-in. Elles peuvent te contacter via la plateforme.'
                : 'Active ce signal pour voir qui d\'autre cherche des partenaires sur cette opp.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onToggle}
            disabled={pending}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition disabled:opacity-50 ${
              optIn ? 'bg-violet-600' : 'bg-slate-300'
            }`}
          >
            <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${optIn ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </button>
        </div>

        {error && (
          <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-2xs font-bold text-rose-700">{error}</p>
        )}

        {/* Pitch optionnel quand opted-in */}
        {optIn && (
          <div className="mt-4 border-t border-slate-100 pt-4">
            {editing ? (
              <form onSubmit={onSavePitch}>
                <label className="text-2xs font-black uppercase tracking-widest text-slate-500">Ton pitch (visible aux autres assos opted-in)</label>
                <textarea
                  value={pitch}
                  onChange={(e) => setPitch(e.target.value)}
                  rows={3}
                  maxLength={600}
                  placeholder="Ex : 'Notre asso travaille avec 200 femmes rurales sur Doukkala. On cherche un partenaire avec expertise plaidoyer politique pour porter la voix au niveau national.'"
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs leading-5 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-200"
                />
                <p className="mt-1 text-2xs text-slate-400">{pitch.length}/600</p>
                <div className="mt-2 flex items-center justify-end gap-2">
                  <button type="button" onClick={() => setEditing(false)} className="text-2xs font-bold text-slate-500">Annuler</button>
                  <button type="submit" disabled={pending} className="rounded-full bg-violet-600 px-3 py-1.5 text-2xs font-black uppercase tracking-widest text-white">Enregistrer</button>
                </div>
              </form>
            ) : (
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-2xs font-black uppercase tracking-widest text-slate-500">Ton pitch</p>
                  <p className="mt-1 text-xs text-slate-600">
                    {pitch || <span className="italic text-slate-400">Pas encore de pitch — clique pour en écrire un, ça aide les partenaires à comprendre ce que tu cherches.</span>}
                  </p>
                </div>
                <button type="button" onClick={() => setEditing(true)} className="shrink-0 text-2xs font-bold text-violet-700 hover:underline">
                  {pitch ? 'Éditer' : 'Ajouter'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Section "Cherchent à co-soumettre" */}
      {!optIn ? (
        <div className="mt-5 rounded-2xl border border-violet-100 bg-violet-50/40 p-4">
          {peersCount > 0 ? (
            <p className="text-xs text-violet-700">
              🤝 <b>{peersCount} association{peersCount > 1 ? 's' : ''}</b> cherche{peersCount > 1 ? 'nt' : ''} à co-soumettre sur cet appel. Active le toggle pour voir qui et entrer en contact.
            </p>
          ) : (
            <p className="text-xs text-violet-700">
              💡 Sois la première association à opter in. Tu apparaîtras automatiquement aux suivantes — c'est ce qui amorce l'effet réseau.
            </p>
          )}
        </div>
      ) : (
        <div className="mt-5">
          {(peers || []).length === 0 ? (
            <div className="rounded-2xl border border-dashed border-violet-200 bg-violet-50/40 p-4">
              <p className="text-xs text-violet-700">
                Pour l'instant, tu es la seule association opted-in sur cette opp. Reviens dans quelques jours — tu seras notifié·e dès qu'une autre signale son intérêt.
              </p>
            </div>
          ) : (
            <>
              <p className="mb-2 text-2xs font-black uppercase tracking-widest text-slate-500">
                {peers.length} autre{peers.length > 1 ? 's' : ''} association{peers.length > 1 ? 's' : ''} cherche{peers.length > 1 ? 'nt' : ''} à co-soumettre
              </p>
              <ul className="grid gap-2">
                {peers.map((p) => (
                  <li key={p.id} className="rounded-2xl border border-slate-200 bg-white p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-slate-950">{p.name}</p>
                        {(p.city || p.themes_str) && (
                          <p className="text-2xs text-slate-500">
                            {p.city ? `${p.city}` : ''}{p.city && p.themes_str ? ' · ' : ''}{p.themes_str || ''}
                          </p>
                        )}
                        {p.message && (
                          <p className="mt-1.5 text-xs leading-5 text-slate-600 italic">
                            "{p.message}"
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => setContactTarget(p)}
                        className="shrink-0 rounded-full bg-violet-600 px-3 py-1.5 text-2xs font-black uppercase tracking-widest text-white hover:bg-violet-700"
                      >
                        Contacter →
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      {/* Modal de mise en relation */}
      {contactTarget && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 p-4 backdrop-blur-sm sm:items-center"
          onClick={(e) => { if (e.target === e.currentTarget) closeContact(); }}
        >
          <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="bg-gradient-to-br from-violet-600 to-violet-800 px-6 py-5 text-white">
              <p className="text-2xs font-black uppercase tracking-widest text-violet-200">🤝 Mise en relation</p>
              <h2 className="mt-1 font-display text-xl font-black">{contactTarget.name}</h2>
              {contactTarget.city && <p className="mt-1 text-xs text-violet-100">{contactTarget.city}</p>}
            </div>

            {contactState === 'success' ? (
              <div className="px-6 py-8 text-center">
                <div className="text-5xl">📬</div>
                <h3 className="mt-3 font-display text-lg font-black text-slate-950">Message envoyé</h3>
                <p className="mt-2 text-sm text-slate-500">
                  {contactTarget.name} reçoit ton message + le contexte de l'opp. La réponse arrivera directement à ton email (reply-to).
                </p>
                <button type="button" onClick={closeContact} className="btn-secondary mt-5 text-2xs uppercase tracking-widest">
                  Fermer
                </button>
              </div>
            ) : (
              <form onSubmit={onSendConnection} className="space-y-4 px-6 py-5">
                <div>
                  <label className="text-2xs font-black uppercase tracking-widest text-slate-500">Présente-toi + ce que tu cherches</label>
                  <textarea
                    value={contactMessage}
                    onChange={(e) => setContactMessage(e.target.value)}
                    rows={6}
                    maxLength={2000}
                    placeholder={`Bonjour ${contactTarget.name},\n\nNotre asso [nom] travaille avec [public cible] sur [thématique]. On candidate sur cette opp et on cherche un partenaire pour [compétence complémentaire]. Si ça t'intéresse, on peut programmer un call la semaine prochaine.\n\nÀ bientôt,\n[ton prénom]`}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm leading-6 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-200"
                    required
                  />
                  <p className="mt-1 text-2xs text-slate-400">{contactMessage.length}/2000 · 30 chars min</p>
                </div>

                {contactState === 'error' && contactError && (
                  <p className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">{contactError}</p>
                )}

                <p className="text-2xs leading-4 text-slate-400">
                  📍 On envoie ton message + ton email à l'asso. Elle peut te répondre directement.
                </p>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button type="button" onClick={closeContact} className="text-2xs font-bold uppercase tracking-widest text-slate-500">Annuler</button>
                  <button type="submit" disabled={contactState === 'sending'} className="rounded-full bg-violet-600 px-5 py-2.5 text-2xs font-black uppercase tracking-widest text-white hover:bg-violet-700 disabled:opacity-50">
                    {contactState === 'sending' ? 'Envoi…' : 'Envoyer la demande'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
