import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { SectionTitle, Card } from '@/components/ui';

export const metadata = { title: 'Tarifs — Funding Watch Morocco' };

const plans = [
  { name: 'Gratuit', price: '0 DH', desc: 'Pour découvrir la plateforme.', features: ['Accès aux opportunités publiées', 'Recherche et filtres', 'Sauvegarde jusqu\'à 10 opportunités', 'Alerte hebdomadaire'], cta: 'Créer un compte', href: '/register' },
  { name: 'Pro', price: '290 DH/mois', desc: 'Pour les associations actives.', features: ['Tout du plan Gratuit', 'Sauvegardes illimitées', 'Suivi de candidatures', 'Alertes en temps réel', 'Score de compatibilité IA', 'Checklist de candidature'], cta: 'Commencer', href: '/register?plan=pro', featured: true },
  { name: 'Organisation', price: 'Sur demande', desc: 'Pour les ONG et réseaux.', features: ['Tout du plan Pro', 'Multi-utilisateurs', 'Reporting et exports', 'Accompagnement personnalisé', 'API'], cta: 'Nous contacter', href: '/contact' }
];

export default function PricingPage() {
  return (
    <main>
      <Header />
      <section className="bg-slate-50 py-16">
        <div className="mx-auto max-w-6xl px-6">
          <SectionTitle eyebrow="Tarifs" title="Des tarifs adaptés à la taille de votre structure." text="Démarrez gratuitement, passez Pro quand vous êtes prêts." />
          <div className="grid gap-6 lg:grid-cols-3">
            {plans.map(p => (
              <Card key={p.name} className={p.featured ? 'border-primary/40 ring-2 ring-primary/20' : ''}>
                <p className="text-sm font-bold text-primary">{p.name}</p>
                <p className="mt-2 text-4xl font-black">{p.price}</p>
                <p className="mt-2 text-sm text-slate-500">{p.desc}</p>
                <ul className="mt-6 space-y-2 text-sm text-slate-700">
                  {p.features.map(f => <li key={f}>✓ {f}</li>)}
                </ul>
                <Link href={p.href} className="mt-6 block rounded-full bg-primary py-3 text-center text-sm font-bold text-white">{p.cta}</Link>
              </Card>
            ))}
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
