import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { SectionTitle, Card } from '@/components/ui';

export const metadata = { title: 'Contact — Funding Watch Morocco' };

export default function ContactPage() {
  return (
    <main>
      <Header />
      <section className="bg-slate-50 py-16">
        <div className="mx-auto max-w-3xl px-6">
          <SectionTitle eyebrow="Contact" title="Une question, un partenariat, un retour ?" text="Écrivez-nous, nous répondons sous 48h ouvrées." />
          <Card>
            <div className="space-y-3 text-slate-700">
              <p>📧 <a href="mailto:contact@fundingwatch.ma" className="font-bold text-primary hover:underline">contact@fundingwatch.ma</a></p>
              <p>🌍 Casablanca, Maroc</p>
              <p className="text-sm text-slate-500 mt-6">Pour signaler une opportunité, écrivez-nous avec le lien officiel et la deadline. Notre équipe la vérifiera et la publiera si elle est pertinente.</p>
            </div>
          </Card>
        </div>
      </section>
      <Footer />
    </main>
  );
}
