import Link from 'next/link';
import NewsletterForm from '@/components/premium/NewsletterForm';

const COLS = [
  { title: 'Plateforme', links: [
    { href: '/opportunities', label: 'Opportunités' },
    { href: '/themes', label: 'Thématiques' },
    { href: '/calendar', label: 'Calendrier financement' },
    { href: '/insights', label: 'Insights & Data' }
  ]},
  { title: 'Communauté', links: [
    { href: '/news', label: 'Actualités' },
    { href: '/resources', label: 'Centre de ressources' },
    { href: '/training', label: 'Formations' },
    { href: '/community', label: 'Communauté' }
  ]},
  { title: 'Produit', links: [
    { href: '/pricing', label: 'Tarifs' },
    { href: '/about', label: 'À propos' },
    { href: '/help', label: 'Centre d\'aide' },
    { href: '/contact', label: 'Contact' },
    { href: '/register', label: 'Créer un compte' }
  ]},
  { title: 'Légal', links: [
    { href: '#', label: 'Confidentialité' },
    { href: '#', label: 'Conditions' },
    { href: '#', label: 'Cookies' },
    { href: '#', label: 'Mentions légales' }
  ]}
];

export default function Footer() {
  return (
    <footer className="relative overflow-hidden bg-ink-950 text-white">
      <div className="absolute inset-0 bg-grid opacity-30" />
      <div className="absolute -top-32 left-1/2 h-64 w-[600px] -translate-x-1/2 bg-grad-brand opacity-30 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-6 py-20">
        <div className="mb-16 grid items-center gap-10 rounded-3xl border border-white/10 bg-white/5 p-10 backdrop-blur-xl md:grid-cols-2">
          <div>
            <p className="eyebrow text-brand-400">Rejoignez la veille</p>
            <h2 className="mt-4 font-display text-4xl font-black tracking-tight md:text-5xl">
              Recevez les financements qui correspondent à votre association.
            </h2>
            <p className="mt-4 text-white/70">Inscription gratuite. Première alerte sous 24h.</p>
          </div>
          <NewsletterForm />
        </div>

        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-1">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-grad-brand font-black text-white">F</div>
              <div>
                <p className="font-display text-base font-black">Funding Watch</p>
                <p className="text-2xs font-bold uppercase tracking-widest text-brand-400">Morocco</p>
              </div>
            </div>
            <p className="mt-5 text-sm leading-7 text-white/60">
              Plateforme d'intelligence de financement pour les associations marocaines et ONG d'Afrique francophone.
            </p>
            <div className="mt-5 flex gap-2">
              {['𝕏', 'in', 'YT', '✉'].map((s) => (
                <a key={s} href="#" className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-sm font-bold hover:border-brand-400 hover:bg-brand-500/10">{s}</a>
              ))}
            </div>
          </div>

          {COLS.map((col) => (
            <div key={col.title}>
              <p className="mb-4 text-2xs font-black uppercase tracking-widest text-brand-400">{col.title}</p>
              <ul className="space-y-2.5 text-sm">
                {col.links.map((l) => (
                  <li key={l.label}><Link href={l.href} className="text-white/70 transition hover:text-white">{l.label}</Link></li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-8 text-2xs uppercase tracking-widest text-white/40">
          <p>© {new Date().getFullYear()} Funding Watch Morocco · Tous droits réservés</p>
          <p>Fait avec ♥ à Casablanca · Stack Next.js · Supabase · Brevo</p>
        </div>
      </div>
    </footer>
  );
}
