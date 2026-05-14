import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getTaxonomies } from './actions';
import OnboardingWizard from './OnboardingWizard';

export const metadata = {
  title: 'Bienvenue — Funding Watch Morocco',
  description: 'Construisons votre profil pour vous proposer les meilleures opportunités.',
};

export default async function OnboardingPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Si déjà complété, retour dashboard
  const { data: org } = await supabase
    .from('organizations')
    .select('id, name, onboarding_completed')
    .eq('user_id', user.id)
    .maybeSingle();

  if (org?.onboarding_completed) {
    redirect('/dashboard');
  }

  const taxonomies = await getTaxonomies();

  // Pré-remplit avec les données du register si dispo
  const initial = {
    name: org?.name || user.user_metadata?.org_name || '',
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-red-950 via-black to-red-950 text-white">
      <OnboardingWizard taxonomies={taxonomies} initial={initial} />
    </main>
  );
}
