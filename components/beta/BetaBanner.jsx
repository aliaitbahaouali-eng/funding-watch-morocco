'use client';

import { useEffect, useState } from 'react';

const DISMISS_KEY = 'fw-beta-banner-dismissed';

/**
 * Sprint 4M — Bannière bêta dismissible.
 * S'affiche en haut du dashboard à la première visite, jusqu'à clic sur
 * "Compris". Le choix est persisté en localStorage.
 *
 * Set les expectations honnêtement : ce qui est solide, ce qui peut casser,
 * comment remonter un bug.
 */
export default function BetaBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(DISMISS_KEY)) setShow(true);
    } catch {
      // localStorage indisponible (private mode) → on affiche quand même
      setShow(true);
    }
  }, []);

  function dismiss() {
    try { localStorage.setItem(DISMISS_KEY, '1'); } catch {}
    setShow(false);
  }

  if (!show) return null;

  return (
    <div className="relative overflow-hidden rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-5 shadow-sm">
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-xl">
          🧪
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-2xs font-black uppercase tracking-widest text-emerald-700">Bêta privée · early access</p>
          <h2 className="mt-1 font-display text-lg font-black text-slate-950">
            Bienvenue dans la bêta. On construit ensemble.
          </h2>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <div>
              <p className="text-2xs font-black uppercase tracking-widest text-emerald-700">✓ Ce qui est solide</p>
              <p className="mt-0.5 text-xs leading-5 text-slate-600">
                Matching IA, scoring, AI co-writer, suivi candidatures, document intelligence PDF, search sémantique FR/AR/EN.
              </p>
            </div>
            <div>
              <p className="text-2xs font-black uppercase tracking-widest text-amber-700">⚠ Ce qui peut bouger</p>
              <p className="mt-0.5 text-xs leading-5 text-slate-600">
                Email digest cadence, certaines sources de scraping en rodage, design qui s'affine selon vos retours.
              </p>
            </div>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            💬 Trouve un bug, une idée, un truc qui te bloque ? Clique sur le bouton <b>Feedback</b> en bas à droite — ça file directement à l'équipe.
          </p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="shrink-0 rounded-full border border-emerald-200 bg-white px-3 py-1.5 text-2xs font-black uppercase tracking-widest text-emerald-700 transition hover:bg-emerald-50"
        >
          Compris
        </button>
      </div>
    </div>
  );
}
