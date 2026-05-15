'use client';
import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import LiveBadge from '@/components/premium/LiveBadge';

function LoginFormInner() {
  const router = useRouter();
  const params = useSearchParams();
  const inviteToken = params.get('invite');
  const redirect = params.get('redirect') || (inviteToken ? `/invite/${inviteToken}` : '/dashboard');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    // Note: Supabase auth persists the session by default (localStorage).
    // "Se souvenir" décoché → on stocke en sessionStorage à la place.
    if (typeof window !== 'undefined' && !remember) {
      try { sessionStorage.setItem('fw-no-persist', '1'); } catch {}
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return setError(error.message);
    router.push(redirect);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {inviteToken && (
        <div className="rounded-2xl border border-brand-200 bg-brand-50 px-3 py-2 text-xs font-bold text-brand-700">
          🔔 Tu as été invité à rejoindre une organisation. Connecte-toi ou crée ton compte pour accepter.
        </div>
      )}
      <div>
        <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-slate-500">Email</label>
        <input
          type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
          placeholder="vous@association.org" autoComplete="email"
          className="input"
        />
      </div>
      <div>
        <div className="mb-1 flex items-center justify-between">
          <label className="block text-xs font-bold uppercase tracking-widest text-slate-500">Mot de passe</label>
          <Link href="/forgot-password" className="text-2xs font-bold text-brand-700 hover:underline">
            Mot de passe oublié ?
          </Link>
        </div>
        <input
          type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••" autoComplete="current-password"
          className="input"
        />
      </div>
      <label className="flex items-center gap-2 text-sm text-slate-600">
        <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
        Se souvenir de moi sur cet appareil
      </label>
      {error && (
        <p className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-bold text-rose-700">{error}</p>
      )}
      <button type="submit" disabled={loading} className="btn-primary w-full text-2xs uppercase tracking-widest disabled:opacity-60">
        {loading ? 'Connexion…' : 'Se connecter →'}
      </button>

      {/* SSO slot — préparé pour Google/Microsoft, désactivé pour l'instant */}
      <div className="relative my-4">
        <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-slate-200" /></div>
        <div className="relative flex justify-center text-2xs"><span className="bg-white px-3 font-bold uppercase tracking-widest text-slate-400">ou bientôt</span></div>
      </div>
      <div className="space-y-2">
        <button
          type="button" disabled
          className="flex w-full items-center justify-center gap-3 rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-400 cursor-not-allowed"
          title="Disponible prochainement"
        >
          <span className="text-base">G</span>
          Continuer avec Google
          <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-2xs font-bold text-slate-500">Bientôt</span>
        </button>
        <button
          type="button" disabled
          className="flex w-full items-center justify-center gap-3 rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-400 cursor-not-allowed"
          title="Disponible prochainement"
        >
          <span className="text-base">M</span>
          Continuer avec Microsoft
          <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-2xs font-bold text-slate-500">Bientôt</span>
        </button>
      </div>
    </form>
  );
}

const VALUE_PROPS = [
  { icon: '🎯', title: 'Matching IA',         desc: 'Algorithme vectoriel qui apprend ton profil et te remonte les meilleurs financements en haut.' },
  { icon: '📩', title: 'Digest matinal',       desc: 'Les 3 meilleures opportunités du jour livrées à 7h sur ton email — zéro veille manuelle.' },
  { icon: '👥', title: 'Équipe collaborative', desc: 'Invite ton équipe avec rôles admin / contributeur / viewer. Le travail de financement n\'est plus solo.' },
];

export default function LoginPage() {
  return (
    <main>
      <Header />
      <section className="min-h-[calc(100vh-180px)] bg-slate-50">
        <div className="mx-auto grid max-w-6xl gap-0 px-0 lg:grid-cols-2">

          {/* LEFT — visual + arguments (dans l'ordre du flux mobile : sous le form) */}
          <div className="order-2 hidden lg:order-1 lg:flex relative overflow-hidden bg-grad-dark text-white">
            <div className="absolute inset-0 bg-grid opacity-20" />
            <div className="absolute -right-32 -top-32 h-72 w-72 rounded-full bg-grad-brand opacity-30 blur-3xl" />
            <div className="relative flex flex-col justify-center gap-8 p-12">
              <LiveBadge label="Plateforme premium · Maroc" />
              <h2 className="font-display text-3xl font-black leading-tight">
                La veille financements <span className="text-brand-400">enfin pensée pour les associations marocaines.</span>
              </h2>
              <ul className="space-y-5">
                {VALUE_PROPS.map((v) => (
                  <li key={v.title} className="flex items-start gap-4">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-xl">{v.icon}</span>
                    <div>
                      <p className="font-bold">{v.title}</p>
                      <p className="mt-0.5 text-sm text-white/70">{v.desc}</p>
                    </div>
                  </li>
                ))}
              </ul>
              <p className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/80">
                « Funding Watch nous a fait gagner 6 mois sur notre dernier appel UE. Le scoring est étrangement précis. »
                <span className="mt-2 block text-2xs font-bold uppercase tracking-widest text-brand-400">— Hanane M. · Directrice, ONG Education Rabat</span>
              </p>
            </div>
          </div>

          {/* RIGHT — formulaire */}
          <div className="order-1 lg:order-2 flex items-center justify-center p-6 sm:p-10 lg:p-12">
            <div className="w-full max-w-md">
              <h1 className="font-display text-3xl font-black leading-tight">Bon retour.</h1>
              <p className="mt-2 text-sm text-slate-500">Accède à ta veille de financements personnalisée.</p>

              <div className="mt-8">
                <Suspense fallback={<div className="h-40 animate-pulse rounded bg-slate-100" />}>
                  <LoginFormInner />
                </Suspense>
              </div>

              <p className="mt-6 text-sm text-slate-500">
                Pas encore inscrit ? <Link href="/register" className="font-bold text-brand-700 hover:underline">Créer un compte gratuit</Link>
              </p>
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
