import { useEffect, useState } from 'react'
import { getImportHistory, ImportRecord } from '../services/api'

export default function AuditLogPage() {
  const [records, setRecords] = useState<ImportRecord[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const limit = 20

  useEffect(() => {
    getImportHistory(limit, page * limit).then((data) => {
      setRecords(data.records)
      setTotal(data.total)
    })
  }, [page])

  const outcomeColor = (o: string | null) => {
    if (o === 'imported') return '#34A853'
    if (o === 'no_changes') return '#888'
    if (o === 'failed') return '#E63946'
    return '#aaa'
  }

  return (
    <div style={{ padding: '16px', maxWidth: '900px', margin: '0 auto' }}>
      <h2>Import History ({total})</h2>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
        <thead>
          <tr style={{ textAlign: 'left', borderBottom: '2px solid #eee' }}>
            <th style={{ padding: '6px' }}>Time</th>
            <th style={{ padding: '6px' }}>Source</th>
            <th style={{ padding: '6px' }}>File</th>
            <th style={{ padding: '6px' }}>Outcome</th>
            <th style={{ padding: '6px' }}>Segments</th>
            <th style={{ padding: '6px' }}>Error</th>
          </tr>
        </thead>
        <tbody>
          {records.map((r) => (
            <tr key={r.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
              <td style={{ padding: '6px', whiteSpace: 'nowrap' }}>{new Date(r.triggered_at).toLocaleString()}</td>
              <td style={{ padding: '6px' }}>{r.trigger_source}</td>
              <td style={{ padding: '6px', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.file_identifier}</td>
              <td style={{ padding: '6px', color: outcomeColor(r.outcome), fontWeight: 500 }}>{r.outcome ?? 'processing…'}</td>
              <td style={{ padding: '6px' }}>{r.segments_imported ?? '—'}</td>
              <td style={{ padding: '6px', color: '#E63946', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.error_message ?? ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {total > limit && (
        <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
          <button disabled={page === 0} onClick={() => setPage((p) => p - 1)}>← Prev</button>
          <span>Page {page + 1} of {Math.ceil(total / limit)}</span>
          <button disabled={(page + 1) * limit >= total} onClick={() => setPage((p) => p + 1)}>Next →</button>
        </div>
      )}
    </div>
  )
}
