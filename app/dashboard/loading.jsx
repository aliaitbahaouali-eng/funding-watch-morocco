/**
 * Sprint 4K — Skeleton de /dashboard.
 * Affiché pendant que les ~10 queries Supabase tournent. Donne l'impression
 * d'instantané perçu : structure visible, contenu en pulse animation.
 */
export default function DashboardLoading() {
  return (
    <div className="space-y-8" aria-busy="true" aria-live="polite">
      {/* Hero skeleton */}
      <div className="relative overflow-hidden rounded-3xl bg-grad-dark p-6 sm:p-8">
        <div className="absolute inset-0 bg-grid opacity-20" />
        <div className="relative flex flex-wrap items-end justify-between gap-6">
          <div className="space-y-4">
            <div className="h-5 w-32 animate-pulse rounded-full bg-white/10" />
            <div className="h-12 w-80 animate-pulse rounded-2xl bg-white/10" />
            <div className="h-4 w-64 animate-pulse rounded-full bg-white/10" />
          </div>
          <div className="flex items-center gap-4 sm:gap-6">
            <div className="h-[88px] w-[88px] animate-pulse rounded-full bg-white/10" />
            <div className="h-[88px] w-[88px] animate-pulse rounded-full bg-white/10" />
          </div>
        </div>
      </div>

      {/* KPI tiles */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="rounded-3xl border border-ink-100 bg-white p-5 shadow-card">
            <div className="flex items-start justify-between">
              <div className="h-4 w-24 animate-pulse rounded-full bg-ink-100" />
              <div className="h-8 w-8 animate-pulse rounded-2xl bg-ink-100" />
            </div>
            <div className="mt-4 h-10 w-16 animate-pulse rounded-xl bg-ink-100" />
            <div className="mt-2 h-3 w-32 animate-pulse rounded-full bg-ink-100" />
          </div>
        ))}
      </div>

      {/* Top matches block */}
      <div className="rounded-3xl border border-ink-100 bg-white p-6">
        <div className="mb-5 flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-3 w-24 animate-pulse rounded-full bg-ink-100" />
            <div className="h-6 w-64 animate-pulse rounded-xl bg-ink-100" />
          </div>
          <div className="h-4 w-20 animate-pulse rounded-full bg-ink-100" />
        </div>
        <div className="space-y-3">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-4 rounded-2xl border border-ink-100 p-4">
              <div className="h-14 w-14 shrink-0 animate-pulse rounded-2xl bg-ink-100" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-3/4 animate-pulse rounded-full bg-ink-100" />
                <div className="h-3 w-1/2 animate-pulse rounded-full bg-ink-100" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Timeline + sectionnement bas */}
      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="card">
          <div className="space-y-3">
            <div className="h-3 w-20 animate-pulse rounded-full bg-ink-100" />
            <div className="h-6 w-72 animate-pulse rounded-xl bg-ink-100" />
            <div className="mt-4 h-64 animate-pulse rounded-2xl bg-ink-50" />
          </div>
        </div>
        <div className="card space-y-3">
          <div className="h-3 w-20 animate-pulse rounded-full bg-ink-100" />
          <div className="h-6 w-48 animate-pulse rounded-xl bg-ink-100" />
          <div className="space-y-3 pt-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="space-y-1.5">
                <div className="h-4 w-full animate-pulse rounded-full bg-ink-100" />
                <div className="h-3 w-1/2 animate-pulse rounded-full bg-ink-100" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
