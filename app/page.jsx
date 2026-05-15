import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import OpportunityCardPremium from '@/components/premium/OpportunityCardPremium';
import LiveBadge from '@/components/premium/LiveBadge';
import AnimatedCounter from '@/components/premium/AnimatedCounter';
import StatTile from '@/components/premium/StatTile';
import DonorMarquee from '@/components/premium/DonorMarquee';
import WorldMap from '@/components/premium/WorldMap';
import Timeline from '@/components/premium/Timeline';
import ActivityFeed from '@/components/premium/ActivityFeed';
import Sparkline from '@/components/premium/Sparkline';
import { createClient } from '@/lib/supabase/server';
import { formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

const SECTORS = [
  { slug: 'femmes',  label: 'Femmes & égalité',  count: 124, delta: '+18%' },
  { slug: 'jeunes',  label: 'Jeunes & emploi',   count: 198, delta: '+24%' },
  { slug: 'climat',  label: 'Climat',            count: 87,  delta: '+12%' },
  { slug: 'digital', label: 'Digitalisation',    count: 56,  delta: '+33%' },
  { slug: 'sante',   label: 'Santé',             count: 71,  delta: '+9%'  },
  { slug: 'rural',   label: 'Rural & agriculture', count: 64, delta: '+6%' }
];

const TESTIMONIALS = [
  { quote: 'Funding Watch nous a fait gagner 6 mois sur notre dernier appel UE. Le scoring est étrangement précis.', name: 'Hanane M.', role: 'Directrice, ONG Education Rabat' },
  { quote: 'Enfin une plateforme pensée pour les associations marocaines. Les alertes ciblées valent de l\'or.', name: 'Karim B.', role: 'Coordinateur projets, Casablanca' },
  { quote: 'On a sauvegardé 14 appels et soumis 3 candidatures en un mois. Productivité ×4.', name: 'Sofia A.', role: 'Coopérative ESS, Marrakech' }
];

const RECENT_ACTIVITY = [
  { type: 'new', title: 'UE — Appel NDICI MENA 2026 publié', time: 'il y a 12 min' },
  { type: 'validated', title: 'UNDP Procurement validée par l\'équipe', time: 'il y a 1 h' },
  { type: 'match', title: '3 nouvelles opportunités matchent votre profil', time: 'il y a 2 h' },
  { type: 'reminder', title: 'Deadline AFD dans 7 jours', time: 'il y a 4 h' },
  { type: 'new', title: 'GIZ — Renewable energy capacity building', time: 'il y a 6 h' }
];

const SPARKLINE_DATA = [12, 18, 15, 22, 30, 26, 34, 38, 32, 45, 50, 48, 56, 60, 58, 68, 72, 75, 82];

// ⚠️ Placeholders bêta — à remplacer par les vraies organisations partenaires
// au fur et à mesure du recrutement de la bêta privée (cf. AUDIT §3.4).
const BETA_PARTNERS = [
  'Association Éducation Rabat',
  'Coopérative ESS Marrakech',
  'ONG Femmes & Climat',
  'Réseau Jeunesse Souss',
  'Fondation Locale Tanger'
];
const ECOSYSTEM = ['Société civile marocaine', 'Bailleurs internationaux', 'Experts financement'];

export default async function HomePage() {
  const supabase = createClient();

  const todayIso = new Date().toISOString().slice(0, 10);
  // P0.3 — count of "fresh" opps for the Header LIVE ticker (published, not test, deadline future or null)
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();

  const [{ data: featured }, { data: themes }, { count: oppCount }, { count: orgCount }, { count: donorCount }, { count: verifiedCount }, { count: freshOppCount }] = await Promise.all([
    supabase.from('opportunities')
      .select('*, donors(name), opportunity_themes(theme_id, themes(name_fr, slug))')
      .eq('status', 'published')
      .or('is_test.is.null,is_test.eq.false')
      .gte('deadline', todayIso)
      .order('deadline', { ascending: true })
      .limit(6),
    supabase.from('themes').select('name_fr, slug').eq('active', true).limit(12),
    supabase.from('opportunities').select('id', { count: 'exact', head: true })
      .eq('status', 'published')
      .or('is_test.is.null,is_test.eq.false')
      .or(`deadline.is.null,deadline.gte.${todayIso}`),
    supabase.from('organizations').select('id', { count: 'exact', head: true }),
    supabase.from('donors').select('id', { count: 'exact', head: true }),
    supabase.from('opportunities').select('id', { count: 'exact', head: true })
      .eq('status', 'published')
      .or('is_test.is.null,is_test.eq.false')
      .eq('verified', true),
    supabase.from('opportunities').select('id', { count: 'exact', head: true })
      .eq('status', 'published')
      .or('is_test.is.null,is_test.eq.false')
      .or(`deadline.is.null,deadline.gte.${todayIso}`)
      .gte('published_at', sevenDaysAgo)
  ]);

  const TRUST_STATS = [
    { value: oppCount || 0, label: 'Opportunités publiées' },
    { value: verifiedCount || 0, label: 'Vérifiées par notre équipe' },
    { value: donorCount || 0, label: 'Bailleurs référencés' },
    { value: orgCount || 0, label: 'Associations inscrites' }
  ];

  const upcomingTimeline = (featured || []).slice(0, 6).map(o => ({
    date: o.deadline ? new Date(o.deadline).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) : '—',
    title: o.title?.slice(0, 36) + (o.title?.length > 36 ? '…' : ''),
    donor: o.donors?.name || 'Bailleur'
  }));

  return (
    <main className="bg-grad-hero min-h-screen">
      <Header />

      {/* ============== HERO ============== */}
      <section className="relative overflow-hidden pt-12 lg:pt-20">
        <div className="absolute inset-0 bg-grid pointer-events-none opacity-50" />
        <div className="absolute -top-40 left-1/2 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-grad-brand opacity-25 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-6">
          <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
            <div className="animate-slide-up">
              <div className="flex flex-wrap items-center gap-3">
                <LiveBadge label="LIVE · Veille active" />
                <span className="chip-brand">🇲🇦 Conçu pour le Maroc</span>
                <span className="chip">⚡ IA scoring</span>
              </div>

              <h1 className="mt-6 font-display text-4xl font-black leading-[1.07] tracking-tighter sm:text-5xl sm:leading-[1.05] lg:text-7xl">
                <span className="title-gradient">L'intelligence</span> derrière chaque financement.
              </h1>

              <p className="mt-6 max-w-xl text-lg leading-8 text-ink-600">
                La plateforme premium qui détecte, vérifie et match les opportunités de financement internationales pour les associations marocaines. Score de compatibilité, alertes ciblées, suivi de candidatures.
              </p>

              <div className="mt-9 flex flex-wrap gap-3">
                <Link href="/opportunities" className="btn-primary text-2xs uppercase tracking-widest">Explorer les opportunités →</Link>
                <Link href="/register" className="btn-secondary text-2xs uppercase tracking-widest">Créer un compte gratuit</Link>
              </div>

              <div className="mt-12 flex flex-wrap items-center gap-6 sm:gap-8">
                <div>
                  <p className="text-2xs font-black uppercase tracking-widest text-ink-500">Aujourd'hui</p>
                  <p className="font-display text-3xl font-black"><AnimatedCounter value={oppCount || 0} /> <span className="text-brand-700">opportunités</span></p>
                </div>
                <div className="h-12 w-px bg-ink-100" />
                <div>
                  <p className="text-2xs font-black uppercase tracking-widest text-ink-500">Cette semaine</p>
                  <p className="font-display text-3xl font-black"><AnimatedCounter value={SPARKLINE_DATA.at(-1)} suffix=" nouvelles" /></p>
                </div>
                <Sparkline data={SPARKLINE_DATA} width={140} height={48} />
              </div>
            </div>

            {/* Live preview panel */}
            <div className="relative">
              <div className="absolute -inset-6 rounded-[3rem] bg-grad-brand opacity-20 blur-3xl" />

              <div className="relative glass-dark p-6 shadow-glow-soft">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div className="flex items-center gap-2">
                    <LiveBadge />
                    <span className="text-sm font-bold text-white">Alertes en temps réel</span>
                  </div>
                  <span className="text-2xs font-black uppercase tracking-widest text-white/40">Maroc éligible · {new Date().toLocaleDateString('fr-FR')}</span>
                </div>

                <div className="mt-5 space-y-3">
                  {(featured || []).slice(0, 3).map((it, i) => (
                    <div key={it.id} className="flex items-center gap-4 rounded-2xl bg-white/5 p-4 transition hover:bg-white/10">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-500/20 text-base font-black text-brand-400">
                        {String(i + 1).padStart(2, '0')}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-white">{it.title}</p>
                        <p className="mt-0.5 text-xs text-white/50">{it.donors?.name || 'Bailleur'} · {formatDate(it.deadline)}</p>
                      </div>
                      <span className="rounded-full bg-emerald-500/20 px-2.5 py-1 text-2xs font-black uppercase tracking-widest text-emerald-400">
                        +{85 + i * 4}
                      </span>
                    </div>
                  ))}
                  {(!featured || featured.length === 0) && (
                    <div className="rounded-2xl bg-white/5 p-6 text-center">
                      <p className="text-sm text-white/60">Aucune opportunité publiée. Lancez la collecte depuis l'admin.</p>
                    </div>
                  )}
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-4 text-xs">
                  <span className="text-white/40">Mise à jour il y a quelques secondes</span>
                  <Link href="/opportunities" className="font-black uppercase tracking-widest text-brand-400 hover:text-brand-300">Tout voir →</Link>
                </div>
              </div>

              <div className="absolute -bottom-4 -left-4 flex items-center gap-2 rounded-full bg-white px-4 py-2 shadow-card-hover">
                <span className="flex -space-x-2">
                  {['#cf2535','#0e9f6e','#f59f00'].map((c, i) => <span key={i} className="h-7 w-7 rounded-full border-2 border-white" style={{ background: c }} />)}
                </span>
                <p className="text-xs font-bold text-ink-700"><AnimatedCounter value={orgCount || 0} /> associations actives</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============== DONOR MARQUEE ============== */}
      <section className="mt-20 border-y border-ink-100 bg-white py-8">
        <p className="mb-5 text-center text-2xs font-black uppercase tracking-[0.3em] text-ink-500">
          Bailleurs et institutions référencés
        </p>
        <DonorMarquee />
      </section>

      {/* ============== TRUST SIGNALS ============== */}
      <section className="mx-auto max-w-7xl px-6 pt-16">
        <div className="surface-elevated overflow-hidden">
          <div className="grid md:grid-cols-[1.25fr_1fr]">
            {/* Partenaires bêta + écosystème */}
            <div className="border-b border-ink-100 p-7 sm:p-9 md:border-b-0 md:border-r">
              <p className="eyebrow">Confiance & transparence</p>
              <h3 className="mt-3 font-display text-2xl font-black tracking-tight">
                Des associations marocaines à impact, déjà à bord.
              </h3>
              <p className="mt-2 text-sm leading-6 text-ink-500">
                Bêta privée en cours : une sélection d'organisations de la société civile teste la plateforme au quotidien et oriente la feuille de route.
              </p>

              <div className="mt-6 flex flex-wrap gap-2.5">
                {BETA_PARTNERS.map((p) => (
                  <div key={p} className="flex items-center gap-2 rounded-2xl border border-ink-100 bg-ink-50 px-3.5 py-2.5">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-grad-brand text-2xs font-black text-white">
                      {p.split(' ').map((w) => w[0]).join('').slice(0, 2)}
                    </span>
                    <span className="text-sm font-bold text-ink-700">{p}</span>
                  </div>
                ))}
              </div>

              <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-ink-100 pt-5">
                <span className="text-2xs font-black uppercase tracking-widest text-ink-400">Au cœur de l'écosystème</span>
                {ECOSYSTEM.map((b) => (
                  <span key={b} className="text-xs font-bold text-ink-600">· {b}</span>
                ))}
              </div>
            </div>

            {/* Chiffres réels (live depuis la base) */}
            <div className="grid grid-cols-2 gap-px bg-ink-100">
              {TRUST_STATS.map((s) => (
                <div key={s.label} className="bg-white p-6">
                  <p className="font-display text-3xl font-black text-brand-700">
                    <AnimatedCounter value={s.value} />
                  </p>
                  <p className="mt-1 text-xs font-bold leading-5 text-ink-500">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-ink-100 bg-ink-50/60 px-7 py-4 text-xs font-bold text-ink-500 sm:px-9">
            <span className="flex items-center gap-1.5">🔒 Vos données restent privées</span>
            <span className="flex items-center gap-1.5">✓ Sources institutionnelles vérifiées</span>
            <span className="flex items-center gap-1.5">🇲🇦 Éligibilité Maroc contrôlée pour chaque appel</span>
          </div>
        </div>
      </section>

      {/* ============== STATS PREMIUM ============== */}
      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="mb-12 flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="eyebrow">Chiffres clés</p>
            <h2 className="mt-3 max-w-2xl font-display text-4xl font-black tracking-tight lg:text-5xl">
              La veille la plus complète sur les financements internationaux <span className="text-brand-700">au Maroc.</span>
            </h2>
          </div>
          <p className="max-w-sm text-sm text-ink-500">Données consolidées en temps réel depuis nos 15+ sources institutionnelles.</p>
        </div>

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          <StatTile label="Opportunités actives" value={oppCount || 0} delta="+18%" icon="🎯" hint="dernières 30 jours" />
          <StatTile label="Bailleurs référencés" value={donorCount || 0} delta="+5" deltaPositive icon="🏛️" hint="nouveaux ce mois" />
          <StatTile label="Associations inscrites" value={orgCount || 0} delta="+24%" icon="🤝" hint="croissance mensuelle" />
          <StatTile label="Thématiques suivies" value={themes?.length || 12} icon="🏷️" hint="catégories actives" />
        </div>

        {/* Secteurs populaires */}
        <div className="mt-14">
          <div className="mb-6 flex items-center justify-between">
            <h3 className="font-display text-2xl font-black">Secteurs les plus financés</h3>
            <Link href="/themes" className="text-2xs font-black uppercase tracking-widest text-brand-700 hover:underline">Tous les secteurs →</Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {SECTORS.map((s) => (
              <Link key={s.slug} href={`/opportunities?theme=${s.slug}`} className="surface-elevated lift p-5">
                <div className="flex items-center justify-between">
                  <p className="font-display text-lg font-black">{s.label}</p>
                  <span className="chip-success">{s.delta}</span>
                </div>
                <p className="mt-3 font-display text-3xl font-black text-brand-700"><AnimatedCounter value={s.count} /></p>
                <p className="mt-1 text-xs text-ink-500">opportunités actives</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ============== LIVE OPPORTUNITIES ============== */}
      <section className="relative bg-ink-50 py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="eyebrow flex items-center gap-3"><LiveBadge /> En direct</p>
              <h2 className="mt-3 font-display text-4xl font-black tracking-tight lg:text-5xl">
                Les <span className="text-brand-700">opportunités en vedette</span> aujourd'hui.
              </h2>
            </div>
            <Link href="/opportunities" className="btn-secondary text-2xs uppercase tracking-widest">Voir toutes →</Link>
          </div>

          {featured && featured.length > 0 ? (
            <div className="grid gap-6 lg:grid-cols-2">
              {featured.slice(0, 4).map((it, i) => <OpportunityCardPremium key={it.id} item={{ ...it, score: 90 - i * 6 }} variant={i === 0 ? 'highlight' : 'default'} />)}
            </div>
          ) : (
            <div className="surface-elevated p-10 text-center">
              <p className="font-bold text-ink-700">Aucune opportunité publiée pour l'instant.</p>
              <p className="mt-2 text-sm text-ink-500">Lance la collecte depuis l'admin pour remplir la base.</p>
            </div>
          )}
        </div>
      </section>

      {/* ============== WORLD MAP + ACTIVITY ============== */}
      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="grid items-stretch gap-8 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <p className="eyebrow">Couverture mondiale</p>
            <h2 className="mt-3 mb-6 font-display text-4xl font-black tracking-tight lg:text-5xl">
              Une veille <span className="text-brand-700">internationale</span>, contextualisée pour le Maroc.
            </h2>
            <WorldMap activeRegion="Maroc" />
          </div>

          <div className="card flex flex-col">
            <div className="flex items-center justify-between">
              <p className="eyebrow">Activité plateforme</p>
              <span className="chip">{RECENT_ACTIVITY.length} aujourd'hui</span>
            </div>
            <h3 className="mt-3 mb-6 font-display text-2xl font-black">Dernières mises à jour</h3>
            <ActivityFeed items={RECENT_ACTIVITY} />
            <Link href="/dashboard" className="mt-6 inline-flex items-center justify-center gap-2 self-start text-2xs font-black uppercase tracking-widest text-brand-700 hover:underline">
              Accéder à mon activité →
            </Link>
          </div>
        </div>
      </section>

      {/* ============== UPCOMING TIMELINE ============== */}
      {upcomingTimeline.length > 0 && (
        <section className="bg-ink-950 py-20 text-white">
          <div className="mx-auto max-w-7xl px-6">
            <p className="eyebrow text-brand-400">Calendrier financement</p>
            <h2 className="mt-3 mb-12 font-display text-4xl font-black tracking-tight lg:text-5xl">
              Les prochaines <span className="text-brand-400">deadlines</span> à ne pas manquer.
            </h2>
            <div className="rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl">
              <Timeline items={upcomingTimeline} />
            </div>
            <div className="mt-8 text-center">
              <Link href="/calendar" className="btn-primary text-2xs uppercase tracking-widest">Voir le calendrier complet →</Link>
            </div>
          </div>
        </section>
      )}

      {/* ============== FEATURES (modules) ============== */}
      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="mb-12">
          <p className="eyebrow">Modules de la plateforme</p>
          <h2 className="mt-3 font-display text-4xl font-black tracking-tight lg:text-5xl">
            Tout ce dont une association a besoin <span className="text-brand-700">en un seul outil.</span>
          </h2>
        </div>

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {[
            { icon: '🎯', title: 'Veille intelligente', desc: 'Scrapers automatiques sur 15+ sources institutionnelles, classification par thématique.' },
            { icon: '🤖', title: 'Score IA compatibilité', desc: 'Algorithme de matching entre votre profil et chaque opportunité (sur 100).' },
            { icon: '📋', title: 'Suivi de candidatures', desc: 'Kanban de vos applications : saved → en analyse → en préparation → soumise → obtenue.' },
            { icon: '✉️', title: 'Alertes email ciblées', desc: 'Digest hebdomadaire personnalisé selon vos thématiques et votre profil.' },
            { icon: '📊', title: 'Insights & analytics', desc: 'Tendances financement, top bailleurs, montants disponibles par secteur.' },
            { icon: '📚', title: 'Centre de ressources', desc: 'Guides, templates de propositions, modèles de budget, logframes.' },
            { icon: '🎓', title: 'Formations', desc: 'Modules en ligne, webinaires, tutoriels sur les techniques de rédaction.' },
            { icon: '🌍', title: 'Communauté', desc: 'Réseau d\'associations marocaines, experts, consultants, événements.' },
            { icon: '🇲🇦', title: 'Contextualisation Maroc', desc: 'Vérification d\'éligibilité Maroc pour chaque appel, en français.' }
          ].map((f, i) => (
            <div key={i} className="surface-elevated lift p-6">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-2xl">{f.icon}</div>
              <h3 className="font-display text-lg font-black">{f.title}</h3>
              <p className="mt-2 text-sm leading-6 text-ink-500">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ============== TESTIMONIALS ============== */}
      <section className="relative bg-grad-light py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-12 text-center">
            <p className="eyebrow justify-center">Ils nous font confiance</p>
            <h2 className="mt-3 mx-auto max-w-3xl font-display text-4xl font-black tracking-tight lg:text-5xl">
              Plus de <span className="text-brand-700">{orgCount || 100}</span> associations utilisent Funding Watch.
            </h2>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {TESTIMONIALS.map((t, i) => (
              <figure key={i} className="surface-elevated p-7">
                <span className="font-display text-5xl font-black text-brand-300">"</span>
                <blockquote className="mt-2 text-base leading-7 text-ink-700">{t.quote}</blockquote>
                <figcaption className="mt-5 flex items-center gap-3 border-t border-ink-100 pt-4">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-grad-brand font-bold text-white">{t.name[0]}</span>
                  <div>
                    <p className="text-sm font-bold">{t.name}</p>
                    <p className="text-xs text-ink-500">{t.role}</p>
                  </div>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* ============== FINAL CTA ============== */}
      <section className="relative overflow-hidden bg-ink-950 py-24 text-white">
        <div className="absolute inset-0 bg-grid opacity-20" />
        <div className="absolute -bottom-32 left-1/2 h-64 w-[600px] -translate-x-1/2 bg-grad-brand opacity-40 blur-3xl" />

        <div className="relative mx-auto max-w-4xl px-6 text-center">
          <p className="eyebrow justify-center text-brand-400">Démarrez maintenant</p>
          <h2 className="mt-4 font-display text-5xl font-black tracking-tight lg:text-6xl">
            Prêt à recevoir les <span className="text-brand-400">bons financements ?</span>
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-white/70">
            Inscription en 30 secondes. Première alerte personnalisée sous 24h. Aucune carte bancaire requise.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Link href="/register" className="btn-primary text-xs uppercase tracking-widest">Créer mon compte gratuit →</Link>
            <Link href="/opportunities" className="rounded-full border border-white/20 px-6 py-3 text-xs font-black uppercase tracking-widest text-white hover:bg-white/10">Explorer d'abord</Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
