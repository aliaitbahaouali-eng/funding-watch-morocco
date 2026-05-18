import { createAdminClient } from '@/lib/supabase/admin';
import { Card, Badge } from '@/components/ui';
import { formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

/**
 * /admin/emails — journal des emails envoyés + métriques d'engagement
 * agrégées depuis Brevo via la table email_events.
 *
 * Si la table email_events n'existe pas encore (migration v17 pas
 * appliquée), on degrade gracefully sur le journal seul.
 */
export default async function EmailsPage() {
  const admin = createAdminClient();

  const [logsRes, eventsRes] = await Promise.all([
    admin.from('email_logs')
      .select('*, organizations(name)')
      .order('created_at', { ascending: false })
      .limit(100),
    admin.from('email_events')
      .select('message_id, event, occurred_at')
      .gte('occurred_at', new Date(Date.now() - 30 * 86400000).toISOString())
      .limit(5000),
  ]);

  const logs = logsRes.data || [];
  const v17Missing = eventsRes.error && /email_events/i.test(eventsRes.error.message || '');
  const events = eventsRes.data || [];

  // ============================================================
  // Stats agrégées par template (30 derniers jours)
  // ============================================================
  // Index events par message_id pour lookup rapide
  const eventsByMsgId = new Map();
  for (const e of events) {
    const arr = eventsByMsgId.get(e.message_id) || [];
    arr.push(e);
    eventsByMsgId.set(e.message_id, arr);
  }

  // Pour chaque log "sent" récent, compte si une opening / click event existe
  const cutoff30 = new Date(Date.now() - 30 * 86400000);
  const recentLogs = logs.filter((l) => l.status === 'sent' && new Date(l.created_at) >= cutoff30);

  const statsByTemplate = {};
  for (const log of recentLogs) {
    const tpl = log.template || 'untagged';
    if (!statsByTemplate[tpl]) statsByTemplate[tpl] = { sent: 0, opened: 0, clicked: 0, bounced: 0, complained: 0 };
    statsByTemplate[tpl].sent++;
    const ev = eventsByMsgId.get(log.provider_id) || [];
    const kinds = new Set(ev.map((e) => e.event));
    if (kinds.has('opened') || kinds.has('opened_proxy')) statsByTemplate[tpl].opened++;
    if (kinds.has('click')) statsByTemplate[tpl].clicked++;
    if (kinds.has('hard_bounce') || kinds.has('soft_bounce')) statsByTemplate[tpl].bounced++;
    if (kinds.has('spam')) statsByTemplate[tpl].complained++;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black">Emails — journal & engagement</h1>
        <p className="mt-1 text-slate-500">
          Envois récents + taux d'ouverture / clic agrégés depuis les webhooks Brevo (30 derniers jours).
        </p>
      </div>

      {v17Missing && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          ⚠ Migration <code>v17</code> non appliquée — la table <code>email_events</code> n'existe pas, donc les stats opens/clicks sont vides.
          Applique <code>supabase/migration_v17.sql</code> puis configure le webhook Brevo (URL dans <code>.env.example</code>).
        </div>
      )}

      {/* === Stats par template === */}
      <Card>
        <h2 className="text-xl font-black">Engagement par template (30j)</h2>
        <p className="mt-1 text-sm text-slate-500">
          Basé sur les <b>{recentLogs.length}</b> envoi(s) marqué(s) "sent" sur les 30 derniers jours. Total events Brevo : <b>{events.length}</b>.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-100 text-left text-2xs font-black uppercase tracking-widest text-slate-500">
              <tr>
                <th className="py-2">Template</th>
                <th>Envoyés</th>
                <th>Ouverts</th>
                <th>Clics</th>
                <th>Bounces</th>
                <th>Spam</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {Object.entries(statsByTemplate).length === 0 && (
                <tr><td colSpan="6" className="py-4 text-center text-slate-400">Aucun envoi sur les 30 derniers jours.</td></tr>
              )}
              {Object.entries(statsByTemplate).map(([tpl, s]) => {
                const openRate = s.sent ? Math.round((s.opened / s.sent) * 100) : 0;
                const clickRate = s.sent ? Math.round((s.clicked / s.sent) * 100) : 0;
                return (
                  <tr key={tpl}>
                    <td className="py-2 font-bold">{tpl}</td>
                    <td>{s.sent}</td>
                    <td>{s.opened} <span className={`ml-1 text-2xs font-bold ${openRate >= 25 ? 'text-emerald-600' : openRate >= 15 ? 'text-amber-600' : 'text-slate-400'}`}>· {openRate}%</span></td>
                    <td>{s.clicked} <span className={`ml-1 text-2xs font-bold ${clickRate >= 5 ? 'text-emerald-600' : clickRate >= 2 ? 'text-amber-600' : 'text-slate-400'}`}>· {clickRate}%</span></td>
                    <td>{s.bounced}</td>
                    <td>{s.complained}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-2xs text-slate-400">
          Benchmarks ONG/associations : ouverture ≥25% = bon, ≥15% = ok. Clic ≥5% = bon, ≥2% = ok.
        </p>
      </Card>

      {/* === Journal des 100 derniers envois === */}
      <Card>
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black">Journal des envois</h2>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-2xs font-bold text-slate-700">{logs.length} derniers</span>
        </div>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-100 text-left text-xs font-bold uppercase text-slate-500">
              <tr>
                <th className="py-2">Date</th>
                <th>Destinataire</th>
                <th>Sujet</th>
                <th>Template</th>
                <th>Statut</th>
                <th>Events</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.map((e) => {
                const ev = eventsByMsgId.get(e.provider_id) || [];
                const kinds = new Set(ev.map((x) => x.event));
                return (
                  <tr key={e.id}>
                    <td className="py-2">{formatDate(e.created_at)}</td>
                    <td>
                      {e.recipient_email}
                      <p className="text-xs text-slate-500">{e.organizations?.name}</p>
                    </td>
                    <td className="max-w-xs truncate">{e.subject}</td>
                    <td><Badge tone="slate">{e.template || '—'}</Badge></td>
                    <td><Badge tone={e.status === 'sent' ? 'green' : e.status === 'failed' ? 'red' : 'gold'}>{e.status}</Badge></td>
                    <td className="text-2xs">
                      {kinds.has('opened') && '👁️ '}
                      {kinds.has('click') && '🖱️ '}
                      {kinds.has('hard_bounce') && '💥 '}
                      {kinds.has('spam') && '🚫 '}
                      {kinds.has('unsubscribed') && '⤴️ '}
                      {ev.length === 0 && <span className="text-slate-300">—</span>}
                    </td>
                  </tr>
                );
              })}
              {logs.length === 0 && (
                <tr><td colSpan="6" className="py-6 text-center text-slate-500">Aucun email envoyé.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
