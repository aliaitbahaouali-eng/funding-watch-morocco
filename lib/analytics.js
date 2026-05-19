/**
 * Sprint 4N — Helper analytics côté client.
 *
 * Utilise Plausible si chargé (window.plausible), sinon no-op.
 * Aucun PII : seuls les noms d'événements + props non-identifiants.
 *
 * Exemples d'événements clés à tracker côté UI :
 *   trackEvent('signup_completed')
 *   trackEvent('onboarding_completed', { props: { theme_count: 4 } })
 *   trackEvent('opp_saved', { props: { score_bucket: 'high' } })
 *   trackEvent('cowriter_run')
 *   trackEvent('feedback_sent', { props: { kind: 'bug', severity: 'high' } })
 */
export function trackEvent(name, options = {}) {
  if (typeof window === 'undefined') return;
  try {
    if (typeof window.plausible === 'function') {
      window.plausible(name, options);
    }
  } catch (e) {
    // Silencieux : analytics ne doit jamais casser l'UX
  }
}
