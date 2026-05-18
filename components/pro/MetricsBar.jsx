import Link from 'next/link';

/**
 * MetricsBar — KPIs row Devex-style (sticky en haut de page).
 *
 * Usage :
 *   <MetricsBar metrics={[
 *     { label: 'Opportunités publiées', value: 39, trend: '+12', trendDir: 'up' },
 *     { label: 'Maroc-éligible', value: 9, link: '?morocco=1' },
 *   ]} />
 */
export default function MetricsBar({ metrics = [], className = '' }) {
  if (!metrics.length) return null;

  return (
    <div className={`grid grid-cols-2 gap-px overflow-hidden rounded-card-pro border border-line bg-line sm:grid-cols-4 ${className}`}>
      {metrics.map((m, i) => {
        const inner = (
          <div className="bg-surface-raised p-4 transition hover:bg-data-50/30">
            <div className="metric-label">{m.label}</div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="metric-value">{typeof m.value === 'number' ? m.value.toLocaleString('fr-FR') : m.value}</span>
              {m.trend && (
                <span className={m.trendDir === 'down' ? 'metric-trend-down' : 'metric-trend-up'}>
                  {m.trendDir === 'down' ? '↓' : '↑'} {m.trend}
                </span>
              )}
            </div>
            {m.subtitle && <p className="mt-0.5 text-2xs text-ink-500">{m.subtitle}</p>}
          </div>
        );
        return m.link ? (
          <Link key={i} href={m.link} className="block">{inner}</Link>
        ) : (
          <div key={i}>{inner}</div>
        );
      })}
    </div>
  );
}
