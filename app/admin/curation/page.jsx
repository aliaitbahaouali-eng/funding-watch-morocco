import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth';
import CurationForm from '@/components/admin/CurationForm';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Curation manuelle — Funding Watch Admin',
  robots: { index: false, follow: false },
};

/**
 * /admin/curation
 *
 * Sprint 6 — Option A : Curation manuelle assistée IA.
 * L'admin colle une URL d'opp trouvée (LinkedIn, Devex, newsletter).
 * Claude fetch la page et extrait toutes les infos. Un draft est créé
 * en pending_review et arrive directement dans /admin/validation.
 */
export default async function CurationPage() {
  // requireAdmin() redirige automatiquement si non admin/veille
  await requireAdmin();

  const supabase = createClient();
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);

  // Stats curation du jour
  const { data: todayLogs } = await supabase
    .from('curation_logs')
    .select('status, created_at, opportunity_id, source_url')
    .gte('created_at', startOfDay.toISOString())
    .order('created_at', { ascending: false });

  const stats = {
    success: 0, duplicate: 0, fetch_error: 0, extract_error: 0, rejected: 0,
  };
  for (const log of (todayLogs || [])) {
    stats[log.status] = (stats[log.status] || 0) + 1;
  }

  // 5 dernières opps curatées (toutes status)
  const { data: lastCurated } = await supabase
    .from('opportunities')
    .select('id, title, status, morocco_eligibility, deadline, created_at, donors(name)')
    .eq('curated_manually', true)
    .order('created_at', { ascending: false })
    .limit(5);

  const dailyTarget = 5;
  const todayDone = stats.success;
  const progressPct = Math.min(100, Math.round((todayDone / dailyTarget) * 100));

  return (
    <main className="min-h-screen bg-slate-50 pb-20">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <header className="mb-8">
          <p className="text-xs font-bold uppercase tracking-widest text-rose-600">Admin · Curation</p>
          <h1 className="mt-2 font-display text-3xl font-black text-slate-950">
            Curation manuelle assistée IA
          </h1>
          <p className="mt-3 max-w-2xl text-slate-600">
            Collez l'URL d'une opportunité trouvée sur LinkedIn, Devex, fundsforNGOs, la presse marocaine,
            ou tout autre canal. Claude analysera la page, extraira les informations et créera un draft
            pré-rempli prêt à valider.
          </p>
        </header>

        {/* Objectif du jour */}
        <section className="mb-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Objectif du jour</p>
              <p className="mt-1 font-display text-3xl font-black text-slate-950">
                {todayDone}<span className="text-xl text-slate-400"> / {dailyTarget}</span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Tentatives aujourd'hui</p>
              <p className="mt-1 font-display text-3xl font-black text-slate-950">
                {(todayLogs || []).length}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {stats.duplicate} doublons · {stats.fetch_error + stats.extract_error} échecs
              </p>
            </div>
          </div>
          <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full bg-gradient-to-r from-rose-500 to-rose-600 transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </section>

        {/* Formulaire de curation (composant client) */}
        <CurationForm />

        {/* Dernières opps curatées */}
        {lastCurated?.length > 0 && (
          <section className="mt-8">
            <h2 className="mb-3 font-display text-lg font-black text-slate-950">
              Vos 5 dernières curations
            </h2>
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-2 text-left font-bold text-slate-700">Titre</th>
                    <th className="px-4 py-2 text-left font-bold text-slate-700">Bailleur</th>
                    <th className="px-4 py-2 text-left font-bold text-slate-700">Statut</th>
                    <th className="px-4 py-2 text-left font-bold text-slate-700">Maroc</th>
                    <th className="px-4 py-2 text-left font-bold text-slate-700">Deadline</th>
                  </tr>
                </thead>
                <tbody>
                  {lastCurated.map((opp) => (
                    <tr key={opp.id} className="border-t border-slate-100">
                      <td className="px-4 py-3">
                        <a href={`/admin/validation#${opp.id}`} className="font-semibold text-slate-900 hover:text-rose-600">
                          {opp.title?.slice(0, 70) || '—'}
                          {opp.title?.length > 70 ? '…' : ''}
                        </a>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{opp.donors?.name || '—'}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={opp.status} />
                      </td>
                      <td className="px-4 py-3">
                        <MoroccoBadge level={opp.morocco_eligibility} />
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {opp.deadline ? new Date(opp.deadline).toLocaleDateString('fr-FR') : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Conseils */}
        <section className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm">
          <p className="font-bold text-amber-900">Conseils de curation efficace</p>
          <ul className="mt-2 list-inside list-disc space-y-1 text-amber-900/90">
            <li>Privilégiez les URLs <strong>directes vers la page de l'opp</strong>, pas vers une liste.</li>
            <li>Vérifiez que la page contient au moins le titre, la deadline et les critères.</li>
            <li>Sources productives : LinkedIn AFD Rabat, GIZ Maroc, EU Délégation, newsletters Devex/fundsforNGOs, presse (Le Matin, MAP, l'Économiste).</li>
            <li>Si Claude rate l'extraction, vous pouvez compléter dans /admin/validation avant de publier.</li>
          </ul>
        </section>
      </div>
    </main>
  );
}

function StatusBadge({ status }) {
  const map = {
    draft: { bg: 'bg-slate-100', text: 'text-slate-700', label: 'Brouillon' },
    pending_review: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'En attente' },
    published: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Publié' },
    archived: { bg: 'bg-slate-100', text: 'text-slate-500', label: 'Archivé' },
    expired: { bg: 'bg-slate-100', text: 'text-slate-500', label: 'Expiré' },
  };
  const s = map[status] || map.draft;
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-bold ${s.bg} ${s.text}`}>
      {s.label}
    </span>
  );
}

function MoroccoBadge({ level }) {
  const map = {
    explicit: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: '🇲🇦 Explicite' },
    regional: { bg: 'bg-sky-100', text: 'text-sky-700', label: '🌍 Régional' },
    global: { bg: 'bg-slate-100', text: 'text-slate-600', label: '🌐 Global' },
    excluded: { bg: 'bg-rose-100', text: 'text-rose-700', label: '❌ Exclus' },
    unknown: { bg: 'bg-slate-100', text: 'text-slate-500', label: '? Inconnu' },
  };
  const m = map[level] || map.unknown;
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-bold ${m.bg} ${m.text}`}>
      {m.label}
    </span>
  );
}
