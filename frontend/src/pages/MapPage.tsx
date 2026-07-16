import { useEffect, useState } from 'react'
import { getSegments, getStats, Segment, Stat } from '../services/api'
import TrackMap from '../components/TrackMap'
import DatePicker from '../components/DatePicker'
import StatsPanel from '../components/StatsPanel'
import UploadForm from '../components/UploadForm'

const MAPS_API_KEY = (import.meta as Record<string, unknown>).env
  ? (import.meta as { env: Record<string, string> }).env.VITE_GOOGLE_MAPS_API_KEY ?? ''
  : ''

export default function MapPage() {
  const today = new Date().toISOString().slice(0, 10)
  const [viewMode, setViewMode] = useState<'single-day' | 'date-range'>('single-day')
  const [dateParam, setDateParam] = useState<{ date?: string; date_from?: string; date_to?: string }>({ date: today })
  const [segments, setSegments] = useState<Segment[]>([])
  const [stats, setStats] = useState<Stat[]>([])
  const [loading, setLoading] = useState(false)
  const [showUpload, setShowUpload] = useState(false)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      getSegments(dateParam),
      getStats(dateParam),
    ]).then(([segs, sts]) => {
      setSegments(segs.segments)
      setStats(sts.stats)
    }).catch(console.error).finally(() => setLoading(false))
  }, [JSON.stringify(dateParam)])

  function handleDateChange(date: string) {
    setViewMode('single-day')
    setDateParam({ date })
  }

  function handleRangeChange(from: string, to: string) {
    setViewMode('date-range')
    setDateParam({ date_from: from, date_to: to })
  }

  const noData = !loading && segments.length === 0

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Sidebar */}
      <div style={{ width: '260px', flexShrink: 0, borderRight: '1px solid #e0e0e0', overflowY: 'auto', background: '#fafafa' }}>
        <div style={{ padding: '12px', borderBottom: '1px solid #e0e0e0', fontWeight: 600, fontSize: '15px' }}>
          Timeline Viewer
        </div>

        <DatePicker onDateChange={handleDateChange} onRangeChange={handleRangeChange} />

        <div style={{ borderTop: '1px solid #e0e0e0' }}>
          <StatsPanel stats={stats} />
        </div>

        <div style={{ borderTop: '1px solid #e0e0e0', padding: '8px' }}>
          <button onClick={() => setShowUpload(!showUpload)} style={{ fontSize: '12px', background: 'none', border: '1px solid #ccc', borderRadius: '3px', padding: '4px 8px', cursor: 'pointer' }}>
            {showUpload ? 'Hide Upload' : 'Upload Timeline File'}
          </button>
          {showUpload && <UploadForm />}
        </div>

        <div style={{ borderTop: '1px solid #e0e0e0', padding: '8px' }}>
          <a href="/audit" style={{ fontSize: '12px', color: '#4285F4' }}>View Import History →</a>
        </div>
      </div>

      {/* Map area */}
      <div style={{ flex: 1, position: 'relative' }}>
        {loading && (
          <div style={{ position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)', background: 'white', padding: '6px 12px', borderRadius: '4px', boxShadow: '0 1px 4px rgba(0,0,0,.2)', zIndex: 10, fontSize: '13px' }}>
            Loading…
          </div>
        )}
        {noData && (
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: 'white', padding: '16px 24px', borderRadius: '6px', boxShadow: '0 2px 8px rgba(0,0,0,.2)', zIndex: 10, fontSize: '14px', textAlign: 'center' }}>
            No data for this date
          </div>
        )}
        <TrackMap segments={segments} viewMode={viewMode} apiKey={MAPS_API_KEY} />
      </div>
    </div>
  )
}
