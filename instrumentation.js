/**
 * Sprint 4N — Hook d'instrumentation Next.js 13+.
 * Charge la config Sentry appropriée selon le runtime (node ou edge).
 * No-op si SENTRY_DSN absent.
 */

export async function register() {
  if (!process.env.SENTRY_DSN && !process.env.NEXT_PUBLIC_SENTRY_DSN) return;

  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}

// Re-export pour le capture d'erreurs côté request (Next.js 15+)
export async function onRequestError(err, request, context) {
  try {
    const Sentry = await import('@sentry/nextjs');
    Sentry.captureRequestError(err, request, context);
  } catch {
    // Sentry pas init → ignore silently
  }
}
