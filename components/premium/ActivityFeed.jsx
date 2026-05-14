/** Flux d'activité avec timeline verticale et points colorés. */
const TYPE_STYLE = {
  new: { color: '#cf2535', label: 'Nouvelle' },
  validated: { color: '#0e9f6e', label: 'Validée' },
  reminder: { color: '#f59f00', label: 'Rappel' },
  match: { color: '#3b82f6', label: 'Match' }
};

export default function ActivityFeed({ items = [] }) {
  return (
    <ol className="relative space-y-5 border-l-2 border-dashed border-ink-200 pl-5">
      {items.map((it, i) => {
        const s = TYPE_STYLE[it.type] || TYPE_STYLE.new;
        return (
          <li key={i} className="relative">
            <span
              className="absolute -left-[26px] top-1 h-3.5 w-3.5 rounded-full ring-4 ring-white"
              style={{ background: s.color }}
            />
            <p className="text-sm font-bold text-ink">
              {it.title}
            </p>
            <p className="mt-0.5 text-xs text-ink-500">
              <span className="font-bold" style={{ color: s.color }}>{s.label}</span> · {it.time}
            </p>
          </li>
        );
      })}
      {items.length === 0 && <li className="text-sm text-ink-500">Aucune activité récente.</li>}
    </ol>
  );
}
