import { useEffect, useRef } from 'react'
import { APIProvider, Map, Polyline, useMap } from '@vis.gl/react-google-maps'
import { Segment } from '../services/api'
import { MODE_COLORS, DAY_PALETTE } from '../constants/colors'
import DayLegend from './DayLegend'
import { Lang, t } from '../i18n'

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

interface FitBoundsProps {
  segments: Segment[]
}

function FitBounds({ segments }: FitBoundsProps) {
  const map = useMap()
  const fitted = useRef<string>('')

  useEffect(() => {
    if (!map) return
    const allPoints = segments.flatMap((s) => s.path_points ?? [])
    if (allPoints.length === 0) return

    const key = allPoints.map((p) => `${p.lat},${p.lng}`).join('|')
    if (key === fitted.current) return
    fitted.current = key

    const bounds = new window.google.maps.LatLngBounds()
    allPoints.forEach((p) => bounds.extend({ lat: p.lat, lng: p.lng }))
    map.fitBounds(bounds, 40)
  }, [map, segments])

  return null
}

interface TimestampOverlayProps {
  segments: Segment[]
  color: string
}

function TimestampMarkers({ segments, color }: TimestampOverlayProps) {
  const map = useMap()
  const markersRef = useRef<google.maps.OverlayView[]>([])

  useEffect(() => {
    if (!map) return

    markersRef.current.forEach((m) => m.setMap(null))
    markersRef.current = []

    segments.forEach((seg) => {
      const points = seg.path_points
      if (!points || points.length === 0) return

      const step = Math.max(1, Math.floor(points.length / 4))
      const indicesToShow = new Set<number>([0, points.length - 1])
      for (let i = step; i < points.length - 1; i += step) indicesToShow.add(i)

      indicesToShow.forEach((idx) => {
        const p = points[idx]
        if (!p.ts) return

        class LabelOverlay extends window.google.maps.OverlayView {
          private div: HTMLDivElement | null = null
          draw() {
            if (!this.div) {
              this.div = document.createElement('div')
              this.div.style.cssText = `
                position:absolute;
                background:${color};
                color:#fff;
                font-size:10px;
                font-family:sans-serif;
                padding:1px 4px;
                border-radius:3px;
                white-space:nowrap;
                pointer-events:none;
                transform:translate(-50%,-130%);
                box-shadow:0 1px 3px rgba(0,0,0,.4);
              `
              this.div.textContent = formatTime(p.ts)
              this.getPanes()!.floatPane.appendChild(this.div)

              const dot = document.createElement('div')
              dot.style.cssText = `
                position:absolute;
                width:10px;height:10px;
                background:${color};
                border:2px solid #fff;
                border-radius:50%;
                transform:translate(-50%,-50%);
                pointer-events:none;
                box-shadow:0 1px 3px rgba(0,0,0,.4);
              `
              this.getPanes()!.overlayMouseTarget.appendChild(dot)
              ;(this as unknown as { dot: HTMLDivElement }).dot = dot
            }
            const proj = this.getProjection()
            const pos = proj.fromLatLngToDivPixel(new window.google.maps.LatLng(p.lat, p.lng))!
            this.div.style.left = `${pos.x}px`
            this.div.style.top = `${pos.y}px`
            const dot = (this as unknown as { dot: HTMLDivElement }).dot
            dot.style.left = `${pos.x}px`
            dot.style.top = `${pos.y}px`
          }
          onRemove() {
            this.div?.parentNode?.removeChild(this.div)
            ;(this as unknown as { dot?: HTMLDivElement }).dot?.parentNode?.removeChild(
              (this as unknown as { dot: HTMLDivElement }).dot
            )
            this.div = null
          }
        }

        const overlay = new LabelOverlay()
        overlay.setMap(map)
        markersRef.current.push(overlay)
      })
    })

    return () => {
      markersRef.current.forEach((m) => m.setMap(null))
      markersRef.current = []
    }
  }, [map, segments, color])

  return null
}

export default function TrackMap({ segments, viewMode, apiKey, showTimestamps, lang: _lang }: Props) {
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
