'use client';
import { cn } from '@/lib/utils';

/* ── Badge ──
   Sprint 5F — palette resserrée à 4 teintes canoniques pour réduire le bruit
   visuel ("sapin de Noël"). Les anciens noms (gold/red/orange/purple) restent
   acceptés comme alias mais ne rendent plus que l'une des 4 couleurs réelles :
     • brand (rouge)  → urgence / emphase   (ex-red, ex-orange)
     • blue           → info / data         (ex-purple)
     • green          → succès / éligible
     • slate          → neutre / inconnu    (ex-gold) */
export function Badge({ children, tone = 'blue', className }) {
  const CANON = {
    brand: 'bg-red-50 text-red-700 ring-red-200',
    blue: 'bg-blue-50 text-blue-700 ring-blue-200',
    green: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    slate: 'bg-slate-100 text-slate-600 ring-slate-200',
  };
  const tones = {
    ...CANON,
    // alias rétro-compat → teinte canonique
    red: CANON.brand,
    orange: CANON.brand,
    gold: CANON.slate,
    purple: CANON.blue,
  };
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ring-1',
        tones[tone] ?? tones.blue,
        className
      )}
    >
      {children}
    </span>
  );
}

/* ── Score Ring ── */
export function Score({ value, size = 'md' }) {
  const color =
    value >= 90 ? 'text-emerald-600' :
    value >= 70 ? 'text-blue-600' :
    value >= 50 ? 'text-amber-600' : 'text-slate-400';
  const sizes = { sm: 'text-lg w-12 h-12', md: 'text-2xl w-16 h-16', lg: 'text-3xl w-20 h-20' };
  return (
    <div className={cn('flex flex-col items-center justify-center rounded-full bg-slate-50 font-black', sizes[size], color)}>
      <span>{value}</span>
      <span className="text-[10px] font-medium text-slate-400">pts</span>
    </div>
  );
}

/* ── Section Title ── */
export function SectionTitle({ eyebrow, title, text, center }) {
  return (
    <div className={cn('mb-10 max-w-2xl', center && 'mx-auto text-center')}>
      {eyebrow && <p className="mb-3 text-sm font-bold uppercase tracking-widest text-primary">{eyebrow}</p>}
      <h2 className="text-3xl font-black tracking-tight text-slate-950 lg:text-4xl">{title}</h2>
      {text && <p className="mt-4 text-lg leading-8 text-slate-500">{text}</p>}
    </div>
  );
}

/* ── Button ── */
export function Button({ children, variant = 'primary', size = 'md', className, ...props }) {
  const variants = {
    primary: 'bg-primary text-white hover:bg-blue-700 focus-visible:ring-2 focus-visible:ring-primary',
    secondary: 'border border-slate-200 bg-white text-slate-800 hover:bg-slate-50',
    danger: 'bg-red-600 text-white hover:bg-red-700',
    ghost: 'text-slate-600 hover:bg-slate-100',
  };
  const sizes = { sm: 'px-4 py-2 text-sm', md: 'px-6 py-3', lg: 'px-8 py-4 text-lg' };
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-full font-bold transition focus-visible:outline-none',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

/* ── Input ── */
export function Input({ label, error, className, ...props }) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-sm font-bold text-slate-700">{label}</label>}
      <input
        className={cn(
          'w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none ring-0 transition placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/20',
          error && 'border-red-400 focus:ring-red-100',
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

/* ── Select ── */
export function Select({ label, children, className, ...props }) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-sm font-bold text-slate-700">{label}</label>}
      <select
        className={cn(
          'w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20',
          className
        )}
        {...props}
      >
        {children}
      </select>
    </div>
  );
}

/* ── Spinner ── */
export function Spinner({ className }) {
  return (
    <div className={cn('h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent', className)} />
  );
}

/* ── Alert ── */
export function Alert({ children, type = 'info' }) {
  const styles = {
    info: 'bg-blue-50 border-blue-200 text-blue-800',
    success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    warning: 'bg-amber-50 border-amber-200 text-amber-800',
    error: 'bg-red-50 border-red-200 text-red-800',
  };
  return (
    <div className={cn('rounded-2xl border px-4 py-3 text-sm font-medium', styles[type])}>
      {children}
    </div>
  );
}

/* ── Card ── */
export function Card({ children, className }) {
  return (
    <div className={cn('rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm', className)}>
      {children}
    </div>
  );
}

/* ── Stat Card ── */
export function StatCard({ label, value, sub, icon }) {
  return (
    <Card>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-bold text-slate-500">{label}</p>
          <p className="mt-1 text-4xl font-black text-slate-950">{value}</p>
          {sub && <p className="mt-1 text-sm text-slate-400">{sub}</p>}
        </div>
        {icon && <span className="text-3xl">{icon}</span>}
      </div>
    </Card>
  );
}
