'use client';

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'fw-more-recos-open';

/**
 * Sprint 5A — Accordion "Plus de recommandations".
 *
 * Wrapper client qui réveille un bloc d'enfants (server components passés
 * en children) UNIQUEMENT au premier clic. Évite de polluer le dashboard
 * principal avec 3-4 sections en plus.
 *
 * État persisté en localStorage : si l'utilisateur l'a déjà ouvert une
 * fois, on l'ouvre par défaut au prochain chargement (assume préférence).
 */
export default function MoreRecommendations({ children }) {
  const [open, setOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) === '1') setOpen(true);
    } catch {}
    setHydrated(true);
  }, []);

  function toggle() {
    const next = !open;
    setOpen(next);
    try { localStorage.setItem(STORAGE_KEY, next ? '1' : '0'); } catch {}
  }

  return (
    <section className="rounded-3xl border border-ink-100 bg-white p-1">
      <button
        type="button"
        onClick={toggle}
        className="flex w-full items-center justify-between gap-3 rounded-2xl px-5 py-4 text-left transition hover:bg-ink-50"
        aria-expanded={open}
      >
        <div>
          <p className="text-2xs font-black uppercase tracking-widest text-ink-500">Explorer plus</p>
          <p className="mt-0.5 font-display text-lg font-black text-ink">
            Voir plus de recommandations
          </p>
          <p className="mt-0.5 text-xs text-ink-500">
            Bailleurs à explorer · Ce que regardent les assos similaires · Frise 90j
          </p>
        </div>
        <svg
          className={`h-6 w-6 shrink-0 text-ink-500 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {hydrated && open && (
        <div className="space-y-6 border-t border-ink-100 px-1 py-6 sm:px-2">
          {children}
        </div>
      )}
    </section>
  );
}
