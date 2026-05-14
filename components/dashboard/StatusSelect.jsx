'use client';
import { useState, useTransition } from 'react';

const STATUSES = [
  { value: 'saved', label: 'Sauvegardé' },
  { value: 'analyzing', label: 'En analyse' },
  { value: 'preparing', label: 'En préparation' },
  { value: 'submitted', label: 'Soumis' },
  { value: 'won', label: 'Obtenu' },
  { value: 'lost', label: 'Refusé' },
  { value: 'abandoned', label: 'Abandonné' }
];

export default function StatusSelect({ id, value }) {
  const [current, setCurrent] = useState(value);
  const [pending, startTransition] = useTransition();

  const change = (v) => {
    setCurrent(v);
    startTransition(async () => {
      await fetch('/api/applications', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id, status: v })
      });
    });
  };

  return (
    <select value={current} onChange={(e) => change(e.target.value)} className="input w-44">
      {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
    </select>
  );
}
