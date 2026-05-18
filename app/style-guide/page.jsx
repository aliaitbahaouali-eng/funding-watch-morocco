import Link from 'next/link';
import DataTable from '@/components/pro/DataTable';
import MetricsBar from '@/components/pro/MetricsBar';

export const metadata = {
  title: 'Style Guide — Funding Watch Pro',
  robots: { index: false, follow: false },
};

/**
 * /style-guide — preview du design system Devex-pro
 * Page exposée pour valider la nouvelle direction visuelle avant
 * d'étendre la refonte à toutes les pages.
 */
export default function StyleGuidePage() {
  const sampleRows = [
    { id: 1, title: 'EU NDICI — Climate Action MENA 2026', donor: 'Union Européenne', deadline: '15 juin 2026', score: 92, status: 'Vérifié', morocco: true },
    { id: 2, title: 'Fondation Drosos — Femmes & ESS', donor: 'Fondation Drosos', deadline: '30 juin 2026', score: 87, status: 'Vérifié', morocco: true },
    { id: 3, title: 'AFD — Société civile Maghreb', donor: 'AFD', deadline: '10 juil. 2026', score: 81, status: 'Vérifié', morocco: true },
    { id: 4, title: 'UN Women — Innovation Genre', donor: 'UN Women', deadline: '22 juil. 2026', score: 76, status: 'Brouillon', morocco: false },
    { id: 5, title: 'Mott Foundation — Civil Society', donor: 'Mott Foundation', deadline: '5 août 2026', score: 68, status: 'Vérifié', morocco: false },
  ];

  return (
    <main className="bg-page-pro min-h-screen">
      <div className="mx-auto max-w-7xl px-6 py-8">

        {/* ── Header ─────────────────────────────────────── */}
        <header className="mb-10">
          <div className="text-3xs font-bold uppercase tracking-wider-2 text-data-600">Design System · v2</div>
          <h1 className="mt-1 font-display text-4xl font-black tracking-tighter-2 text-ink-900">
            Style Guide <span className="text-brand-600">·</span> Funding Watch Pro
          </h1>
          <p className="mt-2 text-sm text-ink-500 max-w-2xl">
            Refonte data-dense pro inspirée de Devex / Crunchbase.
            Palette neutre dominante, accent rouge brand réservé aux CTAs et badges importants,
            bleu data pour les liens et indicateurs interactifs.
          </p>
        </header>

        {/* ── 1. Palette ─────────────────────────────────────── */}
        <section className="mb-12">
          <div className="section-pro">
            <div>
              <div className="section-pro-label">01 · Palette</div>
              <h2 className="section-pro-title">Couleurs</h2>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <ColorGroup name="Brand (CTAs)" shades={[
              { hex: '#fde3e5', label: '100' },
              { hex: '#f06f7a', label: '400' },
              { hex: '#cf2535', label: '600 ◆' },
              { hex: '#751821', label: '900' },
            ]} />
            <ColorGroup name="Data (links)" shades={[
              { hex: '#dbeafe', label: '100' },
              { hex: '#60a5fa', label: '400' },
              { hex: '#2563eb', label: '600 ◆' },
              { hex: '#1e3a8a', label: '900' },
            ]} />
            <ColorGroup name="Ink (texte)" shades={[
              { hex: '#eef0f3', label: '100' },
              { hex: '#828a98', label: '400' },
              { hex: '#3f4754', label: '600' },
              { hex: '#0b0d10', label: '900 ◆' },
            ]} />
            <ColorGroup name="Sémantique" shades={[
              { hex: '#059669', label: 'success' },
              { hex: '#d97706', label: 'warning' },
              { hex: '#0284c7', label: 'info' },
              { hex: '#dc2626', label: 'danger' },
            ]} />
          </div>
        </section>

        {/* ── 2. Typographie ──────────────────────────────────── */}
        <section className="mb-12">
          <div className="section-pro">
            <div>
              <div className="section-pro-label">02 · Typographie</div>
              <h2 className="section-pro-title">Hiérarchie</h2>
            </div>
          </div>
          <div className="card-pro p-8 space-y-4">
            <div>
              <div className="metric-label">Display · Sora · 4xl black</div>
              <p className="font-display text-4xl font-black tracking-tighter-2 text-ink-900">L'intelligence derrière chaque financement.</p>
            </div>
            <div>
              <div className="metric-label">Display · Sora · 2xl black</div>
              <p className="font-display text-2xl font-black tracking-tighter-2 text-ink-900">Section title pour la veille premium</p>
            </div>
            <div>
              <div className="metric-label">Body · Inter · base</div>
              <p className="text-base text-ink-700">La plateforme premium qui détecte, vérifie et match les opportunités de financement internationales pour les associations marocaines.</p>
            </div>
            <div>
              <div className="metric-label">Mono tabular · pour data tables</div>
              <p className="font-mono text-sm tabular-nums text-ink-900">2,547,832 EUR · 92.4% · 156 jours</p>
            </div>
            <div>
              <div className="metric-label">Eyebrow · uppercase wider-2</div>
              <div className="text-3xs font-bold uppercase tracking-wider-2 text-data-600">Veille active · 18 mai 2026</div>
            </div>
          </div>
        </section>

        {/* ── 3. Metrics Bar ──────────────────────────────────── */}
        <section className="mb-12">
          <div className="section-pro">
            <div>
              <div className="section-pro-label">03 · Composant</div>
              <h2 className="section-pro-title">MetricsBar — KPIs sticky</h2>
            </div>
          </div>
          <MetricsBar metrics={[
            { label: 'Opportunités publiées', value: 39, trend: '+12', trendDir: 'up' },
            { label: 'Maroc-éligible', value: 9, link: '/opportunities?morocco=1' },
            { label: 'Bailleurs actifs', value: 27 },
            { label: 'Score moyen', value: '74.8', subtitle: 'sur orgas matchées' },
          ]} />
        </section>

        {/* ── 4. Pills & Chips ────────────────────────────────── */}
        <section className="mb-12">
          <div className="section-pro">
            <div>
              <div className="section-pro-label">04 · Statuts & Tags</div>
              <h2 className="section-pro-title">Pills & Chips</h2>
            </div>
          </div>
          <div className="card-pro space-y-5 p-6">
            <div>
              <div className="metric-label mb-2">Status pills (sémantique)</div>
              <div className="flex flex-wrap gap-2">
                <span className="pill-success">✓ Vérifié</span>
                <span className="pill-warning">⏰ Deadline proche</span>
                <span className="pill-info">i Brouillon</span>
                <span className="pill-danger">✖ Rejeté</span>
                <span className="pill-brand">🇲🇦 Maroc-éligible</span>
                <span className="pill-neutral">Archivé</span>
                <span className="pill-data">Cosine 0.87</span>
              </div>
            </div>
            <div>
              <div className="metric-label mb-2">Chip-tags (taxonomies SDG / DAC / populations)</div>
              <div className="flex flex-wrap gap-1.5">
                <span className="chip-tag">ODD 5 · Genre</span>
                <span className="chip-tag-active">ODD 13 · Climat</span>
                <span className="chip-tag">DAC 41 · Société civile</span>
                <span className="chip-tag">Jeunes 15-29</span>
                <span className="chip-tag">Femmes en milieu rural</span>
                <span className="chip-tag">MENA</span>
              </div>
            </div>
            <div>
              <div className="metric-label mb-2">Score badges</div>
              <div className="flex flex-wrap gap-2">
                <span className="score-badge-excellent">92</span>
                <span className="score-badge-good">76</span>
                <span className="score-badge-low">52</span>
              </div>
            </div>
          </div>
        </section>

        {/* ── 5. DataTable ────────────────────────────────────── */}
        <section className="mb-12">
          <div className="section-pro">
            <div>
              <div className="section-pro-label">05 · Composant</div>
              <h2 className="section-pro-title">DataTable — densité Devex-pro</h2>
              <p className="section-pro-subtitle">Header sticky, hover bleu data, padding dense, tabular nums.</p>
            </div>
            <Link href="/opportunities" className="link-data text-sm">Voir page /opportunities →</Link>
          </div>
          <DataTable
            caption="5 opportunités · classées par score IA"
            columns={[
              { key: 'title', label: 'Opportunité', render: (v, row) => (
                <div>
                  <Link href="#" className="link-strong block">{v}</Link>
                  {row.morocco && <span className="pill-brand mt-1 inline-flex">🇲🇦 Maroc</span>}
                </div>
              ) },
              { key: 'donor', label: 'Bailleur', render: (v) => <span className="link-data">{v}</span> },
              { key: 'deadline', label: 'Deadline' },
              { key: 'status', label: 'Statut', render: (v) => v === 'Vérifié' ? <span className="pill-success">✓ {v}</span> : <span className="pill-info">{v}</span> },
              { key: 'score', label: 'Score', align: 'right', render: (v) => (
                <span className={v >= 85 ? 'score-badge-excellent' : v >= 65 ? 'score-badge-good' : 'score-badge-low'}>{v}</span>
              ) },
            ]}
            rows={sampleRows}
          />
        </section>

        {/* ── 6. Links & CTAs ─────────────────────────────────── */}
        <section className="mb-12">
          <div className="section-pro">
            <div>
              <div className="section-pro-label">06 · Actions</div>
              <h2 className="section-pro-title">Links & boutons</h2>
            </div>
          </div>
          <div className="card-pro space-y-4 p-6">
            <div>
              <div className="metric-label mb-2">Liens (Devex pattern : bleu data underline)</div>
              <p className="text-sm text-ink-700">
                Voir le <a href="#" className="link-data">profil complet du bailleur</a>, ou consulter les{' '}
                <a href="#" className="link-data">12 opportunités similaires</a> publiées cette année.
                Lien <a href="#" className="link-strong">surligné fort</a> sans soulignement.
              </p>
            </div>
            <div>
              <div className="metric-label mb-2">Boutons (existant — conservés)</div>
              <div className="flex flex-wrap gap-3">
                <button className="btn-primary">Action principale</button>
                <button className="btn-secondary">Action secondaire</button>
                <button className="btn-ghost">Action discrète</button>
                <button className="btn-dark">Action sombre</button>
              </div>
            </div>
          </div>
        </section>

        {/* ── Footer ─────────────────────────────────────────── */}
        <div className="mt-16 rounded-card-pro border border-line bg-surface-muted p-6 text-center">
          <p className="text-sm text-ink-600">
            <span className="font-bold text-ink-900">Phase A livrée.</span>{' '}
            Si tu valides cette direction, on passe à Phase B (refonte /opportunities + dashboard + landing avec ces composants).
          </p>
        </div>
      </div>
    </main>
  );
}

function ColorGroup({ name, shades }) {
  return (
    <div className="card-pro overflow-hidden p-0">
      <div className="border-b border-line-subtle bg-surface-muted px-4 py-2.5 text-3xs font-bold uppercase tracking-wider-2 text-ink-700">
        {name}
      </div>
      <div className="grid grid-cols-4">
        {shades.map((s) => (
          <div key={s.label} className="aspect-square flex flex-col items-center justify-center text-3xs font-mono" style={{ background: s.hex, color: getContrast(s.hex) }}>
            <span>{s.label}</span>
            <span className="opacity-60">{s.hex}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function getContrast(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.55 ? '#0b0d10' : '#ffffff';
}
