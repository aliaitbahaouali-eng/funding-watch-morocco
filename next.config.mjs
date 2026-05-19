import { withSentryConfig } from '@sentry/nextjs';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' }
    ]
  },
  experimental: {
    serverActions: { bodySizeLimit: '2mb' }
  }
};

// Sprint 4N — Sentry wrapper. Sans NEXT_PUBLIC_SENTRY_DSN configuré on
// court-circuite withSentryConfig pour garder le build léger. Le DSN gate
// aussi Sentry.init() côté runtime → zero-overhead par défaut.
const sentryOptions = {
  silent: !process.env.SENTRY_AUTH_TOKEN,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  widenClientFileUpload: true,
  reactComponentAnnotation: { enabled: true },
  hideSourceMaps: true,
  disableLogger: true,
  errorHandler: (err) => {
    console.warn('[sentry-build]', err?.message || err);
  },
};

const exportConfig = (process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN)
  ? withSentryConfig(nextConfig, sentryOptions)
  : nextConfig;

export default exportConfig;
