'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { sendEmail, tplCoSubmissionRequest } from '@/lib/email';

/**
 * Sprint 4P — toggle opt-in à la co-soumission pour une opp.
 *
 * Pré-requis : l'utilisateur doit déjà avoir sauvegardé l'opp (présent
 * dans saved_opportunities). On crée le save automatiquement si absent
 * pour éviter une UX bloquante (mais on signale via le retour).
 */
export async function toggleCoSubmitIntent({ opp_id, on, message }) {
  if (!opp_id) return { ok: false, error: 'missing_opp' };
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'unauthorized' };

  // Récupère orga
  const { data: org } = await supabase
    .from('organizations')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();
  if (!org) return { ok: false, error: 'no_org' };

  const cleanMessage = String(message || '').trim().slice(0, 600);

  // Cherche le save existant
  const { data: existing } = await supabase
    .from('saved_opportunities')
    .select('id')
    .eq('organization_id', org.id)
    .eq('opportunity_id', opp_id)
    .maybeSingle();

  const payload = on
    ? {
        intent_co_submit: true,
        co_submit_message: cleanMessage || null,
        co_submit_opt_in_at: new Date().toISOString(),
      }
    : {
        intent_co_submit: false,
        co_submit_message: null,
        co_submit_opt_in_at: null,
      };

  let result;
  if (existing) {
    result = await supabase.from('saved_opportunities').update(payload).eq('id', existing.id);
  } else {
    // Auto-create save (status='saved' + intent)
    result = await supabase.from('saved_opportunities').insert({
      organization_id: org.id,
      opportunity_id: opp_id,
      status: 'saved',
      ...payload,
    });
  }

  if (result.error) {
    if (/column .* does not exist|intent_co_submit/i.test(result.error.message)) {
      return { ok: false, error: 'system_not_ready', detail: 'Migration v27 pas appliquée.' };
    }
    return { ok: false, error: result.error.message };
  }

  revalidatePath(`/opportunities/${opp_id}`);
  return { ok: true };
}

/**
 * Sprint 4P — demande de mise en relation pour co-soumettre.
 *
 * L'utilisateur (asso A) sélectionne une autre asso B opted-in sur la
 * même opp. On insère un co_submission_requests + on envoie un email à
 * l'owner de B avec Reply-To = email de A.
 *
 * Refuse :
 *   - non authentifié
 *   - A == B (auto-demande)
 *   - B n'est pas opted-in sur l'opp
 *   - message < 30 chars
 *   - demande déjà existante (UNIQUE constraint en DB)
 */
export async function requestCoSubmissionConnection({ opp_id, target_org_id, message }) {
  if (!opp_id || !target_org_id) return { ok: false, error: 'missing_params' };
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'unauthorized' };

  const cleanMessage = String(message || '').trim();
  if (cleanMessage.length < 30 || cleanMessage.length > 2000) {
    return { ok: false, error: 'message_invalid', detail: 'Entre 30 et 2000 caractères.' };
  }

  // Récupère orga requester
  const { data: requesterOrg } = await supabase
    .from('organizations')
    .select('id, name')
    .eq('user_id', user.id)
    .maybeSingle();
  if (!requesterOrg) return { ok: false, error: 'no_org' };
  if (requesterOrg.id === target_org_id) return { ok: false, error: 'cannot_self_request' };

  // Vérifie que target est opted-in sur cette opp
  const { data: targetIntent } = await supabase
    .from('saved_opportunities')
    .select('organization_id, organizations(id, name, user_id)')
    .eq('opportunity_id', opp_id)
    .eq('organization_id', target_org_id)
    .eq('intent_co_submit', true)
    .maybeSingle();
  if (!targetIntent) return { ok: false, error: 'target_not_opted_in' };

  // Récupère contexte opp
  const { data: opp } = await supabase
    .from('opportunities')
    .select('id, title, deadline, donors(name)')
    .eq('id', opp_id)
    .single();
  if (!opp) return { ok: false, error: 'opp_not_found' };

  // Insère la requête
  const { data: inserted, error: insErr } = await supabase
    .from('co_submission_requests')
    .insert({
      opportunity_id: opp_id,
      requester_user_id: user.id,
      requester_org_id: requesterOrg.id,
      target_org_id,
      message: cleanMessage,
      contact_email: user.email,
    })
    .select('id')
    .single();

  if (insErr) {
    if (/duplicate key|UNIQUE constraint/i.test(insErr.message)) {
      return { ok: false, error: 'already_requested', detail: 'Tu as déjà contacté cette asso sur cette opp.' };
    }
    if (/relation .* does not exist|co_submission_requests/i.test(insErr.message)) {
      return { ok: false, error: 'system_not_ready', detail: 'Migration v27 pas appliquée.' };
    }
    return { ok: false, error: insErr.message };
  }

  // Envoie email à l'owner de l'asso cible (best-effort)
  try {
    // Récupère email du owner via auth.users (best-effort via admin client)
    const targetUserId = targetIntent.organizations?.user_id;
    if (targetUserId) {
      // Note : l'utilisateur appelant n'a pas accès à auth.users. On utilise
      // une RPC ou on délègue. Pour la version MVP, on s'appuie sur la
      // récupération via service role côté lib/email indirectement.
      // Simplification : on ne récupère pas l'email cible côté server action
      // sans service role. On laisse `to` vide et on échoue silencieusement.
      // Alternative : utiliser supabase admin client.
      const { createClient: createAdmin } = await import('@supabase/supabase-js');
      if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
        const admin = createAdmin(
          process.env.NEXT_PUBLIC_SUPABASE_URL,
          process.env.SUPABASE_SERVICE_ROLE_KEY,
          { auth: { autoRefreshToken: false, persistSession: false } }
        );
        const { data: targetUser } = await admin.auth.admin.getUserById(targetUserId);
        const targetEmail = targetUser?.user?.email;
        if (targetEmail) {
          const tpl = tplCoSubmissionRequest({
            requesterOrgName: requesterOrg.name,
            targetOrgName: targetIntent.organizations?.name,
            opp: { id: opp.id, title: opp.title, deadline: opp.deadline, donor_name: opp.donors?.name },
            message: cleanMessage,
            requesterContact: user.email,
          });
          await sendEmail({
            to: targetEmail,
            subject: tpl.subject,
            htmlContent: tpl.htmlContent,
            headers: { 'Reply-To': user.email },
          });
        }
      }
    }
  } catch (e) {
    console.warn('[co-submission] email failed (non-blocking):', e?.message || e);
  }

  revalidatePath(`/opportunities/${opp_id}`);
  return { ok: true, request_id: inserted?.id };
}
