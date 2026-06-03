'use client';
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const STATIC_RESULTS = [
  { type: 'page', icon: '🏠', title: 'Accueil',              hint: 'Page d\'accueil',         href: '/',             keywords: 'home accueil landing' },
  { type: 'page', icon: '🎯', title: 'Opportunités',         hint: 'Toutes les opportunités',  href: '/opportunities',keywords: 'opportunities appels projets calls' },
  { type: 'page', icon: '🏷️', title: 'Thématiques',         hint: 'Tous les domaines',        href: '/themes',       keywords: 'themes secteurs categories' },
  { type: 'page', icon: '📅', title: 'Calendrier financement', hint: 'Vue calendaire',         href: '/calendar',     keywords: 'calendar deadline planning' },
  // Sprint 5A.5 — retiré Actualités / Ressources / Formations / Insights du Command-K
  { type: 'page', icon: '👥', title: 'Communauté',           hint: 'Experts et réseau',        href: '/community',    keywords: 'community experts network' },
  { type: 'page', icon: '📈', title: 'Mon dashboard',         hint: 'Espace association',       href: '/dashboard',    keywords: 'dashboard espace assoc' },
  { type: 'page', icon: '🛡️', title: 'Admin',                hint: 'Back-office',              href: '/admin',        keywords: 'admin backoffice' },
  { type: 'page', icon: '📡', title: 'Monitoring veille',     hint: 'Sources & collecte',       href: '/admin/monitoring', keywords: 'monitoring veille sources scrapers' },
  { type: 'page', icon: '🕐', title: 'Opportunités à valider', hint: 'File de validation',      href: '/admin/pending',keywords: 'pending validation moderation' },
  { type: 'page', icon: '⚙️', title: 'Paramètres compte',     hint: 'Mon profil',               href: '/dashboard/settings', keywords: 'settings parametres profil compte' }
];

