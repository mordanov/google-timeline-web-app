import { useState } from 'react'
import { Box, ToggleButton, ToggleButtonGroup, TextField, Typography } from '@mui/material'

interface Props {
  onDateChange: (date: string) => void
  onRangeChange: (from: string, to: string) => void
}

export default function DatePicker({ onDateChange, onRangeChange }: Props) {
  const [mode, setMode] = useState<'single' | 'range'>('single')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [dateFrom, setDateFrom] = useState(new Date().toISOString().slice(0, 10))
  const [dateTo, setDateTo] = useState(new Date().toISOString().slice(0, 10))

  function handleModeChange(_: React.MouseEvent, value: 'single' | 'range' | null) {
    if (!value) return
    setMode(value)
    if (value === 'single') onDateChange(date)
    else if (dateFrom && dateTo) onRangeChange(dateFrom, dateTo)
  }

  function handleSingleChange(v: string) {
    setDate(v)
    onDateChange(v)
  }

  function handleRangeChange(from: string, to: string) {
    if (from && to) onRangeChange(from, to)
  }

  return (
    <Box sx={{ p: 1.5, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <ToggleButtonGroup
        value={mode}
        exclusive
        onChange={handleModeChange}
        size="small"
        fullWidth
      >
        <ToggleButton value="single" sx={{ textTransform: 'none', fontSize: 12 }}>Single day</ToggleButton>
        <ToggleButton value="range" sx={{ textTransform: 'none', fontSize: 12 }}>Date range</ToggleButton>
      </ToggleButtonGroup>

      {mode === 'single' && (
        <TextField
          type="date"
          value={date}
          onChange={(e) => handleSingleChange(e.target.value)}
          size="small"
          fullWidth
        />
      )}

      {mode === 'range' && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <TextField
            type="date"
            label="From"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); handleRangeChange(e.target.value, dateTo) }}
            size="small"
            fullWidth
            InputLabelProps={{ shrink: true }}
          />
          <Typography variant="caption" align="center" color="text.secondary">to</Typography>
          <TextField
            type="date"
            label="To"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); handleRangeChange(dateFrom, e.target.value) }}
            size="small"
            fullWidth
            InputLabelProps={{ shrink: true }}
          />
        </Box>
      )}
    </Box>
  )
}
