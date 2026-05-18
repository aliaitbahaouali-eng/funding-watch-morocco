import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrentUser } from '@/lib/auth';
import { sendEmail, tplDailyDigest } from '@/lib/email';
import { Card } from '@/components/ui';

export const dynamic = 'force-dynamic';

/**
 * /admin/email-preview — outil interne :
 *   - sélecteur d'organisation (toutes les onboardées)
 *   - lien "Ouvrir HTML rendu" qui pointe vers /admin/email-preview/render
 *     (le template digest sert isolé dans un onglet séparé)
 *   - bouton "Envoyer un test" qui envoie le digest à l'email de l'admin
 *     connecté
 *
 * Version simplifiée : pas d'iframe inline (provoque un 500 dev pour
 * raisons inconnues — à investiguer en debug futur). Le lien externe
 * permet une preview identique sans embed.
 */
export default async function EmailPreviewPage() {
  const session = await getCurrentUser();
  const admin = createAdminClient();
  const { data: orgs } = await admin
    .from('organizations')
    .select('id, name, email_frequency, unsubscribe_token, profiles!inner(email)')
    .eq('onboarding_completed', true)
    .order('name', { ascending: true })
    .limit(100);

  const orgList = orgs || [];

  async function sendTestEmail(formData) {
    'use server';
    const session = await getCurrentUser();
    if (!session?.profile?.email) return;
    const orgId = formData.get('org_id')?.toString();
    if (!orgId) return;
    const admin = createAdminClient();
    const { data: org } = await admin
      .from('organizations')
      .select('id, name, unsubscribe_token')
      .eq('id', orgId)
      .maybeSingle();
    if (!org) return;
    const { data: matches } = await admin.rpc('match_opportunities_for_org', {
      p_org_id: org.id, p_limit: 3,
    });
    if (!matches || matches.length === 0) return;
    const tpl = tplDailyDigest({
      orgName: org.name,
      matches,
      unsubscribeToken: org.unsubscribe_token,
    });
    await sendEmail({
      to: session.profile.email,
      subject: `[TEST] ${tpl.subject}`,
      htmlContent: tpl.htmlContent,
    });
    revalidatePath('/admin/email-preview');
  }

  return (
    <div>
      <h1 className="text-3xl font-black">Aperçu email — digest matinal</h1>
      <p className="mt-1 text-slate-500">
        Tests envoyés à <b>{session?.profile?.email || '—'}</b>.
      </p>

      <Card>
        <p className="mb-4 text-sm text-slate-500">
          Chaque org → ouvre le HTML dans un onglet pour preview visuel + bouton test.
        </p>

        <ul className="divide-y divide-slate-100">
          {orgList.length === 0 && (
            <li className="py-3 text-sm text-slate-400">Aucune org onboardée.</li>
          )}
          {orgList.map((o) => (
            <li key={o.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div className="min-w-0 flex-1">
                <p className="font-bold">{o.name}</p>
                <p className="text-xs text-slate-500">{o.profiles?.email} · fréquence {o.email_frequency || '—'}</p>
              </div>
              <div className="flex gap-2">
                <a
                  href={`/admin/email-preview/render?org=${o.id}`}
                  target="_blank"
                  rel="noopener"
                  className="btn-secondary text-2xs uppercase tracking-widest"
                >
                  Ouvrir HTML ↗
                </a>
                <form action={sendTestEmail}>
                  <input type="hidden" name="org_id" value={o.id} />
                  <button className="btn-primary text-2xs uppercase tracking-widest">✉ Test send</button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
