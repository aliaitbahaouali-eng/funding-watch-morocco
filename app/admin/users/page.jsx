import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { Card, Badge } from '@/components/ui';
import { formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

async function setRole(fd) {
  'use server';
  const supabase = createClient();
  await supabase.from('profiles').update({ role: fd.get('role') }).eq('id', fd.get('id'));
  revalidatePath('/admin/users');
}

export default async function UsersPage() {
  const supabase = createClient();
  const { data: profiles } = await supabase
    .from('profiles')
    .select('*, organizations(id, name, city)')
    .order('created_at', { ascending: false })
    .limit(100);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black">Utilisateurs</h1>
        <p className="mt-1 text-slate-500">Comptes inscrits sur la plateforme.</p>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-100 text-left text-xs font-bold uppercase text-slate-500">
              <tr><th className="py-2">Email</th><th>Association</th><th>Rôle</th><th>Inscrit</th><th></th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(profiles || []).map(p => (
                <tr key={p.id}>
                  <td className="py-2 font-bold">{p.email}</td>
                  <td>{p.organizations?.[0]?.name || '—'}<p className="text-xs text-slate-500">{p.organizations?.[0]?.city}</p></td>
                  <td><Badge tone={p.role === 'admin' ? 'red' : p.role === 'veille' ? 'gold' : 'blue'}>{p.role}</Badge></td>
                  <td>{formatDate(p.created_at)}</td>
                  <td className="text-right">
                    <form action={setRole} className="inline-flex gap-2">
                      <input type="hidden" name="id" value={p.id} />
                      <select name="role" defaultValue={p.role} className="input w-32 text-xs">
                        <option value="association">Association</option>
                        <option value="veille">Veille</option>
                        <option value="admin">Admin</option>
                      </select>
                      <button className="rounded-full bg-slate-900 px-3 py-1 text-xs font-bold text-white">OK</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
