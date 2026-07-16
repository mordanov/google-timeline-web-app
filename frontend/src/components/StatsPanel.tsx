import { Stat } from '../services/api'
import { MODE_COLORS } from '../constants/colors'

interface Props {
  stats: Stat[]
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

export default function StatsPanel({ stats }: Props) {
  if (stats.length === 0) {
    return (
      <div style={{ padding: '12px', color: '#888', fontSize: '13px' }}>
        No activity data
      </div>
    )
  }

  return (
    <div style={{ padding: '8px', fontSize: '13px' }}>
      <div style={{ fontWeight: 600, marginBottom: '6px' }}>Activity Summary</div>
      {stats.map((s) => (
        <div key={s.transport_mode_group} style={{ display: 'flex', alignItems: 'center', marginBottom: '4px', gap: '8px' }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: MODE_COLORS[s.transport_mode_group] ?? '#9E9E9E', flexShrink: 0 }} />
          <span style={{ textTransform: 'capitalize', minWidth: '60px' }}>{s.transport_mode_group}</span>
          <span style={{ color: '#555' }}>{formatDistance(s.total_distance_meters)}</span>
          <span style={{ color: '#999' }}>{formatDuration(s.total_duration_seconds)}</span>
        </div>
      ))}
    </div>
  )
}
