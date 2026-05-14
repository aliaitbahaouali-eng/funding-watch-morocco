/** Carte du monde stylisée avec points de financement (SVG inline, léger). */
const POINTS = [
  { x: 50,  y: 38, region: 'Maroc',     v: 92 },
  { x: 56,  y: 42, region: 'Tunisie',   v: 70 },
  { x: 52,  y: 56, region: 'Sénégal',   v: 64 },
  { x: 70,  y: 42, region: 'Égypte',    v: 76 },
  { x: 48,  y: 30, region: 'UE',        v: 88 },
  { x: 20,  y: 36, region: 'USA',       v: 60 },
  { x: 85,  y: 38, region: 'MENA',      v: 72 },
  { x: 75,  y: 60, region: 'Afrique',   v: 81 }
];

export default function WorldMap({ activeRegion = 'Maroc' }) {
  return (
    <div className="relative aspect-[2/1] w-full overflow-hidden rounded-3xl border border-ink-100 bg-grad-dark p-6 text-white">
      <svg viewBox="0 0 100 60" preserveAspectRatio="xMidYMid meet" className="absolute inset-0 h-full w-full opacity-40">
        {/* Continents stylisés (formes très simplifiées) */}
        <path d="M10,20 Q15,15 25,20 T40,22 L42,30 L35,38 L20,40 L12,32 Z" fill="rgba(255,255,255,0.08)" />
        <path d="M44,18 Q55,14 65,18 T78,20 L80,30 L72,32 L58,30 L46,32 Z" fill="rgba(255,255,255,0.08)" />
        <path d="M48,34 Q55,30 62,32 L66,40 L60,52 L52,54 L46,46 Z" fill="rgba(207,37,53,0.18)" />
        <path d="M80,30 Q88,32 92,40 L86,52 L78,54 L74,46 Z" fill="rgba(255,255,255,0.08)" />
        <path d="M70,12 Q78,8 88,12 L92,18 L86,22 L78,20 Z" fill="rgba(255,255,255,0.06)" />
      </svg>

      {/* Points actifs */}
      <div className="absolute inset-0">
        {POINTS.map((p, i) => (
          <div
            key={i}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${p.x}%`, top: `${p.y}%` }}
          >
            <div className="relative">
              <span
                className="absolute inset-0 -m-2 rounded-full bg-brand-500/50 blur-xl"
                style={{ width: `${Math.max(20, p.v / 3)}px`, height: `${Math.max(20, p.v / 3)}px` }}
              />
              <span className={`relative inline-block rounded-full ring-4 ring-white/10 ${p.region === activeRegion ? 'bg-white' : 'bg-brand-500'}`} style={{ width: 8, height: 8 }} />
              {p.region === activeRegion && (
                <span className="absolute left-3 top-1/2 -translate-y-1/2 whitespace-nowrap rounded-full bg-white px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-ink-900">
                  {p.region}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="relative">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/60">Couverture mondiale</p>
        <h3 className="mt-1 text-2xl font-black">{POINTS.length} régions actives</h3>
        <p className="mt-2 max-w-sm text-sm text-white/70">Le Maroc et la zone MENA sont au cœur de notre veille, avec des bailleurs présents sur tous les continents.</p>
      </div>
    </div>
  );
}
