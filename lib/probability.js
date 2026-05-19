/**
 * Success probability estimation — MVP heuristique honnête.
 *
 * Tant qu'on n'a pas N outcomes (submitted/won/lost) trackés, on ne peut
 * pas calibrer un vrai modèle. Cette version retourne une estimation à
 * partir de facteurs observables :
 *   - match score (taxonomy + geo + deadline) via match_opportunities_for_org
 *   - profile_completeness de l'orga
 *   - fit budgétaire (target_amount de l'orga vs amount de l'opp)
 *   - donor familiarity (l'orga a-t-elle déjà candidaté chez ce bailleur ?)
 *
 * Le résultat est volontairement borné à 5-70% : on ne promet jamais "très
 * élevé" sans données. Le `confidence` reflète la taille de l'échantillon
 * de candidatures similaires.
 *
 * Sprint 3+ : remplacer par une régression entraînée sur les outcomes
 * réels au fur et à mesure que la base de candidatures grandit.
 */

const MIN_PROB = 5;
const MAX_PROB = 70;

const CONFIDENCE_THRESHOLDS = {
  low: 5,     // < 5 candidatures similaires
  medium: 30, // 5-30
  // high: 30+
};

export async function computeSuccessProbability(supabase, org, opp, opts = {}) {
  // --- Facteur 1 : match score (passé en option si déjà connu, sinon RPC) ------
  // Sprint 4H : si matchScore est passé par l'appelant (ex. TopMatches qui a
  // déjà fait l'appel RPC pour ses N opps), on évite N requêtes redondantes.
  let matchScore = typeof opts.matchScore === 'number' ? opts.matchScore : null;
  if (matchScore === null && org?.id) {
    const { data: matches, error } = await supabase.rpc('match_opportunities_for_org', {
      p_org_id: org.id,
      p_limit: 50,
    });
    if (!error && Array.isArray(matches)) {
      const hit = matches.find((m) => m.opportunity_id === opp.id);
      if (hit) matchScore = Number(hit.final_score) || 0;
    }
  }

  // --- Facteur 2 : profile completeness ---------------------------------------
  const completeness = clamp(Number(org?.profile_completeness) || 0, 0, 100);

  // --- Facteur 3 : fit budgétaire ---------------------------------------------
  // target_amount_min/max sur l'orga vs amount_min/max sur l'opp.
  const budgetFit = computeBudgetFit(org, opp);

  // --- Facteur 4 : donor familiarity ------------------------------------------
  let donorFamiliarity = 0;
  let similarCount = 0;
  if (opp.donor_id && org?.id) {
    const { count } = await supabase
      .from('saved_opportunities')
      .select('id, opportunities!inner(donor_id)', { count: 'exact', head: true })
      .eq('organization_id', org.id)
      .eq('opportunities.donor_id', opp.donor_id)
      .in('status', ['submitted', 'won', 'lost', 'preparing']);
    similarCount = count || 0;
    if (similarCount >= 1) donorFamiliarity = 0.6;
    if (similarCount >= 3) donorFamiliarity = 0.85;
    if (similarCount >= 5) donorFamiliarity = 1.0;
  }

  // --- Pondération -----------------------------------------------------------
  // Sans match score → on neutralise sa pondération (45 par défaut = neutre).
  const matchComponent = (matchScore ?? 45) / 100;        // 0..1
  const completenessComponent = completeness / 100;       // 0..1
  const budgetComponent = budgetFit;                      // 0..1
  const donorComponent = donorFamiliarity;                // 0..1

  // Pondérations : match 50%, completeness 20%, budget 20%, donor 10%
  const raw =
    matchComponent * 0.50 +
    completenessComponent * 0.20 +
    budgetComponent * 0.20 +
    donorComponent * 0.10;

  const probability = Math.round(clamp(raw * 100, MIN_PROB, MAX_PROB));

  // --- Confiance basée sur la taille d'échantillon ----------------------------
  const confidence =
    similarCount < CONFIDENCE_THRESHOLDS.low ? 'low' :
    similarCount < CONFIDENCE_THRESHOLDS.medium ? 'medium' : 'high';

  return {
    probability,
    confidence,
    sampleSize: similarCount,
    breakdown: {
      match: Math.round(matchComponent * 100),
      completeness: Math.round(completenessComponent * 100),
      budget_fit: Math.round(budgetComponent * 100),
      donor_familiarity: Math.round(donorComponent * 100),
    },
    weights: { match: 50, completeness: 20, budget_fit: 20, donor_familiarity: 10 },
    matchScoreAvailable: matchScore !== null,
  };
}

function computeBudgetFit(org, opp) {
  const orgMin = Number(org?.target_amount_min) || 0;
  const orgMax = Number(org?.target_amount_max) || 0;
  const oppMin = Number(opp?.amount_min) || 0;
  const oppMax = Number(opp?.amount_max) || 0;

  // Si aucune des deux parties n'a précisé un montant → neutre 0.5
  if (!orgMax && !oppMax) return 0.5;
  if (!orgMax || !oppMax) return 0.4; // info partielle → légèrement négatif

  // Calcule l'overlap des deux intervalles [orgMin, orgMax] vs [oppMin, oppMax]
  const lowOrg = orgMin || orgMax * 0.3;
  const lowOpp = oppMin || oppMax * 0.3;
  const overlapLow = Math.max(lowOrg, lowOpp);
  const overlapHigh = Math.min(orgMax, oppMax);
  if (overlapHigh < overlapLow) return 0.25; // pas d'overlap → bas

  const overlap = overlapHigh - overlapLow;
  const union = Math.max(orgMax, oppMax) - Math.min(lowOrg, lowOpp);
  return clamp(overlap / union, 0.25, 1.0);
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}
