import AnimatedCounter from './AnimatedCounter';

/** Tuile de KPI premium avec icône, valeur animée, sparkline optionnelle. */
export default function StatTile({
  label,
  value,
  prefix = '',
  suffix = '',
  delta,             // ex: '+12.4%'
  deltaPositive = true,
  icon,
  hint
}) {
  return (
    <div className="surface-elevated p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-ink-500">{label}</p>
          <p className="mt-2 font-display text-4xl font-black text-ink">
            <AnimatedCounter value={Number(value) || 0} prefix={prefix} suffix={suffix} />
          </p>
          {hint && <p className="mt-1 text-xs text-ink-500">{hint}</p>}
        </div>
        {icon && (
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
            {icon}
          </div>
        )}
      </div>
      {delta && (
        <p className={`mt-4 inline-flex items-center gap-1 text-xs font-bold ${deltaPositive ? 'text-emerald-600' : 'text-brand-600'}`}>
          <span>{deltaPositive ? '↑' : '↓'}</span> {delta} <span className="text-ink-400">vs. 30j</span>
        </p>
      )}
    </div>
  );
}
