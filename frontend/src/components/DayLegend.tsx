import { Box, Typography } from '@mui/material'
import { DAY_PALETTE } from '../constants/colors'

interface Props {
  days: string[]
}

export default function DayLegend({ days }: Props) {
  if (days.length === 0) return null
  return (
    <Box sx={{ p: 1.5 }}>
      <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
        Days
      </Typography>
      <Box sx={{ mt: 0.75, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        {days.map((day, i) => (
          <Box key={day} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 10, height: 10, bgcolor: DAY_PALETTE[i % DAY_PALETTE.length], borderRadius: '2px', flexShrink: 0 }} />
            <Typography variant="caption">{day}</Typography>
          </Box>
        ))}
      </Box>
    </Box>
  )
}
