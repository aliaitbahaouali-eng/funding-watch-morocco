import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { Card, Badge } from '@/components/ui';
import { formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

async function create(fd) {
  'use server';
  const supabase = createClient();
  await supabase.from('sources').insert({
    name: fd.get('name'),
    url: fd.get('url'),
    type: fd.get('type') || 'html',
    parser_key: fd.get('parser_key') || null,
    frequency: fd.get('frequency') || 'weekly',
    priority: parseInt(fd.get('priority')) || 1,
    active: true
  });
  revalidatePath('/admin/sources');
}

async function toggle(fd) {
  'use server';
  const supabase = createClient();
  const { data } = await supabase.from('sources').select('active').eq('id', fd.get('id')).single();
  await supabase.from('sources').update({ active: !data?.active }).eq('id', fd.get('id'));
  revalidatePath('/admin/sources');
}

export default async function SourcesPage() {
  const supabase = createClient();
  const { data: sources } = await supabase.from('sources').select('*').order('priority').order('name');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black">Sources</h1>
        <p className="mt-1 text-slate-500">Sources scrapées par les collecteurs Python.</p>
      </div>

      <Card>
        <h2 className="text-lg font-black">Ajouter une source</h2>
        <form action={create} className="mt-4 grid gap-3 md:grid-cols-3">
          <input name="name" required placeholder="Nom" className="input" />
          <input name="url" required placeholder="URL" className="input md:col-span-2" />
          <select name="type" className="input"><option value="html">HTML</option><option value="rss">RSS</option><option value="api">API</option></select>
          <input name="parser_key" placeholder="parser_key (ex: undp)" className="input" />
          <select name="frequency" className="input"><option value="daily">Quotidien</option><option value="weekly">Hebdomadaire</option><option value="monthly">Mensuel</option></select>
          <input name="priority" type="number" min="1" max="5" defaultValue="1" placeholder="Priorité" className="input" />
          <button className="btn-primary md:col-span-3">Ajouter</button>
        </form>
      </Card>

      <Card>
        <table className="w-full text-sm">
          <thead className="border-b border-slate-100 text-left text-xs font-bold uppercase text-slate-500"><tr><th className="py-2">Source</th><th>Type</th><th>Parser</th><th>Fréq.</th><th>Dernier check</th><th></th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {(sources || []).map(s => (
              <tr key={s.id}>
                <td className="py-2"><p className="font-bold">{s.name}</p><a href={s.url} target="_blank" rel="noopener" className="text-xs text-slate-500 hover:text-primary">{s.url.slice(0, 50)}…</a></td>
                <td><Badge tone="slate">{s.type}</Badge></td>
                <td>{s.parser_key || '—'}</td>
                <td>{s.frequency}</td>
                <td className="text-xs">{formatDate(s.last_checked)}</td>
                <td className="text-right">
                  <form action={toggle}><input type="hidden" name="id" value={s.id} /><button className={`rounded-full px-3 py-1 text-xs font-bold ${s.active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>{s.active ? 'Active' : 'Inactive'}</button></form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
