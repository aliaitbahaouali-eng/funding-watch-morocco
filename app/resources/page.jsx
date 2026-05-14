import Header from '@/components/Header';
import Footer from '@/components/Footer';
import LiveBadge from '@/components/premium/LiveBadge';

export const metadata = { title: 'Centre de ressources — Funding Watch Morocco' };

const SECTIONS = [
  {
    title: 'Templates de propositions',
    icon: '📝',
    items: [
      { name: 'Concept note (UE)', format: 'DOCX', pages: 4 },
      { name: 'Full proposal (UNDP)', format: 'DOCX', pages: 12 },
      { name: 'Letter of intent', format: 'DOCX', pages: 2 },
      { name: 'Executive summary', format: 'DOCX', pages: 3 }
    ]
  },
  {
    title: 'Budgets & financiers',
    icon: '💰',
    items: [
      { name: 'Budget prévisionnel UE', format: 'XLSX', pages: 6 },
      { name: 'Budget UNDP narratif', format: 'XLSX', pages: 4 },
      { name: 'Fiche financière simple', format: 'XLSX', pages: 2 },
      { name: 'Cost share / cofinancement', format: 'XLSX', pages: 3 }
    ]
  },
  {
    title: 'Logframes & M&E',
    icon: '🎯',
    items: [
      { name: 'Logframe standard', format: 'DOCX', pages: 4 },
      { name: 'Theory of change', format: 'PDF', pages: 8 },
      { name: 'Indicateurs SMART', format: 'XLSX', pages: 5 },
      { name: 'Risk register', format: 'XLSX', pages: 3 }
    ]
  },
  {
    title: 'Guides pratiques',
    icon: '📚',
    items: [
      { name: 'Premiers pas avec l\'UE', format: 'PDF', pages: 24 },
      { name: 'Décoder un AAP UNDP', format: 'PDF', pages: 16 },
      { name: 'Réussir sa note conceptuelle', format: 'PDF', pages: 12 },
      { name: 'Glossaire des bailleurs', format: 'PDF', pages: 32 }
    ]
  }
];

export default function ResourcesPage() {
  return (
    <main className="min-h-screen bg-grad-light">
      <Header />

      <section className="relative overflow-hidden border-b border-ink-100 bg-white py-16">
        <div className="absolute inset-0 bg-grid opacity-40" />
        <div className="absolute -top-32 right-1/2 h-80 w-80 translate-x-1/2 rounded-full bg-brand-500/15 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-6 text-center">
          <LiveBadge label="Centre de ressources · 80+ documents" />
          <h1 className="mt-5 font-display text-5xl font-black tracking-tighter lg:text-6xl">
            <span className="title-gradient">La boîte à outils</span> pour candidater.
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-ink-500">
            Templates, budgets, logframes, guides pratiques : tout ce dont une association marocaine a besoin pour soumettre des propositions de financement de qualité.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid gap-6 lg:grid-cols-2">
          {SECTIONS.map((s) => (
            <div key={s.title} className="surface-elevated p-7">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-2xl">{s.icon}</div>
                <h2 className="font-display text-2xl font-black">{s.title}</h2>
              </div>
              <ul className="mt-6 divide-y divide-ink-100">
                {s.items.map((it, i) => (
                  <li key={i} className="flex items-center justify-between py-3">
                    <div>
                      <p className="font-bold">{it.name}</p>
                      <p className="text-xs text-ink-400">{it.format} · {it.pages} pages</p>
                    </div>
                    <a href="#" className="rounded-full border border-ink-200 px-3 py-1.5 text-2xs font-black uppercase tracking-widest text-ink-700 hover:border-brand-300 hover:text-brand-700">Télécharger</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <Footer />
    </main>
  );
}
