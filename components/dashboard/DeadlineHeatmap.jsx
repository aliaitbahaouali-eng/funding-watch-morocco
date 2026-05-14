/** Heatmap simple des deadlines à venir (8 semaines). */
export default function DeadlineHeatmap({ buckets = [] }) {
  // buckets: array de 56 numbers (8 semaines x 7 jours)
  const max = Math.max(1, ...buckets);
  const color = (v) => {
    if (v === 0) return 'bg-ink-100';
    if (v / max > 0.66) return 'bg-brand-700';
    if (v / max > 0.33) return 'bg-brand-400';
    return 'bg-brand-200';
  };
  return (
    <div>
      <div className="grid grid-cols-8 gap-1.5">
        {buckets.map((v, i) => (
          <div key={i} className={`aspect-square rounded ${color(v)}`} title={`${v} deadline(s)`} />
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between text-2xs font-bold uppercase tracking-widest text-ink-400">
        <span>il y a 8 sem.</span>
        <div className="flex items-center gap-1">
          <span>Moins</span>
          <span className="h-2.5 w-2.5 rounded bg-ink-100" />
          <span className="h-2.5 w-2.5 rounded bg-brand-200" />
          <span className="h-2.5 w-2.5 rounded bg-brand-400" />
          <span className="h-2.5 w-2.5 rounded bg-brand-700" />
          <span>Plus</span>
        </div>
        <span>aujourd'hui</span>
      </div>
    </div>
  );
}
