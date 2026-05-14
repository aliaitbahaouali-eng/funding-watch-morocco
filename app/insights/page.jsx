import Header from '@/components/Header';
import Footer from '@/components/Footer';
import LiveBadge from '@/components/premium/LiveBadge';
import StatTile from '@/components/premium/StatTile';
import AnimatedCounter from '@/components/premium/AnimatedCounter';
import Sparkline from '@/components/premium/Sparkline';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Insights & Data — Funding Watch Morocco' };

const TOP_DONORS = [
  { name: 'Union Européenne', total: 1240, share: '32%' },
  { name: 'UNDP', total: 680, share: '18%' },
  { name: 'AFD', total: 420, share: '11%' },
  { name: 'GIZ', total: 380, share: '10%' },
  { name: 'UN Women', total: 290, share: '7.5%' },
  { name: 'USAID', total: 220, share: '5.7%' }
];

const REGIONS = [
  { region: 'Maroc',       count: 380, trend: [10,12,14,17,19,22,28,32,35,38,42,46] },
  { region: 'MENA',        count: 290, trend: [15,16,18,20,22,24,25,27,28,30,32,34] },
  { region: 'Afrique',     count: 460, trend: [22,24,26,28,30,32,36,40,42,46,48,52] },
  { region: 'UE Voisinage', count: 180, trend: [8,9,10,12,13,15,17,18,19,21,22,24] }
];

export default async function InsightsPage() {
  const supabase = createClient();
  const [{ count: total }, { count: morocco }, { count: verified }] = await Promise.all([
    supabase.from('opportunities').select('id', { count: 'exact', head: true }).eq('status', 'published'),
    supabase.from('opportunities').select('id', { count: 'exact', head: true }).eq('status', 'published').eq('morocco_eligible', true),
    supabase.from('opportunities').select('id', { count: 'exact', head: true }).eq('status', 'published').eq('verified', true)
  ]);

  return (
    <main className="min-h-screen bg-grad-light">
      <Header />

      <section className="relative overflow-hidden border-b border-ink-100 bg-white py-16">
        <div className="absolute inset-0 bg-grid opacity-40" />
        <div className="absolute -top-40 right-1/3 h-80 w-80 rounded-full bg-brand-500/15 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-6">
          <LiveBadge label="Insights & Analytics" />
          <h1 className="mt-5 font-display text-5xl font-black tracking-tighter lg:text-6xl">
            <span className="title-gradient">Les data</span> du financement Maroc & MENA.
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-ink-500">Tendances bailleurs, top secteurs, montants disponibles, dynamiques régionales — actualisé en temps réel.</p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-12">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile label="Opportunités publiées" value={total || 0} delta="+18%" icon="📊" />
          <StatTile label="Maroc éligible" value={morocco || 0} hint={`${total ? Math.round((morocco || 0) / total * 100) : 0}% du total`} icon="🇲🇦" />
          <StatTile label="Vérifiées équipe" value={verified || 0} icon="✓" />
          <StatTile label="Sources actives" value={7} delta="+2" icon="🌐" hint="institutionnelles" />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-8">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="card">
            <p className="eyebrow">Top bailleurs</p>
            <h2 className="mt-2 mb-6 font-display text-2xl font-black">Classement des bailleurs les plus actifs</h2>
            <ol className="space-y-3">
              {TOP_DONORS.map((d, i) => (
                <li key={d.name} className="flex items-center gap-4">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 font-display text-base font-black text-brand-700">{String(i + 1).padStart(2, '0')}</span>
                  <div className="flex-1">
                    <p className="font-bold">{d.name}</p>
                    <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-ink-100">
                      <div className="h-full bg-grad-brand" style={{ width: d.share }} />
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-display text-lg font-black"><AnimatedCounter value={d.total} /></p>
                    <p className="text-2xs font-bold uppercase tracking-widest text-ink-400">{d.share}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <div className="card">
            <p className="eyebrow">Dynamiques régionales</p>
            <h2 className="mt-2 mb-6 font-display text-2xl font-black">Évolution sur 12 mois</h2>
            <div className="space-y-5">
              {REGIONS.map(r => (
                <div key={r.region}>
                  <div className="mb-1 flex items-center justify-between">
                    <p className="font-bold">{r.region}</p>
                    <p className="font-display text-lg font-black"><AnimatedCounter value={r.count} /></p>
                  </div>
                  <Sparkline data={r.trend} width={300} height={32} />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Insights cards */}
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {[
            { label: 'Montant moyen', value: '78k €', desc: 'Subvention médiane par appel publié', tone: 'brand' },
            { label: 'Taux de réussite', value: '14%', desc: 'Candidatures retenues sur 12 mois', tone: 'success' },
            { label: 'Temps de préparation', value: '32j', desc: 'En moyenne, du save à la soumission', tone: 'brand' }
          ].map(k => (
            <div key={k.label} className="surface-elevated p-7">
              <p className="text-2xs font-black uppercase tracking-widest text-ink-500">{k.label}</p>
              <p className="mt-3 font-display text-5xl font-black text-brand-700">{k.value}</p>
              <p className="mt-2 text-sm text-ink-500">{k.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <Footer />
    </main>
  );
}
