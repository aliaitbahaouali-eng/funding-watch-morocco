/** Skeleton loaders pour différents types de contenus. */

export function Skeleton({ className = '', height = 'h-4' }) {
  return <div className={`shimmer rounded ${height} ${className}`} />;
}

/** Skeleton d'une carte d'opportunité. */
export function OpportunityCardSkeleton() {
  return (
    <div className="rounded-3xl border border-ink-100 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex gap-1.5">
            <Skeleton className="w-24" height="h-5" />
            <Skeleton className="w-20" height="h-5" />
          </div>
          <Skeleton className="w-24" height="h-3" />
          <Skeleton className="w-3/4" height="h-6" />
          <Skeleton className="w-full" height="h-3" />
          <Skeleton className="w-5/6" height="h-3" />
        </div>
        <div className="h-20 w-20 shrink-0 shimmer rounded-full" />
      </div>
      <div className="mt-5 flex justify-between border-t border-ink-100 pt-4">
        <Skeleton className="w-32" height="h-3" />
        <Skeleton className="w-24" height="h-3" />
      </div>
    </div>
  );
}

/** Skeleton pour un KPI tile. */
export function StatTileSkeleton() {
  return (
    <div className="surface-elevated p-6">
      <Skeleton className="w-24" height="h-3" />
      <div className="mt-3 shimmer h-10 w-32 rounded" />
      <Skeleton className="mt-2 w-20" height="h-3" />
    </div>
  );
}

/** Skeleton pour une ligne d'activité. */
export function ActivityRowSkeleton() {
  return (
    <div className="flex gap-4 py-3">
      <div className="shimmer h-3 w-3 shrink-0 rounded-full mt-1.5" />
      <div className="min-w-0 flex-1 space-y-1.5">
        <Skeleton className="w-3/4" />
        <Skeleton className="w-1/3" height="h-3" />
      </div>
    </div>
  );
}

/** Skeleton pour une row de table. */
export function TableRowSkeleton({ cols = 5 }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="py-3">
          <Skeleton />
        </td>
      ))}
    </tr>
  );
}

/** Skeleton page complète opportunités. */
export function OpportunitiesGridSkeleton({ count = 6 }) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {Array.from({ length: count }).map((_, i) => <OpportunityCardSkeleton key={i} />)}
    </div>
  );
}
