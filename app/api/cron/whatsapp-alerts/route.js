import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendWhatsappTemplate, normalizePhone } from '@/lib/whatsapp';

/**
 * GET|POST /api/cron/whatsapp-alerts
 *
 * Pour chaque organisation avec whatsapp_alerts_enabled=true et un numéro
 * valide : appelle match_opportunities_for_org, filtre les matches >=
 * whatsapp_threshold (défaut 90), et envoie un message WhatsApp pour
 * chaque match jamais notifié (dédup via whatsapp_logs.unique).
 *
 * Sans META_WHATSAPP_TOKEN, sendWhatsappTemplate retourne {simulated:true}
 * et on log status='simulated' — utile pour valider le flow sans creds.
 *
 * Auth : Authorization: Bearer <CRON_SECRET>  (header Vercel Cron)
 *        ou x-cron-secret  ou  ?secret=<CRON_SECRET>
 */

const TEMPLATE_NAME = 'funding_watch_high_match';
const LANGUAGE = 'fr';

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

  const { data: orgs, error: orgsError } = await supabase
    .from('organizations')
    .select('id, name, whatsapp_phone, whatsapp_threshold')
    .eq('whatsapp_alerts_enabled', true)
    .eq('onboarding_completed', true)
    .not('whatsapp_phone', 'is', null);

  if (orgsError) {
    return NextResponse.json({ error: orgsError.message }, { status: 500 });
  }

  let sent = 0, simulated = 0, failed = 0, skipped = 0, considered = 0;
  for (const org of (orgs || [])) {
    const phone = normalizePhone(org.whatsapp_phone);
    if (!phone) { skipped++; continue; }
    const threshold = Number(org.whatsapp_threshold) || 90;

    const { data: matches, error: matchError } = await supabase.rpc('match_opportunities_for_org', {
      p_org_id: org.id,
      p_limit: 20,
    });
    if (matchError) { failed++; continue; }

    const candidates = (matches || []).filter((m) => Number(m.final_score) >= threshold);
    considered += candidates.length;

    for (const m of candidates) {
      // Dedupe: skip if we already sent a high-match alert for this opp+org
      const { data: existing } = await supabase
        .from('whatsapp_logs')
        .select('id')
        .eq('organization_id', org.id)
        .eq('opportunity_id', m.opportunity_id)
        .eq('template', TEMPLATE_NAME)
        .maybeSingle();
      if (existing) { skipped++; continue; }

      const deadline = m.deadline
        ? new Date(m.deadline).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
        : 'à confirmer';
      const params = [
        org.name || 'votre association',
        String(Math.round(Number(m.final_score) || 0)),
        m.title || 'Nouvelle opportunité',
        m.donor_name || 'Bailleur',
        deadline,
      ];

      const result = await sendWhatsappTemplate({
        to: phone,
        templateName: TEMPLATE_NAME,
        languageCode: LANGUAGE,
        params,
      });

      const status = result.ok
        ? (result.simulated ? 'simulated' : 'sent')
        : 'failed';

      await supabase.from('whatsapp_logs').insert({
        organization_id: org.id,
        opportunity_id: m.opportunity_id,
        recipient_phone: phone,
        template: TEMPLATE_NAME,
        match_score: m.final_score,
        status,
        provider_message_id: result.providerMessageId || null,
        error_message: result.error || null,
        sent_at: status === 'sent' ? new Date().toISOString() : null,
      });

      if (status === 'sent') sent++;
      else if (status === 'simulated') simulated++;
      else failed++;
    }
  }

  return NextResponse.json({
    ok: true,
    orgs_processed: orgs?.length || 0,
    considered,
    sent,
    simulated,
    failed,
    skipped,
  });
}

export const GET = handler;
export const POST = handler;
