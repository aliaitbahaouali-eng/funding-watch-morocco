import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getCurrentOrganization } from '@/lib/auth';
import { Card } from '@/components/ui';

export default async function PreferencesPage() {
  const supabase = createClient();
  const org = await getCurrentOrganization();
  const { data: themes } = await supabase.from('themes').select('*').eq('active', true).order('name_fr');
  const selected = new Set((org?.organization_themes || []).map(t => t.theme_id));

  async function updateThemes(formData) {
    'use server';
    const supabase = createClient();
    const org = await getCurrentOrganization();
    const ids = formData.getAll('theme_id');
    // Reset + upsert
    await supabase.from('organization_themes').delete().eq('organization_id', org.id);
    if (ids.length) {
      const rows = ids.map(theme_id => ({ organization_id: org.id, theme_id }));
      await supabase.from('organization_themes').insert(rows);
    }
    revalidatePath('/dashboard');
    revalidatePath('/dashboard/preferences');
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black">Préférences</h1>
        <p className="mt-1 text-slate-500">Choisissez les thématiques qui vous intéressent. Elles servent au scoring et aux alertes.</p>
      </div>

      <form action={updateThemes}>
        <Card>
          <h2 className="text-xl font-black">Thématiques suivies</h2>
          <p className="mt-1 text-sm text-slate-500">Cochez toutes celles qui correspondent à votre activité.</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(themes || []).map(t => (
              <label key={t.id} className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 p-4 hover:border-primary/30">
                <input type="checkbox" name="theme_id" value={t.id} defaultChecked={selected.has(t.id)} className="mt-1" />
                <div>
                  <p className="font-bold">{t.name_fr}</p>
                  {t.description && <p className="text-xs text-slate-500">{t.description}</p>}
                </div>
              </label>
            ))}
          </div>
          <button className="btn-primary mt-6">Enregistrer mes préférences</button>
        </Card>
      </form>
    </div>
  );
}
