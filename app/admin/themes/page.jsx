import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { Card } from '@/components/ui';
import { slugify } from '@/lib/utils';

export const dynamic = 'force-dynamic';

async function create(fd) {
  'use server';
  const supabase = createClient();
  const name = fd.get('name');
  await supabase.from('themes').insert({
    name_fr: name,
    slug: slugify(name),
    keywords: (fd.get('keywords') || '').split(',').map(s => s.trim()).filter(Boolean),
    active: true
  });
  revalidatePath('/admin/themes');
}

async function toggle(fd) {
  'use server';
  const supabase = createClient();
  const { data } = await supabase.from('themes').select('active').eq('id', fd.get('id')).single();
  await supabase.from('themes').update({ active: !data?.active }).eq('id', fd.get('id'));
  revalidatePath('/admin/themes');
}

export default async function ThemesAdmin() {
  const supabase = createClient();
  const { data: themes } = await supabase.from('themes').select('*').order('name_fr');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black">Thématiques</h1>
        <p className="mt-1 text-slate-500">Catégories pour classer les opportunités.</p>
      </div>

      <Card>
        <h2 className="text-lg font-black">Ajouter une thématique</h2>
        <form action={create} className="mt-4 grid gap-3 md:grid-cols-2">
          <input name="name" required placeholder="Nom" className="input" />
          <input name="keywords" placeholder="mots-clés (séparés par virgule)" className="input" />
          <button className="btn-primary md:col-span-2">Ajouter</button>
        </form>
      </Card>

      <Card>
        <div className="divide-y divide-slate-100">
          {(themes || []).map(t => (
            <div key={t.id} className="flex items-center justify-between py-3">
              <div>
                <p className="font-bold">{t.name_fr}</p>
                <p className="text-xs text-slate-500">/{t.slug} · {(t.keywords || []).slice(0, 5).join(', ')}</p>
              </div>
              <form action={toggle}><input type="hidden" name="id" value={t.id} /><button className={`rounded-full px-3 py-1 text-xs font-bold ${t.active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>{t.active ? 'Active' : 'Inactive'}</button></form>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
