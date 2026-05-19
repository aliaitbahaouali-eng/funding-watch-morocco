/**
 * Sprint 4N — Sentry côté serveur Node (Vercel serverless functions).
 *
 * Activé uniquement si SENTRY_DSN est défini. Capture les erreurs des
 * server actions, route handlers, et server components.
 */

import * as Sentry from '@sentry/nextjs';

const DSN = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

if (DSN) {
  Sentry.init({
    dsn: DSN,
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV || 'development',
    tracesSampleRate: 0.05,
    // Ne pas reporter les erreurs banales de navigation Supabase auth
    ignoreErrors: [
      /JWT expired/i,
      /Invalid refresh token/i,
      /No API key found/i, // attendu en local sans .env
    ],
  });
}
