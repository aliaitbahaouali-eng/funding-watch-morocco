/** Timeline horizontale stylisée pour deadlines / événements. */
export default function Timeline({ items = [] }) {
  return (
    <div className="relative">
      <div className="absolute left-0 right-0 top-1/2 h-px -translate-y-1/2 bg-gradient-to-r from-transparent via-brand-300 to-transparent" />
      <ul className="relative flex justify-between gap-4 overflow-x-auto pb-2">
        {items.map((it, i) => (
          <li key={i} className="relative flex min-w-[140px] flex-col items-center text-center">
            <span className="mb-2 inline-block h-3 w-3 rounded-full bg-brand-500 ring-4 ring-brand-100" />
            <p className="text-2xs font-black uppercase tracking-widest text-brand-700">{it.date}</p>
            <p className="mt-1 text-sm font-bold text-ink">{it.title}</p>
            <p className="text-xs text-ink-500">{it.donor}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
