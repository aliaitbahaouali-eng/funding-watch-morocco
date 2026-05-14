import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { Card, Badge } from '@/components/ui';
import { formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

async function setStatus(id, status) {
  'use server';
  const supabase = createClient();
  const update = { status };
  if (status === 'published') update.published_at = new Date().toISOString();
  await supabase.from('opportunities').update(update).eq('id', id);
  revalidatePath('/admin/opportunities');
  revalidatePath('/admin/pending');
  revalidatePath('/opportunities');
}

async function publish(formData) { 'use server'; await setStatus(formData.get('id'), 'published'); }
async function archive(formData) { 'use server'; await setStatus(formData.get('id'), 'archived'); }
async function expire(formData) { 'use server'; await setStatus(formData.get('id'), 'expired'); }
async function destroy(formData) {
  'use server';
  const supabase = createClient();
  await supabase.from('opportunities').delete().eq('id', formData.get('id'));
  revalidatePath('/admin/opportunities');
}

export default async function AdminOpportunities({ searchParams }) {
  const supabase = createClient();
  const status = searchParams?.status || 'all';
  let q = supabase.from('opportunities').select('*, donors(name)').order('created_at', { ascending: false }).limit(50);
  if (status !== 'all') q = q.eq('status', status);
  const { data: opps } = await q;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black">Opportunités</h1>
          <p className="mt-1 text-slate-500">Gestion complète des opportunités.</p>
        </div>
        <Link href="/admin/opportunities/new" className="btn-primary">+ Nouvelle opportunité</Link>
      </div>

      <div className="flex flex-wrap gap-2">
        {['all','draft','pending_review','published','archived','expired'].map(s => (
          <Link key={s} href={`/admin/opportunities?status=${s}`}
            className={`rounded-full px-4 py-2 text-sm font-bold ${status === s ? 'bg-primary text-white' : 'bg-white text-slate-600'}`}>
            {s}
          </Link>
        ))}
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-100 text-left text-xs font-bold uppercase text-slate-500">
              <tr><th className="py-3">Titre</th><th>Bailleur</th><th>Deadline</th><th>Statut</th><th className="text-right">Actions</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(opps || []).map(o => (
                <tr key={o.id}>
                  <td className="py-3 pr-4">
                    <Link href={`/admin/opportunities/${o.id}`} className="font-bold hover:text-primary">{o.title}</Link>
                    <p className="text-xs text-slate-500">{o.morocco_eligible ? '🇲🇦' : ''} {o.verified ? '✓' : ''}</p>
                  </td>
                  <td>{o.donors?.name || '—'}</td>
                  <td>{formatDate(o.deadline)}</td>
                  <td><Badge tone={o.status === 'published' ? 'green' : o.status === 'draft' ? 'slate' : 'gold'}>{o.status}</Badge></td>
                  <td className="text-right">
                    <div className="inline-flex gap-1">
                      {o.status !== 'published' && (
                        <form action={publish}><input type="hidden" name="id" value={o.id} /><button className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">Publier</button></form>
                      )}
                      {o.status !== 'archived' && (
                        <form action={archive}><input type="hidden" name="id" value={o.id} /><button className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">Archiver</button></form>
                      )}
                      {o.status !== 'expired' && (
                        <form action={expire}><input type="hidden" name="id" value={o.id} /><button className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700">Expirer</button></form>
                      )}
                      <form action={destroy}><input type="hidden" name="id" value={o.id} /><button className="rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700">Suppr.</button></form>
                    </div>
                  </td>
                </tr>
              ))}
              {(!opps || opps.length === 0) && <tr><td colSpan={5} className="py-6 text-center text-slate-500">Aucune opportunité.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
