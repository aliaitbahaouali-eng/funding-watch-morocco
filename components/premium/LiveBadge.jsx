export default function LiveBadge({ label = 'LIVE', className = '' }) {
  return (
    <span className={`inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-xs font-black uppercase tracking-widest text-brand-700 ${className}`}>
      <span className="live-dot" />
      {label}
    </span>
  );
}
