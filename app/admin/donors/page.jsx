import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { Card } from '@/components/ui';

export const dynamic = 'force-dynamic';

async function create(fd) {
  'use server';
  const supabase = createClient();
  await supabase.from('donors').insert({
    name: fd.get('name'),
    type: fd.get('type') || null,
    country: fd.get('country') || null,
    website: fd.get('website') || null,
    description: fd.get('description') || null
  });
  revalidatePath('/admin/donors');
}

async function destroy(fd) {
  'use server';
  const supabase = createClient();
  await supabase.from('donors').delete().eq('id', fd.get('id'));
  revalidatePath('/admin/donors');
}

export default async function DonorsPage() {
  const supabase = createClient();
  const { data: donors } = await supabase.from('donors').select('*').order('name');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black">Bailleurs</h1>
        <p className="mt-1 text-slate-500">Liste des bailleurs référencés.</p>
      </div>

      <Card>
        <h2 className="text-lg font-black">Ajouter un bailleur</h2>
        <form action={create} className="mt-4 grid gap-3 md:grid-cols-3">
          <input name="name" required placeholder="Nom" className="input" />
          <select name="type" className="input">
            <option value="">Type…</option>
            <option value="bilateral">Bilatéral</option>
            <option value="multilateral">Multilatéral</option>
            <option value="foundation">Fondation</option>
            <option value="ngo">ONG</option>
            <option value="government">Gouvernement</option>
            <option value="private">Privé</option>
          </select>
          <input name="country" placeholder="Pays" className="input" />
          <input name="website" placeholder="Site web" className="input md:col-span-2" />
          <input name="description" placeholder="Description courte" className="input" />
          <button className="btn-primary md:col-span-3">Ajouter</button>
        </form>
      </Card>

      <Card>
        <table className="w-full text-sm">
          <thead className="border-b border-slate-100 text-left text-xs font-bold uppercase text-slate-500"><tr><th className="py-2">Nom</th><th>Type</th><th>Pays</th><th></th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {(donors || []).map(d => (
              <tr key={d.id}>
                <td className="py-2 font-bold">{d.name}</td>
                <td>{d.type || '—'}</td>
                <td>{d.country || '—'}</td>
                <td className="text-right">
                  <form action={destroy}><input type="hidden" name="id" value={d.id} /><button className="text-xs font-bold text-red-600 hover:underline">Supprimer</button></form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
