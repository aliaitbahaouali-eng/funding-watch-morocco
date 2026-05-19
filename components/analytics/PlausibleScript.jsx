import Script from 'next/script';

/**
 * Sprint 4N — Plausible Analytics — privacy-friendly, sans cookies, GDPR-OK
 * (pas de consent banner requis).
 *
 * Activé uniquement si NEXT_PUBLIC_PLAUSIBLE_DOMAIN est défini (ex.
 * "funding-watch-morocco.vercel.app" ou le custom domain).
 *
 * Self-hosted ou plausible.io : configurable via NEXT_PUBLIC_PLAUSIBLE_SRC
 * (défaut https://plausible.io/js/script.js).
 *
 * Tracking custom events :
 *   import { trackEvent } from '@/lib/analytics';
 *   trackEvent('feedback_sent', { props: { kind: 'bug' } });
 */
export default function PlausibleScript() {
  const domain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;
  if (!domain) return null;

  const src = process.env.NEXT_PUBLIC_PLAUSIBLE_SRC || 'https://plausible.io/js/script.js';

  return (
    <Script
      defer
      data-domain={domain}
      src={src}
      strategy="afterInteractive"
    />
  );
}
