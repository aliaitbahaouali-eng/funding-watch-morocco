import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import StatTile from '@/components/premium/StatTile';
import LiveBadge from '@/components/premium/LiveBadge';
import ActivityFeed from '@/components/premium/ActivityFeed';
import { formatDate } from '@/lib/utils';
import TestSourceButton from '@/components/admin/TestSourceButton';

export const dynamic = 'force-dynamic';

export default async function MonitoringPage() {
  const supabase = createClient();

  // Tente d'utiliser la vue source_monitoring (créée par migration_v2.sql)
  let { data: sources } = await supabase.from('source_monitoring').select('*').order('priority').order('name');
  if (!sources) {
    const fallback = await supabase.from('sources').select('*').order('priority').order('name');
    sources = fallback.data;
  }

  const { data: recentLogs } = await supabase
    .from('scraping_logs')
    .select('*, sources(name, category, country)')
    .order('checked_at', { ascending: false })
    .limit(15);

  const totalSources = sources?.length ?? 0;
  const activeSources = (sources || []).filter(s => s.active).length;
  const totalCollected = (sources || []).reduce((s, x) => s + (x.opportunities_collected || 0), 0);
  const totalPublished = (sources || []).reduce((s, x) => s + (x.opportunities_published || 0), 0);
  const errors24h = (recentLogs || []).filter(l => l.status === 'error' && new Date(l.checked_at) > new Date(Date.now() - 86400000)).length;
  const successRate = (recentLogs && recentLogs.length)
    ? Math.round(recentLogs.filter(l => l.status === 'success').length / recentLogs.length * 100)
    : 0;

  // Group by category
  const byCategory = {};
  for (const s of (sources || [])) {
    const cat = s.category || 'other';
    byCategory[cat] = byCategory[cat] || { count: 0, items: 0 };
    byCategory[cat].count++;
    byCategory[cat].items += s.opportunities_collected || 0;
  }

  const activity = (recentLogs || []).slice(0, 6).map(l => ({
    type: l.status === 'success' ? 'validated' : l.status === 'error' ? 'reminder' : 'new',
    title: `${l.sources?.name || l.source_name || 'Source'} — ${l.items_found} trouvés, ${l.items_created} créés`,
    time: formatDate(l.checked_at)
  }));

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl bg-grad-dark p-8 text-white">
        <div className="absolute inset-0 bg-grid opacity-20" />
        <div className="absolute -right-32 -top-32 h-72 w-72 rounded-full bg-grad-brand opacity-30 blur-3xl" />
        <div className="relative flex flex-wrap items-end justify-between gap-6">
          <div>
            <LiveBadge label="Monitoring · Veille active" />
            <h1 className="mt-4 font-display text-4xl font-black tracking-tight lg:text-5xl">
              <span className="text-brand-400">Centre de contrôle</span> de la veille
            </h1>
            <p className="mt-2 text-white/70">Performance des sources, logs techniques et tests manuels.</p>
          </div>
          <Link href="/admin/sources" className="btn-primary text-2xs uppercase tracking-widest">+ Gérer les sources</Link>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Sources actives" value={activeSources} hint={`sur ${totalSources} configurées`} icon="🌐" />
        <StatTile label="Opportunités collectées" value={totalCollected} hint="cumul tous statuts" icon="📥" />
        <StatTile label="Publiées" value={totalPublished} hint="après validation" icon="✓" />
        <StatTile label="Taux succès 15j" value={successRate} suffix="%" hint={`${errors24h} erreurs 24h`} icon="⚡" deltaPositive={errors24h === 0} delta={errors24h ? `${errors24h} erreurs` : 'aucune erreur'} />
      </div>

      {/* Par catégorie */}
      <div className="card">
        <p className="eyebrow">Répartition par catégorie</p>
        <h2 className="mt-2 mb-6 font-display text-2xl font-black">Sources & items collectés</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Object.entries(byCategory).map(([cat, v]) => (
            <div key={cat} className="rounded-2xl border border-ink-100 bg-ink-50 p-5">
              <p className="text-2xs font-black uppercase tracking-widest text-ink-500">{CATEGORY_LABELS[cat] || cat}</p>
              <p className="mt-2 font-display text-3xl font-black text-brand-700">{v.count}</p>
              <p className="mt-1 text-xs text-ink-500">{v.items} item(s) collectés</p>
            </div>
          ))}
        </div>
      </div>

      {/* Sources detail */}
      <div className="card">
        <div className="flex items-center justify-between">
          <div>
            <p className="eyebrow">Sources détail</p>
            <h2 className="mt-2 font-display text-2xl font-black">{totalSources} sources configurées</h2>
          </div>
        </div>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-ink-100 text-left text-2xs font-black uppercase tracking-widest text-ink-500">
              <tr><th className="py-3">Source</th><th>Catégorie</th><th>Fréq.</th><th>Fiabilité</th><th>Items / publiés</th><th>Dernier check</th><th>Actions</th></tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {(sources || []).slice(0, 40).map(s => (
                <tr key={s.id} className={s.active ? '' : 'opacity-50'}>
                  <td className="py-3">
                    <p className="font-bold">{s.name}</p>
                    <a href={s.url} target="_blank" rel="noopener" className="text-2xs text-ink-400 hover:text-brand-700">{(s.url || '').slice(0, 50)}…</a>
                  </td>
                  <td><span className="chip">{CATEGORY_LABELS[s.category] || s.category || '—'}</span></td>
                  <td>{s.frequency}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-16 overflow-hidden rounded-full bg-ink-100">
                        <div className="h-full bg-grad-brand" style={{ width: `${s.reliability_score || 80}%` }} />
                      </div>
                      <span className="text-2xs font-bold">{s.reliability_score ?? 80}</span>
                    </div>
                  </td>
                  <td><span className="font-bold">{s.opportunities_collected || 0}</span> <span className="text-ink-400">/ {s.opportunities_published || 0}</span></td>
                  <td className="text-2xs">
                    {s.last_checked ? formatDate(s.last_checked) : <span className="text-ink-400">jamais</span>}
                    {s.last_error && <p className="mt-0.5 text-2xs text-brand-600">⚠ erreur</p>}
                  </td>
                  <td><TestSourceButton sourceId={s.id} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Activity feed */}
      <div className="card">
        <p className="eyebrow">Activité récente</p>
        <h2 className="mt-2 mb-6 font-display text-2xl font-black">Derniers logs de collecte</h2>
        <ActivityFeed items={activity} />
        <div className="mt-6">
          <Link href="/admin/logs" className="text-2xs font-black uppercase tracking-widest text-brand-700 hover:underline">
            Voir tous les logs →
          </Link>
        </div>
      </div>
    </div>
  );
}

const CATEGORY_LABELS = {
  maroc: '🇲🇦 Maroc',
  un: '🇺🇳 ONU',
  eu: '🇪🇺 UE',
  cooperation: '🤝 Coopération',
  ngo_platform: '🌐 ONG',
  foundation: '🏛️ Fondation',
  embassy: '🏢 Ambassade'
};
