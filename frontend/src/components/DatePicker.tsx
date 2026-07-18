import { useState } from 'react'
import { Box, ToggleButton, ToggleButtonGroup, TextField, Typography } from '@mui/material'
import { Lang, t } from '../i18n'

const STORAGE_KEY = 'timeline_date_state'

interface StoredState {
  mode: 'single' | 'range'
  date: string
  dateFrom: string
  dateTo: string
}

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

function loadState(): StoredState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as StoredState
  } catch {}
  const d = today()
  return { mode: 'single', date: d, dateFrom: d, dateTo: d }
}

function saveState(s: StoredState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s))
}

interface Props {
  onDateChange: (date: string) => void
  onRangeChange: (from: string, to: string) => void
  lang: Lang
}

export default function DatePicker({ onDateChange, onRangeChange, lang }: Props) {
  const [state, setState] = useState<StoredState>(() => {
    const s = loadState()
    // Trigger initial load
    setTimeout(() => {
      if (s.mode === 'single') onDateChange(s.date)
      else onRangeChange(s.dateFrom, s.dateTo)
    }, 0)
    return s
  })

  const tr = t(lang)

  function update(patch: Partial<StoredState>) {
    const next = { ...state, ...patch }
    setState(next)
    saveState(next)
    return next
  }

  function handleModeChange(_: React.MouseEvent, value: 'single' | 'range' | null) {
    if (!value) return
    const next = update({ mode: value })
    if (value === 'single') onDateChange(next.date)
    else onRangeChange(next.dateFrom, next.dateTo)
  }

  function handleSingleChange(v: string) {
    update({ date: v })
    onDateChange(v)
  }

  function handleFromChange(v: string) {
    const next = update({ dateFrom: v })
    if (v && next.dateTo) onRangeChange(v, next.dateTo)
  }

  function handleToChange(v: string) {
    const next = update({ dateTo: v })
    if (next.dateFrom && v) onRangeChange(next.dateFrom, v)
  }

  return (
    <Box sx={{ p: 1.5, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <ToggleButtonGroup
        value={state.mode}
        exclusive
        onChange={handleModeChange}
        size="small"
        fullWidth
      >
        <ToggleButton value="single" sx={{ textTransform: 'none', fontSize: 12 }}>{tr.singleDay}</ToggleButton>
        <ToggleButton value="range" sx={{ textTransform: 'none', fontSize: 12 }}>{tr.dateRange}</ToggleButton>
      </ToggleButtonGroup>

      {state.mode === 'single' && (
        <TextField
          type="date"
          value={state.date}
          onChange={(e) => handleSingleChange(e.target.value)}
          size="small"
          fullWidth
        />
      )}

      {state.mode === 'range' && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <TextField
            type="date"
            label={tr.from}
            value={state.dateFrom}
            onChange={(e) => handleFromChange(e.target.value)}
            size="small"
            fullWidth
            InputLabelProps={{ shrink: true }}
          />
          <Typography variant="caption" align="center" color="text.secondary">{tr.to}</Typography>
          <TextField
            type="date"
            label={tr.to}
            value={state.dateTo}
            onChange={(e) => handleToChange(e.target.value)}
            size="small"
            fullWidth
            InputLabelProps={{ shrink: true }}
          />
        </Box>
      )}
    </Box>
  )
}
