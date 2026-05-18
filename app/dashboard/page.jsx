import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getCurrentOrganization } from '@/lib/auth';
import { computeCompatibility } from '@/lib/scoring';
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

  const [{ count: savedCount }, { count: appsCount }, { data: deadlines }] = await Promise.all([
    supabase.from('saved_opportunities').select('id', { count: 'exact', head: true }).eq('organization_id', org.id),
    supabase.from('saved_opportunities').select('id', { count: 'exact', head: true }).eq('organization_id', org.id).in('status', ['analyzing','preparing','submitted']),
    supabase.from('saved_opportunities')
      .select('id, status, reminder_at, opportunities(id, title, deadline, donors(name))')
      .eq('organization_id', org.id)
      .order('reminder_at', { ascending: true })
      .limit(6)
  ]);

  const completeness = computeOrgCompleteness(org);
  const avgScore = recommended.length
    ? Math.round(recommended.reduce((s, o) => s + o.score, 0) / recommended.length)
    : 0;

  // Trends fictifs (à remplacer par vraies stats sur publication_date)
  const trendsData = [
    { month: 'Jan', opportunities: 32 },
    { month: 'Fév', opportunities: 38 },
    { month: 'Mar', opportunities: 41 },
    { month: 'Avr', opportunities: 48 },
    { month: 'Mai', opportunities: 56 },
    { month: 'Jun', opportunities: 62 },
    { month: 'Juil', opportunities: 71 }
  ];

  // Heatmap deadlines (8 semaines)
  const buckets = new Array(56).fill(0);
  (opps || []).forEach(o => {
    const d = daysUntil(o.deadline);
    if (d !== null && d >= 0 && d < 56) buckets[55 - d] += 1;
  });

  const activity = [
    { type: 'match', title: `${recommended.length} nouvelles opportunités matchent votre profil`, time: 'à l\'instant' },
    { type: 'new', title: 'UNDP — Procurement notice 2026', time: 'il y a 1 h' },
    { type: 'reminder', title: 'Deadline AFD dans 7 jours', time: 'il y a 2 h' },
    { type: 'validated', title: 'EU NDICI MENA validée', time: 'hier' }
  ];

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
        <StatTile label="Recommandées" value={recommended.length} delta="+24%" icon="🎯" hint="vs sem. dernière" />
        <StatTile label="Sauvegardées" value={savedCount ?? 0} icon="⭐" hint="dans votre vault" />
        <StatTile label="Candidatures actives" value={appsCount ?? 0} delta="+3" icon="📋" hint="en suivi" />
        <StatTile label="Deadlines à 30j" value={buckets.slice(-30).reduce((a, b) => a + b, 0)} icon="🔥" hint="dans votre veille" />
      </div>

      {/* ⚡ NOUVEAU — Top Matches IA (matching vectoriel réel) */}
      <TopMatches limit={5} />

      {/* 🔭 Sprint 4E — Donor intelligence prédictive */}
      <DonorRecommendations limit={5} />

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
          {recommended.map((it, i) => <OpportunityCardPremium key={it.id} item={it} variant={i === 0 ? 'highlight' : 'default'} />)}
          {recommended.length === 0 && <p className="col-span-2 text-sm text-ink-500">Aucune opportunité disponible pour l'instant.</p>}
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
            <span className="chip-success">↑ +18%</span>
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
