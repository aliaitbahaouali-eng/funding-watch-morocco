/**
 * Sprint 4K — robots.txt généré dynamiquement.
 * Autorise tous les crawlers sur les pages publiques, interdit les zones
 * privées (dashboard, admin, API) et pointe vers le sitemap.
 */

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://funding-watch-morocco.vercel.app';

export default function robots() {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin/',
          '/api/',
          '/dashboard/',
          '/onboarding/',
          '/invite/',
          '/reset-password/',
          '/forgot-password/',
        ],
      },
    ],
    sitemap: `${APP_URL}/sitemap.xml`,
    host: APP_URL,
  };
}
