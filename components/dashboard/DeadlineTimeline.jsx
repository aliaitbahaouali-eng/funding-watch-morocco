import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getCurrentOrganization } from '@/lib/auth';

/**
 * Frise temporelle horizontale des deadlines à venir (90 jours).
 * Audit §8 idée #2. Sources :
 *   1. saved_opportunities de l'orga (statuts d'engagement)
 *   2. fallback : top matches non-sauvegardés mais avec deadline proche
 *
 * Mobile : scroll horizontal idiomatique (overflow-x-auto), comme le Kanban.
 */
export default async function DeadlineTimeline({ windowDays = 90 }) {
  const supabase = createClient();
  const org = await getCurrentOrganization();
  if (!org || !org.onboarding_completed) return null;

  const today = new Date();
  const todayIso = today.toISOString().slice(0, 10);
  const horizonIso = new Date(today.getTime() + windowDays * 86400000).toISOString().slice(0, 10);

  // 1. Saved opportunities avec deadline dans la fenêtre
  const { data: saved } = await supabase
    .from('saved_opportunities')
    .select('id, status, opportunities!inner(id, title, deadline, donors(name))')
    .eq('organization_id', org.id)
    .in('status', ['saved', 'analyzing', 'preparing', 'submitted'])
    .gte('opportunities.deadline', todayIso)
    .lte('opportunities.deadline', horizonIso);

  const items = (saved || [])
    .filter((s) => s.opportunities?.deadline)
    .map((s) => ({
      id: s.opportunities.id,
      title: s.opportunities.title || 'Sans titre',
      donor: s.opportunities.donors?.name || 'Bailleur',
      deadline: s.opportunities.deadline,
      status: s.status,
      source: 'saved',
    }))
    .sort((a, b) => new Date(a.deadline) - new Date(b.deadline));

  // Empty state — pas de saved dans la fenêtre
  if (items.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-6">
        <p className="eyebrow">📅 Frise des deadlines (90j)</p>
        <p className="mt-2 text-sm text-slate-500">
          Aucune deadline trackée. Sauvegarde tes opportunités en cours pour les voir apparaître ici.
        </p>
        <Link href="/opportunities" className="btn-secondary mt-3 inline-flex text-2xs uppercase tracking-widest">
          Explorer les opportunités →
        </Link>
      </div>
    );
  }

  // ============================================================
  // Layout : container scrollable, chaque ticket positionné par jours-jusqu'à
  // ============================================================
  const PX_PER_DAY = 6; // largeur d'une journée en pixels
  const totalWidth = windowDays * PX_PER_DAY; // 540px pour 90j
  const weekMarkers = [];
  for (let w = 0; w <= Math.floor(windowDays / 7); w++) {
    const d = new Date(today.getTime() + w * 7 * 86400000);
    weekMarkers.push({
      day: w * 7,
      label: w === 0 ? "Aujourd'hui" : `+${w}sem`,
      date: d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
    });
  }

  // Calcule la position X de chaque ticket
  const positioned = items.map((it) => {
    const daysUntil = Math.max(0, Math.round((new Date(it.deadline) - today) / 86400000));
    return { ...it, daysUntil, xPx: daysUntil * PX_PER_DAY };
  });

  // Stack vertical pour éviter les chevauchements (3 lanes)
  const lanes = [[], [], []];
  for (const item of positioned) {
    const myLane = lanes.findIndex((lane) =>
      lane.every((other) => Math.abs(other.xPx - item.xPx) > 180)
    );
    const lane = myLane >= 0 ? myLane : 0;
    lanes[lane].push(item);
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="eyebrow">📅 Frise des deadlines</p>
          <h3 className="mt-1 font-display text-xl font-black text-slate-950">
            {items.length} deadline{items.length > 1 ? 's' : ''} dans les {windowDays} prochains jours
          </h3>
        </div>
        <Link href="/dashboard/applications" className="text-2xs font-black uppercase tracking-widest text-brand-700 hover:underline">
          Voir kanban →
        </Link>
      </div>

      <div className="relative overflow-x-auto overscroll-x-contain">
        <div className="relative" style={{ width: `${totalWidth + 200}px`, minWidth: '100%', height: '240px' }}>
          {/* Axe horizontal */}
          <div className="absolute left-0 right-0 top-[200px] h-px bg-slate-200" />

          {/* Marqueurs de semaines */}
          {weekMarkers.map((m) => (
            <div key={m.day} className="absolute top-[195px]" style={{ left: `${m.day * PX_PER_DAY}px` }}>
              <div className="h-3 w-px bg-slate-300" />
              <div className="mt-1 whitespace-nowrap text-2xs font-bold text-slate-500" style={{ transform: 'translateX(-50%)' }}>
                <p className="font-black text-slate-700">{m.label}</p>
                <p className="text-slate-400">{m.date}</p>
              </div>
            </div>
          ))}

          {/* Tickets — un par opp avec sa lane */}
          {lanes.map((lane, laneIdx) =>
            lane.map((item) => {
              const tone =
                item.daysUntil <= 7 ? { bg: 'bg-rose-50', border: 'border-rose-300', text: 'text-rose-700', dot: 'bg-rose-500' }
                : item.daysUntil <= 30 ? { bg: 'bg-amber-50', border: 'border-amber-300', text: 'text-amber-700', dot: 'bg-amber-500' }
                : { bg: 'bg-emerald-50', border: 'border-emerald-300', text: 'text-emerald-700', dot: 'bg-emerald-500' };
              const top = laneIdx * 64;
              return (
                <Link
                  key={`${item.id}-${laneIdx}`}
                  href={`/opportunities/${item.id}`}
                  className={`group absolute block w-[180px] rounded-2xl border ${tone.border} ${tone.bg} p-2.5 text-xs shadow-sm transition hover:scale-105 hover:shadow-md`}
                  style={{ left: `${item.xPx}px`, top: `${top}px` }}
                >
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 shrink-0 rounded-full ${tone.dot}`} />
                    <span className={`text-2xs font-black uppercase tracking-widest ${tone.text}`}>
                      {item.daysUntil === 0 ? "Auj." : `${item.daysUntil}j`}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs font-bold leading-tight text-slate-950">
                    {item.title}
                  </p>
                  <p className="mt-0.5 truncate text-2xs text-slate-500">{item.donor}</p>
                </Link>
              );
            })
          )}

          {/* Marqueur "Aujourd'hui" verticale */}
          <div className="absolute left-0 top-0 h-[200px] w-px bg-brand-500/30">
            <div className="absolute -top-1 -left-[3px] h-2 w-2 rounded-full bg-brand-500" />
          </div>
        </div>
      </div>

      <p className="mt-2 text-2xs text-slate-400">
        💡 Glisse horizontalement pour voir au-delà de la fenêtre visible. Rouge = ≤7j · Ambre = ≤30j · Vert = au-delà.
      </p>
    </div>
  );
}
