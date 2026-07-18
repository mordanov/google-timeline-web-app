import { useEffect, useRef } from 'react'
import { APIProvider, Map, Polyline, useMap } from '@vis.gl/react-google-maps'
import { Segment } from '../services/api'
import { MODE_COLORS, DAY_PALETTE } from '../constants/colors'
import DayLegend from './DayLegend'
import { Lang } from '../i18n'

interface Props {
  segments: Segment[]
  viewMode: 'single-day' | 'date-range'
  apiKey: string
  showTimestamps: boolean
  lang: Lang
}

function getSegmentColor(seg: Segment, viewMode: string, dayIndex: number): string {
  if (viewMode === 'date-range') return DAY_PALETTE[dayIndex % DAY_PALETTE.length]
  return MODE_COLORS[seg.transport_mode_group ?? 'other'] ?? '#9E9E9E'
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function FitBounds({ segments }: { segments: Segment[] }) {
  const map = useMap()
  const fitted = useRef<string>('')

  useEffect(() => {
    if (!map) return
    const allPoints = segments.flatMap((s) => s.path_points ?? [])
    if (allPoints.length === 0) return
    const key = allPoints.map((p) => `${p.lat},${p.lng}`).join('|')
    if (key === fitted.current) return
    fitted.current = key
    const bounds = new google.maps.LatLngBounds()
    allPoints.forEach((p) => bounds.extend({ lat: p.lat, lng: p.lng }))
    map.fitBounds(bounds, 40)
  }, [map, segments])

  return null
}

function TimestampMarkers({ segments, color }: { segments: Segment[]; color: string }) {
  const map = useMap()
  const overlaysRef = useRef<google.maps.OverlayView[]>([])

  useEffect(() => {
    overlaysRef.current.forEach((o) => o.setMap(null))
    overlaysRef.current = []
    if (!map) return

    segments.forEach((seg) => {
      const points = seg.path_points
      if (!points || points.length === 0) return

      const step = Math.max(1, Math.floor(points.length / 4))
      const indices = new Set<number>([0, points.length - 1])
      for (let i = step; i < points.length - 1; i += step) indices.add(i)

      indices.forEach((idx) => {
        const p = points[idx]
        if (!p.ts) return

        const overlay = new google.maps.OverlayView()
        let dot: HTMLDivElement | null = null
        let label: HTMLDivElement | null = null

        overlay.onAdd = function () {
          const panes = this.getPanes()!

          dot = document.createElement('div')
          dot.style.cssText = `position:absolute;width:10px;height:10px;background:${color};border:2px solid #fff;border-radius:50%;transform:translate(-50%,-50%);pointer-events:none;box-shadow:0 1px 3px rgba(0,0,0,.4);`
          panes.overlayMouseTarget.appendChild(dot)

          label = document.createElement('div')
          label.style.cssText = `position:absolute;background:${color};color:#fff;font-size:10px;font-family:sans-serif;padding:1px 4px;border-radius:3px;white-space:nowrap;pointer-events:none;transform:translate(-50%,-130%);box-shadow:0 1px 3px rgba(0,0,0,.4);`
          label.textContent = formatTime(p.ts)
          panes.floatPane.appendChild(label)
        }

        overlay.draw = function () {
          const proj = this.getProjection()
          const pos = proj.fromLatLngToDivPixel(new google.maps.LatLng(p.lat, p.lng))
          if (!pos) return
          if (dot) { dot.style.left = `${pos.x}px`; dot.style.top = `${pos.y}px` }
          if (label) { label.style.left = `${pos.x}px`; label.style.top = `${pos.y}px` }
        }

        overlay.onRemove = function () {
          dot?.parentNode?.removeChild(dot)
          label?.parentNode?.removeChild(label)
          dot = null
          label = null
        }

        overlay.setMap(map as unknown as google.maps.Map)
        overlaysRef.current.push(overlay)
      })
    })

    return () => {
      overlaysRef.current.forEach((o) => o.setMap(null))
      overlaysRef.current = []
    }
  }, [map, segments, color])

  return null
}

export default function TrackMap({ segments, viewMode, apiKey, showTimestamps }: Props) {
  const days = [...new Set(segments.map((s) => s.calendar_date))].sort()
  const dayIndex = Object.fromEntries(days.map((d, i) => [d, i]))
  const hasData = segments.some((s) => s.path_points && s.path_points.length > 0)
  const defaultCenter = { lat: 55.7558, lng: 37.6173 }
  const activitySegments = segments.filter((s) => s.path_points && s.path_points.length >= 2)

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <APIProvider apiKey={apiKey}>
        <Map
          defaultCenter={defaultCenter}
          defaultZoom={hasData ? 13 : 5}
          gestureHandling="greedy"
          disableDefaultUI={false}
          style={{ width: '100%', height: '100%' }}
        >
          <FitBounds segments={activitySegments} />

          {activitySegments.map((seg) => {
            const color = getSegmentColor(seg, viewMode, dayIndex[seg.calendar_date] ?? 0)
            return (
              <Polyline
                key={seg.id}
                path={seg.path_points!.map((p) => ({ lat: p.lat, lng: p.lng }))}
                strokeColor={color}
                strokeWeight={5}
                strokeOpacity={0.95}
                geodesic
              />
            )
          })}

          {showTimestamps && activitySegments.map((seg) => (
            <TimestampMarkers
              key={`ts-${seg.id}`}
              segments={[seg]}
              color={getSegmentColor(seg, viewMode, dayIndex[seg.calendar_date] ?? 0)}
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
