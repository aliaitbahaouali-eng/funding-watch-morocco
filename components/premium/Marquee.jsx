/** Bandeau qui fait défiler horizontalement de manière infinie. */
export default function Marquee({ items = [], reverse = false }) {
  const doubled = [...items, ...items];
  return (
    <div className="marquee">
      <div className="marquee-track" style={reverse ? { animationDirection: 'reverse' } : undefined}>
        {doubled.map((it, i) => (
          <div key={i} className="flex items-center gap-3 whitespace-nowrap text-sm font-bold text-ink-500">
            {typeof it === 'string' ? it : it}
          </div>
        ))}
      </div>
    </div>
  );
}
