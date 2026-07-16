import { useRef, useState } from 'react'
import { Box, Button, Typography, LinearProgress, Alert } from '@mui/material'
import CloudUploadIcon from '@mui/icons-material/CloudUpload'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'
import { uploadFile, getImportStatus, ImportRecord } from '../services/api'

export default function UploadForm() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState<'idle' | 'uploading' | 'polling' | 'done' | 'error'>('idle')
  const [record, setRecord] = useState<ImportRecord | null>(null)
  const [error, setError] = useState('')
  const [fileName, setFileName] = useState('')

  const busy = status === 'uploading' || status === 'polling'

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
    <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      <Button
        component="label"
        variant="outlined"
        size="small"
        startIcon={<CloudUploadIcon />}
        fullWidth
        disabled={busy}
      >
        {fileName || 'Choose file…'}
        <input
          ref={inputRef}
          type="file"
          accept=".json"
          required
          hidden
          onChange={(e) => setFileName(e.target.files?.[0]?.name ?? '')}
        />
      </Button>

      <Button
        type="submit"
        variant="contained"
        size="small"
        fullWidth
        disabled={busy || !fileName}
      >
        {status === 'uploading' ? 'Uploading…' : status === 'polling' ? 'Processing…' : 'Import'}
      </Button>

      {busy && <LinearProgress sx={{ borderRadius: 1 }} />}

      {status === 'done' && record && (
        <Alert
          severity={record.outcome === 'imported' ? 'success' : record.outcome === 'no_changes' ? 'info' : 'error'}
          icon={record.outcome === 'imported' ? <CheckCircleOutlineIcon fontSize="small" /> : undefined}
          sx={{ py: 0, fontSize: 12 }}
        >
          {record.outcome === 'imported' && `Imported ${record.segments_imported ?? 0} segments`}
          {record.outcome === 'no_changes' && 'No new data (already imported)'}
          {record.outcome === 'failed' && `Failed: ${record.error_message}`}
        </Alert>
      )}

      {status === 'error' && (
        <Alert severity="error" sx={{ py: 0, fontSize: 12 }}>{error}</Alert>
      )}
    </Box>
  )
}
