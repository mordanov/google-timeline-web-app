import { useEffect, useState, useCallback } from 'react'
import {
  Box, Typography, Divider, Button, CircularProgress,
  Paper, Switch, FormControlLabel, ToggleButton, ToggleButtonGroup,
  IconButton, Drawer, useMediaQuery, useTheme,
} from '@mui/material'
import MenuIcon from '@mui/icons-material/Menu'
import CloseIcon from '@mui/icons-material/Close'
import UploadFileIcon from '@mui/icons-material/UploadFile'
import HistoryIcon from '@mui/icons-material/History'
import BarChartIcon from '@mui/icons-material/BarChart'
import { getSegments, getStats, getLocationStatus, Segment, Stat } from '../services/api'
import TrackMap from '../components/TrackMap'
import DatePicker from '../components/DatePicker'
import StatsPanel from '../components/StatsPanel'
import UploadForm from '../components/UploadForm'
import AllTimeStatsModal from '../components/AllTimeStatsModal'
import { getLang, setLang, t, Lang } from '../i18n'

const MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? ''

function formatDateTime(iso: string | null, lang: Lang, never: string): string {
  if (!iso) return never
  const d = new Date(iso)
  return d.toLocaleString(lang === 'ru' ? 'ru-RU' : 'en-GB', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function MapPage() {
  const [lang, setLangState] = useState<Lang>(getLang)
  const [viewMode, setViewMode] = useState<'single-day' | 'date-range'>('single-day')
  const [dateParam, setDateParam] = useState<{ date?: string; date_from?: string; date_to?: string }>({})
  const [segments, setSegments] = useState<Segment[]>([])
  const [stats, setStats] = useState<Stat[]>([])
  const [loading, setLoading] = useState(false)
  const [showUpload, setShowUpload] = useState(false)
  const [showAlltimeStats, setShowAlltimeStats] = useState(false)
  const [showTimestamps, setShowTimestamps] = useState(() => localStorage.getItem('timeline_show_timestamps') === 'true')
  const [status, setStatus] = useState<{ max_tracking_date: string | null; last_sync_at: string | null }>({
    max_tracking_date: null,
    last_sync_at: null,
  })

  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile)

  const tr = t(lang)

  const fetchData = useCallback((params: typeof dateParam) => {
    if (!params.date && !params.date_from) return
    setLoading(true)
    Promise.all([
      getSegments(params),
      getStats(params),
    ]).then(([segs, sts]) => {
      setSegments(segs.segments)
      setStats(sts.stats)
    }).catch(console.error).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    fetchData(dateParam)
  }, [JSON.stringify(dateParam), fetchData])

  useEffect(() => {
    getLocationStatus().then(setStatus).catch(console.error)
    const interval = setInterval(() => {
      getLocationStatus().then(setStatus).catch(console.error)
    }, 60_000)
    return () => clearInterval(interval)
  }, [])

  function handleDateChange(date: string) {
    setViewMode('single-day')
    setDateParam({ date })
    if (isMobile) setSidebarOpen(false)
  }

  function handleRangeChange(from: string, to: string) {
    setViewMode('date-range')
    setDateParam({ date_from: from, date_to: to })
    if (isMobile) setSidebarOpen(false)
  }

  function handleLangChange(_: React.MouseEvent, value: Lang | null) {
    if (!value) return
    setLang(value)
    setLangState(value)
  }

  const noData = !loading && segments.length === 0 && (dateParam.date || dateParam.date_from)

  const sidebarContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="subtitle1" fontWeight={600}>{tr.appTitle}</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <ToggleButtonGroup
            value={lang}
            exclusive
            onChange={handleLangChange}
            size="small"
          >
            <ToggleButton value="ru" sx={{ textTransform: 'none', fontSize: 11, px: 0.75, py: 0.25 }}>RU</ToggleButton>
            <ToggleButton value="en" sx={{ textTransform: 'none', fontSize: 11, px: 0.75, py: 0.25 }}>EN</ToggleButton>
          </ToggleButtonGroup>
          {isMobile && (
            <IconButton size="small" onClick={() => setSidebarOpen(false)}>
              <CloseIcon fontSize="small" />
            </IconButton>
          )}
        </Box>
      </Box>

      <Box sx={{ overflowY: 'auto', flex: 1 }}>
        <DatePicker onDateChange={handleDateChange} onRangeChange={handleRangeChange} lang={lang} />

        <Divider />
        <StatsPanel stats={stats} lang={lang} />

        <Divider />
        <Box sx={{ px: 2, py: 1 }}>
          <FormControlLabel
            control={
              <Switch
                checked={showTimestamps}
                onChange={(e) => {
                  setShowTimestamps(e.target.checked)
                  localStorage.setItem('timeline_show_timestamps', String(e.target.checked))
                }}
                size="small"
              />
            }
            label={<Typography variant="body2">{tr.timestampLabels}</Typography>}
          />
        </Box>

        <Divider />
        <Box sx={{ p: 1.5 }}>
          <Button
            fullWidth
            variant={showUpload ? 'contained' : 'outlined'}
            size="small"
            startIcon={<UploadFileIcon />}
            onClick={() => setShowUpload(!showUpload)}
          >
            {showUpload ? tr.hideUpload : tr.upload}
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
            {tr.importHistory}
          </Button>
        </Box>

        <Divider />
        <Box sx={{ p: 1.5 }}>
          <Button
            fullWidth
            variant="text"
            size="small"
            startIcon={<BarChartIcon />}
            onClick={() => setShowAlltimeStats(true)}
          >
            {tr.alltimeStats}
          </Button>
        </Box>
      </Box>
    </Box>
  )

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative' }}>

        {/* Desktop sidebar */}
        {!isMobile && (
          <>
            {sidebarOpen && (
              <Box sx={{
                width: 272,
                flexShrink: 0,
                borderRight: 1,
                borderColor: 'divider',
                bgcolor: 'background.paper',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
              }}>
                {sidebarContent}
              </Box>
            )}
            {/* Desktop toggle button */}
            <IconButton
              size="small"
              onClick={() => setSidebarOpen(v => !v)}
              sx={{
                position: 'absolute',
                top: 10,
                left: sidebarOpen ? 280 : 10,
                zIndex: 10,
                bgcolor: 'background.paper',
                border: 1,
                borderColor: 'divider',
                borderRadius: 1,
                '&:hover': { bgcolor: 'action.hover' },
              }}
            >
              <MenuIcon fontSize="small" />
            </IconButton>
          </>
        )}

        {/* Mobile drawer */}
        {isMobile && (
          <Drawer
            anchor="left"
            open={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
            PaperProps={{ sx: { width: 280 } }}
          >
            {sidebarContent}
          </Drawer>
        )}

        {/* Map area */}
        <Box sx={{ flex: 1, position: 'relative' }}>
          {/* Mobile hamburger */}
          {isMobile && !sidebarOpen && (
            <IconButton
              size="small"
              onClick={() => setSidebarOpen(true)}
              sx={{
                position: 'absolute',
                top: 10,
                left: 10,
                zIndex: 10,
                bgcolor: 'background.paper',
                border: 1,
                borderColor: 'divider',
                borderRadius: 1,
                '&:hover': { bgcolor: 'action.hover' },
              }}
            >
              <MenuIcon fontSize="small" />
            </IconButton>
          )}

          {loading && (
            <Paper elevation={2} sx={{
              position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
              px: 2, py: 0.75, zIndex: 10, display: 'flex', alignItems: 'center', gap: 1,
            }}>
              <CircularProgress size={14} />
              <Typography variant="caption">{tr.loading}</Typography>
            </Paper>
          )}
          {noData && (
            <Paper elevation={3} sx={{
              position: 'absolute', top: '50%', left: '50%',
              transform: 'translate(-50%, -50%)',
              px: 3, py: 2, zIndex: 10, textAlign: 'center',
            }}>
              <Typography variant="body2" color="text.secondary">{tr.noData}</Typography>
            </Paper>
          )}
          <TrackMap
            segments={segments}
            viewMode={viewMode}
            apiKey={MAPS_API_KEY}
            showTimestamps={showTimestamps}
            lang={lang}
          />
        </Box>
      </Box>

      <AllTimeStatsModal open={showAlltimeStats} onClose={() => setShowAlltimeStats(false)} lang={lang} />

      {/* Status bar */}
      <Box sx={{
        borderTop: 1,
        borderColor: 'divider',
        bgcolor: 'background.paper',
        px: 2,
        py: 0.5,
        display: 'flex',
        gap: 3,
        alignItems: 'center',
        flexShrink: 0,
        flexWrap: 'wrap',
      }}>
        <Typography variant="caption" color="text.secondary">
          {tr.lastSync}: <strong>{formatDateTime(status.last_sync_at, lang, tr.never)}</strong>
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {tr.maxTrackingDate}: <strong>{status.max_tracking_date ?? tr.never}</strong>
        </Typography>
      </Box>
    </Box>
  )
}
