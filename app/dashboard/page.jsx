import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getCurrentOrganization } from '@/lib/auth';
import { computeCompatibility } from '@/lib/scoring';
import { computeSuccessProbability } from '@/lib/probability';
import { computeOrgCompleteness, formatDate, daysUntil } from '@/lib/utils';
import StatTile from '@/components/premium/StatTile';
import LiveBadge from '@/components/premium/LiveBadge';
import ScoreRing from '@/components/premium/ScoreRing';
import ActivityFeed from '@/components/premium/ActivityFeed';
import OpportunityCardPremium from '@/components/premium/OpportunityCardPremium';
import TrendsChart from '@/components/dashboard/TrendsChart';
import DeadlineHeatmap from '@/components/dashboard/DeadlineHeatmap';
import TopMatches from '@/components/dashboard/TopMatches';
import DonorRecommendations from '@/components/dashboard/DonorRecommendations';
import DeadlineTimeline from '@/components/dashboard/DeadlineTimeline';
import CollaborativeRecommendations from '@/components/dashboard/CollaborativeRecommendations';
import PerfectMatchTrigger from '@/components/dashboard/PerfectMatchTrigger';

export default async function DashboardHome({ searchParams }) {
  const supabase = createClient();
  const org = await getCurrentOrganization();

  if (!org) {
    // Pas d'organisation → onboarding obligatoire
    redirect('/onboarding');
  }
  // Si l'orga existe mais pas onboarded, redirige aussi
  if (org && org.onboarding_completed === false) {
    redirect('/onboarding');
  }

  const orgThemeSlugs = (org.organization_themes || []).map(t => t.themes?.slug).filter(Boolean);

  const { data: opps } = await supabase
    .from('opportunities')
    .select('*, donors(name), opportunity_themes(theme_id, themes(name_fr, slug))')
    .eq('status', 'published')
    .gte('deadline', new Date().toISOString().slice(0, 10))
    .order('deadline', { ascending: true })
    .limit(40);

  const orgForScore = {
    org_type: org.org_type,
    preferred_language: org.preferred_language,
    annual_budget_range: org.annual_budget_range,
    themes: orgThemeSlugs.map(s => ({ slug: s }))
  };
  const scored = (opps || []).map(o => {
    const sc = computeCompatibility({
      morocco_eligible: o.morocco_eligible,
      deadline: o.deadline,
      language: o.language,
      amount_min: o.amount_min,
      amount_max: o.amount_max,
      verified: o.verified,
      themes: (o.opportunity_themes || []).map(t => ({ slug: t.themes?.slug }))
    }, orgForScore);
    return { ...o, score: sc.score };
  });
  const recommended = [...scored].sort((a, b) => b.score - a.score).slice(0, 4);

  // Sprint 4I — Dates clés pour deltas week-over-week
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000).toISOString();
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 86400000).toISOString();
  const sevenMonthsAgo = new Date(now.getTime() - 210 * 86400000).toISOString();

  const [
    { count: savedCount },
    { count: appsCount },
    { data: deadlines },
    { count: savedDelta },
    { count: appsDelta },
    { count: newOppsThisWeek },
    { count: newOppsPrevWeek },
    { data: trendsRaw },
    { data: latestPublished },
    { data: nearestSavedDeadlines },
  ] = await Promise.all([
    supabase.from('saved_opportunities').select('id', { count: 'exact', head: true }).eq('organization_id', org.id),
    supabase.from('saved_opportunities').select('id', { count: 'exact', head: true }).eq('organization_id', org.id).in('status', ['analyzing','preparing','submitted']),
    supabase.from('saved_opportunities')
      .select('id, status, reminder_at, opportunities(id, title, deadline, donors(name))')
      .eq('organization_id', org.id)
      .order('reminder_at', { ascending: true })
      .limit(6),
    // KPI deltas (week-over-week)
    supabase.from('saved_opportunities')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', org.id)
      .gte('saved_at', sevenDaysAgo),
    supabase.from('saved_opportunities')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', org.id)
      .in('status', ['analyzing','preparing','submitted'])
      .gte('saved_at', sevenDaysAgo),
    supabase.from('opportunities')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'published')
      .gte('published_at', sevenDaysAgo),
    supabase.from('opportunities')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'published')
      .gte('published_at', fourteenDaysAgo)
      .lt('published_at', sevenDaysAgo),
    // Trends — 7 derniers mois
    supabase.from('opportunities')
      .select('published_at, created_at')
      .gte('created_at', sevenMonthsAgo)
      .eq('status', 'published'),
    // Activity feed — derniers opps publiés
    supabase.from('opportunities')
      .select('id, title, published_at, created_at, donors(name)')
      .eq('status', 'published')
      .order('published_at', { ascending: false, nullsLast: true })
      .order('created_at', { ascending: false })
      .limit(3),
    // Activity feed — deadlines proches de l'orga
    supabase.from('saved_opportunities')
      .select('id, opportunities!inner(id, title, deadline)')
      .eq('organization_id', org.id)
      .gte('opportunities.deadline', new Date().toISOString().slice(0, 10))
      .order('opportunities(deadline)', { ascending: true })
      .limit(1),
  ]);

  const completeness = computeOrgCompleteness(org);
  const avgScore = recommended.length
    ? Math.round(recommended.reduce((s, o) => s + o.score, 0) / recommended.length)
    : 0;

  // Sprint 4I — Trends réels : group by month sur publication_date
  const monthLabelsFr = ['Janv', 'Févr', 'Mars', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sept', 'Oct', 'Nov', 'Déc'];
  const trendsBuckets = new Map();
  // Initialise 7 buckets mensuels (le plus ancien → maintenant)
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    trendsBuckets.set(key, { month: monthLabelsFr[d.getMonth()], opportunities: 0, _ym: key });
  }
  (trendsRaw || []).forEach((o) => {
    const ref = o.published_at || o.created_at;
    if (!ref) return;
    const d = new Date(ref);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (trendsBuckets.has(key)) trendsBuckets.get(key).opportunities += 1;
  });
  const trendsData = Array.from(trendsBuckets.values());
  // Pourcentage de variation sur le dernier vs avant-dernier mois (pour le chip)
  const lastMonthCount = trendsData[trendsData.length - 1]?.opportunities || 0;
  const prevMonthCount = trendsData[trendsData.length - 2]?.opportunities || 0;
  const trendsPct = prevMonthCount > 0
    ? Math.round(((lastMonthCount - prevMonthCount) / prevMonthCount) * 100)
    : null;

  // Heatmap deadlines (8 semaines)
  const buckets = new Array(56).fill(0);
  (opps || []).forEach(o => {
    const d = daysUntil(o.deadline);
    if (d !== null && d >= 0 && d < 56) buckets[55 - d] += 1;
  });

  // Sprint 4I — Deltas KPI réels
  const recommendedDelta = (newOppsThisWeek || 0) - (newOppsPrevWeek || 0);
  function deltaLabel(n, { unit = '', explicit = false } = {}) {
    if (n === null || n === undefined || n === 0) return null;
    const sign = n > 0 ? '+' : '';
    return explicit ? `${sign}${n}${unit} sem.` : `${sign}${n}${unit}`;
  }
  const deadlinesNext30 = buckets.slice(-30).reduce((a, b) => a + b, 0);

  // Sprint 4I — Activity feed réel
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
  const activity = [];
  if (recommended.length > 0) {
    activity.push({
      type: 'match',
      title: `${recommended.length} opportunités matchent votre profil`,
      time: 'à l\'instant',
    });
  }
  (latestPublished || []).slice(0, 2).forEach((o) => {
    const donor = o.donors?.name ? `${o.donors.name} — ` : '';
    activity.push({
      type: 'new',
      title: `${donor}${o.title}`,
      time: relativeTime(o.published_at || o.created_at),
    });
  });
  const nearestSaved = (nearestSavedDeadlines || []).find((s) => s.opportunities);
  if (nearestSaved?.opportunities?.deadline) {
    const d = daysUntil(nearestSaved.opportunities.deadline);
    if (d !== null && d >= 0) {
      activity.push({
        type: 'reminder',
        title: d === 0
          ? `Deadline aujourd'hui : ${nearestSaved.opportunities.title}`
          : `Deadline dans ${d}j : ${nearestSaved.opportunities.title}`,
        time: 'suivi en cours',
      });
    }
  }
  if (activity.length === 0) {
    activity.push({ type: 'match', title: 'Aucune activité récente — reviens dans quelques heures.', time: '' });
  }

  // Sprint 4H+4I — Probabilité de réussite calculée pour chaque carte legacy reco.
  // Réutilise le score déjà computé (computeCompatibility) en matchScore pour
  // éviter de re-déclencher la RPC.
  const recommendedWithProb = await Promise.all(
    recommended.map(async (it) => {
      try {
        const prob = await computeSuccessProbability(
          supabase,
          org,
          { id: it.id, donor_id: it.donor_id, amount_min: it.amount_min, amount_max: it.amount_max },
          { matchScore: it.score }
        );
        return { ...it, _probability: prob };
      } catch {
        return it;
      }
    })
  );

  return (
    <div className="space-y-8">
      {searchParams?.welcome && (
        <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5">
          <p className="font-bold text-emerald-800">🎉 Bienvenue sur Funding Watch</p>
          <p className="mt-1 text-sm text-emerald-700">Complétez votre profil et choisissez vos thématiques pour activer les recommandations.</p>
        </div>
      )}

      {/* Hero dashboard */}
      <div className="relative overflow-hidden rounded-3xl bg-grad-dark p-6 text-white sm:p-8">
        <div className="absolute inset-0 bg-grid opacity-20" />
        <div className="absolute -right-32 -top-32 h-72 w-72 rounded-full bg-grad-brand opacity-30 blur-3xl" />
        <div className="relative flex flex-wrap items-end justify-between gap-6">
          <div>
            <LiveBadge label="Vue d'ensemble" />
            <h1 className="mt-4 font-display text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">
              Bonjour, <span className="text-brand-400">{org.name}</span>
            </h1>
            <p className="mt-2 text-sm text-white/70 sm:text-base">{recommended.length} opportunités recommandées · {appsCount ?? 0} candidatures actives.</p>
          </div>
          <div className="flex items-center gap-4 sm:gap-6">
            <div className="text-center">
              <ScoreRing value={avgScore} size={88} stroke={9} label="Score moyen" />
            </div>
            <div className="text-center">
              <ScoreRing value={completeness} size={88} stroke={9} label="Profil" />
            </div>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Recommandées"
          value={recommended.length}
          delta={deltaLabel(recommendedDelta)}
          icon="🎯"
          hint={newOppsThisWeek > 0 ? `${newOppsThisWeek} nouv. cette semaine` : 'aucune cette semaine'}
        />
        <StatTile
          label="Sauvegardées"
          value={savedCount ?? 0}
          delta={deltaLabel(savedDelta)}
          icon="⭐"
          hint={savedDelta > 0 ? `${savedDelta} ajout(s) 7j` : 'dans votre vault'}
        />
        <StatTile
          label="Candidatures actives"
          value={appsCount ?? 0}
          delta={deltaLabel(appsDelta)}
          icon="📋"
          hint={appsDelta > 0 ? `${appsDelta} nouv. ces 7j` : 'en suivi'}
        />
        <StatTile
          label="Deadlines à 30j"
          value={deadlinesNext30}
          icon="🔥"
          hint={deadlinesNext30 > 0 ? 'dans votre veille' : 'rien d\'urgent'}
        />
      </div>

      {/* ⚡ NOUVEAU — Top Matches IA (matching vectoriel réel) */}
      <TopMatches limit={5} />

      {/* 📅 Sprint 4C — Frise des deadlines (90j) */}
      <DeadlineTimeline windowDays={90} />

      {/* 🔭 Sprint 4E — Donor intelligence prédictive */}
      <DonorRecommendations limit={5} />

      {/* 👥 Sprint 4F — Recommandation collaborative (signal social anonymisé) */}
      <CollaborativeRecommendations limit={5} />

      {/* ✨ Sprint 4C — Modal "Match parfait" (client component, déclenché si score ≥85 jamais vu) */}
      <PerfectMatchTrigger threshold={85} />

      {/* Recommandations IA (ancien système — sera supprimé après validation du matching vectoriel) */}
      <div className="card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="eyebrow">Recommandations IA (legacy)</p>
            <h2 className="mt-2 font-display text-2xl font-black">Les meilleurs matches pour votre association</h2>
          </div>
          <Link href="/opportunities" className="btn-secondary text-2xs uppercase tracking-widest">Tout voir →</Link>
        </div>
        {orgThemeSlugs.length === 0 && (
          <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            Choisissez vos thématiques dans <Link href="/dashboard/preferences" className="font-bold underline">Préférences</Link> pour activer le scoring personnalisé.
          </div>
        )}
        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          {recommendedWithProb.map((it, i) => <OpportunityCardPremium key={it.id} item={it} variant={i === 0 ? 'highlight' : 'default'} probability={it._probability} />)}
          {recommendedWithProb.length === 0 && <p className="col-span-2 text-sm text-ink-500">Aucune opportunité disponible pour l'instant.</p>}
        </div>
      </div>

      {/* Trends + Activity */}
      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="eyebrow">Tendances</p>
              <h3 className="mt-2 font-display text-xl font-black">Opportunités publiées par mois</h3>
            </div>
            {trendsPct !== null && (
              <span className={trendsPct >= 0 ? 'chip-success' : 'chip-warn'}>
                {trendsPct >= 0 ? '↑' : '↓'} {trendsPct >= 0 ? '+' : ''}{trendsPct}%
              </span>
            )}
          </div>
          <div className="mt-4">
            <TrendsChart data={trendsData} />
          </div>
        </div>

        <div className="card">
          <p className="eyebrow">Activité récente</p>
          <h3 className="mt-2 mb-5 font-display text-xl font-black">Dernières mises à jour</h3>
          <ActivityFeed items={activity} />
        </div>
      </div>

      {/* Heatmap deadlines + deadlines liste */}
      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <div className="card">
          <p className="eyebrow">Heatmap deadlines</p>
          <h3 className="mt-2 mb-5 font-display text-xl font-black">Densité des prochaines deadlines (8 sem.)</h3>
          <DeadlineHeatmap buckets={buckets} />
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="eyebrow">Mes deadlines</p>
              <h3 className="mt-2 font-display text-xl font-black">Vos suivis à venir</h3>
            </div>
            <Link href="/dashboard/applications" className="text-2xs font-black uppercase tracking-widest text-brand-700 hover:underline">Voir kanban →</Link>
          </div>
          <div className="mt-4 divide-y divide-ink-100">
            {(deadlines || []).filter(d => d.opportunities).map(d => {
              const days = daysUntil(d.opportunities.deadline);
              return (
                <div key={d.id} className="flex items-center justify-between py-3">
                  <div className="min-w-0 flex-1">
                    <Link href={`/opportunities/${d.opportunities.id}`} className="block truncate font-bold hover:text-brand-700">{d.opportunities.title}</Link>
                    <p className="text-xs text-ink-500">{d.opportunities.donors?.name} · {formatDate(d.opportunities.deadline)}</p>
                  </div>
                  <span className={`chip ${days <= 7 ? 'chip-warn' : days <= 30 ? 'chip-brand' : 'chip-success'}`}>{days >= 0 ? `${days}j` : 'expirée'}</span>
                </div>
              );
            })}
            {(!deadlines || deadlines.length === 0) && (
              <div className="py-6 text-center">
                <p className="text-sm text-ink-500">Aucune deadline en cours.</p>
                <Link href="/opportunities" className="mt-2 inline-block text-2xs font-black uppercase tracking-widest text-brand-700 hover:underline">Sauvegarder ma première →</Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
