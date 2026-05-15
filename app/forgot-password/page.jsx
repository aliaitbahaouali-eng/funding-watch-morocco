'use client';
import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [state, setState] = useState('idle'); // idle | loading | sent | error
  const [error, setError] = useState(null);

  async function onSubmit(e) {
    e.preventDefault();
    setState('loading');
    setError(null);
    const supabase = createClient();
    const redirectTo = `${window.location.origin}/reset-password`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) {
      setError(error.message);
      setState('error');
    } else {
      setState('sent');
    }
  }

  return (
    <main>
      <Header />
      <section className="bg-slate-50 py-16">
        <div className="mx-auto max-w-md px-6">
          <div className="rounded-[2rem] bg-white p-8 shadow-sm">
            <Link href="/login" className="text-xs font-bold text-slate-500 hover:text-brand-700">← Retour à la connexion</Link>
            <h1 className="mt-3 font-display text-3xl font-black">Mot de passe oublié ?</h1>
            <p className="mt-2 text-sm text-slate-500">
              Renseigne ton email et nous t'enverrons un lien pour le réinitialiser.
            </p>

            {state === 'sent' ? (
              <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
                ✓ Si un compte existe pour <b>{email}</b>, un email vient d'être envoyé. Vérifie aussi tes spams.
              </div>
            ) : (
              <form onSubmit={onSubmit} className="mt-6 space-y-4">
                <input
                  type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="vous@association.org"
                  className="input"
                />
                {error && (
                  <p className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-bold text-rose-700">{error}</p>
                )}
                <button type="submit" disabled={state === 'loading'} className="btn-primary w-full text-2xs uppercase tracking-widest disabled:opacity-60">
                  {state === 'loading' ? 'Envoi…' : 'Envoyer le lien de réinitialisation'}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
