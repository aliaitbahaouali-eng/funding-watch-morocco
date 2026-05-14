import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendEmail, tplDeadlineReminder } from '@/lib/email';

/**
 * POST /api/cron — tâches périodiques. Header x-cron-secret requis.
 * 1) Marque les opportunités expirées (deadline < today, status='published') en 'expired'.
 * 2) Envoie les rappels de deadline (J-7 et J-30).
 */
export async function POST(request) {
  const secret = request.headers.get('x-cron-secret');
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();
  const today = new Date().toISOString().slice(0, 10);

  // 1) Expirer
  const { data: expired } = await supabase
    .from('opportunities')
    .update({ status: 'expired' })
    .lt('deadline', today)
    .eq('status', 'published')
    .select('id');

  // 2) Rappels deadline
  let sent = 0;
  for (const offset of [7, 30]) {
    const target = new Date();
    target.setDate(target.getDate() + offset);
    const targetStr = target.toISOString().slice(0, 10);

    const { data: saved } = await supabase
      .from('saved_opportunities')
      .select('id, status, organizations(id, name, profiles(email)), opportunities(id, title, deadline)')
      .eq('opportunities.deadline', targetStr)
      .in('status', ['saved','analyzing','preparing']);

    for (const s of (saved || [])) {
      const to = s.organizations?.profiles?.email;
      if (!to || !s.opportunities) continue;
      const { subject, htmlContent } = tplDeadlineReminder({ orgName: s.organizations.name, opp: s.opportunities, days: offset });
      const result = await sendEmail({ to, subject, htmlContent });
      await supabase.from('email_logs').insert({
        organization_id: s.organizations.id,
        recipient_email: to,
        subject,
        template: 'deadline_reminder',
        opportunities: [s.opportunities.id],
        status: result.ok ? 'sent' : 'failed',
        provider_id: result.providerId || null,
        error_message: result.error || null,
        sent_at: result.ok ? new Date().toISOString() : null
      });
      if (result.ok) sent++;
    }
  }

  return NextResponse.json({ ok: true, expired: expired?.length || 0, reminders_sent: sent });
}
