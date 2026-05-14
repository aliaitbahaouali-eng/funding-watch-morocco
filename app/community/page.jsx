import Header from '@/components/Header';
import Footer from '@/components/Footer';
import LiveBadge from '@/components/premium/LiveBadge';
import AnimatedCounter from '@/components/premium/AnimatedCounter';

export const metadata = { title: 'Communauté — Funding Watch Morocco' };

const EXPERTS = [
  { name: 'Karim Bennani', role: 'Consultant senior UE / NDICI', city: 'Casablanca', skills: ['UE', 'NDICI', 'Logframe'] },
  { name: 'Hanane Mansouri', role: 'Spécialiste M&E', city: 'Rabat', skills: ['M&E', 'Theory of change', 'Audit'] },
  { name: 'Yassine Tahiri', role: 'Expert ESS & coopératives', city: 'Marrakech', skills: ['ESS', 'AFD', 'Drosos'] },
  { name: 'Sofia Amrani', role: 'Consultante genre & jeunesse', city: 'Tanger', skills: ['UN Women', 'Genre', 'Youth'] }
];

const DISCUSSIONS = [
  { title: 'Comment justifier les coûts indirects dans un budget UE ?', replies: 24, members: 8 },
  { title: 'Retour d\'XP : 1ère soumission UNDP Procurement', replies: 12, members: 5 },
  { title: 'Trouver un partenaire UE en Belgique pour un consortium', replies: 18, members: 9 },
  { title: 'Modèle de Theory of Change pour projet jeunesse', replies: 6, members: 4 }
];

const EVENTS = [
  { date: '24 mai', title: 'Webinaire : Décoder l\'AAP UE NDICI Sud 2026', online: true },
  { date: '03 juin', title: 'Rencontre annuelle des associations marocaines', online: false, city: 'Casablanca' },
  { date: '14 juin', title: 'Workshop : Budget UE en 30 minutes', online: true },
  { date: '28 juin', title: 'Forum AFD Maghreb · Innovation sociale', online: false, city: 'Rabat' }
];

export default function CommunityPage() {
  return (
    <main className="min-h-screen bg-grad-light">
      <Header />

      <section className="relative overflow-hidden border-b border-ink-100 bg-white py-16">
        <div className="absolute inset-0 bg-grid opacity-40" />
        <div className="absolute -top-40 left-0 h-80 w-80 rounded-full bg-brand-500/15 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-6">
          <LiveBadge label="Communauté Funding Watch" />
          <h1 className="mt-5 font-display text-5xl font-black tracking-tighter lg:text-6xl">
            <span className="title-gradient">Connectez-vous</span> avec les pros du financement.
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-ink-500">Réseau d'associations marocaines, experts, consultants, événements, discussions. Plus on s'entraide, plus on lève.</p>
          <div className="mt-8 flex flex-wrap gap-5">
            <div className="flex items-center gap-2 text-sm text-ink-700">
              <span className="font-display text-3xl font-black text-brand-700"><AnimatedCounter value={420} suffix="+" /></span>
              <span>associations</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-ink-700">
              <span className="font-display text-3xl font-black text-brand-700"><AnimatedCounter value={68} suffix="+" /></span>
              <span>experts vérifiés</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-ink-700">
              <span className="font-display text-3xl font-black text-brand-700"><AnimatedCounter value={12} /></span>
              <span>événements ce mois</span>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-12">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Experts */}
          <div className="card lg:col-span-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="eyebrow">Experts & consultants</p>
                <h2 className="mt-2 font-display text-2xl font-black">Trouvez le bon profil pour votre prochaine candidature</h2>
              </div>
              <a href="#" className="text-2xs font-black uppercase tracking-widest text-brand-700 hover:underline">Tous →</a>
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {EXPERTS.map(e => (
                <div key={e.name} className="surface-elevated lift p-5">
                  <div className="flex items-center gap-3">
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-grad-brand font-display text-base font-black text-white">{e.name.split(' ').map(w => w[0]).join('')}</span>
                    <div>
                      <p className="font-bold">{e.name}</p>
                      <p className="text-xs text-ink-500">{e.role} · {e.city}</p>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {e.skills.map(s => <span key={s} className="chip">{s}</span>)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Évenements */}
          <div className="card">
            <p className="eyebrow">Événements</p>
            <h2 className="mt-2 mb-6 font-display text-2xl font-black">À venir</h2>
            <ul className="space-y-4">
              {EVENTS.map((e, i) => (
                <li key={i} className="flex gap-4">
                  <span className="flex h-12 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-xs font-black uppercase tracking-widest text-brand-700">{e.date}</span>
                  <div>
                    <p className="font-bold">{e.title}</p>
                    <p className="text-xs text-ink-500">{e.online ? '🔴 En ligne' : `📍 ${e.city}`}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Discussions */}
        <div className="card mt-8">
          <div className="flex items-center justify-between">
            <div>
              <p className="eyebrow">Forum communauté</p>
              <h2 className="mt-2 font-display text-2xl font-black">Discussions récentes</h2>
            </div>
            <a href="#" className="btn-secondary text-2xs uppercase tracking-widest">+ Nouvelle discussion</a>
          </div>
          <ul className="mt-5 divide-y divide-ink-100">
            {DISCUSSIONS.map((d, i) => (
              <li key={i} className="flex flex-wrap items-center justify-between gap-4 py-4">
                <div>
                  <a href="#" className="font-bold hover:text-brand-700">{d.title}</a>
                  <p className="text-xs text-ink-400">{d.replies} réponses · {d.members} membres actifs</p>
                </div>
                <span className="chip-brand">Actif</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <Footer />
    </main>
  );
}
