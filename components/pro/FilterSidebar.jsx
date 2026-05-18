'use client';

import { useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';

/**
 * FilterSidebar — sidebar Devex-style avec groupes collapsibles.
 *
 * Usage :
 *   <FilterSidebar
 *     groups={[
 *       { title: 'Thématique', key: 'theme', options: [{value, label, count}], multi: true },
 *       { title: 'Bailleur', key: 'donor', options: [...] },
 *     ]}
 *   />
 */
export default function FilterSidebar({ groups = [], className = '' }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [collapsed, setCollapsed] = useState({});

  const toggle = (key) => setCollapsed((s) => ({ ...s, [key]: !s[key] }));

  const isActive = (key, value) => {
    const current = searchParams.get(key);
    if (!current) return false;
    return current.split(',').includes(String(value));
  };

  const setFilter = (key, value, multi = false) => {
    const params = new URLSearchParams(searchParams.toString());
    if (multi) {
      const current = (params.get(key) || '').split(',').filter(Boolean);
      const idx = current.indexOf(String(value));
      if (idx >= 0) current.splice(idx, 1);
      else current.push(String(value));
      if (current.length === 0) params.delete(key);
      else params.set(key, current.join(','));
    } else {
      if (params.get(key) === String(value)) params.delete(key);
      else params.set(key, String(value));
    }
    params.delete('page');
    router.push(`${pathname}?${params.toString()}`);
  };

  const clearAll = () => router.push(pathname);
  const hasAnyFilter = Array.from(searchParams.keys()).some((k) => k !== 'page' && k !== 'sort');

  return (
    <aside className={`filter-panel ${className}`}>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-display text-sm font-black tracking-tighter-2 text-ink-900">Filtres</h3>
        {hasAnyFilter && (
          <button onClick={clearAll} className="text-2xs font-bold uppercase tracking-wider text-data-600 hover:underline">
            Effacer tout
          </button>
        )}
      </div>

      {groups.map((g) => {
        const isCollapsed = collapsed[g.key];
        return (
          <div key={g.key} className="filter-group">
            <button
              onClick={() => toggle(g.key)}
              className="filter-group-title w-full"
            >
              <span>{g.title}</span>
              <span className="text-ink-400">{isCollapsed ? '+' : '−'}</span>
            </button>
            {!isCollapsed && (
              <div className="space-y-0.5">
                {g.options.map((opt) => {
                  const active = isActive(g.key, opt.value);
                  return (
                    <label key={opt.value} className={`filter-checkbox ${active ? 'bg-data-50 text-data-700' : ''}`}>
                      <input
                        type={g.multi ? 'checkbox' : 'radio'}
                        name={g.key}
                        checked={active}
                        onChange={() => setFilter(g.key, opt.value, g.multi)}
                      />
                      <span className="flex-1 truncate">{opt.label}</span>
                      {opt.count !== undefined && (
                        <span className="text-3xs tabular-nums text-ink-400">{opt.count}</span>
                      )}
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </aside>
  );
}
