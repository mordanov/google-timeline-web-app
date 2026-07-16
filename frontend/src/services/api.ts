const BASE_URL = '/api'

function getToken(): string {
  return localStorage.getItem('token') ?? ''
}

function authHeaders(): HeadersInit {
  return { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' }
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (res.status === 401 || res.status === 403) {
    localStorage.removeItem('token')
    window.location.href = '/login'
    throw new Error('Unauthorized')
  }
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || `HTTP ${res.status}`)
  }
  return res.json() as Promise<T>
}

export async function login(username: string, password: string): Promise<string> {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
  const data = await handleResponse<{ access_token: string }>(res)
  return data.access_token
}

export async function getDays(): Promise<{ dates: string[] }> {
  const res = await fetch(`${BASE_URL}/locations/days`, { headers: authHeaders() })
  return handleResponse(res)
}

export async function getSegments(params: {
  date?: string
  date_from?: string
  date_to?: string
}): Promise<{ segments: Segment[] }> {
  const q = new URLSearchParams()
  if (params.date) q.set('date', params.date)
  if (params.date_from) q.set('date_from', params.date_from)
  if (params.date_to) q.set('date_to', params.date_to)
  const res = await fetch(`${BASE_URL}/locations/segments?${q}`, { headers: authHeaders() })
  return handleResponse(res)
}

export async function getStats(params: {
  date?: string
  date_from?: string
  date_to?: string
}): Promise<{ stats: Stat[] }> {
  const q = new URLSearchParams()
  if (params.date) q.set('date', params.date)
  if (params.date_from) q.set('date_from', params.date_from)
  if (params.date_to) q.set('date_to', params.date_to)
  const res = await fetch(`${BASE_URL}/locations/stats?${q}`, { headers: authHeaders() })
  return handleResponse(res)
}

export async function uploadFile(file: File): Promise<{ import_record_id: number }> {
  const form = new FormData()
  form.append('file', file)
  const res = await fetch(`${BASE_URL}/import/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${getToken()}` },
    body: form,
  })
  return handleResponse(res)
}

export async function getImportStatus(id: number): Promise<ImportRecord> {
  const res = await fetch(`${BASE_URL}/import/status/${id}`, { headers: authHeaders() })
  return handleResponse(res)
}

export async function getImportHistory(limit = 50, offset = 0): Promise<{ records: ImportRecord[]; total: number }> {
  const res = await fetch(`${BASE_URL}/import/history?limit=${limit}&offset=${offset}`, {
    headers: authHeaders(),
  })
  return handleResponse(res)
}

// Types
export interface Segment {
  id: number
  calendar_date: string
  segment_type: string
  started_at: string
  ended_at: string
  transport_mode_group: string | null
  distance_meters: number | null
  path_points: { lat: number; lng: number; ts: string }[] | null
  place_lat: number | null
  place_lng: number | null
  place_semantic_type: string | null
}

export interface Stat {
  transport_mode_group: string
  total_distance_meters: number
  total_duration_seconds: number
}

export interface ImportRecord {
  id: number
  triggered_at: string
  trigger_source: string
  file_identifier: string
  outcome: string | null
  segments_imported: number | null
  error_message: string | null
  completed_at: string | null
}
