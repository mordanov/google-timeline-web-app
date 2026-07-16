import { APIProvider, Map, Polyline } from '@vis.gl/react-google-maps'
import { Segment } from '../services/api'
import { MODE_COLORS, DAY_PALETTE } from '../constants/colors'
import DayLegend from './DayLegend'

interface Props {
  segments: Segment[]
  viewMode: 'single-day' | 'date-range'
  apiKey: string
}

function getSegmentColor(seg: Segment, viewMode: string, dayIndex: number): string {
  if (viewMode === 'date-range') {
    return DAY_PALETTE[dayIndex % DAY_PALETTE.length]
  }
  return MODE_COLORS[seg.transport_mode_group ?? 'other'] ?? '#9E9E9E'
}

export default function TrackMap({ segments, viewMode, apiKey }: Props) {
  // Build sorted unique day list for date-range coloring
  const days = [...new Set(segments.map((s) => s.calendar_date))].sort()
  const dayIndex = Object.fromEntries(days.map((d, i) => [d, i]))

  // Default center — will auto-fit if segments exist
  const defaultCenter = { lat: 48.8566, lng: 2.3522 }
  const hasData = segments.some((s) => s.path_points && s.path_points.length > 0)

  const firstPoint = segments.find((s) => s.path_points && s.path_points.length > 0)?.path_points?.[0]
  const center = firstPoint ? { lat: firstPoint.lat, lng: firstPoint.lng } : defaultCenter

  // Place visit markers as tiny circles (represented as very short polylines)
  const placeSegments = segments.filter((s) => s.segment_type === 'visit' && s.place_lat != null)

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <APIProvider apiKey={apiKey}>
        <Map
          defaultCenter={center}
          defaultZoom={hasData ? 13 : 5}
          gestureHandling="greedy"
          disableDefaultUI={false}
          style={{ width: '100%', height: '100%' }}
        >
          {segments
            .filter((s) => s.path_points && s.path_points.length >= 2)
            .map((seg) => (
              <Polyline
                key={seg.id}
                path={seg.path_points!.map((p) => ({ lat: p.lat, lng: p.lng }))}
                strokeColor={getSegmentColor(seg, viewMode, dayIndex[seg.calendar_date] ?? 0)}
                strokeWeight={4}
                strokeOpacity={0.85}
                geodesic
              />
            ))}
        </Map>
      </APIProvider>

      {viewMode === 'date-range' && days.length > 0 && (
        <div style={{ position: 'absolute', top: 8, right: 8, background: 'white', borderRadius: 4, boxShadow: '0 1px 4px rgba(0,0,0,.3)' }}>
          <DayLegend days={days} />
        </div>
      )}
    </div>
  )
}
