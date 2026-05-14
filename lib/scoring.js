/**
 * Scoring MVP — calcule un score de compatibilité entre une opportunité
 * et le profil d'une organisation.
 *
 * Barème (sur 100) :
 *  - Thématique commune       : 30
 *  - Maroc éligible            : 25
 *  - Type organisation OK      : 15
 *  - Deadline > 15 jours       : 10
 *  - Langue compatible         : 5
 *  - Budget compatible         : 10
 *  - Opportunité vérifiée      : 5
 */

const WEIGHTS = {
  themes: 30,
  morocco: 25,
  orgType: 15,
  deadline: 10,
  language: 5,
  budget: 10,
  verified: 5
};

/**
 * @param {Object} opportunity - { morocco_eligible, deadline, language, amount_min, amount_max, verified, themes:[{slug}] }
 * @param {Object} organization - { org_type, preferred_language, annual_budget_range, themes:[{slug}] }
 */
export function computeCompatibility(opportunity, organization) {
  if (!opportunity || !organization) return 0;
  const breakdown = {};
  let score = 0;

  // 1. Thématiques communes
  const oppThemes = (opportunity.themes || []).map(t => t.slug || t);
  const orgThemes = (organization.themes || []).map(t => t.slug || t);
  const common = oppThemes.filter(t => orgThemes.includes(t));
  if (common.length > 0) {
    const themePts = Math.min(WEIGHTS.themes, common.length * 15);
    score += themePts;
    breakdown.themes = themePts;
  } else breakdown.themes = 0;

  // 2. Maroc éligible
  if (opportunity.morocco_eligible) {
    score += WEIGHTS.morocco;
    breakdown.morocco = WEIGHTS.morocco;
  } else breakdown.morocco = 0;

  // 3. Type organisation
  // L'org_type 'association', 'ong', 'cooperative' est toujours OK MVP.
  if (organization.org_type && ['association','ong','cooperative','fondation'].includes(organization.org_type)) {
    score += WEIGHTS.orgType;
    breakdown.orgType = WEIGHTS.orgType;
  } else breakdown.orgType = 0;

  // 4. Deadline > 15 jours
  if (opportunity.deadline) {
    const days = daysUntil(opportunity.deadline);
    if (days > 15) {
      score += WEIGHTS.deadline;
      breakdown.deadline = WEIGHTS.deadline;
    } else breakdown.deadline = 0;
  } else breakdown.deadline = 0;

  // 5. Langue compatible
  if (!opportunity.language || opportunity.language === (organization.preferred_language || 'fr')) {
    score += WEIGHTS.language;
    breakdown.language = WEIGHTS.language;
  } else breakdown.language = 0;

  // 6. Budget compatible (heuristique simple : si org a un budget renseigné, on accorde)
  if (organization.annual_budget_range) {
    score += WEIGHTS.budget;
    breakdown.budget = WEIGHTS.budget;
  } else breakdown.budget = 0;

  // 7. Vérifiée
  if (opportunity.verified) {
    score += WEIGHTS.verified;
    breakdown.verified = WEIGHTS.verified;
  } else breakdown.verified = 0;

  return { score: Math.min(100, score), breakdown };
}

export function scoreLabel(score) {
  if (score >= 90) return { label: 'Très compatible', tone: 'green' };
  if (score >= 70) return { label: 'Compatible', tone: 'blue' };
  if (score >= 50) return { label: 'À analyser', tone: 'orange' };
  return { label: 'Faible compatibilité', tone: 'red' };
}

export function daysUntil(date) {
  if (!date) return null;
  const target = new Date(date);
  const today = new Date();
  return Math.ceil((target - today) / (1000 * 60 * 60 * 24));
}

export function deadlineStatus(date) {
  const d = daysUntil(date);
  if (d === null) return 'unknown';
  if (d < 0) return 'expired';
  if (d <= 7) return 'urgent';
  if (d <= 30) return 'soon';
  return 'open';
}
