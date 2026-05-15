'use client';
import { useState } from 'react';

/** Petit bouton "Copier" pour les liens d'invitation et tokens. */
export default function CopyToClipboardButton({ text, label = 'Copier', okLabel = 'Copié ✓' }) {
  const [done, setDone] = useState(false);

  async function onClick() {
    try {
      await navigator.clipboard.writeText(text);
      setDone(true);
      setTimeout(() => setDone(false), 2000);
    } catch {
      /* clipboard unavailable — user can select text manually */
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="shrink-0 rounded-xl bg-slate-900 px-3 py-1.5 text-2xs font-bold text-white hover:bg-slate-700"
    >
      {done ? okLabel : label}
    </button>
  );
}
