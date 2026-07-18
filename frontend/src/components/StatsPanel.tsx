import { Box, Typography } from '@mui/material'
import { Stat } from '../services/api'
import { MODE_COLORS } from '../constants/colors'
import { Lang, t } from '../i18n'

interface Props {
  stats: Stat[]
  lang: Lang
}

function formatDistance(m: number): string {
  if (m >= 1000) return `${(m / 1000).toFixed(1)} km`
  return `${Math.round(m)} m`
}

function formatDuration(s: number): string {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

export default function StatsPanel({ stats, lang }: Props) {
  const tr = t(lang)

  if (stats.length === 0) {
    return (
      <Box sx={{ px: 2, py: 1.5 }}>
        <Typography variant="caption" color="text.secondary">{tr.noActivityData}</Typography>
      </Box>
    )
  }

  return (
    <Box sx={{ px: 2, py: 1.5 }}>
      <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {tr.activitySummary}
      </Typography>
      <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
        {stats.map((s) => (
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
    </Box>
  )
}
