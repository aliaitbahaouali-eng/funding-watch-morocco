'use client';
import { useState } from 'react';
import Link from 'next/link';
import { formatDate, daysUntil } from '@/lib/utils';

// Pipeline candidature : idée → brouillon → soumis → résultat
const COLUMNS = [
  { key: 'saved',      label: 'Idée / Sauvegardé', accent: 'bg-ink-100 text-ink-600' },
  { key: 'analyzing',  label: 'En analyse',        accent: 'bg-sky-100 text-sky-700' },
  { key: 'preparing',  label: 'Brouillon',         accent: 'bg-amber-100 text-amber-700' },
  { key: 'submitted',  label: 'Soumis',            accent: 'bg-indigo-100 text-indigo-700' },
  { key: 'won',        label: 'Obtenu',            accent: 'bg-emerald-100 text-emerald-700' },
  { key: 'lost',       label: 'Refusé',            accent: 'bg-rose-100 text-rose-700' },
  { key: 'abandoned',  label: 'Abandonné',         accent: 'bg-ink-100 text-ink-400' },
];
const ORDER = COLUMNS.map((c) => c.key);

export default function ApplicationsBoard({ initialItems = [] }) {
  const [items, setItems] = useState(initialItems);
  const [dragId, setDragId] = useState(null);
  const [dragOver, setDragOver] = useState(null);
  const [error, setError] = useState(null);

  const byStatus = Object.fromEntries(COLUMNS.map((c) => [c.key, []]));
  items.forEach((s) => { if (s.opportunities && byStatus[s.status]) byStatus[s.status].push(s); });

  async function moveItem(id, newStatus) {
    const current = items.find((i) => i.id === id);
    if (!current || current.status === newStatus) return;
    const prev = items;
    setItems((list) => list.map((i) => (i.id === id ? { ...i, status: newStatus } : i)));
    setError(null);
    try {
      const res = await fetch('/api/applications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Échec de la mise à jour');
    } catch (e) {
      setItems(prev); // rollback
      setError(e.message);
    }
  }

  return (
    <div>
      {error && (
        <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-bold text-rose-700">
          {error}
        </div>
      )}

      <div className="flex gap-4 overflow-x-auto pb-4">
        {COLUMNS.map((col) => (
          <div
            key={col.key}
            onDragOver={(e) => { e.preventDefault(); setDragOver(col.key); }}
            onDragLeave={() => setDragOver((k) => (k === col.key ? null : k))}
            onDrop={(e) => { e.preventDefault(); setDragOver(null); if (dragId) moveItem(dragId, col.key); setDragId(null); }}
            className={`flex w-[280px] shrink-0 flex-col rounded-3xl border bg-ink-50/60 p-3 transition ${
              dragOver === col.key ? 'border-brand-400 bg-brand-50/50' : 'border-ink-100'
            }`}
          >
            <div className="flex items-center justify-between px-1 pb-3">
              <h3 className="text-sm font-black text-ink-700">{col.label}</h3>
              <span className={`rounded-full px-2 py-0.5 text-2xs font-black ${col.accent}`}>
                {byStatus[col.key].length}
              </span>
            </div>

            <div className="flex flex-1 flex-col gap-2">
              {byStatus[col.key].map((s) => {
                const days = daysUntil(s.opportunities.deadline);
                return (
                  <div
                    key={s.id}
                    draggable
                    onDragStart={() => setDragId(s.id)}
                    onDragEnd={() => setDragId(null)}
                    className={`group rounded-2xl border border-ink-100 bg-white p-3 shadow-sm transition hover:shadow-card-hover ${
                      dragId === s.id ? 'opacity-40' : ''
                    }`}
                  >
                    <Link href={`/opportunities/${s.opportunities.id}`} className="block text-sm font-bold leading-tight text-ink hover:text-brand-700">
                      {s.opportunities.title}
                    </Link>
                    <p className="mt-1 text-xs text-ink-500">
                      {s.opportunities.donors?.name || 'Bailleur'} · {formatDate(s.opportunities.deadline)}
                    </p>
                    {days !== null && days >= 0 && days <= 30 && (
                      <span className="mt-2 inline-block rounded-full bg-amber-50 px-2 py-0.5 text-2xs font-black text-amber-700">
                        {days}j restants
                      </span>
                    )}
                    {/* Sélecteur d'étape — fonctionne au clavier et sur mobile (le drag-and-drop est un bonus desktop) */}
                    <select
                      value={s.status}
                      onChange={(e) => moveItem(s.id, e.target.value)}
                      aria-label="Changer l'étape"
                      className="mt-2 w-full rounded-xl border border-ink-200 bg-ink-50 px-2 py-1.5 text-2xs font-bold text-ink-600 focus:border-brand-400 focus:outline-none"
                    >
                      {COLUMNS.map((c) => (
                        <option key={c.key} value={c.key}>{c.label}</option>
                      ))}
                    </select>
                  </div>
                );
              })}
              {byStatus[col.key].length === 0 && (
                <div className="rounded-2xl border border-dashed border-ink-200 px-3 py-6 text-center text-xs text-ink-400">
                  Glissez une carte ici
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export { ORDER };
