import { createClient } from '@/lib/supabase/server';
import { Card, Badge } from '@/components/ui';
import { formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function LogsPage() {
  const supabase = createClient();
  const { data: logs } = await supabase
    .from('scraping_logs')
    .select('*, sources(name)')
    .order('checked_at', { ascending: false })
    .limit(100);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black">Logs de collecte</h1>
        <p className="mt-1 text-slate-500">Historique des exécutions du scraper.</p>
      </div>
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-100 text-left text-xs font-bold uppercase text-slate-500">
              <tr><th className="py-2">Date</th><th>Source</th><th>Statut</th><th>Trouvés</th><th>Créés</th><th>Doublons</th><th>Durée</th><th>Erreur</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(logs || []).map(l => (
                <tr key={l.id}>
                  <td className="py-2">{formatDate(l.checked_at)}</td>
                  <td className="font-bold">{l.sources?.name || l.source_name || '—'}</td>
                  <td><Badge tone={l.status === 'success' ? 'green' : l.status === 'partial' ? 'gold' : 'red'}>{l.status}</Badge></td>
                  <td>{l.items_found}</td><td>{l.items_created}</td><td>{l.duplicates}</td>
                  <td className="text-xs">{l.duration_ms ? `${l.duration_ms}ms` : '—'}</td>
                  <td className="text-xs text-red-600">{l.error_message || ''}</td>
                </tr>
              ))}
              {(!logs || logs.length === 0) && <tr><td colSpan="8" className="py-6 text-center text-slate-500">Aucun log. Lancez le scraper.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
