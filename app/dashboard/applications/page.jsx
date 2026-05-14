import { createClient } from '@/lib/supabase/server';
import { getCurrentOrganization } from '@/lib/auth';
import ApplicationsBoard from '@/components/dashboard/ApplicationsBoard';

export const dynamic = 'force-dynamic';

export default async function ApplicationsKanban() {
  const supabase = createClient();
  const org = await getCurrentOrganization();
  const { data: saved } = await supabase
    .from('saved_opportunities')
    .select('id, status, opportunities(id, title, deadline, donors(name))')
    .eq('organization_id', org.id)
    .order('created_at', { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black">Mes candidatures</h1>
        <p className="mt-1 text-slate-500">
          Pipeline idée → brouillon → soumis → résultat. Glissez-déposez une carte ou changez son étape directement.
        </p>
      </div>

      <ApplicationsBoard initialItems={saved || []} />
    </div>
  );
}
