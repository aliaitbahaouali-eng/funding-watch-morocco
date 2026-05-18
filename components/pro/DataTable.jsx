/**
 * DataTable — composant table Devex/Crunchbase pro
 *
 * Usage :
 *   <DataTable
 *     columns={[{ key: 'title', label: 'Opportunité' }, { key: 'donor', label: 'Bailleur' }, ...]}
 *     rows={data}
 *     keyField="id"
 *     onRowClick={(row) => router.push(...)}
 *     emptyMessage="Aucune opportunité"
 *   />
 *
 * Server component compatible (no client hooks).
 */
export default function DataTable({
  columns = [],
  rows = [],
  keyField = 'id',
  emptyMessage = 'Aucun résultat',
  className = '',
  rowClassName,
  caption,
}) {
  if (!rows || rows.length === 0) {
    return (
      <div className={`card-pro p-12 text-center ${className}`}>
        <p className="text-sm text-ink-500">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={`overflow-hidden rounded-card-pro border border-line bg-surface-raised ${className}`}>
      {caption && (
        <div className="border-b border-line-subtle bg-surface-muted px-cell py-2.5 text-3xs font-bold uppercase tracking-wider-2 text-ink-500">
          {caption}
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="data-thead">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={col.align === 'right' ? 'data-th-num' : 'data-th'}
                  style={col.width ? { width: col.width } : undefined}
                >
                  {col.label}
                  {col.sorted && <span className={`sort-indicator ${col.sorted === 'asc' ? 'sort-asc' : 'sort-desc'}`}></span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => {
              const extraCls = typeof rowClassName === 'function' ? rowClassName(row, idx) : '';
              return (
                <tr key={row[keyField] || idx} className={`data-row ${extraCls}`}>
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={col.align === 'right' ? 'data-td-num' : 'data-td'}
                    >
                      {col.render ? col.render(row[col.key], row, idx) : row[col.key]}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
