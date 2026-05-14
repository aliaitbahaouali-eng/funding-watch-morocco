import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import LiveBadge from '@/components/premium/LiveBadge';
import { createClient } from '@/lib/supabase/server';
import { formatDate, daysUntil } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Calendrier financement — Funding Watch Morocco' };

export default async function CalendarPage() {
  const supabase = createClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data: opps } = await supabase
    .from('opportunities')
    .select('id, title, deadline, donors(name), morocco_eligible')
    .eq('status', 'published')
    .gte('deadline', today)
    .order('deadline', { ascending: true })
    .limit(60);

  // Group par mois
  const groups = {};
  (opps || []).forEach((o) => {
    if (!o.deadline) return;
    const d = new Date(o.deadline);
    const key = d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    groups[key] = groups[key] || [];
    groups[key].push(o);
  });

  return (
    <main className="min-h-screen bg-grad-light">
      <Header />

      <section className="relative overflow-hidden border-b border-ink-100 bg-white py-16">
        <div className="absolute inset-0 bg-grid opacity-40" />
        <div className="absolute -top-40 left-1/4 h-80 w-80 rounded-full bg-brand-500/15 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-6">
          <LiveBadge label="Calendrier financement" />
          <h1 className="mt-5 font-display text-5xl font-black tracking-tighter lg:text-6xl">
            <span className="title-gradient">Toutes les deadlines</span>, en un coup d'œil.
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-ink-500">Vue calendaire des appels à projets en cours. Ne ratez plus jamais une date limite.</p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-12">
        {Object.keys(groups).length === 0 ? (
          <div className="surface-elevated p-10 text-center">
            <p className="font-bold">Aucune deadline à venir dans la base.</p>
            <Link href="/opportunities" className="mt-3 inline-block text-2xs font-black uppercase tracking-widest text-brand-700 hover:underline">Voir les opportunités →</Link>
          </div>
        ) : (
          <div className="space-y-10">
            {Object.entries(groups).map(([month, items]) => (
              <section key={month}>
                <h2 className="mb-5 font-display text-2xl font-black capitalize">{month}</h2>
                <div className="space-y-3">
                  {items.map((o) => {
                    const days = daysUntil(o.deadline);
                    return (
                      <Link key={o.id} href={`/opportunities/${o.id}`} className="surface-elevated flex flex-wrap items-center gap-4 p-5 lift">
                        <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-2xl bg-grad-brand text-white">
                          <span className="text-2xs font-black uppercase tracking-widest opacity-80">{new Date(o.deadline).toLocaleDateString('fr-FR', { month: 'short' })}</span>
                          <span className="font-display text-xl font-black">{new Date(o.deadline).getDate()}</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-bold">{o.title}</p>
                          <p className="text-xs text-ink-500">{o.donors?.name || 'Bailleur'} · {formatDate(o.deadline)}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {o.morocco_eligible && <span className="chip-brand">🇲🇦</span>}
                          <span className={`chip ${days <= 7 ? 'chip-warn' : days <= 30 ? 'chip-brand' : 'chip-success'}`}>{days}j</span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </section>

      <Footer />
    </main>
  );
}
