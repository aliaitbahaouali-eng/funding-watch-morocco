'use client';
import { useState } from 'react';

export default function TestSourceButton({ sourceId }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  async function onClick() {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/admin/test-source', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ source_id: sourceId })
      });
      const data = await res.json();
      setResult(data);
    } catch (e) {
      setResult({ error: e.message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="inline-flex flex-col items-end gap-1">
      <button onClick={onClick} disabled={loading}
        className="rounded-full bg-ink-900 px-3 py-1 text-2xs font-black uppercase tracking-widest text-white disabled:opacity-50">
        {loading ? 'Test…' : '🧪 Tester'}
      </button>
      {result && (
        <span className={`text-2xs font-bold ${result.ok ? 'text-emerald-600' : 'text-brand-600'}`}>
          {result.ok ? `✓ ${result.result?.[0]?.items_found ?? 0} items` : `✖ ${result.error || 'échec'}`}
        </span>
      )}
    </div>
  );
}
