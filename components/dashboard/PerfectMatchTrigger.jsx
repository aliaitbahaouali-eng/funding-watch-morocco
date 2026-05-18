import { createClient } from '@/lib/supabase/server';
import { getCurrentOrganization } from '@/lib/auth';
import PerfectMatchModal from './PerfectMatchModal';

/**
 * Wrapper server qui fetch les top matches puis passe au client component
 * PerfectMatchModal. Évite de dupliquer l'appel RPC fait par TopMatches.
 *
 * On limite à 5 matches : suffisant pour trouver le premier >= 85 jamais vu.
 */
export default async function PerfectMatchTrigger({ threshold = 85 }) {
  const supabase = createClient();
  const org = await getCurrentOrganization();
  if (!org || !org.onboarding_completed) return null;

  const { data: matches, error } = await supabase.rpc('match_opportunities_for_org', {
    p_org_id: org.id,
    p_limit: 5,
  });
  if (error || !matches?.length) return null;

  // Filtre pré-rendu : si le best score < threshold, pas la peine de mount le modal client.
  const best = matches.reduce((a, b) => (Number(b.final_score) > Number(a.final_score) ? b : a), matches[0]);
  if (Number(best.final_score) < threshold) return null;

  return <PerfectMatchModal topMatches={matches} threshold={threshold} />;
}
