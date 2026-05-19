'use client';

import { useEffect } from 'react';

/**
 * Sprint 4N — Root error boundary. Capture les erreurs qui surviennent
 * AVANT le rendu du layout (ex. erreurs dans le layout lui-même).
 * Doit définir son propre <html>/<body>.
 */
export default function GlobalError({ error, reset }) {
  useEffect(() => {
    (async () => {
      try {
        const Sentry = await import('@sentry/nextjs');
        Sentry.captureException(error);
      } catch {
        console.error('[global-error]', error);
      }
    })();
  }, [error]);

  return (
    <html lang="fr">
      <body style={{
        margin: 0,
        padding: '80px 20px',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Inter, Arial, sans-serif',
        background: '#fafaf9',
        color: '#0f172a',
        textAlign: 'center',
      }}>
        <div style={{
          maxWidth: 480,
          margin: '0 auto',
          padding: '40px',
          background: '#fff',
          borderRadius: 24,
          boxShadow: '0 4px 24px rgba(15,23,42,0.06)',
        }}>
          <div style={{ fontSize: 56 }}>💥</div>
          <h1 style={{ marginTop: 16, fontSize: 24, fontWeight: 900 }}>
            Erreur critique
          </h1>
          <p style={{ marginTop: 8, color: '#64748b', fontSize: 14 }}>
            Une erreur fatale s'est produite. L'équipe a été notifiée.
          </p>
          <button
            onClick={() => reset()}
            style={{
              marginTop: 24,
              padding: '12px 24px',
              background: '#cf2535',
              color: '#fff',
              border: 'none',
              borderRadius: 999,
              fontWeight: 800,
              fontSize: 12,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              cursor: 'pointer',
            }}
          >
            Recharger →
          </button>
        </div>
      </body>
    </html>
  );
}
