'use server';

import { createClient } from '@/lib/supabase/server';
import { sendEmail, tplWelcome } from '@/lib/email';

/**
 * Sprint 4L — envoie l'email de bienvenue juste après le register.
 *
 * Appelé depuis le client après que supabase.auth.signUp() ait réussi.
 * Idempotent par best-effort : si BREVO_API_KEY manque on log + simule.
 *
 * On NE bloque PAS l'UX si l'email échoue — l'utilisateur va sur
 * /onboarding même si Brevo plante.
 */
export async function sendWelcomeEmail({ email, fullName, orgName }) {
  if (!email) return { ok: false, error: 'missing_email' };

  try {
    const tpl = tplWelcome({ fullName, orgName });
    const result = await sendEmail({
      to: email,
      subject: tpl.subject,
      htmlContent: tpl.htmlContent,
    });

    // Log dans email_logs si la table existe (best-effort)
    try {
      const supabase = createClient();
      await supabase.from('email_logs').insert({
        recipient: email,
        template: 'welcome',
        subject: tpl.subject,
        provider_id: result.providerId || null,
        simulated: !!result.simulated,
        status: result.ok ? 'sent' : 'error',
        error_message: result.error || null,
      });
    } catch {
      // table email_logs peut ne pas exister selon la version de migration appliquée
    }

    return result;
  } catch (e) {
    console.warn('[welcome-email] failed:', e?.message || e);
    return { ok: false, error: e?.message || 'unknown' };
  }
}
