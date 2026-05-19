'use client';

import { useEffect } from 'react';
import Link from 'next/link';

/**
 * Sprint 4N — Error boundary client. Capture toute exception non gérée
 * dans un Server Component et la remonte à Sentry si configuré.
 *
 * Le user voit une page propre au lieu du screen blanc Next.js par défaut.
 */
export default function GlobalError({ error, reset }) {
  useEffect(() => {
    // Envoie à Sentry si dispo
    (async () => {
      try {
        const Sentry = await import('@sentry/nextjs');
        Sentry.captureException(error);
      } catch {
        // Sentry pas init → log console
        console.error('[error-boundary]', error);
      }
    })();
  }, [error]);

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-20">
      <div className="mx-auto max-w-xl rounded-3xl border border-slate-200 bg-white p-8 shadow-card text-center">
        <div className="text-5xl">⚠️</div>
        <h1 className="mt-4 font-display text-2xl font-black text-slate-950">Quelque chose a planté</h1>
        <p className="mt-2 text-sm text-slate-500">
          On a noté l'erreur et l'équipe va regarder. Tu peux retenter, ou revenir au dashboard.
        </p>
        {error?.digest && (
          <p className="mt-3 inline-block rounded-full bg-slate-100 px-3 py-1 text-2xs font-mono text-slate-500">
            Ref : {error.digest}
          </p>
        )}
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="btn-primary text-2xs uppercase tracking-widest"
          >
            Réessayer
          </button>
          <Link href="/dashboard" className="btn-secondary text-2xs uppercase tracking-widest">
            Retour dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
