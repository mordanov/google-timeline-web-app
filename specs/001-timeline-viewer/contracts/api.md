# API Contracts: Timeline Viewer

Base URL: `http://localhost:8000` (development) / configured via environment

All endpoints except `POST /auth/login` require:
```
Authorization: Bearer <jwt_token>
```
Omitting or providing an invalid/expired token returns `401 Unauthorized`.

---

## Authentication

### `POST /auth/login`

Authenticate and receive a JWT.

**Request** (`application/json`):
```json
{ "username": "string", "password": "string" }
```

**Response 200**:
```json
{ "access_token": "string", "token_type": "bearer" }
```

**Response 401** (invalid credentials):
```json
{ "detail": "Invalid username or password" }
```

---

## Location Data

### `GET /locations/days`

Return a sorted list of calendar dates that have at least one location segment.
Used to populate the date picker.

**Response 200**:
```json
{ "dates": ["2024-01-15", "2024-01-16", "..."] }
```

---

### `GET /locations/segments`

Return location segments for a single date or a date range.

**Query parameters**:

| Param | Type | Required | Notes |
|---|---|---|---|
| `date` | `YYYY-MM-DD` | one of | Single-day view |
| `date_from` | `YYYY-MM-DD` | one of | Start of date range (inclusive) |
| `date_to` | `YYYY-MM-DD` | one of | End of date range (inclusive) |

Use either `date` alone, or `date_from` + `date_to` together.

**Response 200**:
```json
{
  "segments": [
    {
      "id": 1,
      "calendar_date": "2024-01-15",
      "segment_type": "activity",
      "started_at": "2024-01-15T08:00:00Z",
      "ended_at":   "2024-01-15T08:22:00Z",
      "transport_mode_group": "driving",
      "distance_meters": 1649.0,
      "path_points": [
        { "lat": 37.4219, "lng": -122.084, "ts": "2024-01-15T08:01:00Z" }
      ],
      "place_lat": null,
      "place_lng": null,
      "place_semantic_type": null
    },
    {
      "id": 2,
      "calendar_date": "2024-01-15",
      "segment_type": "visit",
      "started_at": "2024-01-15T09:00:00Z",
      "ended_at":   "2024-01-15T12:00:00Z",
      "transport_mode_group": null,
      "distance_meters": null,
      "path_points": null,
      "place_lat": 37.4219,
      "place_lng": -122.084,
      "place_semantic_type": "TYPE_HOME"
    }
  ]
}
```

**Response 400** (invalid params):
```json
{ "detail": "Provide either 'date' or both 'date_from' and 'date_to'" }
```

**Response 200 (no data)**:
```json
{ "segments": [] }
```
Frontend renders the "no data for this date" message when `segments` is empty.

---

### `GET /locations/stats`

Return aggregate activity statistics for a date or date range.

**Query parameters**: same as `GET /locations/segments`.

**Response 200**:
```json
{
  "stats": [
    {
      "transport_mode_group": "driving",
      "total_distance_meters": 24500.0,
      "total_duration_seconds": 1800
    },
    {
      "transport_mode_group": "walking",
      "total_distance_meters": 3200.0,
      "total_duration_seconds": 2400
    }
  ]
}
```

Only `activity` segments contribute to stats. `visit` and `timeline_path`
segments are excluded. Empty array if no activity segments exist for the
requested period.

---

## File Import

### `POST /import/upload`

Upload a Timeline JSON export file for manual import.

**Request** (`multipart/form-data`):
- `file`: the JSON file

**Response 202** (accepted, processing in background):
```json
{ "status": "queued", "import_record_id": 42 }
```

**Response 400** (file missing or wrong content type):
```json
{ "detail": "No file provided or unsupported content type" }
```

---

### `GET /import/status/{import_record_id}`

Poll the status of a background import job.

**Response 200**:
```json
{
  "id": 42,
  "triggered_at": "2024-01-15T10:00:00Z",
  "trigger_source": "manual",
  "file_identifier": "Timeline.json",
  "outcome": "imported",
  "segments_imported": 1847,
  "error_message": null,
  "completed_at": "2024-01-15T10:00:23Z"
}
```

`outcome` is `null` while processing is in progress.

---

## Audit Log

### `GET /import/history`

Return all import records, newest first.

**Query parameters**:

| Param | Type | Default | Notes |
|---|---|---|---|
| `limit` | integer | 50 | Max records to return |
| `offset` | integer | 0 | Pagination offset |

**Response 200**:
```json
{
  "records": [
    {
      "id": 42,
      "triggered_at": "2024-01-15T10:00:00Z",
      "trigger_source": "manual",
      "file_identifier": "Timeline.json",
      "outcome": "imported",
      "segments_imported": 1847,
      "error_message": null,
      "completed_at": "2024-01-15T10:00:23Z"
    }
  ],
  "total": 1
}
```
