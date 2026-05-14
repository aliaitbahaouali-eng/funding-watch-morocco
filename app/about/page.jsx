import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { SectionTitle, Card } from '@/components/ui';

export const metadata = { title: 'À propos — Funding Watch Morocco' };

export default function AboutPage() {
  return (
    <main>
      <Header />
      <section className="bg-slate-50 py-16">
        <div className="mx-auto max-w-4xl px-6">
          <SectionTitle eyebrow="À propos" title="Une plateforme d'intelligence de financement pour les associations marocaines." text="Funding Watch Morocco aide les associations, ONG et coopératives à détecter, vérifier et postuler aux opportunités de financement adaptées à leur profil." />
          <Card>
            <h3 className="text-xl font-black">Notre mission</h3>
            <p className="mt-3 leading-7 text-slate-600">Démocratiser l'accès aux financements internationaux pour les acteurs de la société civile marocaine, à travers une veille intelligente, contextualisée et vérifiée.</p>

            <h3 className="mt-8 text-xl font-black">Comment ça marche</h3>
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-slate-600">
              <li>Nos collecteurs scannent en continu les sources de bailleurs (UNDP, UE, GIZ, AFD, UN Women, FAO, fondations, ambassades…).</li>
              <li>Chaque opportunité est analysée, classée par thématique et vérifiée pour l'éligibilité Maroc.</li>
              <li>Une équipe humaine valide chaque appel avant publication.</li>
              <li>Vous recevez des alertes personnalisées selon vos thématiques et votre profil.</li>
            </ol>
          </Card>
        </div>
      </section>
      <Footer />
    </main>
  );
}
