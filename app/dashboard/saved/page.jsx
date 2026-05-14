import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getCurrentOrganization } from '@/lib/auth';
import { Card, Badge } from '@/components/ui';
import { formatDate, daysUntil } from '@/lib/utils';
import StatusSelect from '@/components/dashboard/StatusSelect';

export default async function SavedPage() {
  const supabase = createClient();
  const org = await getCurrentOrganization();
  const { data: saved } = await supabase
    .from('saved_opportunities')
    .select('id, status, notes, reminder_at, saved_at, opportunities(id, title, deadline, donors(name), morocco_eligible, verified)')
    .eq('organization_id', org.id)
    .order('saved_at', { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black">Opportunités sauvegardées</h1>
        <p className="mt-1 text-slate-500">Suivez l'avancement de vos candidatures.</p>
      </div>

      <Card>
        {(!saved || saved.length === 0) ? (
          <div className="py-12 text-center">
            <p className="font-bold">Aucune opportunité sauvegardée.</p>
            <Link href="/opportunities" className="mt-3 inline-block text-sm font-bold text-primary hover:underline">Explorer les opportunités →</Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {saved.map(s => {
              const o = s.opportunities;
              if (!o) return null;
              const days = daysUntil(o.deadline);
              return (
                <div key={s.id} className="flex flex-wrap items-center justify-between gap-4 py-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap gap-2">
                      {o.morocco_eligible && <Badge tone="green">🇲🇦</Badge>}
                      {o.verified && <Badge tone="blue">✓</Badge>}
                    </div>
                    <Link href={`/opportunities/${o.id}`} className="mt-1 block font-bold hover:text-primary">{o.title}</Link>
                    <p className="text-xs text-slate-500">{o.donors?.name} · {formatDate(o.deadline)} · {days >= 0 ? `${days}j restants` : 'Échue'}</p>
                  </div>
                  <StatusSelect id={s.id} value={s.status} />
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
