import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { generateExecutiveSummary } from '@/lib/ai';
import { buildKey, getCached, setCached, contentFingerprint } from '@/lib/ai-cache';

/**
 * POST /api/ai/cowriter  { opportunity_id, force?: boolean }
 *
 * AI co-writer : génère un premier jet de résumé exécutif. Cache DB par
 * (org_id, opportunity_id, prompt_version + fingerprint org+opp). TTL
 * 30 jours. `force: true` bypass le cache pour régénérer.
 */

const PROMPT_VERSION = 'cowriter-v1';

export async function POST(request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'invalid_body' }, { status: 400 }); }
  const { opportunity_id, force } = body || {};
  if (!opportunity_id) return NextResponse.json({ error: 'opportunity_id requis' }, { status: 400 });

  const [{ data: org }, { data: opp }] = await Promise.all([
    supabase
      .from('organizations')
      .select('id, name, org_type, description, action_summary, intervention_themes_text, city, region')
      .eq('user_id', user.id)
      .maybeSingle(),
    supabase
      .from('opportunities')
      .select('id, title, type, summary, description, eligibility, donors(name)')
      .eq('id', opportunity_id)
      .eq('status', 'published')
      .maybeSingle(),
  ]);

  if (!org) return NextResponse.json({ error: 'no_org' }, { status: 400 });
  if (!opp) return NextResponse.json({ error: 'opportunity_not_found' }, { status: 404 });

  // Fingerprint pour invalider le cache si le contenu de l'org ou de
  // l'opp change substantiellement (ex. l'utilisateur a édité son profil).
  const fp = contentFingerprint(
    [org.description, org.action_summary, org.intervention_themes_text, opp.title, opp.summary, opp.description].filter(Boolean).join('|')
  );
  const promptVersionWithFp = `${PROMPT_VERSION}:${fp}`;
  const cacheKey = buildKey({ kind: 'cowriter', orgId: org.id, oppId: opp.id, promptVersion: promptVersionWithFp });

  const admin = createAdminClient();

  // Cache lookup (sauf si l'utilisateur force la régénération)
  if (!force) {
    const hit = await getCached(admin, cacheKey);
    if (hit && hit.response?.draft) {
      return NextResponse.json({ ok: true, draft: hit.response.draft, cached: true, cachedAt: hit.created_at });
    }
  }

  const result = await generateExecutiveSummary(org, opp);

  if (!result.ok) {
    let errCode = result.error;
    if (typeof errCode === 'string' && /credit balance.*too low|insufficient.*credit/i.test(errCode)) {
      errCode = 'no_credit';
    }
    const status = errCode === 'no_api_key' || errCode === 'no_credit' ? 503 : 502;
    return NextResponse.json({ error: errCode === 'no_api_key' ? 'ai_unavailable' : errCode === 'no_credit' ? 'no_credit' : 'generation_failed' }, { status });
  }

  // Store in cache
  await setCached(admin, {
    cacheKey,
    kind: 'cowriter',
    orgId: org.id,
    oppId: opp.id,
    promptVersion: promptVersionWithFp,
    response: { draft: result.draft },
    tokensUsed: result.tokensUsed || null,
  });

  return NextResponse.json({ ok: true, draft: result.draft, cached: false });
}
