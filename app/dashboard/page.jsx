import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getCurrentOrganization } from '@/lib/auth';
import { computeCompatibility } from '@/lib/scoring';
import { computeOrgCompleteness, formatDate, daysUntil } from '@/lib/utils';
import LiveBadge from '@/components/premium/LiveBadge';
import ScoreRing from '@/components/premium/ScoreRing';
import TopMatches from '@/components/dashboard/TopMatches';
import DonorRecommendations from '@/components/dashboard/DonorRecommendations';
import DeadlineTimeline from '@/components/dashboard/DeadlineTimeline';
import CollaborativeRecommendations from '@/components/dashboard/CollaborativeRecommendations';
import PerfectMatchTrigger from '@/components/dashboard/PerfectMatchTrigger';
import MoreRecommendations from '@/components/dashboard/MoreRecommendations';
import BetaBanner from '@/components/beta/BetaBanner';

/**
 * Sprint 5A — Dashboard minimaliste.
 *
 * Philosophie "delete first" :
 *  - SUPPRIMÉ : 4 StatTiles cards, TrendsChart, ActivityFeed, DeadlineHeatmap,
 *    section "Recommandations IA (legacy)" avec 4 cards.
 *  - DÉPLACÉ dans accordion <MoreRecommendations> : DonorReco, CollabReco,
 *    DeadlineTimeline.
 *  - GARDÉ au-dessus du fold : Hero compact (greeting + KPI line + CTA),
 *    TopMatches (limit 3), Mes deadlines proches.
 *
 * Avant : 12 sections visuelles. Maintenant : 3 sections + 1 accordion.
 */
