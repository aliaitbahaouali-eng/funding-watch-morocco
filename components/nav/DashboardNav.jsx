'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const ITEMS = [
  { href: '/dashboard', label: 'Vue d\'ensemble', icon: '📊' },
  { href: '/dashboard/profile', label: 'Profil association', icon: '🏢' },
  { href: '/dashboard/preferences', label: 'Préférences', icon: '🎯' },
  { href: '/dashboard/saved', label: 'Sauvegardées', icon: '⭐' },
  { href: '/dashboard/applications', label: 'Candidatures', icon: '📋' },
  { href: '/dashboard/settings', label: 'Paramètres', icon: '⚙️' }
];

export default function DashboardNav() {
  const pathname = usePathname();
  return (
    <aside className="w-full lg:w-60">
      <nav className="flex gap-2 overflow-x-auto rounded-3xl bg-white p-3 shadow-sm lg:flex-col lg:gap-1">
        {ITEMS.map(it => {
          const active = pathname === it.href;
          return (
            <Link key={it.href} href={it.href}
              className={`flex items-center gap-3 whitespace-nowrap rounded-2xl px-4 py-3 text-sm font-bold transition ${active ? 'bg-primary text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
              <span>{it.icon}</span>
              <span>{it.label}</span>
            </Link>
          );
        })}
        <form action="/api/auth/signout" method="POST" className="lg:mt-4">
          <button className="w-full rounded-2xl px-4 py-3 text-left text-sm font-bold text-red-600 hover:bg-red-50">⤴ Déconnexion</button>
        </form>
      </nav>
    </aside>
  );
}
