'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

/**
 * MobileBottomNav — navigation fixe en bas pour mobile (≤md).
 *
 * Pattern iOS/Android natif : 5 icônes max, libellés courts, indicateur
 * d'onglet actif. Touch targets ≥ 44px (Apple HIG).
 *
 * Affichée seulement quand l'utilisateur est loggué (auth context lit
 * un cookie ou state — pour l'instant on l'affiche toujours, à raffiner).
 *
 * Style : barre blanche fixe, ombre subtile, border-top, safe area iOS.
 */
const TABS = [
  { href: '/dashboard', label: 'Accueil', icon: HomeIcon },
  { href: '/opportunities', label: 'Opps', icon: SearchIcon },
  { href: '/dashboard/applications', label: 'Suivi', icon: KanbanIcon },
  { href: '/dashboard/profile', label: 'Profil', icon: UserIcon },
];

export default function MobileBottomNav() {
  const pathname = usePathname();

  // Ne pas afficher sur landing publique + login + register + onboarding + unsubscribe
  const hideOn = ['/', '/login', '/register', '/unsubscribe', '/forgot-password'];
  if (hideOn.some((p) => pathname === p) || pathname.startsWith('/onboarding') || pathname.startsWith('/admin')) {
    return null;
  }

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white/95 shadow-[0_-4px_12px_rgba(15,17,22,0.05)] backdrop-blur-md md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="mx-auto flex max-w-md items-stretch justify-around">
        {TABS.map((tab) => {
          const active = pathname === tab.href || pathname.startsWith(tab.href + '/');
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex min-h-[56px] flex-1 flex-col items-center justify-center gap-1 px-1 py-2 transition active:scale-95 ${
                active ? 'text-brand-600' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Icon className="h-5 w-5" filled={active} />
              <span className={`text-[10px] font-bold tracking-wide ${active ? 'text-brand-700' : ''}`}>
                {tab.label}
              </span>
              {active && (
                <span className="absolute top-0 left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full bg-brand-600" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

// ─── Icons (inline SVG, no extra deps) ──────────────────────
function HomeIcon({ className, filled }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 9.75L12 3l9 6.75V20a1 1 0 0 1-1 1h-5v-7h-6v7H4a1 1 0 0 1-1-1V9.75z" />
    </svg>
  );
}
function SearchIcon({ className, filled }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <circle cx="11" cy="11" r="7" fill={filled ? 'currentColor' : 'none'} fillOpacity={filled ? 0.15 : 0} />
      <path strokeLinecap="round" strokeLinejoin="round" d="m20 20-3.5-3.5" />
    </svg>
  );
}
function KanbanIcon({ className, filled }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" className={className}>
      <rect x="3" y="4" width="5" height="16" rx="1.5" fillOpacity={filled ? 0.2 : 0} />
      <rect x="10" y="4" width="5" height="10" rx="1.5" fillOpacity={filled ? 0.3 : 0} />
      <rect x="17" y="4" width="4" height="6" rx="1.5" fillOpacity={filled ? 0.4 : 0} />
    </svg>
  );
}
function UserIcon({ className, filled }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <circle cx="12" cy="8" r="4" fill={filled ? 'currentColor' : 'none'} fillOpacity={filled ? 0.2 : 0} />
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 21c0-4.42 3.58-8 8-8s8 3.58 8 8" />
    </svg>
  );
}
