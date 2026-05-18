'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const ITEMS = [
  { href: '/admin', label: 'Dashboard', icon: '📊' },
  { href: '/admin/monitoring', label: 'Monitoring veille', icon: '📡' },
  { href: '/admin/opportunities', label: 'Opportunités', icon: '🎯' },
  { href: '/admin/pending', label: 'À valider', icon: '🕐' },
  { href: '/admin/donors', label: 'Bailleurs', icon: '🏛️' },
  { href: '/admin/sources', label: 'Sources', icon: '🌐' },
  { href: '/admin/themes', label: 'Thématiques', icon: '🏷️' },
  { href: '/admin/users', label: 'Utilisateurs', icon: '👥' },
  { href: '/admin/logs', label: 'Logs collecte', icon: '📜' },
  { href: '/admin/emails', label: 'Emails', icon: '✉️' },
  { href: '/admin/email-preview', label: 'Preview digest', icon: '👁️' }
];

export default function AdminNav() {
  const pathname = usePathname();
  return (
    <aside className="w-full lg:w-60">
      <nav className="flex gap-2 overflow-x-auto rounded-3xl bg-white p-3 shadow-sm lg:flex-col lg:gap-1">
        {ITEMS.map(it => {
          const active = pathname === it.href || (it.href !== '/admin' && pathname.startsWith(it.href));
          return (
            <Link key={it.href} href={it.href}
              className={`flex items-center gap-3 whitespace-nowrap rounded-2xl px-4 py-3 text-sm font-bold transition ${active ? 'bg-slate-950 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
              <span>{it.icon}</span>
              <span>{it.label}</span>
            </Link>
          );
        })}
        <Link href="/dashboard" className="mt-4 rounded-2xl px-4 py-3 text-sm font-bold text-slate-500 hover:bg-slate-100">
          ← Retour côté assoc.
        </Link>
      </nav>
    </aside>
  );
}
