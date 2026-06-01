import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const STATUS_STYLE = {
  placeholder: { label: 'Exemple', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  pending: { label: 'En attente', cls: 'bg-slate-50 text-slate-600 border-slate-200' },
  active: { label: 'Actif', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  retired: { label: 'Retiré', cls: 'bg-rose-50 text-rose-700 border-rose-200' },
};

const HELP_OPTIONS = ['redaction','budget','legal','consultance','formation','strategy','evaluation'];

export default async function AdminExpertsPage({ searchParams }) {
  const supabase = createClient();
  const filter = searchParams?.status || 'all';

  let query = supabase.from('experts').select('*').order('display_order').order('created_at', { ascending: false });
  if (filter !== 'all') query = query.eq('status', filter);
  const { data: experts, error } = await query;

  // Counts
  const { data: countsRaw } = await supabase.from('experts').select('status');
  const counts = { all: 0, placeholder: 0, pending: 0, active: 0, retired: 0 };
  for (const r of countsRaw || []) {
    counts.all += 1;
    counts[r.status] = (counts[r.status] || 0) + 1;
  }

  // Récupère thématiques pour le formulaire de création
  const { data: themes } = await supabase.from('themes').select('slug, name_fr').eq('active', true).order('name_fr');

  async function upsertExpert(formData) {
    'use server';
    const supabase = createClient();
    const id = formData.get('id') || null;
    const payload = {
      name: formData.get('name'),
      title: formData.get('title') || null,
      bio_short: formData.get('bio_short') || null,
      bio_long: formData.get('bio_long') || null,
      languages: (formData.get('languages') || 'fr').toString().split(',').map(s => s.trim()).filter(Boolean),
      specialty_slugs: formData.getAll('specialty_slugs').filter(Boolean),
      help_kinds: formData.getAll('help_kinds').filter(Boolean),
      country: formData.get('country') || null,
      city: formData.get('city') || null,
      years_experience: parseInt(formData.get('years_experience')) || null,
      contact_email: formData.get('contact_email') || null,
      contact_url: formData.get('contact_url') || null,
      contact_phone: formData.get('contact_phone') || null,
      hourly_rate_min: formData.get('hourly_rate_min') ? Number(formData.get('hourly_rate_min')) : null,
      hourly_rate_max: formData.get('hourly_rate_max') ? Number(formData.get('hourly_rate_max')) : null,
      currency: formData.get('currency') || 'EUR',
      pro_bono: formData.get('pro_bono') === 'on',
      status: formData.get('status') || 'pending',
      notes: formData.get('notes') || null,
      display_order: parseInt(formData.get('display_order')) || 0,
    };
    if (!payload.name) return;
    if (id) {
      await supabase.from('experts').update(payload).eq('id', id);
    } else {
      await supabase.from('experts').insert(payload);
    }
    revalidatePath('/admin/experts');
  }

  async function deleteExpert(formData) {
    'use server';
    const supabase = createClient();
    const id = formData.get('id');
    if (!id) return;
    await supabase.from('experts').delete().eq('id', id);
    revalidatePath('/admin/experts');
  }

  async function setStatus(formData) {
    'use server';
    const supabase = createClient();
    const id = formData.get('id');
    const status = formData.get('status');
    if (!id || !status) return;
    await supabase.from('experts').update({ status }).eq('id', id);
    revalidatePath('/admin/experts');
  }

  if (error) {
    return (
      <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6">
        <p className="font-bold text-amber-800">⚠ Table experts indisponible</p>
        <p className="mt-2 text-sm text-amber-700">
          Exécute <code>supabase/migration_v26.sql</code> dans le SQL Editor Supabase pour activer la marketplace experts.
        </p>
        <p className="mt-2 text-xs text-amber-600">Erreur : {error.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-black text-slate-950">💼 Experts marketplace</h1>
        <p className="mt-1 text-sm text-slate-500">
          {counts.all} profil{counts.all > 1 ? 's' : ''} · {counts.active || 0} actif{(counts.active || 0) > 1 ? 's' : ''} · {counts.placeholder || 0} exemple{(counts.placeholder || 0) > 1 ? 's' : ''}.
        </p>
      </div>

      {/* Onglets */}
      <div className="flex flex-wrap gap-2">
        {[
          { v: 'all', l: 'Tous', n: counts.all },
          { v: 'active', l: 'Actifs', n: counts.active || 0 },
          { v: 'placeholder', l: 'Exemples', n: counts.placeholder || 0 },
          { v: 'pending', l: 'En attente', n: counts.pending || 0 },
          { v: 'retired', l: 'Retirés', n: counts.retired || 0 },
        ].map(t => {
          const active = filter === t.v;
          return (
            <a key={t.v} href={`/admin/experts?status=${t.v}`}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-black uppercase tracking-widest transition ${
                active ? 'bg-slate-950 text-white' : 'bg-white text-slate-600 hover:bg-slate-100'
              }`}>
              {t.l}
              <span className={`rounded-full px-2 py-0.5 text-2xs ${active ? 'bg-white/20' : 'bg-slate-100'}`}>{t.n}</span>
            </a>
          );
        })}
      </div>

      {/* Form création */}
      <details className="rounded-3xl border border-indigo-200 bg-indigo-50/30 p-5">
        <summary className="cursor-pointer text-sm font-bold text-indigo-700">+ Ajouter un nouvel expert</summary>
        <form action={upsertExpert} className="mt-4 grid gap-3 sm:grid-cols-2">
          <input name="name" required placeholder="Nom complet *" className="rounded-2xl border border-slate-200 p-2 text-sm" />
          <input name="title" placeholder="Titre / spécialité" className="rounded-2xl border border-slate-200 p-2 text-sm" />
          <textarea name="bio_short" rows={3} placeholder="Bio courte (~200 chars, affichée sur la card)" className="rounded-2xl border border-slate-200 p-2 text-sm sm:col-span-2" />
          <input name="languages" defaultValue="fr,en" placeholder="Langues séparées par virgule (fr,en,ar)" className="rounded-2xl border border-slate-200 p-2 text-sm" />
          <input name="country" placeholder="Pays (MA, FR, CH…)" className="rounded-2xl border border-slate-200 p-2 text-sm" />
          <input name="city" placeholder="Ville" className="rounded-2xl border border-slate-200 p-2 text-sm" />
          <input name="years_experience" type="number" placeholder="Années d'expérience" className="rounded-2xl border border-slate-200 p-2 text-sm" />
          <input name="contact_email" type="email" placeholder="Email contact *" className="rounded-2xl border border-slate-200 p-2 text-sm" />
          <input name="contact_url" placeholder="LinkedIn / site perso" className="rounded-2xl border border-slate-200 p-2 text-sm" />
          <input name="hourly_rate_min" type="number" placeholder="Tarif min/h" className="rounded-2xl border border-slate-200 p-2 text-sm" />
          <input name="hourly_rate_max" type="number" placeholder="Tarif max/h" className="rounded-2xl border border-slate-200 p-2 text-sm" />
          <select name="currency" defaultValue="EUR" className="rounded-2xl border border-slate-200 p-2 text-sm">
            <option value="EUR">EUR</option><option value="MAD">MAD</option><option value="USD">USD</option><option value="CHF">CHF</option>
          </select>
          <label className="flex items-center gap-2 text-xs text-slate-600">
            <input type="checkbox" name="pro_bono" /> Pro bono / bénévole
          </label>
          <select name="status" defaultValue="pending" className="rounded-2xl border border-slate-200 p-2 text-sm">
            <option value="pending">En attente</option>
            <option value="active">Actif (visible côté users)</option>
            <option value="placeholder">Exemple (badge bêta)</option>
            <option value="retired">Retiré</option>
          </select>

          <div className="sm:col-span-2">
            <p className="text-2xs font-bold uppercase text-slate-500">Spécialités (thématiques)</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {(themes || []).map(t => (
                <label key={t.slug} className="inline-flex items-center gap-1 text-xs">
                  <input type="checkbox" name="specialty_slugs" value={t.slug} /> {t.name_fr}
                </label>
              ))}
            </div>
          </div>

          <div className="sm:col-span-2">
            <p className="text-2xs font-bold uppercase text-slate-500">Types d'aide</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {HELP_OPTIONS.map(k => (
                <label key={k} className="inline-flex items-center gap-1 text-xs">
                  <input type="checkbox" name="help_kinds" value={k} /> {k}
                </label>
              ))}
            </div>
          </div>

          <textarea name="bio_long" rows={4} placeholder="Bio longue (optionnel)" className="rounded-2xl border border-slate-200 p-2 text-sm sm:col-span-2" />
          <textarea name="notes" rows={2} placeholder="Notes admin (privé)" className="rounded-2xl border border-slate-200 p-2 text-sm sm:col-span-2" />

          <button className="btn-primary mt-2 text-2xs uppercase tracking-widest sm:col-span-2">Créer l'expert</button>
        </form>
      </details>

      {/* Liste */}
      {!experts || experts.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-10 text-center">
          <p className="text-sm text-slate-500">Aucun expert pour ce filtre.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {experts.map((e) => {
            const stat = STATUS_STYLE[e.status] || STATUS_STYLE.pending;
            return (
              <div key={e.id} className="rounded-2xl border border-slate-200 bg-white p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-2xs font-black uppercase tracking-widest ${stat.cls}`}>{stat.label}</span>
                      <p className="font-display text-base font-black text-slate-950">{e.name}</p>
                      {e.pro_bono && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-2xs font-bold text-emerald-700">Pro bono</span>}
                    </div>
                    {e.title && <p className="mt-1 text-xs text-slate-500">{e.title}</p>}
                    {e.bio_short && <p className="mt-2 text-xs leading-5 text-slate-600">{e.bio_short}</p>}
                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-2xs text-slate-500">
                      <span>{e.country || '—'}{e.city ? ` · ${e.city}` : ''}</span>
                      <span>{(e.languages || []).join(', ')}</span>
                      <span>Thèmes : {(e.specialty_slugs || []).slice(0, 5).join(', ') || '—'}</span>
                      <span>Aide : {(e.help_kinds || []).join(', ') || '—'}</span>
                      {e.contact_email && <span>📧 {e.contact_email}</span>}
                    </div>
                  </div>
                  <div className="shrink-0 space-y-2">
                    <form action={setStatus} className="flex items-center gap-2">
                      <input type="hidden" name="id" value={e.id} />
                      <select name="status" defaultValue={e.status} className="rounded-full border border-slate-200 px-3 py-1.5 text-2xs font-bold">
                        <option value="placeholder">Exemple</option>
                        <option value="pending">En attente</option>
                        <option value="active">Actif</option>
                        <option value="retired">Retiré</option>
                      </select>
                      <button type="submit" className="rounded-full bg-slate-900 px-3 py-1.5 text-2xs font-black uppercase tracking-widest text-white">OK</button>
                    </form>
                    <form action={deleteExpert}>
                      <input type="hidden" name="id" value={e.id} />
                      <button type="submit" className="text-2xs font-bold text-rose-600 hover:underline" onClick={(ev) => { if (!confirm('Supprimer ?')) ev.preventDefault(); }}>
                        Supprimer
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
