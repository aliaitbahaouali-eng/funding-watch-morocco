'use client';
import { createContext, useContext, useState, useCallback, useEffect } from 'react';

const ToastCtx = createContext({ push: () => {} });

let _id = 0;

export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);

  const push = useCallback((opts) => {
    const id = ++_id;
    const item = {
      id,
      type: opts.type || 'info',
      title: opts.title,
      desc: opts.desc,
      duration: opts.duration ?? 4500
    };
    setItems((prev) => [...prev, item]);
    if (item.duration > 0) {
      setTimeout(() => setItems(prev => prev.filter(t => t.id !== id)), item.duration);
    }
    return id;
  }, []);

  const dismiss = useCallback((id) => {
    setItems(prev => prev.filter(t => t.id !== id));
  }, []);

  // Expose en window.toast pour usage facile
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.toast = (title, opts = {}) => push({ title, ...opts });
      window.toast.success = (title, desc) => push({ title, desc, type: 'success' });
      window.toast.error = (title, desc) => push({ title, desc, type: 'error' });
      window.toast.info = (title, desc) => push({ title, desc, type: 'info' });
    }
  }, [push]);

  return (
    <ToastCtx.Provider value={{ push, dismiss }}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[200] flex w-96 max-w-[calc(100vw-2rem)] flex-col gap-2">
        {items.map((t) => (
          <div key={t.id}
            className={`pointer-events-auto animate-slide-up rounded-2xl border bg-white p-4 shadow-xl ring-1 ring-ink-900/5 ${TONE[t.type]}`}>
            <div className="flex gap-3">
              <span className="text-lg">{ICON[t.type]}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-ink-900">{t.title}</p>
                {t.desc && <p className="mt-0.5 text-xs text-ink-600">{t.desc}</p>}
              </div>
              <button onClick={() => dismiss(t.id)} className="text-ink-400 hover:text-ink-600">×</button>
            </div>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

const TONE = {
  success: 'border-emerald-200',
  error: 'border-brand-200',
  info: 'border-ink-200'
};
const ICON = {
  success: '✅',
  error: '⚠️',
  info: 'ℹ️'
};

export function useToast() {
  return useContext(ToastCtx);
}
