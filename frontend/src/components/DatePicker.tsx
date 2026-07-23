import { useState } from 'react'
import { Box, ToggleButton, ToggleButtonGroup, TextField, Typography, Button } from '@mui/material'
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
    update({ mode: value })
  }

  function handleApply() {
    if (state.mode === 'single') {
      onDateChange(state.date)
    } else if (state.dateFrom && state.dateTo) {
      onRangeChange(state.dateFrom, state.dateTo)
    }
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
          onChange={(e) => update({ date: e.target.value })}
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
            onChange={(e) => update({ dateFrom: e.target.value })}
            size="small"
            fullWidth
            InputLabelProps={{ shrink: true }}
          />
          <Typography variant="caption" align="center" color="text.secondary">{tr.to}</Typography>
          <TextField
            type="date"
            label={tr.to}
            value={state.dateTo}
            onChange={(e) => update({ dateTo: e.target.value })}
            size="small"
            fullWidth
            InputLabelProps={{ shrink: true }}
          />
        </Box>
      )}

      <Button variant="contained" size="small" fullWidth onClick={handleApply}>
        {tr.apply}
      </Button>
    </Box>
  )
}
