import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendEmail, tplDailyDigest } from '@/lib/email';

/**
 * GET|POST /api/cron/digest
 *
 * Digest matinal — depuis Sprint 2B.2, le cron tourne TOUTES LES HEURES
 * (vercel.json: "0 * * * *") et chaque organisation choisit :
 *   - digest_hour          : heure UTC d'envoi (0-23, défaut 7 = 8h Maroc)
 *   - digest_days_of_week  : jours actifs ISO (1=lun..7=dim, défaut jours ouvrés)
 *   - digest_min_score     : seuil match minimum 0-100 (défaut 0 = pas de filtre)
 *
 * Dédup intra-journée : un org qui a déjà reçu un digest 'sent' aujourd'hui
 * UTC est skippé (évite les doublons si l'utilisateur change ses préfs en
 * cours de journée).
 *
 * Auth : Authorization: Bearer <CRON_SECRET> | x-cron-secret | ?secret=
 */

const TOP_N = 3;

function isAuthorized(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = request.headers.get('authorization');
  if (auth === `Bearer ${secret}`) return true;
  if (request.headers.get('x-cron-secret') === secret) return true;
  if (new URL(request.url).searchParams.get('secret') === secret) return true;
  return false;
}

async function handler(request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();
  const url = new URL(request.url);
  const dryRun = url.searchParams.get('dry') === '1';
  const forceHour = url.searchParams.get('hour');     // override pour /admin/email-preview tests
  const forceDay = url.searchParams.get('day');

  const now = new Date();
  const currentHour = forceHour !== null ? parseInt(forceHour, 10) : now.getUTCHours();
  // ISO weekday : 1 (Lundi) .. 7 (Dimanche). getUTCDay() renvoie 0 (Dim) .. 6 (Sam).
  const jsDay = now.getUTCDay();
  const currentIsoDay = forceDay !== null ? parseInt(forceDay, 10) : (jsDay === 0 ? 7 : jsDay);

  // Orgs cibles : onboarding + active + slot horaire qui matche + jour actif
  const { data: orgs, error: orgsError } = await supabase
    .from('organizations')
    .select('id, name, email_frequency, onboarding_completed, unsubscribe_token, digest_hour, digest_days_of_week, digest_min_score, profiles!inner(email, status)')
    .eq('onboarding_completed', true)
    .eq('email_frequency', 'daily')
    .eq('profiles.status', 'active')
    .eq('digest_hour', currentHour)
    .filter('digest_days_of_week', 'cs', `{${currentIsoDay}}`);

  if (orgsError) {
    console.error('digest: orgs query failed:', orgsError);
    return NextResponse.json({ error: orgsError.message }, { status: 500 });
  }

  // Dédup intra-journée : exclut les orgs déjà servies aujourd'hui
  const todayStartIso = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();
  let alreadySentToday = new Set();
  if ((orgs || []).length > 0) {
    const orgIds = orgs.map((o) => o.id);
    const { data: recent } = await supabase
      .from('email_logs')
      .select('organization_id')
      .eq('template', 'daily_digest')
      .eq('status', 'sent')
      .in('organization_id', orgIds)
      .gte('sent_at', todayStartIso);
    alreadySentToday = new Set((recent || []).map((r) => r.organization_id));
  }

  let sent = 0, failed = 0, skipped = 0, dedupSkipped = 0, belowMinScore = 0;
  const previews = []; // pour dry-run

  for (const org of (orgs || [])) {
    const email = org.profiles?.email;
    if (!email) { skipped++; continue; }
    if (alreadySentToday.has(org.id)) { dedupSkipped++; continue; }

    const { data: matches, error: matchError } = await supabase.rpc('match_opportunities_for_org', {
      p_org_id: org.id,
      p_limit: 20,  // on prend plus large pour filtrer ensuite par min_score
    });
    if (matchError) {
      console.error(`digest: match failed for org ${org.id}:`, matchError);
      failed++; continue;
    }

    // Filtre min_score puis top N
    const minScore = Number(org.digest_min_score || 0);
    const filtered = (matches || []).filter((m) => Number(m.final_score) >= minScore).slice(0, TOP_N);

    if (filtered.length === 0) {
      // Aucune opp ne passe le seuil : on ne dérange pas l'utilisateur (silencieux)
      if ((matches || []).length > 0) belowMinScore++; else skipped++;
      continue;
    }

    const { subject, htmlContent } = tplDailyDigest({
      orgName: org.name,
      matches: filtered,
      unsubscribeToken: org.unsubscribe_token,
    });

    // RFC 8058 headers — unsubscribe one-click natif Gmail/Apple Mail
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://funding-watch-morocco.vercel.app';
    const unsubUrl = `${appUrl}/unsubscribe?token=${org.unsubscribe_token}`;
    const headers = org.unsubscribe_token ? {
      'List-Unsubscribe': `<${unsubUrl}>, <mailto:unsubscribe@fundingwatch.ma?subject=unsubscribe%20${org.id}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    } : undefined;

    if (dryRun) {
      previews.push({ org: org.name, email, subject, top_score: filtered[0]?.final_score, matches: filtered.length });
      continue;
    }

    const result = await sendEmail({ to: email, subject, htmlContent, headers });

    await supabase.from('email_logs').insert({
      organization_id: org.id,
      recipient_email: email,
      subject,
      template: 'daily_digest',
      opportunities: filtered.map((m) => m.opportunity_id),
      status: result.ok ? 'sent' : 'failed',
      provider_id: result.providerId || null,
      error_message: result.error || null,
      sent_at: result.ok ? new Date().toISOString() : null,
    });

    if (result.ok) sent++; else failed++;
  }

  return NextResponse.json({
    ok: true,
    slot: { hour_utc: currentHour, iso_day: currentIsoDay },
    total_candidates: orgs?.length || 0,
    sent, failed, skipped, dedup_skipped: dedupSkipped, below_min_score: belowMinScore,
    ...(dryRun ? { dry_run: true, previews } : {}),
  });
}

export const GET = handler;
export const POST = handler;
