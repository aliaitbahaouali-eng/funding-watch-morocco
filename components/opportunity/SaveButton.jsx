'use client';
import { useState, useTransition } from 'react';

export default function SaveButton({ opportunityId, initiallySaved = false }) {
  const [saved, setSaved] = useState(initiallySaved);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState(null);

  const toggle = async () => {
    setError(null);
    startTransition(async () => {
      const res = await fetch('/api/saved', {
        method: saved ? 'DELETE' : 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ opportunity_id: opportunityId })
      });
      if (res.ok) setSaved(!saved);
      else if (res.status === 401) window.location.href = '/login?redirect=/opportunities/' + opportunityId;
      else setError('Erreur');
    });
  };

  return (
    <div className="space-y-2">
      <button onClick={toggle} disabled={pending}
        className={`w-full rounded-full px-5 py-3 text-sm font-bold transition ${saved ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-primary text-white hover:bg-primary-600'}`}>
        {saved ? '★ Sauvegardé' : '☆ Sauvegarder cette opportunité'}
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
