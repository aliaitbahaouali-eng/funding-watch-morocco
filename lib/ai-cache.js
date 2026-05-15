/**
 * AI response cache — DB-backed (table ai_response_cache).
 *
 * Évite de re-générer un résultat identique pour (kind, org_id, opp_id,
 * prompt_version). TTL par défaut 30 jours. Utiliser le service role
 * client (les utilisateurs n'ont pas accès direct à la table).
 *
 * Usage :
 *   import { getCached, setCached, buildKey } from '@/lib/ai-cache';
 *   const key = buildKey({ kind: 'cowriter', orgId, oppId, promptVersion: 'v1' });
 *   const hit = await getCached(supabase, key);
 *   if (hit) return hit.response;
 *   const result = await callClaude(...);
 *   await setCached(supabase, { key, kind, orgId, oppId, promptVersion, response, tokensUsed });
 */

export function buildKey({ kind, orgId, oppId, promptVersion }) {
  // null parts collapsed to '-' to keep the key deterministic.
  return `${kind}:${orgId || '-'}:${oppId || '-'}:${promptVersion}`;
}

export async function getCached(supabase, cacheKey) {
  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from('ai_response_cache')
    .select('response, tokens_used, created_at, expires_at')
    .eq('cache_key', cacheKey)
    .gt('expires_at', nowIso)
    .maybeSingle();
  if (error) {
    // Missing table or RLS issue — log + return miss so the caller falls
    // back to the live call. Never propagate cache errors.
    console.warn('[ai-cache] get failed:', error.message);
    return null;
  }
  return data || null;
}

export async function setCached(supabase, { cacheKey, kind, orgId, oppId, promptVersion, response, tokensUsed }) {
  const payload = {
    cache_key: cacheKey,
    kind,
    organization_id: orgId || null,
    opportunity_id: oppId || null,
    prompt_version: promptVersion,
    response,
    tokens_used: tokensUsed || null,
    created_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
  };
  const { error } = await supabase
    .from('ai_response_cache')
    .upsert(payload, { onConflict: 'cache_key' });
  if (error) {
    console.warn('[ai-cache] set failed:', error.message);
  }
}

/**
 * Compute a short content fingerprint to invalidate cache when the
 * underlying opp text changes substantially.
 */
export function contentFingerprint(text) {
  if (!text) return '0';
  let h = 0;
  for (let i = 0; i < text.length; i++) {
    h = ((h << 5) - h + text.charCodeAt(i)) | 0;
  }
  return String(h);
}
