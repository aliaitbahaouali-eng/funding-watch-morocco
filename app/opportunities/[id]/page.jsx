import { notFound } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import SaveButton from '@/components/opportunity/SaveButton';
import AiCoWriter from '@/components/opportunity/AiCoWriter';
import DonorIntelligence from '@/components/opportunity/DonorIntelligence';
import SuccessProbability from '@/components/opportunity/SuccessProbability';
import ExpertsForOpp from '@/components/experts/ExpertsForOpp';
import CoSubmissionPanel from '@/components/opportunity/CoSubmissionPanel';
import { Badge, Score, Card } from '@/components/ui';
import { createClient } from '@/lib/supabase/server';
import { formatDate, formatAmount, daysUntil, opportunityStatus, scoreTier } from '@/lib/utils';
import { computeCompatibility } from '@/lib/scoring';
import { generateChecklist } from '@/lib/ai';

export const dynamic = 'force-dynamic';

/**
 * Sprint 4K — Métadonnées dynamiques par opportunité.
 * Quand on partage l'URL d'une opp dans WhatsApp / LinkedIn / Slack,
 * la preview affiche titre + résumé + bailleur au lieu d'une URL nue.
 */
export async function generateMetadata({ params }) {
  const supabase = createClient();
  const { data: opp } = await supabase
    .from('opportunities')
    .select('title, summary, donors(name), deadline, morocco_eligible, morocco_eligibility')
    .eq('id', params.id)
    .eq('status', 'published')
    .single();

  if (!opp) return { title: 'Opportunité introuvable' };

  const donorPart = opp.donors?.name ? ` — ${opp.donors.name}` : '';
  const title = `${opp.title}${donorPart}`;
  const deadlinePart = opp.deadline
    ? ` Deadline : ${new Date(opp.deadline).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}.`
    : '';
  // Sprint 5C — badge selon le niveau strict
  const moroccoPart = opp.morocco_eligibility === 'explicit'
    ? ' 🇲🇦 Maroc éligible.'
    : opp.morocco_eligibility === 'regional'
      ? ' 🌍 Région MENA/Afrique.'
      : '';
  const description = (opp.summary || '').slice(0, 220)
    || `Opportunité de financement référencée sur Funding Watch.${deadlinePart}${moroccoPart}`.trim();

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'article',
      url: `/opportunities/${params.id}`,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
    alternates: { canonical: `/opportunities/${params.id}` },
  };
}

