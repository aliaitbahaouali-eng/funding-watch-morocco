import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendEmail, tplDailyDigest } from '@/lib/email';

/**
 * GET|POST /api/cron/digest
 * Digest matinal quotidien : envoie les 3 meilleurs matches du jour à chaque
 * organisation dont onboarding est complété et email_frequency='daily'.
 *
 * Différence avec /api/cron/weekly : ce digest utilise le matching vectoriel v4
 * (fonction SQL match_opportunities_for_org) au lieu du score cosmétique.
 *
 * Auth : Authorization: Bearer <CRON_SECRET>  (header injecté par Vercel Cron)
 *        ou header x-cron-secret  ou  ?secret=<CRON_SECRET>
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

  // Organisations cibles : onboarding complété + fréquence quotidienne + compte actif
  const { data: orgs, error: orgsError } = await supabase
    .from('organizations')
    .select('id, name, email_frequency, onboarding_completed, unsubscribe_token, profiles!inner(email, status)')
    .eq('onboarding_completed', true)
    .eq('email_frequency', 'daily')
    .eq('profiles.status', 'active');

  if (orgsError) {
    console.error('digest: orgs query failed:', orgsError);
    return NextResponse.json({ error: orgsError.message }, { status: 500 });
  }

  let sent = 0, failed = 0, skipped = 0;
  for (const org of (orgs || [])) {
    const email = org.profiles?.email;
    if (!email) { skipped++; continue; }

    const { data: matches, error: matchError } = await supabase.rpc('match_opportunities_for_org', {
      p_org_id: org.id,
      p_limit: TOP_N,
    });

    if (matchError) {
      console.error(`digest: match failed for org ${org.id}:`, matchError);
      failed++;
      continue;
    }
    if (!matches || matches.length === 0) { skipped++; continue; }

    const { subject, htmlContent } = tplDailyDigest({
      orgName: org.name,
      matches,
      unsubscribeToken: org.unsubscribe_token,
    });

    // RFC 8058 headers — unsubscribe one-click natif Gmail/Apple Mail
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://funding-watch-morocco.vercel.app';
    const unsubUrl = `${appUrl}/unsubscribe?token=${org.unsubscribe_token}`;
    const headers = org.unsubscribe_token ? {
      'List-Unsubscribe': `<${unsubUrl}>, <mailto:unsubscribe@fundingwatch.ma?subject=unsubscribe%20${org.id}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    } : undefined;

    const result = await sendEmail({ to: email, subject, htmlContent, headers });

    await supabase.from('email_logs').insert({
      organization_id: org.id,
      recipient_email: email,
      subject,
      template: 'daily_digest',
      opportunities: matches.map(m => m.opportunity_id),
      status: result.ok ? 'sent' : 'failed',
      provider_id: result.providerId || null,
      error_message: result.error || null,
      sent_at: result.ok ? new Date().toISOString() : null,
    });

    if (result.ok) sent++; else failed++;
  }

  return NextResponse.json({
    ok: true,
    sent,
    failed,
    skipped,
    total_orgs: orgs?.length || 0,
  });
}

export const GET = handler;
export const POST = handler;
