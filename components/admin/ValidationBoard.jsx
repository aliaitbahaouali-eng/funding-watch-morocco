'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';

/**
 * ValidationBoard — UI client pour /admin/validation
 * Server actions sont passées en props pour découplage propre.
 *
 * Raccourcis clavier :
 *   J     : ligne suivante
 *   K     : ligne précédente
 *   P     : publish (approve) la ligne active
 *   X     : reject la ligne active
 *   Space : toggle sélection bulk
 *   A     : sélectionne / désélectionne tout
 *   ?     : ouvre/ferme la cheatsheet
 */
export default function ValidationBoard({ drafts, error, stats, filters, actions }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [activeIdx, setActiveIdx] = useState(0);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [showHelp, setShowHelp] = useState(false);
  const [pendingAction, setPendingAction] = useState(null); // {type, count} pour confirm bulk
  const rowRefs = useRef([]);

  const dayUntil = (deadline) => {
    if (!deadline) return null;
    return Math.ceil((new Date(deadline).getTime() - Date.now()) / 86400000);
  };

  // ── Raccourcis clavier ───────────────────────────────────
  useEffect(() => {
    const onKey = (e) => {
      // Ignore si focus dans input/textarea/contenteditable
      const target = e.target;
      if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable) return;

      switch (e.key.toLowerCase()) {
        case 'j':
          e.preventDefault();
          setActiveIdx((i) => Math.min(i + 1, drafts.length - 1));
          break;
        case 'k':
          e.preventDefault();
          setActiveIdx((i) => Math.max(i - 1, 0));
          break;
        case 'p':
          e.preventDefault();
          if (drafts[activeIdx]) {
            const fd = new FormData();
            fd.set('id', drafts[activeIdx].id);
            actions.approveOne(fd);
          }
          break;
        case 'x':
          e.preventDefault();
          if (drafts[activeIdx]) {
            const fd = new FormData();
            fd.set('id', drafts[activeIdx].id);
            actions.rejectOne(fd);
          }
          break;
        case ' ':
          e.preventDefault();
          if (drafts[activeIdx]) {
            toggleSelect(drafts[activeIdx].id);
          }
          break;
        case 'a':
          e.preventDefault();
          if (selectedIds.size === drafts.length) {
            setSelectedIds(new Set());
          } else {
            setSelectedIds(new Set(drafts.map((d) => d.id)));
          }
          break;
        case '?':
          e.preventDefault();
          setShowHelp((s) => !s);
          break;
        case 'escape':
          setSelectedIds(new Set());
          setShowHelp(false);
          setPendingAction(null);
          break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [drafts, activeIdx, selectedIds, actions]);

  // Scroll active row en vue
  useEffect(() => {
    rowRefs.current[activeIdx]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [activeIdx]);

  const toggleSelect = useCallback((id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // ── Filter chips ─────────────────────────────────────────
  const updateFilter = (key, value) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === null || value === undefined || value === '') {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  const allSelected = selectedIds.size > 0 && selectedIds.size === drafts.length;
  const someSelected = selectedIds.size > 0 && !allSelected;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-red-600">Workflow validation</p>
          <h1 className="mt-1 font-display text-3xl font-black text-slate-950">Drafts à valider</h1>
          <p className="mt-1 text-sm text-slate-500">
            {stats.total} en attente · {stats.ngoOk} ONG-fit · {stats.moroccoOk} Maroc-éligible ·{' '}
            <button onClick={() => setShowHelp((s) => !s)} className="underline hover:text-red-600">
              raccourcis (?)
            </button>
          </p>
        </div>
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-2">
            <span className="text-sm font-bold text-red-800">{selectedIds.size} sélectionnée(s)</span>
            <button
              onClick={() => setPendingAction({ type: 'bulk_approve', count: selectedIds.size })}
              className="rounded-full bg-emerald-600 px-4 py-2 text-xs font-bold uppercase tracking-widest text-white hover:bg-emerald-700"
            >
              ✓ Publier
            </button>
            <button
              onClick={() => setPendingAction({ type: 'bulk_reject', count: selectedIds.size })}
              className="rounded-full bg-red-600 px-4 py-2 text-xs font-bold uppercase tracking-widest text-white hover:bg-red-700"
            >
              ✖ Rejeter
            </button>
            <button onClick={() => setSelectedIds(new Set())} className="text-xs text-slate-500 hover:underline">
              annuler
            </button>
          </div>
        )}
      </div>

      {/* Stats par source — chips bulk-approve */}
      {stats.topSources.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-500">Drafts par source</p>
          <div className="flex flex-wrap gap-2">
            {stats.topSources.map((s) => (
              <button
                key={s.id}
                onClick={() => updateFilter('source', s.id === 'null' ? '' : s.id)}
                className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${
                  filters.source === s.id
                    ? 'border-red-600 bg-red-600 text-white'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-red-300'
                }`}
              >
                {s.name} · {s.count}
              </button>
            ))}
            {filters.source && (
              <button onClick={() => updateFilter('source', '')} className="text-xs text-slate-500 hover:underline">
                ✕ effacer filtre source
              </button>
            )}
          </div>
        </div>
      )}

      {/* Filtres NGO + Maroc */}
      <div className="flex flex-wrap gap-2">
        <span className="text-xs font-bold uppercase tracking-widest text-slate-500 self-center mr-2">NGO :</span>
        {[
          { v: '', l: 'Tous' },
          { v: 'yes', l: '✓ ONG-fit' },
          { v: 'no', l: '✖ Non-ONG' },
          { v: 'unknown', l: '? Non classé' },
        ].map((o) => (
          <button
            key={o.v}
            onClick={() => updateFilter('ngo', o.v)}
            className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${
              (filters.ngo || '') === o.v
                ? 'border-red-600 bg-red-600 text-white'
                : 'border-slate-200 bg-white text-slate-700 hover:border-red-300'
            }`}
          >
            {o.l}
          </button>
        ))}
        <span className="ml-4 text-xs font-bold uppercase tracking-widest text-slate-500 self-center mr-2">Maroc :</span>
        <button
          onClick={() => updateFilter('morocco', filters.moroccoOnly ? '' : '1')}
          className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${
            filters.moroccoOnly
              ? 'border-red-600 bg-red-600 text-white'
              : 'border-slate-200 bg-white text-slate-700 hover:border-red-300'
          }`}
        >
          🇲🇦 {filters.moroccoOnly ? '✓' : ''} Maroc-éligible
        </button>
      </div>

      {/* Liste drafts */}
      {error && (
        <div className="rounded-2xl border border-red-300 bg-red-50 p-4 text-sm text-red-800">
          Erreur chargement : {error}
        </div>
      )}

      {drafts.length === 0 && !error && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <p className="text-lg font-bold text-slate-700">🎉 Aucun draft à valider</p>
          <p className="mt-2 text-sm text-slate-500">
            Tous les drafts ont été traités. Le scraper insère les nouveautés ici automatiquement.
          </p>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-widest text-slate-500">
            <tr>
              <th className="w-12 px-4 py-3">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => el && (el.indeterminate = someSelected)}
                  onChange={() => {
                    if (allSelected || someSelected) setSelectedIds(new Set());
                    else setSelectedIds(new Set(drafts.map((d) => d.id)));
                  }}
                  className="h-4 w-4 cursor-pointer"
                />
              </th>
              <th className="px-4 py-3">Opp</th>
              <th className="px-4 py-3">Source</th>
              <th className="w-20 px-4 py-3">NGO</th>
              <th className="w-32 px-4 py-3">Deadline</th>
              <th className="w-48 px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {drafts.map((o, idx) => {
              const days = dayUntil(o.deadline);
              const isActive = idx === activeIdx;
              const isSelected = selectedIds.has(o.id);
              return (
                <tr
                  key={o.id}
                  ref={(el) => (rowRefs.current[idx] = el)}
                  onClick={() => setActiveIdx(idx)}
                  className={`cursor-pointer transition ${
                    isActive ? 'bg-red-50/70' : isSelected ? 'bg-amber-50/40' : 'hover:bg-slate-50'
                  }`}
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(o.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="h-4 w-4 cursor-pointer"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-bold text-slate-950 line-clamp-2">{o.title || '(sans titre)'}</div>
                    {o.summary && (
                      <div className="mt-1 text-xs text-slate-500 line-clamp-2">{o.summary}</div>
                    )}
                    <div className="mt-1 flex flex-wrap gap-1">
                      {o.morocco_eligible && (
                        <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-700">
                          🇲🇦 Maroc
                        </span>
                      )}
                      {o.donors?.name && (
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600">
                          {o.donors.name}
                        </span>
                      )}
                      <a
                        href={o.official_url}
                        target="_blank"
                        rel="noopener"
                        onClick={(e) => e.stopPropagation()}
                        className="text-[10px] font-bold text-red-600 hover:underline"
                      >
                        Lien officiel ↗
                      </a>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600">{o.sources?.name || '—'}</td>
                  <td className="px-4 py-3">
                    {o.ngo_relevant === true && (
                      <span className="text-emerald-700" title={o.ngo_relevance_reason}>
                        ✓ {o.ngo_relevance_score ? `${o.ngo_relevance_score}%` : ''}
                      </span>
                    )}
                    {o.ngo_relevant === false && (
                      <span className="text-red-600" title={o.ngo_relevance_reason}>
                        ✖ {o.ngo_relevance_score ? `${o.ngo_relevance_score}%` : ''}
                      </span>
                    )}
                    {o.ngo_relevant === null && <span className="text-slate-400">?</span>}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {o.deadline ? (
                      <span
                        className={
                          days < 0
                            ? 'text-slate-400 line-through'
                            : days <= 7
                            ? 'font-bold text-red-600'
                            : days <= 30
                            ? 'font-bold text-amber-600'
                            : 'text-slate-600'
                        }
                      >
                        {new Date(o.deadline).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                        {days !== null && days >= 0 && <span className="ml-1">({days}j)</span>}
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <form action={actions.approveOne} className="inline">
                      <input type="hidden" name="id" value={o.id} />
                      <button
                        type="submit"
                        onClick={(e) => e.stopPropagation()}
                        className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700 hover:bg-emerald-200"
                        title="P"
                      >
                        ✓ Publier
                      </button>
                    </form>
                    <form action={actions.rejectOne} className="ml-2 inline">
                      <input type="hidden" name="id" value={o.id} />
                      <button
                        type="submit"
                        onClick={(e) => e.stopPropagation()}
                        className="rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700 hover:bg-red-200"
                        title="X"
                      >
                        ✖ Rejeter
                      </button>
                    </form>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal confirm bulk action */}
      {pendingAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="font-display text-xl font-black text-slate-950">
              {pendingAction.type === 'bulk_approve' ? '✓ Publier' : '✖ Rejeter'} {pendingAction.count}{' '}
              opportunité{pendingAction.count > 1 ? 's' : ''} ?
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Cette action sera tracée dans le journal d'audit et ne pourra pas être annulée d'un clic.
            </p>
            <form
              action={pendingAction.type === 'bulk_approve' ? actions.bulkApprove : actions.bulkReject}
              className="mt-4 flex flex-col gap-3"
            >
              <input type="hidden" name="ids" value={Array.from(selectedIds).join(',')} />
              {pendingAction.type === 'bulk_reject' && (
                <input
                  type="text"
                  name="reason"
                  placeholder="Raison du rejet (optionnel)"
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm"
                />
              )}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setPendingAction(null)}
                  className="rounded-full border-2 border-slate-200 px-4 py-2 text-sm font-bold text-slate-700"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  onClick={() => {
                    setPendingAction(null);
                    setSelectedIds(new Set());
                  }}
                  className={`rounded-full px-4 py-2 text-sm font-bold text-white ${
                    pendingAction.type === 'bulk_approve' ? 'bg-emerald-600' : 'bg-red-600'
                  }`}
                >
                  Confirmer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cheatsheet raccourcis */}
      {showHelp && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          onClick={() => setShowHelp(false)}
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-display text-xl font-black text-slate-950">Raccourcis clavier</h2>
            <div className="mt-4 space-y-2 text-sm">
              {[
                ['J', 'Ligne suivante'],
                ['K', 'Ligne précédente'],
                ['P', 'Publier la ligne active'],
                ['X', 'Rejeter la ligne active'],
                ['Espace', 'Toggle sélection (bulk)'],
                ['A', 'Sélectionner tout / rien'],
                ['?', 'Afficher cette aide'],
                ['Esc', 'Annuler / fermer'],
              ].map(([k, d]) => (
                <div key={k} className="flex items-center justify-between border-b border-slate-100 py-2">
                  <kbd className="rounded bg-slate-100 px-2 py-1 font-mono text-xs font-bold text-slate-700">{k}</kbd>
                  <span className="text-slate-600">{d}</span>
                </div>
              ))}
            </div>
            <button
              onClick={() => setShowHelp(false)}
              className="mt-6 w-full rounded-full bg-slate-900 px-4 py-2 text-sm font-bold text-white"
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
