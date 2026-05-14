import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card, SectionTitle } from '@/components/ui';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function ThemesPage() {
  const supabase = createClient();
  const { data: themes } = await supabase.from('themes').select('*').eq('active', true).order('name_fr');

  // Compteur d'opps publiées par thème
  const slugs = (themes || []).map(t => t.slug);
  const counts = {};
  if (themes?.length) {
    const { data: pivots } = await supabase
      .from('opportunity_themes')
      .select('theme_id, opportunities!inner(status)')
      .eq('opportunities.status', 'published');
    (pivots || []).forEach(p => { counts[p.theme_id] = (counts[p.theme_id] || 0) + 1; });
  }

  return (
    <main>
      <Header />
      <section className="bg-slate-50 py-16">
        <div className="mx-auto max-w-7xl px-6">
          <SectionTitle eyebrow="Thématiques" title="Toutes les thématiques suivies par Funding Watch." text="Explorez par domaine d'intervention. Les compteurs reflètent uniquement les opportunités publiées et actives." />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {(themes || []).map(t => (
              <Link key={t.slug} href={`/opportunities?theme=${t.slug}`}>
                <Card className="h-full hover:border-primary/30 hover:shadow-md">
                  <p className="text-2xl font-black text-slate-950">{t.name_fr}</p>
                  {t.description && <p className="mt-2 text-sm text-slate-500">{t.description}</p>}
                  <p className="mt-4 text-sm font-bold text-primary">{counts[t.id] || 0} opportunité(s) →</p>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
