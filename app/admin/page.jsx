import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { StatCard, Card, Badge } from '@/components/ui';
import { formatDate } from '@/lib/utils';

export default async function AdminDashboard() {
  const supabase = createClient();
  const today = new Date().toISOString().slice(0, 10);

  const [draftRes, pubRes, archRes, orgsRes, sourcesRes, logsRes, emailsRes] = await Promise.all([
    supabase.from('opportunities').select('id', { count: 'exact', head: true }).eq('status', 'draft'),
    supabase.from('opportunities').select('id', { count: 'exact', head: true }).eq('status', 'published'),
    supabase.from('opportunities').select('id', { count: 'exact', head: true }).eq('status', 'archived'),
    supabase.from('organizations').select('id', { count: 'exact', head: true }),
    supabase.from('sources').select('id', { count: 'exact', head: true }).eq('active', true),
    supabase.from('scraping_logs').select('*, sources(name)').order('checked_at', { ascending: false }).limit(5),
    supabase.from('email_logs').select('id', { count: 'exact', head: true }).gte('created_at', new Date(Date.now() - 7 * 86400000).toISOString())
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black">Back-office admin</h1>
        <p className="mt-1 text-slate-500">Vue d'ensemble de la plateforme.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Brouillons à valider" value={draftRes.count ?? 0} sub="status=draft" icon="🕐" />
        <StatCard label="Publiées" value={pubRes.count ?? 0} icon="✅" />
        <StatCard label="Archivées" value={archRes.count ?? 0} icon="📦" />
        <StatCard label="Associations" value={orgsRes.count ?? 0} icon="🏢" />
        <StatCard label="Sources actives" value={sourcesRes.count ?? 0} icon="🌐" />
        <StatCard label="Emails 7j" value={emailsRes.count ?? 0} icon="✉️" />
      </div>

      <Card>
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black">Derniers logs de collecte</h2>
          <Link href="/admin/logs" className="text-sm font-bold text-primary hover:underline">Tous →</Link>
        </div>
        <div className="mt-4 divide-y divide-slate-100">
          {(logsRes.data || []).map(l => (
            <div key={l.id} className="flex items-center justify-between py-3">
              <div>
                <p className="font-bold">{l.sources?.name || l.source_name || 'Source'}</p>
                <p className="text-xs text-slate-500">{formatDate(l.checked_at)} · {l.items_found} trouvés · {l.items_created} créés · {l.duplicates} doublons</p>
              </div>
              <Badge tone={l.status === 'success' ? 'green' : l.status === 'partial' ? 'gold' : 'red'}>{l.status}</Badge>
            </div>
          ))}
          {(!logsRes.data || logsRes.data.length === 0) && <p className="py-4 text-sm text-slate-500">Aucune collecte enregistrée. Lancez le scraper Python.</p>}
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h3 className="text-lg font-black">Actions rapides</h3>
          <div className="mt-4 space-y-2 text-sm">
            <Link href="/admin/pending" className="block rounded-2xl bg-slate-50 p-4 hover:bg-slate-100">🕐 {draftRes.count ?? 0} opportunité(s) à valider</Link>
            <Link href="/admin/opportunities/new" className="block rounded-2xl bg-slate-50 p-4 hover:bg-slate-100">➕ Créer une opportunité manuellement</Link>
            <Link href="/admin/sources" className="block rounded-2xl bg-slate-50 p-4 hover:bg-slate-100">🌐 Gérer les sources</Link>
          </div>
        </Card>
        <Card>
          <h3 className="text-lg font-black">Pipeline de collecte</h3>
          <ol className="mt-4 space-y-2 text-sm text-slate-600">
            <li>1. Sources actives ⇒ scrapers Python (cron / GitHub Actions).</li>
            <li>2. POST sur /api/ingest avec header <code>x-cron-secret</code>.</li>
            <li>3. Insertion en <Badge tone="slate">draft</Badge> et log dans scraping_logs.</li>
            <li>4. Validation manuelle dans <Link href="/admin/pending" className="font-bold text-primary">À valider</Link>.</li>
            <li>5. Publication ⇒ visible dans /opportunities + alertes email.</li>
          </ol>
        </Card>
      </div>
    </div>
  );
}
