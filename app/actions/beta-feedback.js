'use server';

import { createClient } from '@/lib/supabase/server';

const ALLOWED_KINDS = new Set(['bug', 'idea', 'love', 'question', 'other']);
const ALLOWED_SEVERITIES = new Set(['low', 'medium', 'high', 'blocker']);

/**
 * Sprint 4M — Server action pour soumettre un beta feedback.
 * Appelée depuis BetaFeedbackWidget côté client.
 *
 * Validations :
 *   - user authentifié (sinon 401)
 *   - kind / severity dans la liste blanche
 *   - message 5..4000 caractères
 *
 * Best-effort : si la table n'existe pas (migration v22 pas appliquée),
 * on retourne une erreur explicite pour que l'UI puisse l'afficher.
 */
export async function submitBetaFeedback({ kind, severity, message, page_url, user_agent }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Non authentifié.' };

  const cleanKind = ALLOWED_KINDS.has(kind) ? kind : 'other';
  const cleanSeverity = ALLOWED_SEVERITIES.has(severity) ? severity : 'low';
  const cleanMessage = String(message || '').trim();
  if (cleanMessage.length < 5 || cleanMessage.length > 4000) {
    return { ok: false, error: 'Message trop court ou trop long.' };
  }

  // Récupère organization_id si dispo (best-effort)
  let organizationId = null;
  try {
    const { data: org } = await supabase
      .from('organizations')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();
    organizationId = org?.id || null;
  } catch {}

  const { error } = await supabase.from('beta_feedback').insert({
    user_id: user.id,
    organization_id: organizationId,
    kind: cleanKind,
    severity: cleanKind === 'bug' ? cleanSeverity : 'low',
    page_url: page_url ? String(page_url).slice(0, 500) : null,
    user_agent: user_agent ? String(user_agent).slice(0, 500) : null,
    message: cleanMessage,
  });

  if (error) {
    if (/relation .* does not exist|table .* not found|beta_feedback/i.test(error.message)) {
      return { ok: false, error: 'Le système de feedback n\'est pas encore prêt — la migration v22 n\'est pas appliquée. Préviens un admin.' };
    }
    return { ok: false, error: error.message };
  }
  return { ok: true };
}
