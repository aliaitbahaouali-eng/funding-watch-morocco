/** Bandeau de logos bailleurs (texte stylisé — pas d'images externes). */
const DONORS = [
  'Union Européenne', 'UNDP', 'GIZ', 'AFD', 'UN Women', 'USAID', 'FAO',
  'Enabel', 'World Bank', 'Fondation Drosos', 'EuropeAid', 'NDICI', 'Open Society',
  'OIF', 'Coopération Suisse', 'JICA', 'KfW', 'Ford Foundation'
];

export default function DonorMarquee() {
  const items = DONORS.map((d, i) => (
    <span key={i} className="flex items-center gap-3 whitespace-nowrap text-base font-display font-black tracking-tight text-ink-400 hover:text-brand-700">
      <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
      {d}
    </span>
  ));
  const doubled = [...items, ...items];

  return (
    <div className="marquee py-2">
      <div className="marquee-track">
        {doubled}
      </div>
    </div>
  );
}
