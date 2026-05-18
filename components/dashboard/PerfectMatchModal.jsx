'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Modal "Match parfait" — audit §8 idée #3.
 *
 * Quand le dashboard load et qu'il y a un match avec final_score >= 85
 * que cette orga n'a jamais vu (localStorage flag), on déclenche une
 * overlay pleine page 1.5s + CTA "Lire maintenant".
 *
 * Respecte prefers-reduced-motion (anim désactivée si OS demande moins
 * de motion). Désactivable en perm via une checkbox dans le modal.
 */
export default function PerfectMatchModal({ topMatches = [], threshold = 85 }) {
  const [overlay, setOverlay] = useState(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [permanentDismiss, setPermanentDismiss] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    // Respect OS reduced-motion preference
    setReducedMotion(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || false);

    // Opt-out permanente
    try {
      const off = localStorage.getItem('fw-perfect-match-off') === '1';
      setPermanentDismiss(off);
      if (off) return;
    } catch {}

    // Cherche le meilleur match >= threshold pas encore vu
    const candidates = (topMatches || [])
      .filter((m) => Number(m.final_score) >= threshold)
      .sort((a, b) => Number(b.final_score) - Number(a.final_score));
    for (const m of candidates) {
      try {
        const key = `fw-seen-perfect-match-${m.opportunity_id}`;
        if (!localStorage.getItem(key)) {
          // Trouvé — on affiche et on marque vu (pas de double pop sur reload)
          localStorage.setItem(key, String(Date.now()));
          setOverlay(m);
          break;
        }
      } catch {}
    }
  }, [topMatches, threshold]);

  function close() { setOverlay(null); }
  function disableForever() {
    try { localStorage.setItem('fw-perfect-match-off', '1'); } catch {}
    setPermanentDismiss(true);
    close();
  }

  if (!overlay || permanentDismiss) return null;

  const score = Math.round(Number(overlay.final_score) || 0);
  const animDuration = reducedMotion ? 0.05 : 0.4;

  return (
    <AnimatePresence>
      {overlay && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: animDuration }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm"
          onClick={close}
        >
          <motion.div
            initial={{ scale: reducedMotion ? 1 : 0.7, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ duration: animDuration, type: 'spring', stiffness: 220, damping: 22 }}
            className="relative max-w-md rounded-[2rem] bg-white p-8 text-center shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Score ring grand format */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1, duration: 0.4, type: 'spring', stiffness: 200 }}
              className="mx-auto mb-4 flex h-32 w-32 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 via-emerald-500 to-emerald-600 text-white shadow-glow-brand"
            >
              <div>
                <div className="font-display text-5xl font-black leading-none">{score}</div>
                <div className="mt-1 text-2xs font-black uppercase tracking-widest text-emerald-50">%</div>
              </div>
            </motion.div>

            <p className="text-2xs font-black uppercase tracking-widest text-emerald-600">⚡ Match parfait détecté</p>
            <h2 className="mt-2 font-display text-2xl font-black leading-tight text-slate-950">
              {overlay.title || 'Nouvelle opportunité'}
            </h2>
            {overlay.donor_name && (
              <p className="mt-1 text-sm font-bold text-slate-500">{overlay.donor_name}</p>
            )}
            {overlay.reason && (
              <p className="mt-3 text-sm italic text-slate-600">« {overlay.reason} »</p>
            )}

            <div className="mt-6 flex flex-col gap-2">
              <Link
                href={`/opportunities/${overlay.opportunity_id}`}
                className="btn-primary w-full text-xs uppercase tracking-widest"
                onClick={close}
              >
                Lire maintenant →
              </Link>
              <button onClick={close} className="text-2xs font-bold text-slate-500 hover:text-slate-700">
                Plus tard
              </button>
              <button
                onClick={disableForever}
                className="mt-2 text-2xs text-slate-400 hover:text-slate-600"
              >
                Ne plus jamais m'afficher ces notifications
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
