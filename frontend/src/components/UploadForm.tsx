import { useRef, useState } from 'react'
import { uploadFile, getImportStatus, ImportRecord } from '../services/api'

export default function UploadForm() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState<'idle' | 'uploading' | 'polling' | 'done' | 'error'>('idle')
  const [record, setRecord] = useState<ImportRecord | null>(null)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const file = inputRef.current?.files?.[0]
    if (!file) return

    setStatus('uploading')
    setError('')
    setRecord(null)

    try {
      const { import_record_id } = await uploadFile(file)
      setStatus('polling')

      // Poll until outcome is set
      const poll = async () => {
        const rec = await getImportStatus(import_record_id)
        setRecord(rec)
        if (rec.outcome === null) {
          setTimeout(poll, 2000)
        } else {
          setStatus('done')
        }
      }
      await poll()
    } catch (err: unknown) {
      setStatus('error')
      setError(err instanceof Error ? err.message : 'Upload failed')
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ padding: '12px', fontSize: '13px' }}>
      <div style={{ fontWeight: 600, marginBottom: '8px' }}>Upload Timeline JSON</div>
      <input ref={inputRef} type="file" accept=".json" required />
      <button type="submit" disabled={status === 'uploading' || status === 'polling'} style={{ marginLeft: '8px' }}>
        {status === 'uploading' ? 'Uploading…' : status === 'polling' ? 'Processing…' : 'Upload'}
      </button>

      {status === 'done' && record && (
        <div style={{ marginTop: '8px', color: record.outcome === 'imported' ? '#34A853' : record.outcome === 'no_changes' ? '#888' : '#E63946' }}>
          {record.outcome === 'imported' && `✓ Imported ${record.segments_imported ?? 0} segments`}
          {record.outcome === 'no_changes' && '— No new data (file already imported)'}
          {record.outcome === 'failed' && `✗ Failed: ${record.error_message}`}
        </div>
      )}

      {status === 'error' && (
        <div style={{ marginTop: '8px', color: '#E63946' }}>✗ {error}</div>
      )}
    </form>
  )
}
