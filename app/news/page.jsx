import Header from '@/components/Header';
import Footer from '@/components/Footer';
import LiveBadge from '@/components/premium/LiveBadge';

export const metadata = { title: 'Actualités — Funding Watch Morocco' };

const ARTICLES = [
  { tag: 'Tendance', title: 'L\'UE débloque 1.2 Md€ pour la zone NDICI Sud en 2026', excerpt: 'Le programme Voisinage Sud accélère ses appels à projets sur le genre, la jeunesse et la transition verte au Maghreb.', date: '12 mai 2026', author: 'Équipe Funding Watch' },
  { tag: 'Politique', title: 'Maroc · Nouveau cadre légal pour les financements internationaux des ONG', excerpt: 'La loi 39-23 entre en vigueur : ce qui change pour les associations recevant des fonds étrangers.', date: '08 mai 2026', author: 'Équipe Funding Watch' },
  { tag: 'Bailleur', title: 'AFD lance un fonds de 80 M€ dédié à l\'innovation sociale au Maghreb', excerpt: 'L\'Agence Française de Développement annonce un nouveau guichet pour les coopératives et entreprises sociales.', date: '05 mai 2026', author: 'Équipe Funding Watch' },
  { tag: 'Innovation', title: '7 ONG marocaines présélectionnées au prix Drosos Impact 2026', excerpt: 'Notre revue des finalistes : éducation, climat, inclusion économique et droits humains.', date: '02 mai 2026', author: 'Équipe Funding Watch' },
  { tag: 'Analyse', title: 'Les 10 thématiques les plus financées au Maroc en 2026', excerpt: 'Analyse comparative des 850 opportunités collectées par notre veille au cours du dernier trimestre.', date: '29 avril 2026', author: 'Équipe Funding Watch' },
  { tag: 'Témoignage', title: '"Comment nous avons levé 250 000 € via l\'UE en 4 mois"', excerpt: 'L\'association Sanad Rabat partage son retour d\'expérience sur le processus de soumission NDICI.', date: '24 avril 2026', author: 'Sanad Rabat' }
];

export default function NewsPage() {
  return (
    <main className="min-h-screen bg-grad-light">
      <Header />

      <section className="relative overflow-hidden border-b border-ink-100 bg-white py-16">
        <div className="absolute inset-0 bg-grid opacity-40" />
        <div className="absolute -top-40 right-0 h-80 w-80 rounded-full bg-brand-500/15 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-6">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <LiveBadge label="Actualités · Veille" />
                <span className="chip-brand">Bailleurs · Politiques · Innovations</span>
              </div>
              <h1 className="mt-5 font-display text-5xl font-black tracking-tighter lg:text-6xl">
                <span className="title-gradient">Le pouls</span> du financement international.
              </h1>
              <p className="mt-4 max-w-2xl text-lg text-ink-500">Décryptages, tendances bailleurs, politiques publiques et innovations dans la coopération internationale.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-12">
        {/* Article vedette */}
        <article className="surface-elevated lift mb-10 grid gap-8 p-8 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <span className="chip-brand">À LA UNE · {ARTICLES[0].tag}</span>
            <h2 className="mt-4 font-display text-3xl font-black leading-tight lg:text-4xl">{ARTICLES[0].title}</h2>
            <p className="mt-4 text-base leading-7 text-ink-500">{ARTICLES[0].excerpt}</p>
            <p className="mt-6 text-xs text-ink-400">{ARTICLES[0].date} · {ARTICLES[0].author}</p>
            <a href="#" className="btn-primary mt-6 inline-flex text-2xs uppercase tracking-widest">Lire l'article →</a>
          </div>
          <div className="relative aspect-square overflow-hidden rounded-3xl bg-grad-brand">
            <div className="absolute inset-0 bg-grid opacity-30" />
            <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center text-white">
              <p className="font-display text-7xl font-black">1.2 Md€</p>
              <p className="mt-2 text-sm font-bold uppercase tracking-widest">UE · NDICI Sud 2026</p>
            </div>
          </div>
        </article>

        {/* Grid articles */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {ARTICLES.slice(1).map((a, i) => (
            <article key={i} className="surface-elevated lift p-6">
              <span className="chip-brand">{a.tag}</span>
              <h3 className="mt-4 font-display text-xl font-black leading-tight">{a.title}</h3>
              <p className="mt-3 text-sm leading-6 text-ink-500">{a.excerpt}</p>
              <div className="mt-4 flex items-center justify-between border-t border-ink-100 pt-4 text-xs text-ink-400">
                <span>{a.date}</span>
                <a href="#" className="font-black uppercase tracking-widest text-brand-700 hover:underline">Lire →</a>
              </div>
            </article>
          ))}
        </div>
      </section>

      <Footer />
    </main>
  );
}
