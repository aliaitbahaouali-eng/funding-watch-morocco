'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Alert, Button, Input, Select } from '@/components/ui';

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    full_name: '',
    org_name: '',
    org_type: 'association',
    city: '',
    email: '',
    password: ''
  });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const update = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function onSubmit(e) {
    e.preventDefault();
    setError(null);
    if (form.password.length < 8) return setError('Le mot de passe doit faire 8 caractères minimum.');
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: {
          full_name: form.full_name,
          role: 'association',
          org_name: form.org_name
        },
        emailRedirectTo: `${window.location.origin}/api/auth/callback`
      }
    });
    setLoading(false);
    if (error) return setError(error.message);
    router.push('/onboarding');
    router.refresh();
  }

  return (
    <main>
      <Header />
      <section className="bg-slate-50 py-20">
        <div className="mx-auto max-w-lg px-6">
          <div className="rounded-[2rem] bg-white p-8 shadow-xl">
            <h1 className="text-3xl font-black">Créer un compte association</h1>
            <p className="mt-2 text-sm text-slate-500">C'est gratuit et prend 30 secondes.</p>

            <form onSubmit={onSubmit} className="mt-8 space-y-4">
              <Input label="Votre nom complet" required value={form.full_name} onChange={update('full_name')} placeholder="Ex. Aïcha Bennani" />
              <Input label="Nom de l'association" required value={form.org_name} onChange={update('org_name')} placeholder="Ex. Association Avenir" />
              <Select label="Type d'organisation" value={form.org_type} onChange={update('org_type')}>
                <option value="association">Association</option>
                <option value="ong">ONG</option>
                <option value="cooperative">Coopérative</option>
                <option value="fondation">Fondation</option>
                <option value="autre">Autre</option>
              </Select>
              <Input label="Ville" value={form.city} onChange={update('city')} placeholder="Ex. Casablanca" />
              <Input label="Email" type="email" required value={form.email} onChange={update('email')} placeholder="vous@association.org" />
              <Input label="Mot de passe" type="password" required minLength={8} value={form.password} onChange={update('password')} placeholder="8 caractères minimum" />
              {error && <Alert type="error">{error}</Alert>}
              <Button type="submit" disabled={loading} className="w-full">{loading ? 'Création…' : 'Créer mon compte'}</Button>
              <p className="text-xs text-slate-500">En créant votre compte vous acceptez nos conditions d'utilisation.</p>
            </form>

            <p className="mt-6 text-sm text-slate-500">
              Déjà inscrit ? <Link href="/login" className="font-bold text-primary hover:underline">Se connecter</Link>
            </p>
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
