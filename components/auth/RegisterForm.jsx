// Composant alternatif d'inscription — non utilisé actuellement.
// Le formulaire d'inscription est inline dans app/register/page.jsx (plus simple
// pour le MVP). Ce fichier est gardé en référence si tu veux extraire un composant
// réutilisable plus tard (ex. modal d'inscription).

'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Input, Button, Alert, Select } from '@/components/ui';

const ORG_TYPES = [
  { value: 'association', label: 'Association' },
  { value: 'ong', label: 'ONG' },
  { value: 'cooperative', label: 'Coopérative' },
  { value: 'fondation', label: 'Fondation' },
  { value: 'autre', label: 'Autre' }
];

export default function RegisterForm() {
  const router = useRouter();
  const [form, setForm] = useState({ full_name: '', org_name: '', org_type: 'association', city: '', email: '', password: '' });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const upd = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: { data: { full_name: form.full_name, role: 'association', org_name: form.org_name } }
    });
    setLoading(false);
    if (error) return setError(error.message);
    router.push('/dashboard?welcome=1');
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Input label="Nom complet" required value={form.full_name} onChange={upd('full_name')} />
      <Input label="Nom de l'association" required value={form.org_name} onChange={upd('org_name')} />
      <Select label="Type" value={form.org_type} onChange={upd('org_type')}>
        {ORG_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
      </Select>
      <Input label="Ville" value={form.city} onChange={upd('city')} />
      <Input label="Email" type="email" required value={form.email} onChange={upd('email')} />
      <Input label="Mot de passe" type="password" required minLength={8} value={form.password} onChange={upd('password')} />
      {error && <Alert type="error">{error}</Alert>}
      <Button type="submit" disabled={loading} className="w-full">{loading ? 'Création…' : 'Créer mon compte'}</Button>
    </form>
  );
}
