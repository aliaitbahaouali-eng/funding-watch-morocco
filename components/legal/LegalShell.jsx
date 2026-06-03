import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const NAV = [
  { href: '/privacy', label: 'Confidentialité' },
  { href: '/terms', label: 'Conditions générales' },
  { href: '/cookies', label: 'Cookies' },
  { href: '/legal', label: 'Mentions légales' },
];

/**
 * Sprint 5B — Wrapper pour les pages légales.
 * Pose un layout uniforme + une nav latérale entre les 4 pages.
 */
export default function LegalShell({ title, subtitle, lastUpdated, currentPath, children }) {
  return (
    <main className="bg-slate-50">
      <Header />
      <section className="py-12 lg:py-16">
        <div className="mx-auto max-w-5xl px-6">
          <div className="mb-8">
            <p className="text-2xs font-black uppercase tracking-widest text-slate-500">Légal</p>
            <h1 className="mt-2 font-display text-3xl font-black text-slate-950 sm:text-4xl">{title}</h1>
            {subtitle && <p className="mt-2 text-sm text-slate-600">{subtitle}</p>}
            {lastUpdated && (
              <p className="mt-2 text-xs text-slate-400">Dernière mise à jour : {lastUpdated}</p>
            )}
          </div>

          <div className="grid gap-8 lg:grid-cols-[200px_1fr]">
            {/* Sidebar nav */}
            <aside className="lg:sticky lg:top-24 lg:self-start">
              <nav className="flex gap-2 overflow-x-auto rounded-2xl bg-white p-2 shadow-sm lg:flex-col lg:gap-1">
                {NAV.map((it) => {
                  const active = it.href === currentPath;
                  return (
                    <Link
                      key={it.href}
                      href={it.href}
                      className={`whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-bold transition ${
                        active
                          ? 'bg-slate-950 text-white'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {it.label}
                    </Link>
                  );
                })}
              </nav>
              <p className="mt-4 hidden text-2xs leading-5 text-slate-400 lg:block">
                Une question ? Écris-nous à{' '}
                <a href="mailto:contact@fundingwatch.ma" className="font-bold text-brand-700 hover:underline">
                  contact@fundingwatch.ma
                </a>
              </p>
            </aside>

            {/* Content */}
            <div className="prose prose-slate max-w-none rounded-3xl bg-white p-8 shadow-sm">
              {children}
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
