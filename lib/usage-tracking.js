/**
 * API usage logging — Sprint 4A.3
 *
 * Helper léger pour logger chaque appel d'API externe (Anthropic, OpenAI,
 * Brevo, Meta) dans la table api_usage_logs. Calcule le coût USD à
 * l'insertion depuis les tarifs publics connus, pour qu'on puisse trier
 * /admin/monitoring sans recalculer.
 *
 * Best-effort : si la table n'existe pas (migration v18 pas appliquée),
 * on swallow l'erreur — l'appel API n'est jamais bloqué par le tracking.
 *
 * Utilisation :
 *   import { logUsage } from '@/lib/usage-tracking';
 *   await logUsage(supabase, {
 *     provider: 'anthropic',
 *     model: 'claude-haiku-4-5-20251001',
 *     kind: 'cowriter',
 *     organizationId, opportunityId,
 *     usage: { input_tokens: 1500, output_tokens: 230, cache_read_input_tokens: 600 },
 *     durationMs: 1240,
 *     status: 'ok',
 *   });
 */

// Pricing USD per 1M tokens (Mai 2026 — à mettre à jour si Anthropic/OpenAI changent).
const PRICING = {
  // Claude Haiku 4.5
  'claude-haiku-4-5-20251001': {
    input: 1.0,
    output: 5.0,
    cache_write: 1.25,
    cache_read: 0.1,
  },
  // Claude Sonnet 4.5 (au cas où on switch)
  'claude-sonnet-4-5': {
    input: 3.0,
    output: 15.0,
    cache_write: 3.75,
    cache_read: 0.3,
  },
  // OpenAI embeddings
  'text-embedding-3-small': {
    input: 0.02,
    output: 0,
  },
};

function computeCostUsd({ model, usage }) {
  if (!usage) return null;
  const tarif = PRICING[model];
  if (!tarif) return null;
  const inputTokens = (usage.input_tokens || 0);
  const outputTokens = (usage.output_tokens || 0);
  const cacheWriteTokens = (usage.cache_creation_input_tokens || 0);
  const cacheReadTokens = (usage.cache_read_input_tokens || 0);
  const cost =
    inputTokens * (tarif.input / 1_000_000) +
    outputTokens * (tarif.output / 1_000_000) +
    cacheWriteTokens * ((tarif.cache_write ?? tarif.input) / 1_000_000) +
    cacheReadTokens * ((tarif.cache_read ?? tarif.input * 0.1) / 1_000_000);
  return Number(cost.toFixed(6));
}

export async function logUsage(supabase, {
  provider,
  model = null,
  kind = null,
  organizationId = null,
  opportunityId = null,
  usage = null,
  durationMs = null,
  status = 'ok',
  errorMessage = null,
  requestId = null,
}) {
  try {
    const cost_usd = computeCostUsd({ model, usage });
    const payload = {
      provider,
      model,
      kind,
      organization_id: organizationId,
      opportunity_id: opportunityId,
      input_tokens: usage?.input_tokens ?? null,
      output_tokens: usage?.output_tokens ?? null,
      cache_creation_tokens: usage?.cache_creation_input_tokens ?? null,
      cache_read_tokens: usage?.cache_read_input_tokens ?? null,
      cost_usd,
      duration_ms: durationMs,
      status,
      error_message: errorMessage,
      request_id: requestId,
    };
    const { error } = await supabase.from('api_usage_logs').insert(payload);
    if (error) {
      // table missing / RLS / autre — on n'échoue jamais l'appel à cause du tracking.
      if (!/api_usage_logs/i.test(error.message)) {
        console.warn('[usage-tracking] insert failed:', error.message);
      }
    }
  } catch (e) {
    // best-effort, never throw
    console.warn('[usage-tracking] swallowed:', e?.message || e);
  }
}
