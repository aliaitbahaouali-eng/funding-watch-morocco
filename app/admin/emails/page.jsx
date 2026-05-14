import { createClient } from '@/lib/supabase/server';
import { Card, Badge } from '@/components/ui';
import { formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function EmailsPage() {
  const supabase = createClient();
  const { data: emails } = await supabase
    .from('email_logs')
    .select('*, organizations(name)')
    .order('created_at', { ascending: false })
    .limit(100);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black">Emails envoyés</h1>
        <p className="mt-1 text-slate-500">Journal des notifications.</p>
      </div>
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-100 text-left text-xs font-bold uppercase text-slate-500">
              <tr><th className="py-2">Date</th><th>Destinataire</th><th>Sujet</th><th>Template</th><th>Statut</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(emails || []).map(e => (
                <tr key={e.id}>
                  <td className="py-2">{formatDate(e.created_at)}</td>
                  <td>{e.recipient_email}<p className="text-xs text-slate-500">{e.organizations?.name}</p></td>
                  <td>{e.subject}</td>
                  <td><Badge tone="slate">{e.template || '—'}</Badge></td>
                  <td><Badge tone={e.status === 'sent' ? 'green' : e.status === 'failed' ? 'red' : 'gold'}>{e.status}</Badge></td>
                </tr>
              ))}
              {(!emails || emails.length === 0) && <tr><td colSpan="5" className="py-6 text-center text-slate-500">Aucun email envoyé.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
