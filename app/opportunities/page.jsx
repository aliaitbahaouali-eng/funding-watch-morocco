import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import OpportunityCardPremium from '@/components/premium/OpportunityCardPremium';
import OpportunityFilters from '@/components/opportunity/OpportunityFilters';
import LiveBadge from '@/components/premium/LiveBadge';
import AnimatedCounter from '@/components/premium/AnimatedCounter';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
const PAGE_SIZE = 12;

export default async function OpportunitiesPage({ searchParams }) {
  const supabase = createClient();
  const sp = searchParams || {};
  const page = Math.max(1, parseInt(sp.page || '1'));
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const [{ data: themes }, { data: donors }] = await Promise.all([
    supabase.from('themes').select('id, name_fr, slug').eq('active', true).order('name_fr'),
    supabase.from('donors').select('id, name').order('name')
  ]);

  // P1.7 — multi-thèmes via `?themes=slug1,slug2,...` (avec rétrocompat `?theme=slug`)
  let oppIdsByTheme = null;
  const themeSlugs = (sp.themes || sp.theme || '').toString().split(',').filter(Boolean);
  if (themeSlugs.length > 0 && themeSlugs[0] !== 'all') {
    const themeIds = (themes || []).filter((x) => themeSlugs.includes(x.slug)).map((x) => x.id);
    if (themeIds.length > 0) {
      const { data: links } = await supabase
        .from('opportunity_themes')
        .select('opportunity_id')
        .in('theme_id', themeIds);
      oppIdsByTheme = Array.from(new Set((links || []).map((l) => l.opportunity_id)));
      if (oppIdsByTheme.length === 0) oppIdsByTheme = ['00000000-0000-0000-0000-000000000000'];
    }
  }

  const today = new Date().toISOString().slice(0, 10);

  let query = supabase
    .from('opportunities')
    .select('*, donors(id, name), opportunity_themes(theme_id, themes(name_fr, slug))', { count: 'exact' })
    .eq('status', 'published')
    // P0.1 — hide test fixtures (v12)
    .or('is_test.is.null,is_test.eq.false')
    // Sprint dedup — hide cross-source duplicates (v13)
    .is('duplicate_of_id', null);

  // P0.2 — by default, hide expired opps. ?expired=1 to include them.
  if (sp.expired !== '1') {
    query = query.or(`deadline.is.null,deadline.gte.${today}`);
  }

  // ⭐ NGO-fit filter (S1) : par défaut on n'affiche que les opps pertinentes ONG
  // (ngo_relevant=true) OU non encore classées (ngo_relevant IS NULL) pour ne rien cacher au début.
  // Toggle ?all=1 pour bypasser (admin/debug)
  if (sp.all !== '1') {
    query = query.or('ngo_relevant.is.null,ngo_relevant.eq.true');
  }

  // P0 keyword fallback toujours dispo. Sprint 4B : si q présent ET pas
  // ?keyword=1 explicite, on tente d'abord la recherche sémantique (RPC
  // pgvector). Si le fallback OpenAI hash kicke ou si la RPC échoue,
  // retombe sur le .ilike.
  let semanticIds = null;
  let semanticMeta = null;
  if (sp.q && sp.keyword !== '1') {
    try {
      const { getEmbedding } = await import('@/lib/embeddings');
      const { detectQueryLang, rerankResults } = await import('@/lib/search-helpers');
      const { vector, model } = await getEmbedding(sp.q);
      // Si on est en fallback hash, le sémantique n'a aucun sens → on skip.
      if (model && model.startsWith('openai/')) {
        const { data: matches, error: searchErr } = await supabase.rpc('semantic_search_opportunities', {
          p_query_embedding: vector,
          p_limit: 50,
          p_morocco_only: sp.morocco === '1',
        });
        if (!searchErr && Array.isArray(matches) && matches.length > 0) {
          const queryLang = detectQueryLang(sp.q);
          const reranked = rerankResults(matches, { queryLang, preferMorocco: true });
          semanticIds = reranked.map((r) => r.opportunity_id);
          semanticMeta = { queryLang, model, count: reranked.length };
        }
      }
    } catch (e) {
      console.warn('[opportunities] semantic search failed, fallback keyword:', e?.message);
    }
  }

  if (semanticIds && semanticIds.length > 0) {
    query = query.in('id', semanticIds);
  } else if (sp.q) {
    query = query.or(`title.ilike.%${sp.q}%,summary.ilike.%${sp.q}%,description.ilike.%${sp.q}%`);
  }
  if (sp.donor && sp.donor !== 'all') query = query.eq('donor_id', sp.donor);
  if (sp.morocco === '1') query = query.eq('morocco_eligible', true);
  if (sp.verified === '1') query = query.eq('verified', true);
  if (sp.difficulty && sp.difficulty !== 'all') query = query.eq('difficulty_level', sp.difficulty);
  if (sp.deadline && sp.deadline !== 'all') {
    const target = new Date();
    target.setDate(target.getDate() + parseInt(sp.deadline));
    query = query.lte('deadline', target.toISOString().slice(0, 10));
  }
  if (oppIdsByTheme) query = query.in('id', oppIdsByTheme);

  // Sprint 4B : en mode sémantique on respecte l'ordre du re-rank (sauf
  // si l'utilisateur a choisi un tri explicite via le selector).
  const sort = sp.sort || (semanticIds ? 'relevance' : 'deadline');
  if (sort === 'deadline') query = query.order('deadline', { ascending: true, nullsFirst: false });
  else if (sort === 'recent') query = query.order('published_at', { ascending: false, nullsFirst: false });
  else if (sort === 'amount') query = query.order('amount_max', { ascending: false, nullsFirst: false });
  // sort === 'relevance' → on laisse Postgres rendre dans l'ordre du IN(semanticIds)
  // (Postgres ne garantit pas l'ordre, mais avec l'index + le scope limité aux ~50
  // IDs ça reste ok ; on re-trie côté JS après fetch pour garantir l'ordre exact).

  query = query.range(from, to);
  let { data: opportunities, count } = await query;
  if (semanticIds && sort === 'relevance' && Array.isArray(opportunities)) {
    const order = new Map(semanticIds.map((id, idx) => [id, idx]));
    opportunities = [...opportunities].sort((a, b) => (order.get(a.id) ?? 999) - (order.get(b.id) ?? 999));
  }
  const totalPages = Math.max(1, Math.ceil((count || 0) / PAGE_SIZE));

  // KPIs latéraux
  const [{ count: morCount }, { count: verCount }] = await Promise.all([
    supabase.from('opportunities').select('id', { count: 'exact', head: true }).eq('status', 'published').eq('morocco_eligible', true),
    supabase.from('opportunities').select('id', { count: 'exact', head: true }).eq('status', 'published').eq('verified', true)
  ]);

  return (
    <main className="min-h-screen bg-ink-50">
      <Header />

      {/* Hero compact (P1.5 — réduit pour que les filtres + cartes soient au-dessus du fold) */}
      <section className="relative overflow-hidden border-b border-ink-100 bg-white py-5 sm:py-7">
        <div className="absolute inset-0 bg-grid opacity-40" />
        <div className="absolute -top-40 right-0 h-60 w-60 rounded-full bg-brand-500/15 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <LiveBadge label="Base d'opportunités" />
                <span className="chip-brand">🇲🇦 {morCount ?? 0}</span>
                <span className="chip-success">✓ {verCount ?? 0}</span>
              </div>
              <h1 className="mt-2 font-display text-2xl font-black tracking-tight sm:text-3xl lg:text-4xl">
                <AnimatedCounter value={count || 0} /> <span className="title-gradient">opportunités</span> en cours
              </h1>
            </div>
            <div className="hidden lg:flex items-center gap-2 rounded-full border border-ink-200 bg-white px-3 py-1.5 text-xs font-bold text-ink-500 shadow-card">
              <kbd className="rounded-md bg-ink-100 px-1.5 py-0.5 font-mono text-2xs text-ink-600">⌘K</kbd>
              <span>recherche rapide</span>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-8">
        {/* Filtres sticky */}
        <div className="sticky top-[88px] z-30">
          <OpportunityFilters themes={themes || []} donors={donors || []} />
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-bold text-ink-700">
            {count ?? 0} résultat(s) <span className="text-ink-400">· page {page} sur {totalPages}</span>
            {semanticMeta && (
              <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-2xs font-bold text-emerald-700">
                ⚡ Recherche sémantique{semanticMeta.queryLang !== 'fr' ? ` · ${semanticMeta.queryLang.toUpperCase()}` : ''}
              </span>
            )}
          </p>
          <div className="flex items-center gap-2 text-2xs font-black uppercase tracking-widest text-ink-500">
            <span>Vue :</span>
            <button className="rounded-md bg-ink-900 px-2.5 py-1 text-white">Grid</button>
            <button className="rounded-md px-2.5 py-1 hover:bg-ink-100">List</button>
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          {(opportunities || []).map((item, i) => (
            <OpportunityCardPremium key={item.id} item={{ ...item, score: 70 + (i % 30) }} variant={i === 0 ? 'highlight' : 'default'} />
          ))}
          {(!opportunities || opportunities.length === 0) && (
            <div className="col-span-2 surface-elevated p-10 text-center">
              <p className="font-display text-xl font-black text-ink-700">Aucun résultat</p>
              <p className="mt-2 text-sm text-ink-500">Essayez d'élargir vos filtres ou lancez la collecte depuis le back-office admin.</p>
              <Link href="/opportunities" className="btn-secondary mt-5 inline-flex text-2xs uppercase tracking-widest">Réinitialiser</Link>
            </div>
          )}
        </div>

        {totalPages > 1 && (
          <nav className="mt-12 flex justify-center gap-2">
            {Array.from({ length: totalPages }).slice(0, 10).map((_, i) => {
              const p = i + 1;
              const next = new URLSearchParams(sp);
              next.set('page', String(p));
              const active = p === page;
              return (
                <a key={p} href={`?${next.toString()}`} className={`rounded-full px-4 py-2 text-sm font-bold transition ${active ? 'btn-primary' : 'bg-white text-ink-600 shadow-card hover:bg-ink-50'}`}>{p}</a>
              );
            })}
          </nav>
        )}
      </section>

      <Footer />
    </main>
  );
}
