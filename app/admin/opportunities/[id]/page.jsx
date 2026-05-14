import { notFound, redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import OpportunityForm from '@/components/admin/OpportunityForm';
import { Badge } from '@/components/ui';

export const dynamic = 'force-dynamic';

export default async function EditOpportunity({ params }) {
  const supabase = createClient();
  const [{ data: opp }, { data: donors }, { data: themes }] = await Promise.all([
    supabase.from('opportunities').select('*, opportunity_themes(theme_id)').eq('id', params.id).single(),
    supabase.from('donors').select('id, name').order('name'),
    supabase.from('themes').select('id, name_fr, slug').eq('active', true).order('name_fr')
  ]);
  if (!opp) return notFound();

  async function update(formData) {
    'use server';
    const supabase = createClient();
    const payload = parseForm(formData);
    await supabase.from('opportunities').update(payload).eq('id', params.id);
    const themeIds = formData.getAll('theme_id');
    await supabase.from('opportunity_themes').delete().eq('opportunity_id', params.id);
    if (themeIds.length) {
      await supabase.from('opportunity_themes').insert(themeIds.map(id => ({ opportunity_id: params.id, theme_id: id })));
    }
    revalidatePath(`/admin/opportunities/${params.id}`);
    revalidatePath('/admin/opportunities');
    redirect('/admin/opportunities');
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black">Éditer l'opportunité</h1>
          <p className="mt-1 text-slate-500">{opp.title}</p>
        </div>
        <Badge tone="slate">{opp.status}</Badge>
      </div>
      <OpportunityForm donors={donors || []} themes={themes || []} action={update} defaults={opp} selectedThemeIds={(opp.opportunity_themes || []).map(t => t.theme_id)} />
    </div>
  );
}

function parseForm(fd) {
  return {
    title: fd.get('title'),
    donor_id: fd.get('donor_id') || null,
    type: fd.get('type') || null,
    summary: fd.get('summary') || null,
    description: fd.get('description') || null,
    eligibility: fd.get('eligibility') || null,
    amount_min: fd.get('amount_min') ? parseFloat(fd.get('amount_min')) : null,
    amount_max: fd.get('amount_max') ? parseFloat(fd.get('amount_max')) : null,
    currency: fd.get('currency') || 'EUR',
    deadline: fd.get('deadline') || null,
    official_url: fd.get('official_url'),
    language: fd.get('language') || 'fr',
    countries_eligible: (fd.get('countries_eligible') || '').split(',').map(s => s.trim()).filter(Boolean),
    morocco_eligible: fd.get('morocco_eligible') === 'on',
    verified: fd.get('verified') === 'on',
    difficulty_level: fd.get('difficulty_level') || null,
    required_documents: (fd.get('required_documents') || '').split('\n').map(s => s.trim()).filter(Boolean)
  };
}
