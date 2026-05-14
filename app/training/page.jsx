import Header from '@/components/Header';
import Footer from '@/components/Footer';
import LiveBadge from '@/components/premium/LiveBadge';

export const metadata = { title: 'Formations — Funding Watch Morocco' };

const COURSES = [
  { level: 'Débutant', duration: '3h', modules: 6, title: 'Premiers pas : décrocher son premier financement international', topics: ['Identifier les bailleurs', 'Comprendre un AAP', 'Préparer son dossier'] },
  { level: 'Intermédiaire', duration: '5h', modules: 10, title: 'Rédiger une proposition gagnante (UE / UNDP)', topics: ['Concept note', 'Logframe', 'Budget narratif'] },
  { level: 'Avancé', duration: '4h', modules: 8, title: 'Master class : consortiums internationaux & cofinancement', topics: ['Trouver des partenaires', 'Lead vs co-applicant', 'Cost share'] },
  { level: 'Pratique', duration: '2h', modules: 4, title: 'Workshop : monter un budget UE en 30 min', topics: ['Catégories éligibles', 'Per diem', 'Audit'] },
  { level: 'Stratégie', duration: '3h', modules: 6, title: 'Construire une stratégie de financement triennale', topics: ['Diversification bailleurs', 'Mix subventions/contrats', 'Pipeline'] },
  { level: 'Pratique', duration: '90min', modules: 3, title: 'Webinaire mensuel : les opportunités du mois', topics: ['Tour d\'horizon', 'Q&R live', 'Replay disponible'] }
];

const LEVEL_TONE = { 'Débutant': 'chip-success', 'Intermédiaire': 'chip-brand', 'Avancé': 'chip-warn', 'Pratique': 'chip', 'Stratégie': 'chip-brand' };

export default function TrainingPage() {
  return (
    <main className="min-h-screen bg-grad-light">
      <Header />

      <section className="relative overflow-hidden border-b border-ink-100 bg-white py-16">
        <div className="absolute inset-0 bg-grid opacity-40" />
        <div className="absolute -top-40 right-0 h-80 w-80 rounded-full bg-brand-500/15 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-6">
          <LiveBadge label="Formations & webinaires" />
          <h1 className="mt-5 font-display text-5xl font-black tracking-tighter lg:text-6xl">
            <span className="title-gradient">Montez en compétence</span> sur le financement international.
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-ink-500">Modules en ligne, webinaires live, tutoriels vidéo et workshops pratiques — conçus pour les équipes d'associations marocaines.</p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {COURSES.map((c, i) => (
            <article key={i} className="surface-elevated lift p-6">
              <div className="flex items-center justify-between">
                <span className={LEVEL_TONE[c.level]}>{c.level}</span>
                <span className="text-2xs font-bold uppercase tracking-widest text-ink-400">{c.duration} · {c.modules} modules</span>
              </div>
              <h3 className="mt-4 font-display text-xl font-black leading-tight">{c.title}</h3>
              <ul className="mt-4 space-y-1.5 text-sm text-ink-600">
                {c.topics.map(t => <li key={t} className="flex items-start gap-2"><span className="text-brand-700">▸</span>{t}</li>)}
              </ul>
              <a href="#" className="mt-5 inline-block text-2xs font-black uppercase tracking-widest text-brand-700 hover:underline">Commencer →</a>
            </article>
          ))}
        </div>
      </section>

      <Footer />
    </main>
  );
}
