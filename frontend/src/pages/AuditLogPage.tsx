import { useEffect, useState } from 'react'
import {
  Box, Typography, Table, TableHead, TableBody, TableRow, TableCell,
  TableContainer, Paper, Chip, Button, Pagination,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import { getImportHistory, ImportRecord } from '../services/api'

const outcomeChip = (o: string | null) => {
  if (o === 'imported') return <Chip label="imported" size="small" color="success" />
  if (o === 'no_changes') return <Chip label="no changes" size="small" />
  if (o === 'failed') return <Chip label="failed" size="small" color="error" />
  return <Chip label="processing…" size="small" color="warning" />
}

export default function AuditLogPage() {
  const [records, setRecords] = useState<ImportRecord[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const limit = 20

  useEffect(() => {
    getImportHistory(limit, (page - 1) * limit).then((data) => {
      setRecords(data.records)
      setTotal(data.total)
    })
  }, [page])

  return (
    <Box sx={{ p: 3, maxWidth: 960, mx: 'auto' }}>
      <Button href="/" startIcon={<ArrowBackIcon />} sx={{ mb: 2 }}>Back to map</Button>
      <Typography variant="h6" fontWeight={600} mb={2}>Import History ({total})</Typography>

      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow sx={{ '& th': { fontWeight: 600, bgcolor: 'grey.50' } }}>
              <TableCell>Time</TableCell>
              <TableCell>Source</TableCell>
              <TableCell>File</TableCell>
              <TableCell>Outcome</TableCell>
              <TableCell align="right">Segments</TableCell>
              <TableCell>Error</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {records.map((r) => (
              <TableRow key={r.id} hover>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>{new Date(r.triggered_at).toLocaleString()}</TableCell>
                <TableCell>{r.trigger_source}</TableCell>
                <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {r.file_identifier}
                </TableCell>
                <TableCell>{outcomeChip(r.outcome)}</TableCell>
                <TableCell align="right">{r.segments_imported ?? '—'}</TableCell>
                <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'error.main' }}>
                  {r.error_message ?? ''}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {total > limit && (
        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
          <Pagination
            count={Math.ceil(total / limit)}
            page={page}
            onChange={(_, v) => setPage(v)}
            color="primary"
            size="small"
          />
        </Box>
      )}
    </Box>
  )
}
