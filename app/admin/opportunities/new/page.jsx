import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import OpportunityForm from '@/components/admin/OpportunityForm';

export default async function NewOpportunityPage() {
  const supabase = createClient();
  const [{ data: donors }, { data: themes }] = await Promise.all([
    supabase.from('donors').select('id, name').order('name'),
    supabase.from('themes').select('id, name_fr, slug').eq('active', true).order('name_fr')
  ]);

  async function create(formData) {
    'use server';
    const supabase = createClient();
    const payload = parseForm(formData);
    payload.status = 'draft';
    const { data: opp, error } = await supabase.from('opportunities').insert(payload).select().single();
    if (error) throw new Error(error.message);
    const themeIds = formData.getAll('theme_id');
    if (themeIds.length) {
      await supabase.from('opportunity_themes').insert(themeIds.map(id => ({ opportunity_id: opp.id, theme_id: id })));
    }
    redirect(`/admin/opportunities/${opp.id}`);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black">Nouvelle opportunité</h1>
        <p className="mt-1 text-slate-500">Créée en brouillon. Publiez-la quand elle est prête.</p>
      </div>
      <OpportunityForm donors={donors || []} themes={themes || []} action={create} />
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