export default async function DashboardHome({ searchParams }) {
  const supabase = createClient();
  const org = await getCurrentOrganization();

  if (!org) redirect('/onboarding');
  if (org && org.onboarding_completed === false) redirect('/onboarding');

  const orgThemeSlugs = (org.organization_themes || [])
    .map((t) => t.themes?.slug)
    .filter(Boolean);

  // Une seule query d'opps (limit réduit 40 → 20) pour calculer le score
  // moyen et le compte de recommandations utilisé en haut du dashboard.
  const { data: opps } = await supabase
    .from('opportunities')
    .select('id, morocco_eligible, deadline, language, amount_min, amount_max, verified, donors(name), opportunity_themes(themes(slug))')
    .eq('status', 'published')
    .gte('deadline', new Date().toISOString().slice(0, 10))
    .order('deadline', { ascending: true })
    .limit(20);

  const orgForScore = {
    org_type: org.org_type,
    preferred_language: org.preferred_language,
    annual_budget_range: org.annual_budget_range,
    themes: orgThemeSlugs.map((s) => ({ slug: s })),
  };
  const scored = (opps || []).map((o) => {
    const sc = computeCompatibility(
      {
        morocco_eligible: o.morocco_eligible,
        deadline: o.deadline,
        language: o.language,
        amount_min: o.amount_min,
        amount_max: o.amount_max,
        verified: o.verified,
        themes: (o.opportunity_themes || []).map((t) => ({ slug: t.themes?.slug })),
      },
      orgForScore
    );
    return { ...o, score: sc.score };
  });
  const recommendedCount = scored.filter((o) => o.score >= 50).length;
  const avgScore = scored.length
    ? Math.round(scored.reduce((s, o) => s + o.score, 0) / scored.length)
    : 0;

  // KPI + deadlines : 1 seul Promise.all, queries indispensables seulement
  const [{ count: savedCount }, { count: appsCount }, { data: deadlines }] = await Promise.all([
    supabase
      .from('saved_opportunities')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', org.id),
    supabase
      .from('saved_opportunities')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', org.id)
      .in('status', ['analyzing', 'preparing', 'submitted']),
    supabase
      .from('saved_opportunities')
      .select('id, status, opportunities!inner(id, title, deadline, donors(name))')
      .eq('organization_id', org.id)
      .gte('opportunities.deadline', new Date().toISOString().slice(0, 10))
      .order('opportunities(deadline)', { ascending: true })
      .limit(5),
  ]);

  const completeness = computeOrgCompleteness(org);
  const deadlines30jCount = (deadlines || []).filter((d) => {
    const days = daysUntil(d.opportunities?.deadline);
    return days !== null && days >= 0 && days <= 30;
  }).length;

  return (
    <div className="space-y-8">
      {/* Bannière bêta dismissible */}
      <BetaBanner />

      {searchParams?.welcome && (
        <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5">
          <p className="font-bold text-emerald-800">🎉 Bienvenue sur Funding Watch</p>
          <p className="mt-1 text-sm text-emerald-700">
            Complétez votre profil et choisissez vos thématiques pour activer les recommandations.
          </p>
        </div>
      )}

      {/* ============== HERO COMPACT ============== */}
      <section className="relative overflow-hidden rounded-3xl bg-grad-dark p-6 text-white sm:p-8">
        <div className="absolute inset-0 bg-grid opacity-20" />
        <div className="absolute -right-32 -top-32 h-72 w-72 rounded-full bg-grad-brand opacity-30 blur-3xl" />

        <div className="relative grid items-start gap-6 lg:grid-cols-[1.4fr_auto]">
          <div className="min-w-0">
            <LiveBadge label="Vue d'ensemble" />
            <h1 className="mt-4 font-display text-3xl font-black tracking-tight sm:text-4xl">
              Bonjour, <span className="text-brand-400">{org.name}</span>
            </h1>
            <p className="mt-3 text-base text-white/80 sm:text-lg">
              {recommendedCount > 0 ? (
                <>
                  <b className="text-white">{recommendedCount} opportunité{recommendedCount > 1 ? 's' : ''}</b>{' '}
                  matche{recommendedCount > 1 ? 'nt' : ''} votre profil aujourd'hui.
                </>
              ) : (
                <>Aucun match au-dessus du seuil pour l'instant. Complétez votre profil pour affiner.</>
              )}
            </p>

            {/* KPI inline — 4 chiffres, pas 4 cards */}
            <dl className="mt-5 flex flex-wrap gap-x-6 gap-y-3 text-sm">
              <div>
                <dt className="text-2xs font-black uppercase tracking-widest text-white/50">Sauvegardées</dt>
                <dd className="mt-0.5 font-display text-xl font-black">{savedCount ?? 0}</dd>
              </div>
              <div>
                <dt className="text-2xs font-black uppercase tracking-widest text-white/50">Candidatures actives</dt>
                <dd className="mt-0.5 font-display text-xl font-black">{appsCount ?? 0}</dd>
              </div>
              <div>
                <dt className="text-2xs font-black uppercase tracking-widest text-white/50">Deadlines ≤30j</dt>
                <dd className="mt-0.5 font-display text-xl font-black">{deadlines30jCount}</dd>
              </div>
            </dl>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/opportunities?matched=1"
                className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-2xs font-black uppercase tracking-widest text-ink shadow-card transition hover:bg-white/90"
              >
                Voir mes top matches →
              </Link>
              <Link
                href="/dashboard/preferences"
                className="inline-flex items-center gap-2 rounded-full border border-white/20 px-5 py-3 text-2xs font-black uppercase tracking-widest text-white/90 transition hover:bg-white/10"
              >
                Préférences
              </Link>
            </div>
          </div>

          {/* ScoreRings compacts — passe de 88px à 64px, pas de card séparée */}
          <div className="flex items-start gap-5 lg:flex-col lg:items-end">
            <ScoreRing value={avgScore} size={64} stroke={7} label="Match moyen" />
            <ScoreRing value={completeness} size={64} stroke={7} label="Profil" />
          </div>
        </div>
      </section>

      {/* ============== TOP 3 MATCHES ============== */}
      <TopMatches limit={3} />

      {/* ============== MES DEADLINES PROCHES ============== */}
      <section className="rounded-3xl border border-ink-100 bg-white p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-2xs font-black uppercase tracking-widest text-ink-500">Prochaines deadlines</p>
            <h2 className="mt-1 font-display text-xl font-black text-ink">Vos suivis à venir</h2>
          </div>
          <Link
            href="/dashboard/applications"
            className="text-2xs font-black uppercase tracking-widest text-brand-700 hover:underline"
          >
            Voir kanban →
          </Link>
        </div>

        <div className="mt-4 divide-y divide-ink-100">
          {(deadlines || [])
            .filter((d) => d.opportunities)
            .map((d) => {
              const days = daysUntil(d.opportunities.deadline);
              return (
                <div key={d.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/opportunities/${d.opportunities.id}`}
                      className="block truncate font-bold hover:text-brand-700"
                    >
                      {d.opportunities.title}
                    </Link>
                    <p className="text-xs text-ink-500">
                      {d.opportunities.donors?.name} · {formatDate(d.opportunities.deadline)}
                    </p>
                  </div>
                  <span
                    className={`chip ${
                      days <= 7 ? 'chip-warn' : days <= 30 ? 'chip-brand' : 'chip-success'
                    }`}
                  >
                    {days >= 0 ? `${days}j` : 'expirée'}
                  </span>
                </div>
              );
            })}
          {(!deadlines || deadlines.length === 0) && (
            <div className="py-6 text-center">
              <p className="text-sm text-ink-500">Aucune deadline en cours.</p>
              <Link
                href="/opportunities"
                className="mt-2 inline-block text-2xs font-black uppercase tracking-widest text-brand-700 hover:underline"
              >
                Sauvegarder ma première →
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* ============== ACCORDION "PLUS DE RECOS" ============== */}
      <MoreRecommendations>
        <DonorRecommendations limit={5} />
        <CollaborativeRecommendations limit={5} />
        <DeadlineTimeline windowDays={90} />
      </MoreRecommendations>

      {/* Modal silent — déclenché si un match ≥85 jamais vu */}
      <PerfectMatchTrigger threshold={85} />
    </div>
  );
}
