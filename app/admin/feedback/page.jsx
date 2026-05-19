import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

const KIND_STYLE = {
  bug: { label: '🐛 Bug', cls: 'bg-rose-50 text-rose-700 border-rose-200' },
  idea: { label: '💡 Idée', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  love: { label: '❤️ Love', cls: 'bg-pink-50 text-pink-700 border-pink-200' },
  question: { label: '❓ Question', cls: 'bg-sky-50 text-sky-700 border-sky-200' },
  other: { label: '· Autre', cls: 'bg-slate-50 text-slate-600 border-slate-200' },
};

const SEVERITY_STYLE = {
  blocker: { label: '🚨 Bloquant', cls: 'bg-rose-100 text-rose-800' },
  high: { label: 'Important', cls: 'bg-rose-50 text-rose-700' },
  medium: { label: 'Modéré', cls: 'bg-amber-50 text-amber-700' },
  low: { label: 'Mineur', cls: 'bg-slate-50 text-slate-600' },
};

const STATUS_STYLE = {
  new: { label: 'Nouveau', cls: 'bg-emerald-100 text-emerald-800' },
  in_progress: { label: 'En cours', cls: 'bg-sky-100 text-sky-800' },
  resolved: { label: 'Résolu', cls: 'bg-slate-100 text-slate-700' },
  rejected: { label: 'Rejeté', cls: 'bg-rose-50 text-rose-700' },
};

export default async function AdminFeedbackPage({ searchParams }) {
  const supabase = createClient();
  const filter = searchParams?.status || 'open';

  // Récupère les feedbacks
  let query = supabase
    .from('beta_feedback')
    .select('*, organizations(name)')
    .order('created_at', { ascending: false })
    .limit(200);

  if (filter === 'open') query = query.in('status', ['new', 'in_progress']);
  else if (filter === 'resolved') query = query.eq('status', 'resolved');
  else if (filter === 'rejected') query = query.eq('status', 'rejected');

  const { data: feedbacks, error } = await query;

  // Counts pour les onglets
  const { data: countsRaw } = await supabase.from('beta_feedback').select('status');
  const counts = { open: 0, resolved: 0, rejected: 0, total: 0 };
  for (const row of countsRaw || []) {
    counts.total += 1;
    if (row.status === 'new' || row.status === 'in_progress') counts.open += 1;
    else if (row.status === 'resolved') counts.resolved += 1;
    else if (row.status === 'rejected') counts.rejected += 1;
  }

  async function updateStatus(formData) {
    'use server';
    const supabase = createClient();
    const id = formData.get('id');
    const status = formData.get('status');
    const notes = formData.get('admin_notes') || null;
    if (!id || !status) return;
    const update = { status };
    if (notes) update.admin_notes = String(notes).slice(0, 2000);
    if (status === 'resolved') update.resolved_at = new Date().toISOString();
    await supabase.from('beta_feedback').update(update).eq('id', id);
    revalidatePath('/admin/feedback');
  }

  if (error) {
    return (
      <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6">
        <p className="font-bold text-amber-800">⚠ Table beta_feedback indisponible</p>
        <p className="mt-2 text-sm text-amber-700">
          La migration <code>supabase/migration_v22.sql</code> n'a pas été appliquée. Exécute-la dans le SQL Editor Supabase pour activer le système de feedback bêta.
        </p>
        <p className="mt-2 text-xs text-amber-600">Erreur : {error.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div>
        <h1 className="font-display text-3xl font-black text-slate-950">💬 Feedback bêta</h1>
        <p className="mt-1 text-sm text-slate-500">
          Retours utilisateurs envoyés via le widget flottant. {counts.total} feedback{counts.total > 1 ? 's' : ''} reçu{counts.total > 1 ? 's' : ''} au total.
        </p>
      </div>

      {/* Onglets de filtre */}
      <div className="flex flex-wrap gap-2">
        {[
          { value: 'open', label: 'À traiter', count: counts.open },
          { value: 'resolved', label: 'Résolus', count: counts.resolved },
          { value: 'rejected', label: 'Rejetés', count: counts.rejected },
          { value: 'all', label: 'Tous', count: counts.total },
        ].map((tab) => {
          const active = filter === tab.value;
          return (
            <a
              key={tab.value}
              href={`/admin/feedback?status=${tab.value}`}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-black uppercase tracking-widest transition ${
                active ? 'bg-slate-950 text-white' : 'bg-white text-slate-600 hover:bg-slate-100'
              }`}
            >
              {tab.label}
              <span className={`rounded-full px-2 py-0.5 text-2xs ${active ? 'bg-white/20' : 'bg-slate-100'}`}>
                {tab.count}
              </span>
            </a>
          );
        })}
      </div>

      {/* Liste */}
      {(!feedbacks || feedbacks.length === 0) ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-10 text-center">
          <div className="text-4xl">🌱</div>
          <p className="mt-3 font-bold text-slate-700">Aucun feedback pour ce filtre.</p>
          <p className="mt-1 text-sm text-slate-500">Les retours apparaîtront ici dès que les utilisateurs cliqueront sur le bouton Feedback.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {feedbacks.map((f) => {
            const kind = KIND_STYLE[f.kind] || KIND_STYLE.other;
            const sev = SEVERITY_STYLE[f.severity] || SEVERITY_STYLE.low;
            const stat = STATUS_STYLE[f.status] || STATUS_STYLE.new;
            return (
              <div key={f.id} className="rounded-2xl border border-slate-200 bg-white p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-2xs font-black uppercase tracking-widest ${kind.cls}`}>
                      {kind.label}
                    </span>
                    {f.kind === 'bug' && (
                      <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-2xs font-black uppercase tracking-widest ${sev.cls}`}>
                        {sev.label}
                      </span>
                    )}
                    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-2xs font-black uppercase tracking-widest ${stat.cls}`}>
                      {stat.label}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">{formatDate(f.created_at)}</p>
                </div>

                <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">{f.message}</p>

                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-2xs text-slate-500">
                  {f.organizations?.name && <span><b>Orga :</b> {f.organizations.name}</span>}
                  {f.page_url && <span><b>URL :</b> <code className="text-2xs">{f.page_url}</code></span>}
                  {f.user_agent && (
                    <span className="truncate" title={f.user_agent}>
                      <b>UA :</b> {f.user_agent.split(' ').slice(0, 3).join(' ')}…
                    </span>
                  )}
                </div>

                {f.admin_notes && (
                  <p className="mt-3 rounded-2xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
                    <b>Notes admin :</b> {f.admin_notes}
                  </p>
                )}

                {/* Actions */}
                <form action={updateStatus} className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
                  <input type="hidden" name="id" value={f.id} />
                  <select name="status" defaultValue={f.status} className="rounded-full border border-slate-200 px-3 py-1.5 text-2xs font-bold">
                    <option value="new">Nouveau</option>
                    <option value="in_progress">En cours</option>
                    <option value="resolved">Résolu</option>
                    <option value="rejected">Rejeté</option>
                  </select>
                  <input
                    type="text"
                    name="admin_notes"
                    defaultValue={f.admin_notes || ''}
                    placeholder="Notes admin (optionnel)"
                    maxLength={2000}
                    className="flex-1 min-w-[200px] rounded-full border border-slate-200 px-3 py-1.5 text-xs"
                  />
                  <button type="submit" className="btn-primary text-2xs uppercase tracking-widest">
                    Enregistrer
                  </button>
                </form>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
