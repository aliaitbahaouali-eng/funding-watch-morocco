'use server';

import { createClient } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/email';

/**
 * Sprint 4Q — Demande d'aide à un expert.
 *
 * Insère dans expert_requests + envoie email à l'expert avec le contexte
 * (opp, asso, message). Non bloquant si Brevo plante.
 *
 * Refuse :
 *   - non-authentifié
 *   - expert status != 'active'  (les placeholders ne reçoivent pas de demandes)
 *   - message hors bornes 20..2000 chars
 */
export async function requestExpertHelp({ expert_id, opp_id, message, contact_phone }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'unauthorized' };

  const cleanMessage = String(message || '').trim();
  if (cleanMessage.length < 20 || cleanMessage.length > 2000) {
    return { ok: false, error: 'message_invalid', detail: 'Entre 20 et 2000 caractères.' };
  }

  // Vérifie que l'expert existe et est active
  const { data: expert, error: expertErr } = await supabase
    .from('experts')
    .select('id, name, contact_email, status')
    .eq('id', expert_id)
    .single();
  if (expertErr || !expert) return { ok: false, error: 'expert_not_found' };
  if (expert.status !== 'active') {
    return {
      ok: false,
      error: 'expert_unavailable',
      detail: 'Cet expert n\'est pas encore disponible (profil exemple — vrai expert en cours de recrutement).'
    };
  }

  // Récupère orga
  const { data: org } = await supabase
    .from('organizations')
    .select('id, name')
    .eq('user_id', user.id)
    .maybeSingle();

  // Récupère opp si fourni
  let oppCtx = null;
  if (opp_id) {
    const { data: opp } = await supabase
      .from('opportunities')
      .select('id, title, donors(name), deadline')
      .eq('id', opp_id)
      .maybeSingle();
    if (opp) oppCtx = opp;
  }

  // Insert request
  const { data: insertResult, error: insertErr } = await supabase
    .from('expert_requests')
    .insert({
      organization_id: org?.id || null,
      user_id: user.id,
      expert_id: expert.id,
      opportunity_id: opp_id || null,
      message: cleanMessage,
      contact_email: user.email,
      contact_phone: contact_phone || null,
    })
    .select('id')
    .single();

  if (insertErr) {
    if (/relation .* does not exist|expert_requests/i.test(insertErr.message)) {
      return { ok: false, error: 'system_not_ready', detail: 'Migration v26 pas encore appliquée.' };
    }
    return { ok: false, error: insertErr.message };
  }

  // Envoie email à l'expert (best-effort, non bloquant)
  if (expert.contact_email) {
    try {
      const oppLine = oppCtx
        ? `Opportunité concernée : ${oppCtx.title}${oppCtx.donors?.name ? ' (' + oppCtx.donors.name + ')' : ''}${oppCtx.deadline ? ' — deadline ' + oppCtx.deadline : ''}`
        : 'Aucune opportunité spécifique mentionnée.';
      const html = `
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:600px">
          <h2 style="color:#cf2535">Nouvelle demande d'accompagnement</h2>
          <p>Bonjour ${expert.name},</p>
          <p>Une association marocaine référencée sur Funding Watch te contacte via la plateforme.</p>
          <table style="background:#f8fafc;border-radius:12px;padding:16px;margin:16px 0;width:100%">
            <tr><td style="padding:6px 0"><b>Association :</b> ${org?.name || '(profil incomplet)'}</td></tr>
            <tr><td style="padding:6px 0"><b>${oppLine}</b></td></tr>
            <tr><td style="padding:6px 0"><b>Email contact :</b> ${user.email}</td></tr>
            ${contact_phone ? `<tr><td style="padding:6px 0"><b>Téléphone :</b> ${contact_phone}</td></tr>` : ''}
          </table>
          <h3>Message</h3>
          <blockquote style="border-left:4px solid #cf2535;padding-left:16px;color:#475569">
            ${cleanMessage.replace(/\n/g, '<br>')}
          </blockquote>
          <p style="margin-top:24px;font-size:13px;color:#64748b">
            Tu peux répondre directement à cet email (le To: est l'asso) ou ignorer si la demande ne te correspond pas.
          </p>
          <p style="font-size:12px;color:#94a3b8">Cette mise en relation a été initiée via funding-watch-morocco.vercel.app</p>
        </div>
      `;
      await sendEmail({
        to: expert.contact_email,
        subject: `Demande d'accompagnement — ${org?.name || 'Asso marocaine'} — Funding Watch`,
        htmlContent: html,
        // Reply-to vers l'utilisateur final pour faciliter le démarrage
        headers: { 'Reply-To': user.email },
      });
    } catch (e) {
      console.warn('[expert-request] email failed (non-blocking):', e?.message || e);
    }
  }

  return { ok: true, request_id: insertResult?.id };
}
