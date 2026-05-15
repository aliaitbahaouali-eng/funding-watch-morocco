'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useTransition } from 'react';

/**
 * Filtres /opportunities en chips cliquables (P1.7).
 * - Thématiques : multi-sélection via param `themes=femmes,jeunes,…`
 * - Deadline    : single chips ≤7j / ≤30j / ≤90j / Toute
 * - Difficulté  : single chips Accessible / Moyen / Élevé / Toute
 * - Bailleur    : <select> (trop d'options pour des chips)
 * - Toggles     : Maroc éligible, Vérifié, Voir aussi les expirées
 */
export default function OpportunityFilters({ themes, donors }) {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [q, setQ] = useState(params.get('q') || '');

  // Helpers
  const setParam = (k, v) => {
    const next = new URLSearchParams(params);
    if (v && v !== 'all') next.set(k, v); else next.delete(k);
    next.delete('page');
    startTransition(() => router.push(`/opportunities?${next.toString()}`));
  };

  // multi-select pour themes : URL = 'themes=slug1,slug2,…'
  const selectedThemes = new Set(((params.get('themes') || params.get('theme') || '').split(',')).filter(Boolean));
  const toggleTheme = (slug) => {
    const next = new URLSearchParams(params);
    if (selectedThemes.has(slug)) selectedThemes.delete(slug); else selectedThemes.add(slug);
    if (selectedThemes.size === 0) {
      next.delete('themes'); next.delete('theme');
    } else {
      next.set('themes', Array.from(selectedThemes).join(','));
      next.delete('theme');
    }
    next.delete('page');
    startTransition(() => router.push(`/opportunities?${next.toString()}`));
  };

  const onSearch = (e) => {
    e.preventDefault();
    setParam('q', q.trim());
  };

  // Single-select chip helper
  const Chip = ({ active, onClick, children, tone = 'default' }) => {
    const toneClasses = {
      default: active ? 'bg-ink-900 text-white border-ink-900' : 'bg-white text-ink-700 border-slate-200 hover:border-brand-300 hover:text-brand-700',
      brand:   active ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-ink-700 border-slate-200 hover:border-brand-300 hover:text-brand-700',
    };
    return (
      <button
        type="button"
        onClick={onClick}
        className={`rounded-full border px-3.5 py-1.5 text-xs font-bold transition ${toneClasses[tone]}`}
      >
        {children}
      </button>
    );
  };

  const ChipRow = ({ label, children }) => (
    <div>
      <p className="mb-1.5 text-2xs font-black uppercase tracking-widest text-slate-500">{label}</p>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );

  const deadline = params.get('deadline') || 'all';
  const difficulty = params.get('difficulty') || 'all';

  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm sm:p-5">
      {/* Search */}
      <form onSubmit={onSearch} className="mb-4 flex gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Rechercher par mot-clé, bailleur, thématique…"
          className="input flex-1"
        />
        <button type="submit" className="btn-primary text-2xs uppercase tracking-widest">Rechercher</button>
      </form>

      <div className="space-y-4">
        {/* Thèmes — chips multi-sélection */}
        <ChipRow label={`Thématiques${selectedThemes.size ? ` · ${selectedThemes.size} actives` : ''}`}>
          {(themes || []).slice(0, 16).map((t) => (
            <Chip
              key={t.slug}
              active={selectedThemes.has(t.slug)}
              tone="brand"
              onClick={() => toggleTheme(t.slug)}
            >
              {t.name_fr}
            </Chip>
          ))}
          {selectedThemes.size > 0 && (
            <Chip active={false} onClick={() => { selectedThemes.clear(); setParam('themes', ''); }}>
              ✕ Tout effacer
            </Chip>
          )}
        </ChipRow>

        {/* Deadline — chips single-select */}
        <ChipRow label="Deadline">
          <Chip active={deadline === 'all'} onClick={() => setParam('deadline', 'all')}>Toute</Chip>
          <Chip active={deadline === '7'} onClick={() => setParam('deadline', '7')}>≤ 7 jours</Chip>
          <Chip active={deadline === '30'} onClick={() => setParam('deadline', '30')}>≤ 30 jours</Chip>
          <Chip active={deadline === '90'} onClick={() => setParam('deadline', '90')}>≤ 90 jours</Chip>
        </ChipRow>

        {/* Difficulté — chips single-select */}
        <ChipRow label="Difficulté">
          <Chip active={difficulty === 'all'} onClick={() => setParam('difficulty', 'all')}>Toute</Chip>
          <Chip active={difficulty === 'Accessible'} onClick={() => setParam('difficulty', 'Accessible')}>Accessible</Chip>
          <Chip active={difficulty === 'Moyen'} onClick={() => setParam('difficulty', 'Moyen')}>Moyen</Chip>
          <Chip active={difficulty === 'Élevé'} onClick={() => setParam('difficulty', 'Élevé')}>Élevé</Chip>
        </ChipRow>

        {/* Bailleur — select (trop d'options) + Tri */}
        <div className="grid gap-3 sm:grid-cols-[1fr_180px_auto]">
          <select className="input" value={params.get('donor') || 'all'} onChange={(e) => setParam('donor', e.target.value)}>
            <option value="all">Tous bailleurs</option>
            {donors?.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>

          <select className="input" value={params.get('sort') || 'deadline'} onChange={(e) => setParam('sort', e.target.value)}>
            <option value="deadline">Tri : deadline ↑</option>
            <option value="recent">Tri : plus récentes</option>
            <option value="amount">Tri : montant ↓</option>
          </select>

          <a href="/opportunities" className="flex items-center justify-center rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50">
            Réinitialiser
          </a>
        </div>

        {/* Toggles */}
        <div className="grid gap-2 sm:grid-cols-3">
          <label className="flex cursor-pointer items-center gap-2 rounded-2xl border border-slate-200 px-3 py-2 text-sm">
            <input
              type="checkbox"
              checked={params.get('morocco') === '1'}
              onChange={(e) => setParam('morocco', e.target.checked ? '1' : '')}
            />
            🇲🇦 Maroc éligible
          </label>
          <label className="flex cursor-pointer items-center gap-2 rounded-2xl border border-slate-200 px-3 py-2 text-sm">
            <input
              type="checkbox"
              checked={params.get('verified') === '1'}
              onChange={(e) => setParam('verified', e.target.checked ? '1' : '')}
            />
            ✓ Vérifié uniquement
          </label>
          <label className="flex cursor-pointer items-center gap-2 rounded-2xl border border-slate-200 px-3 py-2 text-sm">
            <input
              type="checkbox"
              checked={params.get('expired') === '1'}
              onChange={(e) => setParam('expired', e.target.checked ? '1' : '')}
            />
            ⏰ Voir aussi les expirées
          </label>
        </div>
      </div>

      {pending && <p className="mt-2 text-xs text-slate-400">Mise à jour…</p>}
    </div>
  );
}
