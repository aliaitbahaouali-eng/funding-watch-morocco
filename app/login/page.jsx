'use client';
import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Alert, Button, Input } from '@/components/ui';

function LoginFormInner() {
  const router = useRouter();
  const params = useSearchParams();
  const redirect = params.get('redirect') || '/dashboard';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return setError(error.message);
    router.push(redirect);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 space-y-4">
      <Input label="Email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vous@association.org" />
      <Input label="Mot de passe" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
      {error && <Alert type="error">{error}</Alert>}
      <Button type="submit" disabled={loading} className="w-full">{loading ? 'Connexion…' : 'Se connecter'}</Button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <main>
      <Header />
      <section className="bg-slate-50 py-20">
        <div className="mx-auto max-w-md px-6">
          <div className="rounded-[2rem] bg-white p-8 shadow-xl">
            <h1 className="text-3xl font-black">Se connecter</h1>
            <p className="mt-2 text-sm text-slate-500">Accédez à votre veille de financements.</p>

            <Suspense fallback={<div className="mt-8 h-40 animate-pulse rounded bg-slate-100" />}>
              <LoginFormInner />
            </Suspense>

            <p className="mt-6 text-sm text-slate-500">
              Pas encore inscrit ? <Link href="/register" className="font-bold text-primary hover:underline">Créer un compte gratuit</Link>
            </p>
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