export default function CommandBar() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [dynamicResults, setDynamicResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);
  const supabase = useRef(null);

  // Init supabase client lazy
  if (!supabase.current && typeof window !== 'undefined') {
    supabase.current = createClient();
  }

  // Ouvrir/fermer via ⌘K
  useEffect(() => {
    function onKey(e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === 'Escape' && open) {
        setOpen(false);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  // Focus input à l'ouverture
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setActive(0);
    } else {
      setQ('');
      setDynamicResults([]);
    }
  }, [open]);

  // Recherche dynamique (opps + themes + donors)
  useEffect(() => {
    if (!q || q.length < 2) {
      setDynamicResults([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const timeout = setTimeout(async () => {
      try {
        if (!supabase.current) return;
        const [opps, themes, donors] = await Promise.all([
          supabase.current
            .from('opportunities')
            .select('id, title, donors(name)')
            .eq('status', 'published')
            .ilike('title', `%${q}%`)
            .limit(5),
          supabase.current
            .from('themes')
            .select('id, name_fr, slug')
            .ilike('name_fr', `%${q}%`)
            .limit(5),
          supabase.current
            .from('donors')
            .select('id, name')
            .ilike('name', `%${q}%`)
            .limit(5)
        ]);
        if (cancelled) return;
        const out = [];
        (opps.data || []).forEach(o => out.push({ type: 'opp', icon: '🎯', title: o.title, hint: o.donors?.name || 'Opportunité', href: `/opportunities/${o.id}` }));
        (themes.data || []).forEach(t => out.push({ type: 'theme', icon: '🏷️', title: t.name_fr, hint: 'Thématique', href: `/opportunities?theme=${t.slug}` }));
        (donors.data || []).forEach(d => out.push({ type: 'donor', icon: '🏛️', title: d.name, hint: 'Bailleur', href: `/opportunities?donor=${d.id}` }));
        setDynamicResults(out);
      } catch (e) {
        // silent — fallback à static
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => { cancelled = true; clearTimeout(timeout); };
  }, [q]);

  // Filtre les pages statiques
  const filteredStatic = useMemo(() => {
    if (!q) return STATIC_RESULTS;
    const lower = q.toLowerCase();
    return STATIC_RESULTS.filter(r => r.title.toLowerCase().includes(lower) || r.keywords.includes(lower) || r.hint.toLowerCase().includes(lower));
  }, [q]);

  const all = useMemo(() => {
    return [...dynamicResults, ...filteredStatic].slice(0, 12);
  }, [dynamicResults, filteredStatic]);

  // Navigation clavier
  useEffect(() => {
    function onKey(e) {
      if (!open) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActive(a => Math.min(a + 1, all.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActive(a => Math.max(a - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const item = all[active];
        if (item) {
          router.push(item.href);
          setOpen(false);
        }
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, active, all, router]);

  const select = useCallback((item) => {
    router.push(item.href);
    setOpen(false);
  }, [router]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center px-4 pt-[15vh]" onClick={() => setOpen(false)}>
      <div className="absolute inset-0 bg-ink-950/60 backdrop-blur-sm animate-fade-in" />

      <div onClick={(e) => e.stopPropagation()} className="relative w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-ink-900/5 animate-slide-up">
        {/* Search input */}
        <div className="flex items-center gap-3 border-b border-ink-100 px-5 py-4">
          <svg className="h-5 w-5 text-ink-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => { setQ(e.target.value); setActive(0); }}
            placeholder="Rechercher opportunités, bailleurs, thématiques, pages…"
            className="flex-1 bg-transparent text-base font-medium placeholder:text-ink-400 focus:outline-none"
          />
          {loading && <div className="h-4 w-4 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />}
          <kbd className="rounded-md bg-ink-100 px-1.5 py-0.5 font-mono text-2xs font-bold text-ink-500">ESC</kbd>
        </div>

        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto">
          {all.length === 0 && q.length >= 2 ? (
            <div className="px-5 py-12 text-center text-sm text-ink-400">
              Aucun résultat pour <b className="text-ink-700">"{q}"</b>
            </div>
          ) : (
            <>
              {/* Group: dynamic */}
              {dynamicResults.length > 0 && (
                <div className="px-2 py-2">
                  <p className="px-3 py-1 text-2xs font-black uppercase tracking-widest text-ink-400">Dans la base</p>
                  {dynamicResults.map((r, i) => (
                    <ResultRow key={`d-${i}`} item={r} active={i === active} onSelect={() => select(r)} onHover={() => setActive(i)} />
                  ))}
                </div>
              )}
              {/* Group: pages */}
              {filteredStatic.length > 0 && (
                <div className="px-2 py-2">
                  <p className="px-3 py-1 text-2xs font-black uppercase tracking-widest text-ink-400">Navigation</p>
                  {filteredStatic.map((r, i) => {
                    const idx = dynamicResults.length + i;
                    return <ResultRow key={`s-${i}`} item={r} active={idx === active} onSelect={() => select(r)} onHover={() => setActive(idx)} />;
                  })}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-ink-100 bg-ink-50 px-5 py-2.5 text-2xs font-bold text-ink-500">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1"><kbd className="rounded bg-white px-1.5 py-0.5 shadow-sm">↑</kbd><kbd className="rounded bg-white px-1.5 py-0.5 shadow-sm">↓</kbd> naviguer</span>
            <span className="flex items-center gap-1"><kbd className="rounded bg-white px-1.5 py-0.5 shadow-sm">↵</kbd> ouvrir</span>
          </div>
          <span className="flex items-center gap-1"><kbd className="rounded bg-white px-1.5 py-0.5 shadow-sm">⌘ K</kbd> Funding Watch</span>
        </div>
      </div>
    </div>
  );
}

function ResultRow({ item, active, onSelect, onHover }) {
  return (
    <button
      onClick={onSelect}
      onMouseEnter={onHover}
      className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition ${active ? 'bg-brand-50' : 'hover:bg-ink-50'}`}
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-base shadow-sm ring-1 ring-ink-100">{item.icon}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-ink">{item.title}</p>
        <p className="truncate text-2xs text-ink-500">{item.hint}</p>
      </div>
      {active && <span className={`text-2xs font-black uppercase tracking-widest text-brand-700`}>↵</span>}
    </button>
  );
}
