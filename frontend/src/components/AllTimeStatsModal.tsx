import { useEffect, useState } from 'react'
import {
  Box, CircularProgress, Dialog, DialogContent, DialogTitle,
  Divider, IconButton, Table, TableBody, TableCell, TableHead, TableRow,
  Typography,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import { getAlltimeStats, AlltimeStats } from '../services/api'
import { MODE_COLORS } from '../constants/colors'
import { Lang, t } from '../i18n'

interface Props {
  open: boolean
  onClose: () => void
  lang: Lang
}

function formatDistance(m: number): string {
  if (m >= 1000) return `${(m / 1000).toFixed(1)} km`
  return `${Math.round(m)} m`
}

function formatDuration(s: number): string {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  if (h >= 24) {
    const d = Math.floor(h / 24)
    const rh = h % 24
    return `${d}d ${rh}h`
  }
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

function formatMonth(ym: string): string {
  const [year, month] = ym.split('-')
  const d = new Date(Number(year), Number(month) - 1, 1)
  return d.toLocaleString('default', { month: 'long', year: 'numeric' })
}

function countryFlag(code: string): string {
  return code
    .toUpperCase()
    .replace(/./g, (c) => String.fromCodePoint(0x1f1e6 - 65 + c.charCodeAt(0)))
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <Typography variant="overline" fontWeight={700} color="text.secondary" sx={{ display: 'block', mt: 2.5, mb: 0.5 }}>
      {children}
    </Typography>
  )
}

export default function AllTimeStatsModal({ open, onClose, lang }: Props) {
  const [data, setData] = useState<AlltimeStats | null>(null)
  const [loading, setLoading] = useState(false)
  const tr = t(lang)
  const at = tr.alltime

  useEffect(() => {
    if (!open) return
    setLoading(true)
    getAlltimeStats()
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [open])

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth scroll="paper">
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
        {at.title}
        <IconButton size="small" onClick={onClose}><CloseIcon fontSize="small" /></IconButton>
      </DialogTitle>
      <Divider />
      <DialogContent>
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        )}

        {!loading && !data && (
          <Typography color="text.secondary">{at.noData}</Typography>
        )}

        {!loading && data && (
          <Box>
            {/* Overview */}
            <SectionTitle>{at.overview}</SectionTitle>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 1.5 }}>
              <StatCard label={at.totalDays} value={String(data.total_days)} />
              {data.first_date && data.last_date && (
                <StatCard label={at.period} value={`${data.first_date} – ${data.last_date}`} small />
              )}
              <StatCard label={at.longestStreak} value={`${data.longest_streak_days} ${at.days}`} />
              <StatCard label={at.uniquePlaces} value={String(data.unique_places)} />
              {data.total_transit_seconds > 0 && (
                <StatCard label={at.totalTransitTime} value={formatDuration(data.total_transit_seconds)} />
              )}
              {data.longest_day && (
                <StatCard
                  label={at.longestDay}
                  value={formatDistance(data.longest_day.distance_meters)}
                  sub={data.longest_day.date}
                />
              )}
              {data.most_active_month && (
                <StatCard
                  label={at.mostActiveMonth}
                  value={formatMonth(data.most_active_month.month)}
                  sub={formatDistance(data.most_active_month.distance_meters)}
                />
              )}
            </Box>

            {/* Transport */}
            {data.transport.length > 0 && (
              <>
                <SectionTitle>{at.transport}</SectionTitle>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                  {data.transport.map((s) => (
                    <Box key={s.transport_mode_group} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{
                        width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
                        bgcolor: MODE_COLORS[s.transport_mode_group] ?? '#9E9E9E',
                      }} />
                      <Typography variant="body2" sx={{ flex: 1 }}>
                        {tr.modes[s.transport_mode_group as keyof typeof tr.modes] ?? s.transport_mode_group}
                      </Typography>
                      <Typography variant="body2" fontWeight={500}>
                        {formatDistance(s.total_distance_meters)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {formatDuration(s.total_duration_seconds)}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </>
            )}

            {/* Countries */}
            {data.countries.length > 0 && (
              <>
                <SectionTitle>{at.countries} ({data.countries.length})</SectionTitle>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell></TableCell>
                      <TableCell>{at.firstVisit}</TableCell>
                      <TableCell>{at.lastVisit}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.countries.map((c) => (
                      <TableRow key={c.country_code} hover>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <span style={{ fontSize: 18 }}>{countryFlag(c.country_code)}</span>
                            <Typography variant="body2">{c.country || c.country_code}</Typography>
                          </Box>
                        </TableCell>
                        <TableCell><Typography variant="body2">{c.first_visit}</Typography></TableCell>
                        <TableCell><Typography variant="body2">{c.last_visit}</Typography></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </>
            )}

            {/* Cities */}
            {data.cities.length > 0 && (
              <>
                <SectionTitle>{at.cities} ({data.cities.length})</SectionTitle>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell></TableCell>
                      <TableCell align="right">{at.visits}</TableCell>
                      <TableCell align="right">{at.days}</TableCell>
                      <TableCell>{at.firstVisit}</TableCell>
                      <TableCell>{at.lastVisit}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.cities.map((c) => (
                      <TableRow key={`${c.city}-${c.country_code}`} hover>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                            <span style={{ fontSize: 14 }}>{countryFlag(c.country_code)}</span>
                            <Typography variant="body2">{c.city}</Typography>
                          </Box>
                        </TableCell>
                        <TableCell align="right"><Typography variant="body2">{c.visit_count}</Typography></TableCell>
                        <TableCell align="right"><Typography variant="body2">{c.day_count}</Typography></TableCell>
                        <TableCell><Typography variant="body2">{c.first_visit}</Typography></TableCell>
                        <TableCell><Typography variant="body2">{c.last_visit}</Typography></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </>
            )}
          </Box>
        )}
      </DialogContent>
    </Dialog>
  )
}

function StatCard({ label, value, sub, small }: { label: string; value: string; sub?: string; small?: boolean }) {
  return (
    <Box sx={{ bgcolor: 'action.hover', borderRadius: 1, p: 1.5 }}>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      <Typography variant={small ? 'body2' : 'h6'} fontWeight={600} lineHeight={1.2}>{value}</Typography>
      {sub && <Typography variant="caption" color="text.secondary">{sub}</Typography>}
    </Box>
  )
}
