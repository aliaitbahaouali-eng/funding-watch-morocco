'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useTransition } from 'react';

export default function OpportunityFilters({ themes, donors }) {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [q, setQ] = useState(params.get('q') || '');

  const setParam = (k, v) => {
    const next = new URLSearchParams(params);
    if (v && v !== 'all') next.set(k, v); else next.delete(k);
    next.delete('page');
    startTransition(() => router.push(`/opportunities?${next.toString()}`));
  };

  const onSearch = (e) => {
    e.preventDefault();
    setParam('q', q.trim());
  };

  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
      <form onSubmit={onSearch} className="mb-4 flex gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Rechercher par mot-clé, bailleur, thématique…"
          className="input flex-1"
        />
        <button type="submit" className="btn-primary">Rechercher</button>
      </form>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <select className="input" value={params.get('theme') || 'all'} onChange={(e) => setParam('theme', e.target.value)}>
          <option value="all">Toutes thématiques</option>
          {themes?.map(t => <option key={t.slug} value={t.slug}>{t.name_fr}</option>)}
        </select>

        <select className="input" value={params.get('donor') || 'all'} onChange={(e) => setParam('donor', e.target.value)}>
          <option value="all">Tous bailleurs</option>
          {donors?.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>

        <select className="input" value={params.get('deadline') || 'all'} onChange={(e) => setParam('deadline', e.target.value)}>
          <option value="all">Toute deadline</option>
          <option value="7">≤ 7 jours</option>
          <option value="30">≤ 30 jours</option>
          <option value="90">≤ 90 jours</option>
        </select>

        <select className="input" value={params.get('difficulty') || 'all'} onChange={(e) => setParam('difficulty', e.target.value)}>
          <option value="all">Toute difficulté</option>
          <option value="Accessible">Accessible</option>
          <option value="Moyen">Moyen</option>
          <option value="Élevé">Élevé</option>
        </select>

        <label className="flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm">
          <input
            type="checkbox"
            checked={params.get('morocco') === '1'}
            onChange={(e) => setParam('morocco', e.target.checked ? '1' : '')}
          />
          🇲🇦 Maroc éligible
        </label>

        <label className="flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm">
          <input
            type="checkbox"
            checked={params.get('verified') === '1'}
            onChange={(e) => setParam('verified', e.target.checked ? '1' : '')}
          />
          ✓ Vérifié uniquement
        </label>

        <label className="flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm">
          <input
            type="checkbox"
            checked={params.get('expired') === '1'}
            onChange={(e) => setParam('expired', e.target.checked ? '1' : '')}
          />
          ⏰ Voir aussi les expirées
        </label>

        <select className="input" value={params.get('sort') || 'deadline'} onChange={(e) => setParam('sort', e.target.value)}>
          <option value="deadline">Tri : deadline ↑</option>
          <option value="recent">Tri : plus récentes</option>
          <option value="amount">Tri : montant ↓</option>
        </select>

        <a href="/opportunities" className="flex items-center justify-center rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50">
          Réinitialiser
        </a>
      </div>
      {pending && <p className="mt-2 text-xs text-slate-400">Mise à jour…</p>}
    </div>
  );
}
