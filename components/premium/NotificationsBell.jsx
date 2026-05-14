'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

// Demo data — à brancher sur la table notifications plus tard
const DEMO_NOTIFS = [
  { id: 1, type: 'match', title: '3 nouvelles opportunités matchent votre profil', time: 'il y a 12 min', href: '/dashboard', unread: true },
  { id: 2, type: 'deadline', title: 'Deadline UE NDICI dans 7 jours', time: 'il y a 2 h', href: '/opportunities', unread: true },
  { id: 3, type: 'new', title: 'UNDP a publié 5 nouveaux appels', time: 'il y a 4 h', href: '/opportunities', unread: true },
  { id: 4, type: 'system', title: 'Votre profil est complété à 78%', time: 'hier', href: '/dashboard/profile', unread: false }
];

const ICON = {
  match: '🎯',
  deadline: '🔥',
  new: '✨',
  system: '⚙️'
};

export default function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState(DEMO_NOTIFS);
  const ref = useRef(null);

  useEffect(() => {
    function onClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const unread = items.filter(i => i.unread).length;

  const markAllRead = () => {
    setItems(items.map(i => ({ ...i, unread: false })));
  };

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(!open)} className="relative flex h-10 w-10 items-center justify-center rounded-full border border-ink-200 bg-white text-ink-700 hover:border-brand-300 hover:text-brand-700">
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-brand-600 px-1 text-[10px] font-black text-white ring-2 ring-white">
            {unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-50 w-96 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-2xl ring-1 ring-ink-900/5">
          <div className="flex items-center justify-between border-b border-ink-100 px-5 py-3">
            <p className="font-display text-sm font-black">Notifications</p>
            {unread > 0 && (
              <button onClick={markAllRead} className="text-2xs font-bold uppercase tracking-widest text-brand-700 hover:underline">
                Tout marquer lu
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-ink-400">Aucune notification</div>
            ) : (
              items.map(n => (
                <Link key={n.id} href={n.href} onClick={() => setOpen(false)}
                  className="flex items-start gap-3 border-b border-ink-50 px-5 py-3 last:border-b-0 hover:bg-ink-50">
                  <span className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-xl bg-brand-50 text-base">{ICON[n.type]}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm leading-snug text-ink-900">{n.title}</p>
                    <p className="mt-0.5 text-2xs text-ink-400">{n.time}</p>
                  </div>
                  {n.unread && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-500" />}
                </Link>
              ))
            )}
          </div>
          <Link href="/dashboard" onClick={() => setOpen(false)} className="block border-t border-ink-100 bg-ink-50 px-5 py-2.5 text-center text-2xs font-black uppercase tracking-widest text-brand-700 hover:bg-ink-100">
            Voir mon dashboard →
          </Link>
        </div>
      )}
    </div>
  );
}
