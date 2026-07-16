import { DAY_PALETTE } from '../constants/colors'

interface Props {
  days: string[]
}

export default function DayLegend({ days }: Props) {
  if (days.length === 0) return null
  return (
    <div style={{ padding: '8px', fontSize: '12px' }}>
      <div style={{ fontWeight: 600, marginBottom: '4px' }}>Days</div>
      {days.map((day, i) => (
        <div key={day} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
          <div style={{ width: 10, height: 10, background: DAY_PALETTE[i % DAY_PALETTE.length], borderRadius: '2px', flexShrink: 0 }} />
          <span>{day}</span>
        </div>
      ))}
    </div>
  )
}
