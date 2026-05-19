import { ImageResponse } from 'next/og';

/**
 * Sprint 4K — Image OpenGraph générée dynamiquement à la build / au runtime.
 * Sert pour les partages LinkedIn / Twitter / WhatsApp / Slack du landing.
 *
 * 1200×630 = ratio standard OG (Facebook, LinkedIn, Twitter summary_large_image).
 */

export const runtime = 'edge';
export const alt = 'Funding Watch Morocco — Veille intelligente des financements pour associations';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: 'linear-gradient(135deg, #0a0a0f 0%, #1a0f12 100%)',
          padding: '64px',
          color: 'white',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          position: 'relative',
        }}
      >
        {/* Gradient blob accent */}
        <div
          style={{
            position: 'absolute',
            top: -200,
            right: -100,
            width: 600,
            height: 600,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(207,37,53,0.5) 0%, transparent 70%)',
            filter: 'blur(80px)',
          }}
        />

        {/* Header — Brand + LIVE badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: 'linear-gradient(135deg, #cf2535 0%, #f43f5e 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 28,
              fontWeight: 900,
            }}
          >
            FW
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, opacity: 0.9 }}>Funding Watch</div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: '#10b981',
                boxShadow: '0 0 12px #10b981',
              }}
            />
            <div style={{ fontSize: 16, fontWeight: 700, color: '#10b981', letterSpacing: 1 }}>
              LIVE · VEILLE ACTIVE
            </div>
          </div>
        </div>

        {/* Main title */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            flex: 1,
            marginTop: 32,
          }}
        >
          <div
            style={{
              fontSize: 72,
              fontWeight: 900,
              lineHeight: 1.05,
              letterSpacing: -2,
              maxWidth: 1000,
            }}
          >
            L'intelligence derrière
            <br />
            <span
              style={{
                background: 'linear-gradient(90deg, #f43f5e 0%, #fbbf24 100%)',
                backgroundClip: 'text',
                color: 'transparent',
              }}
            >
              chaque financement.
            </span>
          </div>
          <div
            style={{
              marginTop: 28,
              fontSize: 28,
              fontWeight: 500,
              color: 'rgba(255,255,255,0.7)',
              maxWidth: 900,
              lineHeight: 1.4,
            }}
          >
            Plateforme de veille IA pour les associations marocaines.
            Matching sémantique, AI co-writer, document intelligence.
          </div>
        </div>

        {/* Footer chips */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 'auto' }}>
          {['🇲🇦 Maroc', '⚡ Scoring IA', '📅 90j timeline', '🔭 Donor predictive'].map((tag) => (
            <div
              key={tag}
              style={{
                padding: '10px 18px',
                borderRadius: 999,
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.12)',
                fontSize: 18,
                fontWeight: 700,
              }}
            >
              {tag}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size }
  );
}
