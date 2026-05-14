import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendEmail, tplWeeklyDigest } from '@/lib/email';
import { computeCompatibility } from '@/lib/scoring';

/**
 * POST /api/cron/weekly
 * Envoie le digest hebdomadaire aux organisations dont email_frequency='weekly'
 * (ou 'daily' si on l'appelle quotidiennement, à toi de choisir le cron).
 *
 * Auth : header x-cron-secret = process.env.CRON_SECRET
 *
 * Logique :
 *   1. Récupère toutes les opportunités publiées récentes (deadline future).
 *   2. Pour chaque organisation active :
 *      - charge ses thématiques
 *      - score chaque opp côté serveur
 *      - garde top 5
 *      - envoie l'email (Brevo) et log dans email_logs
 */
export async function POST(request) {
  const secret = request.headers.get('x-cron-secret') || new URL(request.url).searchParams.get('secret');
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();
  const frequency = new URL(request.url).searchParams.get('frequency') || 'weekly';

  // Opportunités publiées avec deadline future
  const today = new Date().toISOString().slice(0, 10);
  const { data: opps } = await supabase
    .from('opportunities')
    .select('*, donors(name), opportunity_themes(theme_id, themes(slug))')
    .eq('status', 'published')
    .gte('deadline', today)
    .order('deadline', { ascending: true })
    .limit(100);

  if (!opps || opps.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, note: 'no_opportunities' });
  }

  // Organisations cibles
  const { data: orgs } = await supabase
    .from('organizations')
    .select('id, name, preferred_language, annual_budget_range, org_type, email_frequency, user_id, organization_themes(theme_id, themes(slug)), profiles!inner(email, status)')
    .eq('email_frequency', frequency)
    .eq('profiles.status', 'active');

  let sent = 0, failed = 0;
  for (const org of (orgs || [])) {
    const orgThemeSlugs = (org.organization_themes || []).map(t => t.themes?.slug).filter(Boolean);
    if (orgThemeSlugs.length === 0) continue; // pas de préférences → on n'envoie rien

    // Score + filtre top 5
    const orgForScore = {
      org_type: org.org_type,
      preferred_language: org.preferred_language,
      annual_budget_range: org.annual_budget_range,
      themes: orgThemeSlugs.map(s => ({ slug: s }))
    };
    const ranked = opps.map(o => {
      const sc = computeCompatibility({
        morocco_eligible: o.morocco_eligible,
        deadline: o.deadline,
        language: o.language,
        amount_min: o.amount_min,
        amount_max: o.amount_max,
        verified: o.verified,
        themes: (o.opportunity_themes || []).map(t => ({ slug: t.themes?.slug }))
      }, orgForScore);
      return { ...o, score: sc.score };
    })
      .filter(o => o.score >= 50)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    if (ranked.length === 0) continue;

    const email = org.profiles?.email;
    if (!email) continue;
    const { subject, htmlContent } = tplWeeklyDigest({ orgName: org.name, opportunities: ranked });
    const result = await sendEmail({ to: email, subject, htmlContent });

    await supabase.from('email_logs').insert({
      organization_id: org.id,
      recipient_email: email,
      subject,
      template: 'weekly_digest',
      opportunities: ranked.map(o => o.id),
      status: result.ok ? 'sent' : 'failed',
      provider_id: result.providerId || null,
      error_message: result.error || null,
      sent_at: result.ok ? new Date().toISOString() : null
    });

    if (result.ok) sent++; else failed++;
  }

  return NextResponse.json({ ok: true, sent, failed, total_orgs: orgs?.length || 0 });
}
