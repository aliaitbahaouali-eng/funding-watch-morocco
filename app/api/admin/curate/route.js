/**
 * POST /api/admin/curate
 *
 * Sprint 6 / Option A — Curation manuelle assistée IA.
 *
 * Body : { url: string, notes?: string }
 *
 * Workflow :
 *   1. Vérifie auth + rôle admin
 *   2. Vérifie qu'on n'a pas déjà cette URL en base (dédup)
 *   3. Fetch la page + appel Claude pour extraction
 *   4. Crée un draft pré-rempli en DB avec curated_manually=true
 *   5. Crée une ligne curation_logs
 *   6. Retourne { ok, opportunity_id, redirect_to }
 *
 * Permissions : admin uniquement (vérifié via is_admin RPC).
 */
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { curateFromUrl } from '@/lib/ai-curation';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

async function isCurrentUserAdmin(supabase) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, user: null };
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, status')
    .eq('id', user.id)
    .maybeSingle();
  const ok = profile?.status === 'active' && (profile?.role === 'admin' || profile?.role === 'veille');
  return { ok, user, role: profile?.role };
}

export async function POST(request) {
  const supabase = createClient();
  const auth = await isCurrentUserAdmin(supabase);
  if (!auth.ok) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'JSON invalide' }, { status: 400 });
  }

  const url = (body?.url || '').trim();
  const notes = (body?.notes || '').trim().slice(0, 500);
  if (!url) {
    return NextResponse.json({ error: 'url manquante' }, { status: 400 });
  }

  const admin = createAdminClient();

  // 1. Dédup : URL déjà présente en base ?
  const { data: existing } = await admin
    .from('opportunities')
    .select('id, title, status')
    .or(`official_url.eq.${url},source_url.eq.${url}`)
    .limit(1)
    .maybeSingle();

  if (existing) {
    await admin.from('curation_logs').insert({
      curator_user_id: auth.user.id,
      source_url: url,
      status: 'duplicate',
      opportunity_id: existing.id,
      error_message: `Déjà présent en base (status=${existing.status})`,
    });
    return NextResponse.json({
      ok: false,
      duplicate: true,
      opportunity_id: existing.id,
      title: existing.title,
      status: existing.status,
      message: `Cette URL est déjà en base (${existing.status})`,
    }, { status: 200 });
  }

  // 2. Curation via Claude
  const result = await curateFromUrl(url);
  if (!result.ok) {
    await admin.from('curation_logs').insert({
      curator_user_id: auth.user.id,
      source_url: url,
      status: result.stage || 'extract_error',
      error_message: result.error,
      duration_ms: result.durationMs,
    });
    return NextResponse.json({
      ok: false,
      error: result.error,
      stage: result.stage,
    }, { status: 422 });
  }

  // 3. Insert opportunity en draft
  const d = result.data;

  // Trouve ou crée le donateur si donor_name fourni
  let donorId = null;
  if (d.donor_name) {
    const { data: existingDonor } = await admin
      .from('donors')
      .select('id')
      .ilike('name', d.donor_name)
      .maybeSingle();
    if (existingDonor) {
      donorId = existingDonor.id;
    } else {
      const { data: newDonor } = await admin
        .from('donors')
        .insert({ name: d.donor_name.slice(0, 200), category: 'autre' })
        .select('id')
        .single();
      donorId = newDonor?.id;
    }
  }

  const insertPayload = {
    title: d.title.slice(0, 500),
    donor_id: donorId,
    type: d.type || null,
    summary: d.summary?.slice(0, 280) || null,
    description: d.description?.slice(0, 5000) || null,
    eligibility: d.eligibility?.slice(0, 2000) || null,
    amount_min: d.amount_min ?? null,
    amount_max: d.amount_max ?? null,
    currency: d.currency || 'EUR',
    deadline: d.deadline || null,
    publication_date: d.publication_date || null,
    official_url: url,
    source_url: url,
    language: d.language || 'fr',
    countries_eligible: d.countries_eligible || [],
    morocco_eligible: ['explicit', 'regional'].includes(d.morocco_eligibility),
    morocco_eligibility: d.morocco_eligibility || 'unknown',
    difficulty_level: d.difficulty_level || null,
    required_documents: d.required_documents || [],
    target_org_types: d.target_org_types || [],
    ngo_relevant: d.ngo_relevant ?? null,
    ngo_relevance_score: d.ngo_relevance_score ?? null,
    ngo_relevance_reason: d.ngo_relevance_reason || null,
    status: 'pending_review',  // arrive directement dans la file de validation
    verified: true,
    ai_processed: true,
    curated_manually: true,
    curator_user_id: auth.user.id,
    curation_notes: notes || d.curation_notes || null,
    collected_at: new Date().toISOString(),
  };

  const { data: opp, error: insertErr } = await admin
    .from('opportunities')
    .insert(insertPayload)
    .select('id, title, status, morocco_eligibility, deadline')
    .single();

  if (insertErr || !opp) {
    await admin.from('curation_logs').insert({
      curator_user_id: auth.user.id,
      source_url: url,
      status: 'extract_error',
      error_message: 'DB insert failed: ' + (insertErr?.message || 'unknown'),
      duration_ms: result.durationMs,
    });
    return NextResponse.json({
      ok: false,
      error: 'Insertion DB échouée: ' + (insertErr?.message || 'unknown'),
    }, { status: 500 });
  }

  // 4. Thématiques (pivot)
  if (Array.isArray(d.theme_slugs) && d.theme_slugs.length) {
    const themeLinks = [];
    for (const slug of d.theme_slugs.slice(0, 4)) {
      const { data: theme } = await admin
        .from('themes')
        .select('id')
        .eq('slug', slug)
        .maybeSingle();
      if (theme) themeLinks.push({ opportunity_id: opp.id, theme_id: theme.id });
    }
    if (themeLinks.length) {
      await admin.from('opportunity_themes').insert(themeLinks);
    }
  }

  // 5. Log succès
  await admin.from('curation_logs').insert({
    curator_user_id: auth.user.id,
    source_url: url,
    status: 'success',
    opportunity_id: opp.id,
    llm_tokens_in: result.usage?.input_tokens || null,
    llm_tokens_out: result.usage?.output_tokens || null,
    duration_ms: result.durationMs,
  });

  return NextResponse.json({
    ok: true,
    opportunity_id: opp.id,
    title: opp.title,
    status: opp.status,
    morocco_eligibility: opp.morocco_eligibility,
    deadline: opp.deadline,
    redirect_to: `/admin/validation#${opp.id}`,
    usage: result.usage,
    duration_ms: result.durationMs,
  });
}

/**
 * GET /api/admin/curate?stats=1 — stats curation du jour
 */
export async function GET(request) {
  const supabase = createClient();
  const auth = await isCurrentUserAdmin(supabase);
  if (!auth.ok) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);

  const [{ data: todayLogs }, { count: totalCurated }] = await Promise.all([
    admin.from('curation_logs')
      .select('status, created_at')
      .gte('created_at', startOfDay.toISOString()),
    admin.from('opportunities')
      .select('id', { count: 'exact', head: true })
      .eq('curated_manually', true)
      .eq('curator_user_id', auth.user.id),
  ]);

  const todayStats = {
    success: 0,
    duplicate: 0,
    fetch_error: 0,
    extract_error: 0,
    rejected: 0,
  };
  for (const log of (todayLogs || [])) {
    todayStats[log.status] = (todayStats[log.status] || 0) + 1;
  }

  return NextResponse.json({
    ok: true,
    today: todayStats,
    today_total_attempts: (todayLogs || []).length,
    user_total_curated: totalCurated || 0,
    daily_target: 5,
  });
}
