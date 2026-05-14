/** Ring SVG premium pour le score de compatibilité. */
export default function ScoreRing({ value = 0, size = 96, stroke = 10, label = 'Score' }) {
  const v = Math.max(0, Math.min(100, value));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - v / 100);
  const color = v >= 90 ? '#0e9f6e' : v >= 70 ? '#cf2535' : v >= 50 ? '#f59f00' : '#828a98';

  return (
    <div className="relative inline-flex flex-col items-center" style={{ width: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(15,17,22,0.06)" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          fill="none"
          style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.16,1,0.3,1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-2xl font-black" style={{ color }}>{v}</span>
        <span className="text-2xs font-bold uppercase tracking-widest text-ink-400">{label}</span>
      </div>
    </div>
  );
}
