import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrentUser } from '@/lib/auth';
import { tplDailyDigest } from '@/lib/email';

/**
 * GET /admin/email-preview/render?org=<uuid>
 * Renvoie le HTML brut du digest tel qu'il serait envoyé à l'org choisie.
 * Utilisé par /admin/email-preview qui le charge dans un <iframe src>.
 *
 * Admin-only. Pas d'inclusion dans /api/* (la convention /admin/ requiert
 * déjà role admin via layout, mais on re-vérifie ici par défense en
 * profondeur).
 */
export const dynamic = 'force-dynamic';

export async function GET(request) {
  const session = await getCurrentUser();
  const role = session?.profile?.role;
  if (!session || !['admin', 'veille'].includes(role)) {
    return new NextResponse('forbidden', { status: 403 });
  }

  const url = new URL(request.url);
  const orgId = url.searchParams.get('org');
  if (!orgId) {
    return new NextResponse('missing org param', { status: 400 });
  }

  const admin = createAdminClient();
  const { data: org } = await admin
    .from('organizations')
    .select('id, name, unsubscribe_token')
    .eq('id', orgId)
    .maybeSingle();
  if (!org) {
    return new NextResponse('org not found', { status: 404 });
  }

  // min_score est appliqué optionnellement
  let minScore = 0;
  try {
    const { data: orgFull } = await admin
      .from('organizations')
      .select('digest_min_score')
      .eq('id', orgId)
      .maybeSingle();
    minScore = Number(orgFull?.digest_min_score || 0);
  } catch { /* v15 not applied */ }

  const { data: matches, error } = await admin.rpc('match_opportunities_for_org', {
    p_org_id: orgId,
    p_limit: 20,
  });
  if (error) {
    return new NextResponse(`RPC error: ${error.message}`, { status: 500 });
  }
  const filtered = (matches || []).filter((m) => Number(m.final_score) >= minScore).slice(0, 3);

  if (filtered.length === 0) {
    return new NextResponse(
      `<!doctype html><html><body style="font-family:sans-serif;padding:40px;background:#f8fafc"><h2>Aucun digest pour ${org.name}</h2><p>${(matches || []).length} match(es) au total, aucun &ge; min_score=${minScore}.</p></body></html>`,
      { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }

  const { htmlContent } = tplDailyDigest({
    orgName: org.name,
    matches: filtered,
    unsubscribeToken: org.unsubscribe_token,
  });

  return new NextResponse(htmlContent, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
