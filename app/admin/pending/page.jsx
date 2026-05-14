import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { Card, Badge } from '@/components/ui';
import { formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

async function decision(id, newStatus) {
  'use server';
  const supabase = createClient();
  const update = { status: newStatus };
  if (newStatus === 'published') update.published_at = new Date().toISOString();
  await supabase.from('opportunities').update(update).eq('id', id);
  revalidatePath('/admin/pending');
  revalidatePath('/admin/opportunities');
  revalidatePath('/opportunities');
}

async function publish(fd) { 'use server'; await decision(fd.get('id'), 'published'); }
async function reject(fd) { 'use server'; await decision(fd.get('id'), 'archived'); }

export default async function PendingPage() {
  const supabase = createClient();
  const { data: opps } = await supabase
    .from('opportunities')
    .select('*, donors(name), sources(name)')
    .in('status', ['draft','pending_review'])
    .order('created_at', { ascending: false })
    .limit(50);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black">Opportunités à valider</h1>
        <p className="mt-1 text-slate-500">Validation humaine obligatoire avant publication.</p>
      </div>

      <Card>
        {(!opps || opps.length === 0) ? (
          <p className="py-8 text-center text-slate-500">Aucune opportunité en attente. Le scraper insère automatiquement les nouveautés ici.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {opps.map(o => (
              <div key={o.id} className="flex flex-wrap items-start justify-between gap-4 py-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap gap-2">
                    <Badge tone="slate">{o.status}</Badge>
                    {o.sources?.name && <Badge tone="blue">source: {o.sources.name}</Badge>}
                    {o.morocco_eligible && <Badge tone="green">🇲🇦</Badge>}
                    {o.ngo_relevant === true && <Badge tone="green">✓ ONG fit {o.ngo_relevance_score ? `· ${o.ngo_relevance_score}` : ''}</Badge>}
                    {o.ngo_relevant === false && <Badge tone="red">✖ Non ONG {o.ngo_relevance_score ? `· ${o.ngo_relevance_score}` : ''}</Badge>}
                    {o.ngo_relevant === null && <Badge tone="gold">? Non classé</Badge>}
                  </div>
                  <Link href={`/admin/opportunities/${o.id}`} className="mt-2 block font-bold hover:text-primary">{o.title}</Link>
                  <p className="text-xs text-slate-500">{o.donors?.name || '—'} · Deadline {formatDate(o.deadline)} · <a href={o.official_url} target="_blank" rel="noopener" className="text-primary hover:underline">Lien officiel ↗</a></p>
                  {o.ngo_relevance_reason && (
                    <p className={`mt-1.5 text-xs italic ${o.ngo_relevant ? 'text-emerald-700' : 'text-amber-700'}`}>
                      🤖 {o.ngo_relevance_reason}
                    </p>
                  )}
                  {o.summary && <p className="mt-2 text-sm text-slate-600">{o.summary.slice(0, 200)}{o.summary.length > 200 ? '…' : ''}</p>}
                </div>
                <div className="flex gap-2">
                  <Link href={`/admin/opportunities/${o.id}`} className="rounded-full border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700">Éditer</Link>
                  <form action={publish}><input type="hidden" name="id" value={o.id} /><button className="rounded-full bg-green-600 px-4 py-2 text-xs font-bold text-white">Publier</button></form>
                  <form action={reject}><input type="hidden" name="id" value={o.id} /><button className="rounded-full bg-red-100 px-4 py-2 text-xs font-bold text-red-700">Rejeter</button></form>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
