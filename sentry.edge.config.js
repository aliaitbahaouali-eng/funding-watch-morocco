/**
 * Sprint 4N — Sentry côté Edge runtime (middleware, edge routes).
 * Activé uniquement si SENTRY_DSN défini.
 */

import * as Sentry from '@sentry/nextjs';

const DSN = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

if (DSN) {
  Sentry.init({
    dsn: DSN,
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV || 'development',
    tracesSampleRate: 0.05,
  });
}
