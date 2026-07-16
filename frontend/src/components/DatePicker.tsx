import { useState } from 'react'

interface Props {
  onDateChange: (date: string) => void
  onRangeChange: (from: string, to: string) => void
}

export default function DatePicker({ onDateChange, onRangeChange }: Props) {
  const [mode, setMode] = useState<'single' | 'range'>('single')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [dateFrom, setDateFrom] = useState(new Date().toISOString().slice(0, 10))
  const [dateTo, setDateTo] = useState(new Date().toISOString().slice(0, 10))

  function handleSingleChange(v: string) {
    setDate(v)
    onDateChange(v)
  }

  function handleRangeChange(from: string, to: string) {
    if (from && to) onRangeChange(from, to)
  }

  return (
    <div style={{ padding: '8px', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px' }}>
      <div style={{ display: 'flex', gap: '8px' }}>
        <label>
          <input type="radio" value="single" checked={mode === 'single'} onChange={() => { setMode('single'); onDateChange(date) }} /> Single day
        </label>
        <label>
          <input type="radio" value="range" checked={mode === 'range'} onChange={() => { setMode('range'); handleRangeChange(dateFrom, dateTo) }} /> Date range
        </label>
      </div>

      {mode === 'single' && (
        <input type="date" value={date} onChange={(e) => handleSingleChange(e.target.value)} />
      )}

      {mode === 'range' && (
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); handleRangeChange(e.target.value, dateTo) }} />
          <span>to</span>
          <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); handleRangeChange(dateFrom, e.target.value) }} />
        </div>
      )}
    </div>
  )
}
