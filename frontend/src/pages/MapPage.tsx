import { useEffect, useState } from 'react'
import {
  Box, Typography, Divider, Button, CircularProgress,
  Paper,
} from '@mui/material'
import UploadFileIcon from '@mui/icons-material/UploadFile'
import HistoryIcon from '@mui/icons-material/History'
import { getSegments, getStats, Segment, Stat } from '../services/api'
import TrackMap from '../components/TrackMap'
import DatePicker from '../components/DatePicker'
import StatsPanel from '../components/StatsPanel'
import UploadForm from '../components/UploadForm'

const MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? ''

export default function MapPage() {
  const today = new Date().toISOString().slice(0, 10)
  const [viewMode, setViewMode] = useState<'single-day' | 'date-range'>('single-day')
  const [dateParam, setDateParam] = useState<{ date?: string; date_from?: string; date_to?: string }>({ date: today })
  const [segments, setSegments] = useState<Segment[]>([])
  const [stats, setStats] = useState<Stat[]>([])
  const [loading, setLoading] = useState(false)
  const [showUpload, setShowUpload] = useState(false)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      getSegments(dateParam),
      getStats(dateParam),
    ]).then(([segs, sts]) => {
      setSegments(segs.segments)
      setStats(sts.stats)
    }).catch(console.error).finally(() => setLoading(false))
  }, [JSON.stringify(dateParam)])

  function handleDateChange(date: string) {
    setViewMode('single-day')
    setDateParam({ date })
  }

  function handleRangeChange(from: string, to: string) {
    setViewMode('date-range')
    setDateParam({ date_from: from, date_to: to })
  }

  const noData = !loading && segments.length === 0

  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Sidebar */}
      <Box sx={{
        width: 272,
        flexShrink: 0,
        borderRight: 1,
        borderColor: 'divider',
        overflowY: 'auto',
        bgcolor: 'background.paper',
        display: 'flex',
        flexDirection: 'column',
      }}>
        <Box sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="subtitle1" fontWeight={600}>Timeline Viewer</Typography>
        </Box>

        <DatePicker onDateChange={handleDateChange} onRangeChange={handleRangeChange} />

        <Divider />
        <StatsPanel stats={stats} />

        <Divider />
        <Box sx={{ p: 1.5 }}>
          <Button
            fullWidth
            variant={showUpload ? 'contained' : 'outlined'}
            size="small"
            startIcon={<UploadFileIcon />}
            onClick={() => setShowUpload(!showUpload)}
          >
            {showUpload ? 'Hide Upload' : 'Upload Timeline File'}
          </Button>
          {showUpload && <Box sx={{ mt: 1 }}><UploadForm /></Box>}
        </Box>

        <Divider />
        <Box sx={{ p: 1.5 }}>
          <Button
            fullWidth
            variant="text"
            size="small"
            startIcon={<HistoryIcon />}
            href="/audit"
          >
            Import History
          </Button>
        </Box>
      </Box>

      {/* Map area */}
      <Box sx={{ flex: 1, position: 'relative' }}>
        {loading && (
          <Paper elevation={2} sx={{
            position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
            px: 2, py: 0.75, zIndex: 10, display: 'flex', alignItems: 'center', gap: 1,
          }}>
            <CircularProgress size={14} />
            <Typography variant="caption">Loading…</Typography>
          </Paper>
        )}
        {noData && (
          <Paper elevation={3} sx={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            px: 3, py: 2, zIndex: 10, textAlign: 'center',
          }}>
            <Typography variant="body2" color="text.secondary">No data for this date</Typography>
          </Paper>
        )}
        <TrackMap segments={segments} viewMode={viewMode} apiKey={MAPS_API_KEY} />
      </Box>
    </Box>
  )
}
