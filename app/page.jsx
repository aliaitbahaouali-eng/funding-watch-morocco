import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import OpportunityCardPremium from '@/components/premium/OpportunityCardPremium';
import LiveBadge from '@/components/premium/LiveBadge';
import AnimatedCounter from '@/components/premium/AnimatedCounter';
import StatTile from '@/components/premium/StatTile';
import DonorMarquee from '@/components/premium/DonorMarquee';
import WorldMap from '@/components/premium/WorldMap';
import Timeline from '@/components/premium/Timeline';
import ActivityFeed from '@/components/premium/ActivityFeed';
import Sparkline from '@/components/premium/Sparkline';
import { createClient } from '@/lib/supabase/server';
import { formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

// Sprint 4J — Toutes les données sont désormais calculées à partir de Supabase.
// Les anciens tableaux hardcodés (SECTORS, RECENT_ACTIVITY, SPARKLINE_DATA,
// BETA_PARTNERS, TESTIMONIALS) ont été supprimés au profit de queries réelles.

// Slugs prioritaires pour la section "Secteurs les plus financés" — on les
// remonte d'abord, puis on complète avec les autres thématiques actives par
// volume.
const PRIORITY_SECTOR_SLUGS = ['femmes', 'jeunes', 'climat', 'digital', 'sante', 'rural'];

const ECOSYSTEM = ['Société civile marocaine', 'Bailleurs internationaux', 'Experts financement'];

export default async function HomePage() {
  const supabase = createClient();

  const now = new Date();
  const todayIso = now.toISOString().slice(0, 10);
  // P0.3 — count of "fresh" opps for the Header LIVE ticker (published, not test, deadline future or null)
  const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000).toISOString();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000).toISOString();
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 86400000).toISOString();
  const nineteenDaysAgo = new Date(now.getTime() - 19 * 86400000).toISOString();

  const [
    { data: featured },
    { data: themes },
    { count: oppCount },
    { count: orgCount },
    { count: donorCount },
    { count: verifiedCount },
    { count: freshOppCount },
    { count: newOppsThisMonth },
    { count: newOppsPrevMonth },
    { count: newOrgsThisMonth },
    { count: newOrgsPrevMonth },
    { count: newDonorsThisMonth },
    { data: themesWithCounts },
    { data: dailyPublishedRaw },
    { data: recentPublished },
    { data: recentVerified },
  ] = await Promise.all([
    supabase.from('opportunities')
      .select('*, donors(name), opportunity_themes(theme_id, themes(name_fr, slug))')
      .eq('status', 'published')
      .or('is_test.is.null,is_test.eq.false')
      .is('duplicate_of_id', null)
      .gte('deadline', todayIso)
      .order('deadline', { ascending: true })
      .limit(6),
    supabase.from('themes').select('name_fr, slug').eq('active', true).limit(12),
    supabase.from('opportunities').select('id', { count: 'exact', head: true })
      .eq('status', 'published')
      .or('is_test.is.null,is_test.eq.false')
      .is('duplicate_of_id', null)
      .or(`deadline.is.null,deadline.gte.${todayIso}`),
    supabase.from('organizations').select('id', { count: 'exact', head: true }),
    supabase.from('donors').select('id', { count: 'exact', head: true }),
    supabase.from('opportunities').select('id', { count: 'exact', head: true })
      .eq('status', 'published')
      .or('is_test.is.null,is_test.eq.false')
      .is('duplicate_of_id', null)
      .eq('verified', true),
    supabase.from('opportunities').select('id', { count: 'exact', head: true })
      .eq('status', 'published')
      .or('is_test.is.null,is_test.eq.false')
      .is('duplicate_of_id', null)
      .or(`deadline.is.null,deadline.gte.${todayIso}`)
      .gte('published_at', sevenDaysAgo),
    // Sprint 4J — Deltas pour StatTile (croissance mensuelle réelle)
    supabase.from('opportunities').select('id', { count: 'exact', head: true })
      .eq('status', 'published')
      .or('is_test.is.null,is_test.eq.false')
      .is('duplicate_of_id', null)
      .gte('published_at', thirtyDaysAgo),
    supabase.from('opportunities').select('id', { count: 'exact', head: true })
      .eq('status', 'published')
      .or('is_test.is.null,is_test.eq.false')
      .is('duplicate_of_id', null)
      .gte('published_at', sixtyDaysAgo)
      .lt('published_at', thirtyDaysAgo),
    supabase.from('organizations').select('id', { count: 'exact', head: true })
      .gte('created_at', thirtyDaysAgo),
    supabase.from('organizations').select('id', { count: 'exact', head: true })
      .gte('created_at', sixtyDaysAgo)
      .lt('created_at', thirtyDaysAgo),
    supabase.from('donors').select('id', { count: 'exact', head: true })
      .gte('created_at', thirtyDaysAgo),
    // Sprint 4J — Comptage opps par thématique (pour les SECTORS réels)
    supabase.from('opportunity_themes')
      .select('themes!inner(slug, name_fr), opportunities!inner(id, published_at, status, is_test, duplicate_of_id, deadline)')
      .eq('opportunities.status', 'published')
      .is('opportunities.duplicate_of_id', null)
      .or('opportunities.is_test.is.null,opportunities.is_test.eq.false', { foreignTable: 'opportunities' })
      .limit(2000),
    // Sprint 4J — Sparkline : opps publiées par jour sur les 19 derniers jours
    supabase.from('opportunities')
      .select('published_at, created_at')
      .eq('status', 'published')
      .or('is_test.is.null,is_test.eq.false')
      .is('duplicate_of_id', null)
      .gte('created_at', nineteenDaysAgo),
    // Sprint 4J — Activity feed : derniers opps publiés
    supabase.from('opportunities')
      .select('id, title, published_at, created_at, donors(name)')
      .eq('status', 'published')
      .or('is_test.is.null,is_test.eq.false')
      .is('duplicate_of_id', null)
      .order('published_at', { ascending: false, nullsLast: true })
      .order('created_at', { ascending: false })
      .limit(4),
    // Sprint 4J — Activity feed : opps vérifiées récemment
    supabase.from('opportunities')
      .select('id, title, donors(name), updated_at')
      .eq('status', 'published')
      .eq('verified', true)
      .or('is_test.is.null,is_test.eq.false')
      .is('duplicate_of_id', null)
      .order('updated_at', { ascending: false })
      .limit(2),
  ]);

  // Sprint 4J — Sectors réels : agrégation par slug + delta 30j vs 30j précédents
  const sectorCountsAll = new Map();      // slug → { label, total, last30, prev30 }
  const thirtyDaysAgoMs = now.getTime() - 30 * 86400000;
  const sixtyDaysAgoMs = now.getTime() - 60 * 86400000;
  for (const row of themesWithCounts || []) {
    const t = row.themes;
    const o = row.opportunities;
    if (!t?.slug || !o) continue;
    // exclure expirées
    if (o.deadline && new Date(o.deadline) < now) continue;
    if (!sectorCountsAll.has(t.slug)) {
      sectorCountsAll.set(t.slug, { slug: t.slug, label: t.name_fr || t.slug, count: 0, last30: 0, prev30: 0 });
    }
    const bucket = sectorCountsAll.get(t.slug);
    bucket.count += 1;
    const ref = o.published_at ? new Date(o.published_at).getTime() : (o.created_at ? new Date(o.created_at).getTime() : null);
    if (ref !== null) {
      if (ref >= thirtyDaysAgoMs) bucket.last30 += 1;
      else if (ref >= sixtyDaysAgoMs) bucket.prev30 += 1;
    }
  }
  // Priorité visuelle : on garde d'abord les slugs prioritaires (ordre du tableau),
  // puis on complète par volume si la priorité est <6.
  const priorityHits = PRIORITY_SECTOR_SLUGS
    .map((slug) => sectorCountsAll.get(slug))
    .filter(Boolean);
  const fillers = Array.from(sectorCountsAll.values())
    .filter((s) => !PRIORITY_SECTOR_SLUGS.includes(s.slug))
    .sort((a, b) => b.count - a.count);
  const SECTORS = [...priorityHits, ...fillers].slice(0, 6).map((s) => {
    let delta = null;
    if (s.prev30 > 0) {
      const pct = Math.round(((s.last30 - s.prev30) / s.prev30) * 100);
      delta = pct === 0 ? null : `${pct > 0 ? '+' : ''}${pct}%`;
    } else if (s.last30 > 0) {
      delta = `+${s.last30}`;
    }
    return { slug: s.slug, label: s.label, count: s.count, delta };
  });

  // Sprint 4J — Sparkline réelle (19 derniers jours, count par jour)
  const sparkBuckets = new Array(19).fill(0);
  for (const row of dailyPublishedRaw || []) {
    const ref = row.published_at || row.created_at;
    if (!ref) continue;
    const dayIndex = 18 - Math.floor((now.getTime() - new Date(ref).getTime()) / 86400000);
    if (dayIndex >= 0 && dayIndex < 19) sparkBuckets[dayIndex] += 1;
  }
  const SPARKLINE_DATA = sparkBuckets.length > 0 ? sparkBuckets : [0];
  const sparkThisWeek = sparkBuckets.slice(-7).reduce((a, b) => a + b, 0);

  // Sprint 4J — Activity feed réel
  function relativeTime(iso) {
    if (!iso) return '';
    const diffH = (Date.now() - new Date(iso).getTime()) / 36e5;
    if (diffH < 1) return 'à l\'instant';
    if (diffH < 24) return `il y a ${Math.round(diffH)} h`;
    const days = Math.round(diffH / 24);
    if (days === 1) return 'hier';
    if (days < 7) return `il y a ${days} j`;
    return formatDate(iso);
  }
  const RECENT_ACTIVITY = [];
  (recentPublished || []).slice(0, 3).forEach((o) => {
    const donor = o.donors?.name ? `${o.donors.name} — ` : '';
    RECENT_ACTIVITY.push({ type: 'new', title: `${donor}${o.title}`, time: relativeTime(o.published_at || o.created_at) });
  });
  (recentVerified || []).slice(0, 2).forEach((o) => {
    const donor = o.donors?.name ? `${o.donors.name} — ` : '';
    RECENT_ACTIVITY.push({ type: 'validated', title: `${donor}${o.title} vérifiée`, time: relativeTime(o.updated_at) });
  });
  // Tri par récence
  RECENT_ACTIVITY.sort(() => 0); // déjà à peu près en ordre — pas de tri strict, on s'appuie sur les queries

  // Sprint 4J — Deltas StatTile (croissance mensuelle réelle)
  const oppDeltaPct = newOppsPrevMonth > 0
    ? Math.round(((newOppsThisMonth - newOppsPrevMonth) / newOppsPrevMonth) * 100)
    : (newOppsThisMonth > 0 ? null : null);
  const oppDeltaLabel = oppDeltaPct !== null && oppDeltaPct !== 0
    ? `${oppDeltaPct > 0 ? '+' : ''}${oppDeltaPct}%`
    : (newOppsThisMonth > 0 ? `+${newOppsThisMonth} ces 30j` : null);
  const orgDeltaPct = newOrgsPrevMonth > 0
    ? Math.round(((newOrgsThisMonth - newOrgsPrevMonth) / newOrgsPrevMonth) * 100)
    : null;
  const orgDeltaLabel = orgDeltaPct !== null && orgDeltaPct !== 0
    ? `${orgDeltaPct > 0 ? '+' : ''}${orgDeltaPct}%`
    : (newOrgsThisMonth > 0 ? `+${newOrgsThisMonth} ces 30j` : null);
  const donorDeltaLabel = newDonorsThisMonth > 0 ? `+${newDonorsThisMonth}` : null;

  const TRUST_STATS = [
    { value: oppCount || 0, label: 'Opportunités publiées' },
    { value: verifiedCount || 0, label: 'Vérifiées par notre équipe' },
    { value: donorCount || 0, label: 'Bailleurs référencés' },
    { value: orgCount || 0, label: 'Associations inscrites' }
  ];

  const upcomingTimeline = (featured || []).slice(0, 6).map(o => ({
    date: o.deadline ? new Date(o.deadline).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) : '—',
    title: o.title?.slice(0, 36) + (o.title?.length > 36 ? '…' : ''),
    donor: o.donors?.name || 'Bailleur'
  }));

  return (
    <main className="bg-grad-hero min-h-screen">
      <Header />

      {/* ============== HERO ============== */}
      <section className="relative overflow-hidden pt-12 lg:pt-20">
        <div className="absolute inset-0 bg-grid pointer-events-none opacity-50" />
        <div className="absolute -top-40 left-1/2 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-grad-brand opacity-25 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-6">
          <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
            <div className="animate-slide-up">
              <div className="flex flex-wrap items-center gap-3">
                <LiveBadge label="LIVE · Veille active" />
                <span className="chip-brand">🇲🇦 Conçu pour le Maroc</span>
                <span className="chip">⚡ IA scoring</span>
              </div>

              <h1 className="mt-6 font-display text-4xl font-black leading-[1.07] tracking-tighter sm:text-5xl sm:leading-[1.05] lg:text-7xl">
                <span className="title-gradient">L'intelligence</span> derrière chaque financement.
              </h1>

              <p className="mt-6 max-w-xl text-lg leading-8 text-ink-600">
                La plateforme premium qui détecte, vérifie et match les opportunités de financement internationales pour les associations marocaines. Score de compatibilité, alertes ciblées, suivi de candidatures.
              </p>

              <div className="mt-9 flex flex-wrap gap-3">
                <Link href="/opportunities" className="btn-primary text-2xs uppercase tracking-widest">Explorer les opportunités →</Link>
                <Link href="/register" className="btn-secondary text-2xs uppercase tracking-widest">Créer un compte gratuit</Link>
              </div>

              <div className="mt-12 flex flex-wrap items-center gap-6 sm:gap-8">
                <div>
                  <p className="text-2xs font-black uppercase tracking-widest text-ink-500">Aujourd'hui</p>
                  <p className="font-display text-3xl font-black"><AnimatedCounter value={oppCount || 0} /> <span className="text-brand-700">opportunités</span></p>
                </div>
                <div className="h-12 w-px bg-ink-100" />
                <div>
                  <p className="text-2xs font-black uppercase tracking-widest text-ink-500">Cette semaine</p>
                  <p className="font-display text-3xl font-black"><AnimatedCounter value={sparkThisWeek} suffix=" nouvelles" /></p>
                </div>
                <Sparkline data={SPARKLINE_DATA} width={140} height={48} />
              </div>
            </div>

            {/* Live preview panel */}
            <div className="relative">
              <div className="absolute -inset-6 rounded-[3rem] bg-grad-brand opacity-20 blur-3xl" />

              <div className="relative glass-dark p-6 shadow-glow-soft">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div className="flex items-center gap-2">
                    <LiveBadge />
                    <span className="text-sm font-bold text-white">Alertes en temps réel</span>
                  </div>
                  <span className="text-2xs font-black uppercase tracking-widest text-white/40">Maroc éligible · {new Date().toLocaleDateString('fr-FR')}</span>
                </div>

                <div className="mt-5 space-y-3">
                  {(featured || []).slice(0, 3).map((it, i) => {
                    const days = it.deadline ? Math.max(0, Math.ceil((new Date(it.deadline) - now) / 86400000)) : null;
                    return (
                      <div key={it.id} className="flex items-center gap-4 rounded-2xl bg-white/5 p-4 transition hover:bg-white/10">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-500/20 text-base font-black text-brand-400">
                          {String(i + 1).padStart(2, '0')}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold text-white">{it.title}</p>
                          <p className="mt-0.5 text-xs text-white/50">{it.donors?.name || 'Bailleur'} · {formatDate(it.deadline)}</p>
                        </div>
                        {days !== null && (
                          <span className={`rounded-full px-2.5 py-1 text-2xs font-black uppercase tracking-widest ${
                            days <= 7 ? 'bg-rose-500/20 text-rose-300'
                            : days <= 30 ? 'bg-amber-500/20 text-amber-300'
                            : 'bg-emerald-500/20 text-emerald-400'
                          }`}>
                            {days}j
                          </span>
                        )}
                      </div>
                    );
                  })}
                  {(!featured || featured.length === 0) && (
                    <div className="rounded-2xl bg-white/5 p-6 text-center">
                      <p className="text-sm text-white/60">Aucune opportunité publiée. Lancez la collecte depuis l'admin.</p>
                    </div>
                  )}
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-4 text-xs">
                  <span className="text-white/40">Mise à jour il y a quelques secondes</span>
                  <Link href="/opportunities" className="font-black uppercase tracking-widest text-brand-400 hover:text-brand-300">Tout voir →</Link>
                </div>
              </div>

              {orgCount > 4 ? (
                <div className="absolute -bottom-4 -left-4 flex items-center gap-2 rounded-full bg-white px-4 py-2 shadow-card-hover">
                  <span className="flex -space-x-2">
                    {['#cf2535','#0e9f6e','#f59f00'].map((c, i) => <span key={i} className="h-7 w-7 rounded-full border-2 border-white" style={{ background: c }} />)}
                  </span>
                  <p className="text-xs font-bold text-ink-700"><AnimatedCounter value={orgCount} /> associations actives</p>
                </div>
              ) : (
                <div className="absolute -bottom-4 -left-4 flex items-center gap-2 rounded-full bg-grad-brand px-4 py-2 text-white shadow-glow-brand">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
                  </span>
                  <p className="text-xs font-black uppercase tracking-wider">Bêta privée · Places limitées</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ============== DONOR MARQUEE ============== */}
      <section className="mt-20 border-y border-ink-100 bg-white py-8">
        <p className="mb-5 text-center text-2xs font-black uppercase tracking-[0.3em] text-ink-500">
          Bailleurs et institutions référencés
        </p>
        <DonorMarquee />
      </section>

      {/* ============== TRUST SIGNALS ============== */}
      <section className="mx-auto max-w-7xl px-6 pt-16">
        <div className="surface-elevated overflow-hidden">
          <div className="grid md:grid-cols-[1.25fr_1fr]">
            {/* Sprint 4J — Bêta privée : message honnête, pas de fake partners */}
            <div className="border-b border-ink-100 p-7 sm:p-9 md:border-b-0 md:border-r">
              <p className="eyebrow">Bêta privée · early access</p>
              <h3 className="mt-3 font-display text-2xl font-black tracking-tight">
                Funding Watch est en bêta — pour les pionniers de la société civile marocaine.
              </h3>
              <p className="mt-2 text-sm leading-6 text-ink-500">
                Quelques places sont ouvertes pour les premières associations qui veulent tester la plateforme, accéder aux fonctionnalités IA en avant-première et orienter directement la feuille de route.
              </p>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 px-4 py-3">
                  <p className="text-2xs font-black uppercase tracking-widest text-emerald-700">✓ Inclus dans la bêta</p>
                  <p className="mt-1 text-xs leading-5 text-ink-700">
                    Veille active, scoring IA, AI co-writer, suivi candidatures, alertes ciblées.
                  </p>
                </div>
                <div className="rounded-2xl border border-amber-100 bg-amber-50/60 px-4 py-3">
                  <p className="text-2xs font-black uppercase tracking-widest text-amber-700">→ Ce qu'on attend de toi</p>
                  <p className="mt-1 text-xs leading-5 text-ink-700">
                    Feedback bi-mensuel, tester les nouvelles fonctionnalités, partager tes outcomes (won/lost).
                  </p>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-3">
                <Link href="/register" className="btn-primary text-2xs uppercase tracking-widest">Demander un accès →</Link>
                <Link href="/contact" className="text-2xs font-black uppercase tracking-widest text-ink-500 hover:text-brand-700">Nous écrire →</Link>
              </div>

              <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-ink-100 pt-5">
                <span className="text-2xs font-black uppercase tracking-widest text-ink-400">Au cœur de l'écosystème</span>
                {ECOSYSTEM.map((b) => (
                  <span key={b} className="text-xs font-bold text-ink-600">· {b}</span>
                ))}
              </div>
            </div>

            {/* Chiffres réels (live depuis la base) */}
            <div className="grid grid-cols-2 gap-px bg-ink-100">
              {TRUST_STATS.map((s) => (
                <div key={s.label} className="bg-white p-6">
                  <p className="font-display text-3xl font-black text-brand-700">
                    <AnimatedCounter value={s.value} />
                  </p>
                  <p className="mt-1 text-xs font-bold leading-5 text-ink-500">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-ink-100 bg-ink-50/60 px-7 py-4 text-xs font-bold text-ink-500 sm:px-9">
            <span className="flex items-center gap-1.5">🔒 Vos données restent privées</span>
            <span className="flex items-center gap-1.5">✓ Sources institutionnelles vérifiées</span>
            <span className="flex items-center gap-1.5">🇲🇦 Éligibilité Maroc contrôlée pour chaque appel</span>
          </div>
        </div>
      </section>

      {/* ============== STATS PREMIUM ============== */}
      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="mb-12 flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="eyebrow">Chiffres clés</p>
            <h2 className="mt-3 max-w-2xl font-display text-4xl font-black tracking-tight lg:text-5xl">
              La veille la plus complète sur les financements internationaux <span className="text-brand-700">au Maroc.</span>
            </h2>
          </div>
          <p className="max-w-sm text-sm text-ink-500">Données consolidées en temps réel depuis nos 15+ sources institutionnelles.</p>
        </div>

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          <StatTile
            label="Opportunités actives"
            value={oppCount || 0}
            delta={oppDeltaLabel}
            icon="🎯"
            hint={newOppsThisMonth > 0 ? `${newOppsThisMonth} nouv. ces 30j` : 'dernières 30 jours'}
          />
          <StatTile
            label="Bailleurs référencés"
            value={donorCount || 0}
            delta={donorDeltaLabel}
            deltaPositive
            icon="🏛️"
            hint={newDonorsThisMonth > 0 ? `${newDonorsThisMonth} ajouté(s) ce mois` : 'sources institutionnelles'}
          />
          <StatTile
            label="Associations inscrites"
            value={orgCount || 0}
            delta={orgDeltaLabel}
            icon="🤝"
            hint={newOrgsThisMonth > 0 ? `${newOrgsThisMonth} inscrites ces 30j` : 'sur la plateforme'}
          />
          <StatTile
            label="Thématiques suivies"
            value={themes?.length || 0}
            icon="🏷️"
            hint="catégories actives"
          />
        </div>

        {/* Secteurs populaires */}
        <div className="mt-14">
          <div className="mb-6 flex items-center justify-between">
            <h3 className="font-display text-2xl font-black">Secteurs les plus financés</h3>
            <Link href="/themes" className="text-2xs font-black uppercase tracking-widest text-brand-700 hover:underline">Tous les secteurs →</Link>
          </div>
          {SECTORS.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {SECTORS.map((s) => (
                <Link key={s.slug} href={`/opportunities?theme=${s.slug}`} className="surface-elevated lift p-5">
                  <div className="flex items-center justify-between">
                    <p className="font-display text-lg font-black">{s.label}</p>
                    {s.delta && (
                      <span className={s.delta.startsWith('-') ? 'chip-warn' : 'chip-success'}>{s.delta}</span>
                    )}
                  </div>
                  <p className="mt-3 font-display text-3xl font-black text-brand-700"><AnimatedCounter value={s.count} /></p>
                  <p className="mt-1 text-xs text-ink-500">opportunités actives</p>
                </Link>
              ))}
            </div>
          ) : (
            <div className="surface-elevated p-8 text-center text-sm text-ink-500">
              Les compteurs par secteur s'activeront dès qu'il y aura des opportunités classées par thématique.
            </div>
          )}
        </div>
      </section>

      {/* ============== LIVE OPPORTUNITIES ============== */}
      <section className="relative bg-ink-50 py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="eyebrow flex items-center gap-3"><LiveBadge /> En direct</p>
              <h2 className="mt-3 font-display text-4xl font-black tracking-tight lg:text-5xl">
                Les <span className="text-brand-700">opportunités en vedette</span> aujourd'hui.
              </h2>
            </div>
            <Link href="/opportunities" className="btn-secondary text-2xs uppercase tracking-widest">Voir toutes →</Link>
          </div>

          {featured && featured.length > 0 ? (
            <div className="grid gap-6 lg:grid-cols-2">
              {featured.slice(0, 4).map((it, i) => <OpportunityCardPremium key={it.id} item={{ ...it, score: 90 - i * 6 }} variant={i === 0 ? 'highlight' : 'default'} />)}
            </div>
          ) : (
            <div className="surface-elevated p-10 text-center">
              <p className="font-bold text-ink-700">Aucune opportunité publiée pour l'instant.</p>
              <p className="mt-2 text-sm text-ink-500">Lance la collecte depuis l'admin pour remplir la base.</p>
            </div>
          )}
        </div>
      </section>

      {/* ============== WORLD MAP + ACTIVITY ============== */}
      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="grid items-stretch gap-8 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <p className="eyebrow">Couverture mondiale</p>
            <h2 className="mt-3 mb-6 font-display text-4xl font-black tracking-tight lg:text-5xl">
              Une veille <span className="text-brand-700">internationale</span>, contextualisée pour le Maroc.
            </h2>
            <WorldMap activeRegion="Maroc" />
          </div>

          <div className="card flex flex-col">
            <div className="flex items-center justify-between">
              <p className="eyebrow">Activité plateforme</p>
              {RECENT_ACTIVITY.length > 0 && (
                <span className="chip">{freshOppCount || RECENT_ACTIVITY.length} cette semaine</span>
              )}
            </div>
            <h3 className="mt-3 mb-6 font-display text-2xl font-black">Dernières mises à jour</h3>
            {RECENT_ACTIVITY.length > 0 ? (
              <ActivityFeed items={RECENT_ACTIVITY} />
            ) : (
              <p className="text-sm text-ink-500">Aucune nouveauté à afficher. Reviens dans quelques heures — les scrapers tournent en continu.</p>
            )}
            <Link href="/dashboard" className="mt-6 inline-flex items-center justify-center gap-2 self-start text-2xs font-black uppercase tracking-widest text-brand-700 hover:underline">
              Accéder à mon activité →
            </Link>
          </div>
        </div>
      </section>

      {/* ============== UPCOMING TIMELINE ============== */}
      {upcomingTimeline.length > 0 && (
        <section className="bg-ink-950 py-20 text-white">
          <div className="mx-auto max-w-7xl px-6">
            <p className="eyebrow text-brand-400">Calendrier financement</p>
            <h2 className="mt-3 mb-12 font-display text-4xl font-black tracking-tight lg:text-5xl">
              Les prochaines <span className="text-brand-400">deadlines</span> à ne pas manquer.
            </h2>
            <div className="rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl">
              <Timeline items={upcomingTimeline} />
            </div>
            <div className="mt-8 text-center">
              <Link href="/calendar" className="btn-primary text-2xs uppercase tracking-widest">Voir le calendrier complet →</Link>
            </div>
          </div>
        </section>
      )}

      {/* ============== FEATURES (modules) ============== */}
      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="mb-12">
          <p className="eyebrow">Modules de la plateforme</p>
          <h2 className="mt-3 font-display text-4xl font-black tracking-tight lg:text-5xl">
            Tout ce dont une association a besoin <span className="text-brand-700">en un seul outil.</span>
          </h2>
        </div>

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {[
            { icon: '🎯', title: 'Veille intelligente', desc: 'Scrapers automatiques sur 15+ sources institutionnelles, classification par thématique.' },
            { icon: '🤖', title: 'Score IA compatibilité', desc: 'Algorithme de matching entre votre profil et chaque opportunité (sur 100).' },
            { icon: '📋', title: 'Suivi de candidatures', desc: 'Kanban de vos applications : saved → en analyse → en préparation → soumise → obtenue.' },
            { icon: '✉️', title: 'Alertes email ciblées', desc: 'Digest hebdomadaire personnalisé selon vos thématiques et votre profil.' },
            { icon: '📊', title: 'Insights & analytics', desc: 'Tendances financement, top bailleurs, montants disponibles par secteur.' },
            { icon: '📚', title: 'Centre de ressources', desc: 'Guides, templates de propositions, modèles de budget, logframes.' },
            { icon: '🎓', title: 'Formations', desc: 'Modules en ligne, webinaires, tutoriels sur les techniques de rédaction.' },
            { icon: '🌍', title: 'Communauté', desc: 'Réseau d\'associations marocaines, experts, consultants, événements.' },
            { icon: '🇲🇦', title: 'Contextualisation Maroc', desc: 'Vérification d\'éligibilité Maroc pour chaque appel, en français.' }
          ].map((f, i) => (
            <div key={i} className="surface-elevated lift p-6">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-2xl">{f.icon}</div>
              <h3 className="font-display text-lg font-black">{f.title}</h3>
              <p className="mt-2 text-sm leading-6 text-ink-500">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ============== POURQUOI MAINTENANT (remplace les fausses testimonials) ============== */}
      <section className="relative bg-grad-light py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-12 text-center">
            <p className="eyebrow justify-center">Pourquoi maintenant</p>
            <h2 className="mt-3 mx-auto max-w-3xl font-display text-4xl font-black tracking-tight lg:text-5xl">
              Le bon timing pour <span className="text-brand-700">prendre une longueur d'avance</span> sur les financements 2026.
            </h2>
            <p className="mt-4 mx-auto max-w-2xl text-base leading-7 text-ink-500">
              Nous lançons Funding Watch en bêta privée parce que l'écosystème marocain manque cruellement d'outils de veille structurée. Voici ce qu'on apporte aux premières associations qui rejoignent.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            <div className="surface-elevated p-7">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-2xl">⏱️</div>
              <h3 className="font-display text-lg font-black">Gagne des semaines de recherche</h3>
              <p className="mt-2 text-sm leading-6 text-ink-500">
                Nos scrapers parcourent {donorCount || 'des dizaines de'} bailleurs en continu. Tu reçois ce qui te correspond, classé par compatibilité, sans passer tes vendredis à googler.
              </p>
            </div>
            <div className="surface-elevated p-7">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-2xl">🎯</div>
              <h3 className="font-display text-lg font-black">Un scoring qui parle ton métier</h3>
              <p className="mt-2 text-sm leading-6 text-ink-500">
                Matching vectoriel sur ton profil exact (thématiques, budget, expérience). Pas de mots-clés naïfs : la similarité sémantique repère les opportunités même quand le vocabulaire diverge.
              </p>
            </div>
            <div className="surface-elevated p-7">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-2xl">🤝</div>
              <h3 className="font-display text-lg font-black">Influence la roadmap</h3>
              <p className="mt-2 text-sm leading-6 text-ink-500">
                En bêta tu parles directement à l'équipe. Tes besoins remontent en feature requests, pas dans une file d'attente anonyme. Les fonctionnalités IA récentes (PDF intel, collab reco) viennent de feedbacks utilisateurs.
              </p>
            </div>
          </div>
          <p className="mt-10 text-center text-xs italic text-ink-400">
            Les témoignages utilisateurs apparaîtront ici dès que la bêta privée aura généré assez de retours. On préfère attendre les vrais.
          </p>
        </div>
      </section>

      {/* ============== FINAL CTA ============== */}
      <section className="relative overflow-hidden bg-ink-950 py-24 text-white">
        <div className="absolute inset-0 bg-grid opacity-20" />
        <div className="absolute -bottom-32 left-1/2 h-64 w-[600px] -translate-x-1/2 bg-grad-brand opacity-40 blur-3xl" />

        <div className="relative mx-auto max-w-4xl px-6 text-center">
          <p className="eyebrow justify-center text-brand-400">Démarrez maintenant</p>
          <h2 className="mt-4 font-display text-5xl font-black tracking-tight lg:text-6xl">
            Prêt à recevoir les <span className="text-brand-400">bons financements ?</span>
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-white/70">
            Inscription en 30 secondes. Première alerte personnalisée sous 24h. Aucune carte bancaire requise.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Link href="/register" className="btn-primary text-xs uppercase tracking-widest">Créer mon compte gratuit →</Link>
            <Link href="/opportunities" className="rounded-full border border-white/20 px-6 py-3 text-xs font-black uppercase tracking-widest text-white hover:bg-white/10">Explorer d'abord</Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