export default async function OpportunityDetailPage({ params }) {
  const supabase = createClient();
  const { data: opp, error } = await supabase
    .from('opportunities')
    .select('*, donors(*), sources(name, url), opportunity_themes(theme_id, themes(name_fr, slug))')
    .eq('id', params.id)
    .eq('status', 'published')
    .single();

  if (error || !opp) return notFound();

  // Score si user connecté
  const { data: { user } } = await supabase.auth.getUser();
  let scoring = null, alreadySaved = false, org = null;
  if (user) {
    const { data: orgRow } = await supabase
      .from('organizations')
      .select('*, organization_themes(theme_id, themes(slug, name_fr))')
      .eq('user_id', user.id)
      .single();
    if (orgRow) {
      org = orgRow;
      const oppForScore = {
        morocco_eligible: opp.morocco_eligible,
        deadline: opp.deadline,
        language: opp.language,
        amount_min: opp.amount_min,
        amount_max: opp.amount_max,
        verified: opp.verified,
        themes: (opp.opportunity_themes || []).map(t => ({ slug: t.themes?.slug }))
      };
      const orgForScore = {
        org_type: orgRow.org_type,
        preferred_language: orgRow.preferred_language,
        annual_budget_range: orgRow.annual_budget_range,
        themes: (orgRow.organization_themes || []).map(t => ({ slug: t.themes?.slug }))
      };
      scoring = computeCompatibility(oppForScore, orgForScore);

      const { data: existing } = await supabase
        .from('saved_opportunities')
        .select('id, intent_co_submit, co_submit_message')
        .eq('organization_id', orgRow.id)
        .eq('opportunity_id', opp.id)
        .maybeSingle();
      alreadySaved = !!existing;
      // Sprint 4P — opt-in state (safe even si v27 pas appliquée — columns absentes = undefined)
      org._coSubmitOptIn = existing?.intent_co_submit === true;
      org._coSubmitMessage = existing?.co_submit_message || '';
    }
  }

  // Sprint 4P — Co-submission peers count (visible à tous) + détails (visible si opted-in)
  // Best-effort : si la migration v27 n'est pas appliquée, on retourne 0 / [].
  let coSubmitPeersCount = 0;
  let coSubmitPeers = [];
  try {
    const { count } = await supabase
      .from('saved_opportunities')
      .select('id', { count: 'exact', head: true })
      .eq('opportunity_id', opp.id)
      .eq('intent_co_submit', true);
    coSubmitPeersCount = Math.max(0, (count || 0) - (org?._coSubmitOptIn ? 1 : 0));

    if (org?._coSubmitOptIn) {
      const { data: peerRows } = await supabase
        .from('saved_opportunities')
        .select('organization_id, co_submit_message, organizations(id, name, city, organization_themes(themes(name_fr)))')
        .eq('opportunity_id', opp.id)
        .eq('intent_co_submit', true)
        .neq('organization_id', org.id)
        .limit(20);
      coSubmitPeers = (peerRows || []).map((r) => {
        const themes = (r.organizations?.organization_themes || [])
          .map((ot) => ot.themes?.name_fr)
          .filter(Boolean)
          .slice(0, 3);
        return {
          id: r.organization_id,
          name: r.organizations?.name || 'Asso',
          city: r.organizations?.city || null,
          themes_str: themes.join(' · '),
          message: r.co_submit_message || null,
        };
      });
    }
  } catch {
    // v27 pas appliquée — on garde 0 / []
  }

  const checklist = await generateChecklist(opp);
  const status = opportunityStatus(opp.deadline, opp.status);
  const days = daysUntil(opp.deadline);

  return (
    <main>
      <Header />
      <section className="bg-slate-50 py-10">
        <div className="mx-auto max-w-6xl px-6">
          <a href="/opportunities" className="text-sm font-bold text-slate-500 hover:text-primary">← Toutes les opportunités</a>

          <div className="mt-6 grid gap-6 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              <Card>
                <div className="flex flex-wrap gap-2">
                  {status === 'urgent' && <Badge tone="orange">🔥 Urgent — {days}j</Badge>}
                  {status === 'expired' && <Badge tone="slate">Expiré</Badge>}
                  {opp.morocco_eligibility === 'explicit' && <Badge tone="green">🇲🇦 Maroc éligible</Badge>}
                  {opp.morocco_eligibility === 'regional' && <Badge tone="blue">🌍 Région MENA/Afrique</Badge>}
                  {opp.morocco_eligibility === 'global' && <Badge tone="slate">🌐 Appel global</Badge>}
                  {opp.verified && <Badge tone="blue">✓ Vérifié</Badge>}
                  {opp.type && <Badge tone="slate">{opp.type}</Badge>}
                </div>
                {opp.donors?.name && (
                  <p className="mt-4 text-xs font-bold uppercase tracking-widest text-primary">{opp.donors.name}</p>
                )}
                <h1 className="mt-2 text-3xl font-black leading-tight lg:text-4xl">{opp.title}</h1>
                {opp.summary && <p className="mt-4 text-lg leading-7 text-slate-600">{opp.summary}</p>}

                <div className="mt-6 grid gap-4 sm:grid-cols-3">
                  <div>
                    <p className="text-xs font-bold uppercase text-slate-500">Deadline</p>
                    <p className="mt-1 font-black text-slate-950">{formatDate(opp.deadline)}</p>
                    {days !== null && <p className="text-xs text-slate-500">{days >= 0 ? `Dans ${days} jours` : 'Échue'}</p>}
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase text-slate-500">Montant</p>
                    <p className="mt-1 font-black text-slate-950">{formatAmount(opp)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase text-slate-500">Difficulté</p>
                    <p className="mt-1 font-black text-slate-950">{opp.difficulty_level || '—'}</p>
                  </div>
                </div>
              </Card>

              {opp.description && (
                <Card>
                  <h2 className="text-xl font-black">Description</h2>
                  <p className="mt-3 whitespace-pre-line leading-7 text-slate-700">{opp.description}</p>
                </Card>
              )}

              {opp.eligibility && (
                <Card>
                  <h2 className="text-xl font-black">Critères d'éligibilité</h2>
                  <p className="mt-3 whitespace-pre-line leading-7 text-slate-700">{opp.eligibility}</p>
                </Card>
              )}

              {opp.required_documents?.length > 0 && (
                <Card>
                  <h2 className="text-xl font-black">Documents requis</h2>
                  <ul className="mt-3 list-disc space-y-1 pl-5 text-slate-700">
                    {opp.required_documents.map((d, i) => <li key={i}>{d}</li>)}
                  </ul>
                </Card>
              )}

              {opp.donor_id && (
                <DonorIntelligence donorId={opp.donor_id} currentOpportunityId={opp.id} />
              )}

              <Card>
                <h2 className="text-xl font-black">Checklist candidature</h2>
                <ul className="mt-3 space-y-2">
                  {checklist.map((step, i) => (
                    <li key={i} className="flex gap-3 text-slate-700">
                      <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold">{i + 1}</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            </div>

            <aside className="space-y-6">
              {user && org && (
                <SuccessProbability org={org} opp={opp} />
              )}

              {/* Sprint 4P — Co-soumission */}
              {user && org && (
                <CoSubmissionPanel
                  oppId={opp.id}
                  isOwnerOptIn={org._coSubmitOptIn}
                  ownerMessage={org._coSubmitMessage}
                  peers={coSubmitPeers}
                  peersCount={coSubmitPeersCount}
                />
              )}

              {/* Sprint 4Q — Experts marketplace */}
              <ExpertsForOpp opp={opp} />

              {scoring && (
                <Card>
                  <p className="text-xs font-bold uppercase text-slate-500">Score de compatibilité</p>
                  <div className="mt-3 flex items-center gap-4">
                    <Score value={scoring.score} size="md" />
                    <div>
                      <p className="text-sm font-black">{scoreTier(scoring.score).label}</p>
                      <p className="text-xs text-slate-500">basé sur votre profil</p>
                    </div>
                  </div>
                  <ul className="mt-4 space-y-1 text-xs text-slate-600">
                    {Object.entries(scoring.breakdown).map(([k, v]) => (
                      <li key={k} className="flex justify-between"><span>{k}</span><span className="font-bold">+{v}</span></li>
                    ))}
                  </ul>
                </Card>
              )}

              <Card>
                <p className="text-xs font-bold uppercase text-slate-500">Pays éligibles</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(opp.countries_eligible || []).map(c => <Badge key={c} tone="slate">{c}</Badge>)}
                  {(!opp.countries_eligible || opp.countries_eligible.length === 0) && <span className="text-sm text-slate-500">Non spécifié</span>}
                </div>
              </Card>

              <Card>
                <p className="text-xs font-bold uppercase text-slate-500">Thématiques</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(opp.opportunity_themes || []).map(t => <Badge key={t.theme_id} tone="blue">{t.themes?.name_fr}</Badge>)}
                </div>
              </Card>

              <Card>
                <div className="space-y-3">
                  {user && org ? (
                    <SaveButton opportunityId={opp.id} initiallySaved={alreadySaved} />
                  ) : (
                    <a href={`/login?redirect=/opportunities/${opp.id}`} className="block w-full rounded-full bg-primary px-5 py-3 text-center text-sm font-bold text-white">Connectez-vous pour sauvegarder</a>
                  )}
                  <a href={opp.official_url} target="_blank" rel="noopener noreferrer" className="block w-full rounded-full border border-slate-200 px-5 py-3 text-center text-sm font-bold text-primary">
                    Voir l'appel officiel ↗
                  </a>
                </div>
              </Card>

              {user && org && (
                <Card>
                  <AiCoWriter opportunityId={opp.id} />
                </Card>
              )}
            </aside>
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
