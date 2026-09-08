/*
 * Generic data table.
 *
 * columns: [{ key, header, render? }]
 * rows: array of row objects (or the items consumed by rowKey + columns.render)
 */

const DataTable = ({ columns, rows, rowKey = (row) => row.id, emptyLabel = 'No records' }) => {
  if (!rows || rows.length === 0) {
    return (
      <div className="px-4 py-8 text-center text-sm text-slate-400">{emptyLabel}</div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-ink-600/70 text-left">
            {columns.map((col) => (
              <th
                key={col.key}
                className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-400"
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={rowKey(row)}
              className="border-b border-ink-600/50 last:border-0 hover:bg-ink-700/50"
            >
              {columns.map((col) => (
                <td key={col.key} className="px-4 py-2.5 text-slate-200">
                  {col.render ? col.render(row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default DataTable
