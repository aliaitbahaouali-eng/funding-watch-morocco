'use client';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import LiveBadge from '@/components/premium/LiveBadge';

// Sprint 5A.5 — Nav réduite : on retire Actualités / Ressources / Insights
// (placeholders peu actionables). Restent les pages avec vraie valeur produit.
const NAV = [
  { href: '/opportunities', label: 'Opportunités' },
  { href: '/themes', label: 'Thématiques' },
  { href: '/community', label: 'Communauté' }
];

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [open, setOpen] = useState(false);
  const [dark, setDark] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [q, setQ] = useState('');
  const [freshCount, setFreshCount] = useState(null); // P0.3 — vrai count des opps Maroc-éligibles publiées et non expirées

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      setUser(user);
      if (user) {
        const { data } = await supabase.from('profiles').select('role, full_name').eq('id', user.id).single();
        setRole(data?.role);
      }
    });
    // Fresh count for the LIVE ticker — anon read, no auth required.
    (async () => {
      const todayIso = new Date().toISOString().slice(0, 10);
      const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
      const { count } = await supabase
        .from('opportunities')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'published')
        .eq('morocco_eligible', true)
        .or('is_test.is.null,is_test.eq.false')
        .or(`deadline.is.null,deadline.gte.${todayIso}`)
        .gte('published_at', sevenDaysAgo);
      if (typeof count === 'number') setFreshCount(count);
    })();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => setUser(session?.user ?? null));
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    setDark(document.documentElement.classList.contains('dark'));
    return () => { subscription.unsubscribe(); window.removeEventListener('scroll', onScroll); };
  }, []);

  const toggleDark = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
    try { localStorage.setItem('fw-theme', next ? 'dark' : 'light'); } catch {}
  };

  const onSearch = (e) => {
    e.preventDefault();
    if (q.trim()) router.push(`/opportunities?q=${encodeURIComponent(q.trim())}`);
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  };

  return (
    <header className={`sticky top-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/80 backdrop-blur-xl border-b border-ink-100 shadow-card' : 'bg-transparent'} ${dark ? 'dark:bg-ink-950/80 dark:border-ink-800' : ''}`}>
      {/* Ticker mini bar */}
      <div className="hidden border-b border-ink-100 bg-ink-950 text-xs font-bold text-white md:block dark:border-ink-800">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-1.5">
          <div className="flex items-center gap-3">
            <LiveBadge label="LIVE" />
            <span className="text-white/80">
              {freshCount === null
                ? 'Veille active'
                : freshCount === 0
                  ? 'Aucune nouvelle opp · Maroc éligible cette semaine'
                  : `${freshCount} nouvelle${freshCount > 1 ? 's' : ''} opportunité${freshCount > 1 ? 's' : ''} · Maroc éligible`}
            </span>
          </div>
          <div className="flex items-center gap-5 text-white/60">
            <Link href="/pricing" className="hover:text-white">Tarifs</Link>
            <Link href="/about" className="hover:text-white">À propos</Link>
            <Link href="/contact" className="hover:text-white">Contact</Link>
            <button onClick={toggleDark} className="hover:text-white">{dark ? '☀ Light' : '☾ Dark'}</button>
          </div>
        </div>
      </div>

      <div className="mx-auto flex max-w-7xl items-center gap-4 px-6 py-3 lg:gap-8">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-grad-brand text-base font-black text-white shadow-glow-brand">
            F
            <span className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-white" />
          </div>
          <div className="leading-tight">
            <p className="flex items-center gap-2 font-display text-base font-black text-ink dark:text-white">
              Funding Watch
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-widest text-emerald-700" title="Plateforme en bêta privée — vos retours sont précieux">
                BETA
              </span>
            </p>
            <p className="text-2xs font-bold uppercase tracking-widest text-brand-700">Morocco · Intelligence</p>
          </div>
        </Link>

        <form onSubmit={onSearch} className="ml-auto hidden flex-1 max-w-md lg:flex">
          <div className="relative w-full">
            <input
              value={q} onChange={(e) => setQ(e.target.value)}
              placeholder="Rechercher une opportunité, un bailleur, une thématique…"
              className="w-full rounded-full border border-ink-200 bg-white/80 py-2.5 pl-10 pr-16 text-sm font-medium text-ink shadow-card placeholder:text-ink-400 focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-50 dark:border-ink-700 dark:bg-ink-900 dark:text-white"
            />
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-base">🔎</span>
            <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-md bg-ink-100 px-1.5 py-0.5 font-mono text-2xs font-bold text-ink-500 dark:bg-ink-800 dark:text-ink-300 lg:inline">⌘K</kbd>
          </div>
        </form>

        <nav className="hidden items-center gap-1 lg:flex">
          {NAV.map((it) => {
            const active = pathname === it.href || (it.href !== '/' && pathname.startsWith(it.href));
            return (
              <Link key={it.href} href={it.href} className={`nav-link ${active ? 'active' : ''}`}>
                {it.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          {user ? (
            <>
              {(role === 'admin' || role === 'veille') && (
                <Link href="/admin" className="hidden lg:inline-flex rounded-full border border-ink-200 px-3 py-2 text-2xs font-black uppercase tracking-widest text-ink-700 hover:border-brand-300 hover:text-brand-700 dark:border-ink-700 dark:text-white">
                  Admin
                </Link>
              )}
              <Link href="/dashboard" className="btn-primary text-2xs uppercase tracking-widest">Dashboard</Link>
              <button onClick={handleLogout} className="hidden rounded-full p-2 text-ink-500 hover:bg-ink-100 lg:inline-block dark:hover:bg-ink-800" title="Déconnexion">⤴</button>
            </>
          ) : (
            <>
              <Link href="/login" className="nav-link hidden lg:inline-flex">Se connecter</Link>
              <Link href="/register" className="btn-primary text-2xs uppercase tracking-widest">Créer un compte</Link>
            </>
          )}
          <button onClick={() => setOpen(!open)} className="ml-1 flex h-10 w-10 items-center justify-center rounded-xl border border-ink-200 bg-white text-ink-700 lg:hidden dark:border-ink-700 dark:bg-ink-900 dark:text-white" aria-label="Menu">
            <span className="block w-4">
              <span className={`mb-1 block h-0.5 w-full bg-current transition-transform ${open ? 'translate-y-1.5 rotate-45' : ''}`} />
              <span className={`mb-1 block h-0.5 w-full bg-current transition-opacity ${open ? 'opacity-0' : ''}`} />
              <span className={`block h-0.5 w-full bg-current transition-transform ${open ? '-translate-y-1.5 -rotate-45' : ''}`} />
            </span>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="border-t border-ink-100 bg-white px-6 py-5 lg:hidden dark:border-ink-800 dark:bg-ink-900">
          <form onSubmit={onSearch} className="mb-5">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher…" className="input" />
          </form>
          <nav className="flex flex-col gap-1">
            {NAV.map((it) => (
              <Link key={it.href} href={it.href} onClick={() => setOpen(false)} className="rounded-2xl px-4 py-3 font-bold text-ink hover:bg-ink-50 dark:text-white dark:hover:bg-ink-800">
                {it.label}
              </Link>
            ))}
            <div className="my-3 border-t border-ink-100 dark:border-ink-800" />
            {user ? (
              <>
                <Link href="/dashboard" onClick={() => setOpen(false)} className="rounded-2xl px-4 py-3 font-bold text-ink">Dashboard</Link>
                {(role === 'admin' || role === 'veille') && (
                  <Link href="/admin" onClick={() => setOpen(false)} className="rounded-2xl px-4 py-3 font-bold text-brand-700">Admin</Link>
                )}
                <button onClick={handleLogout} className="rounded-2xl px-4 py-3 text-left font-bold text-ink-500">Déconnexion</button>
              </>
            ) : (
              <>
                <Link href="/login" onClick={() => setOpen(false)} className="rounded-2xl px-4 py-3 font-bold text-ink">Se connecter</Link>
                <Link href="/register" onClick={() => setOpen(false)} className="rounded-2xl bg-brand-600 px-4 py-3 text-center font-black uppercase tracking-widest text-white">Créer un compte</Link>
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
