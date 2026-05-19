/**
 * Sprint 4N — Sentry côté navigateur.
 *
 * Activé uniquement si NEXT_PUBLIC_SENTRY_DSN est défini. Sinon no-op
 * complet (zéro impact bundle / runtime).
 */

import * as Sentry from '@sentry/nextjs';

const DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (DSN) {
  Sentry.init({
    dsn: DSN,
    environment: process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.NODE_ENV || 'development',
    // Petite proba pour ne pas exploser le quota free tier (5k events/mois)
    tracesSampleRate: 0.05,
    // Session replay désactivé par défaut (cher en quota) — activer manuellement si besoin
    replaysOnErrorSampleRate: 0,
    replaysSessionSampleRate: 0,
    // Ignore les erreurs de bruit fréquentes
    ignoreErrors: [
      'ResizeObserver loop limit exceeded',
      'ResizeObserver loop completed with undelivered notifications',
      'Non-Error promise rejection captured',
      // Extensions navigateur
      /chrome-extension/i,
      /moz-extension/i,
    ],
    beforeSend(event) {
      // Filtre les events sans stack trace (souvent du bruit)
      if (!event.exception?.values?.[0]?.stacktrace) return null;
      return event;
    },
  });
}
