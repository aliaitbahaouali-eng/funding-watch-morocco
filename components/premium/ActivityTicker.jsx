'use client';
import { useEffect, useState } from 'react';

const DEMO_ACTIVITIES = [
  '🎯 Hanane M. a sauvegardé UE NDICI MENA 2026',
  '🔥 14 nouvelles opportunités aujourd\'hui',
  '⚡ Dernière collecte UNDP il y a 12 min',
  '✓ Karim B. a soumis sa candidature AFD',
  '🌍 3 nouvelles opportunités · Maroc éligible',
  '✨ Sofia A. a publié son profil organisation',
  '📊 +18% d\'opportunités vs. mois dernier',
  '🏛️ Open Society Foundations · 4 nouveaux appels',
  '👥 +24 associations inscrites cette semaine',
  '🎯 Match IA : 12 opportunités pour secteur ESS'
];

export default function ActivityTicker() {
  const [idx, setIdx] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIdx(i => (i + 1) % DEMO_ACTIVITIES.length);
        setVisible(true);
      }, 250);
    }, 4500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-ink-100 bg-white/85 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-2 text-xs">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <span className="live-dot shrink-0" />
          <span className="text-2xs font-black uppercase tracking-widest text-brand-700">Activité live</span>
          <span className={`truncate text-ink-700 font-medium transition-opacity duration-200 ${visible ? 'opacity-100' : 'opacity-0'}`}>
            {DEMO_ACTIVITIES[idx]}
          </span>
        </div>
        <span className="hidden text-2xs text-ink-400 md:inline">Updated just now</span>
      </div>
    </div>
  );
}
