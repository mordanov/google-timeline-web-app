# Research: Timeline Viewer

## 1. Google Timeline JSON Format

### Decision
Parse four mutually exclusive segment types from the `semanticSegments` array:
`activity`, `visit`, `timelinePath`, and `timelineMemory`.

### Key fields

**`activity` segment** — inferred movement leg:
```json
{
  "activity": {
    "topCandidate": {
      "type": "IN_PASSENGER_VEHICLE",
      "probability": 0.5
    },
    "distanceMeters": 1649.0,
    "start": "2024-01-15T08:00:00.000Z",
    "end":   "2024-01-15T08:22:00.000Z"
  },
  "startTime": "2024-01-15T08:00:00.000Z",
  "endTime":   "2024-01-15T08:22:00.000Z"
}
```

**`visit` segment** — stay at a place:
```json
{
  "visit": {
    "topCandidate": {
      "placeLocation": { "latLng": "37.4219°, -122.0840°" },
      "semanticType": "TYPE_HOME",
      "probability": 0.9
    }
  },
  "startTime": "...",
  "endTime": "..."
}
```

**`timelinePath` segment** — raw GPS breadcrumbs (no transport mode):
```json
{
  "timelinePath": [
    { "point": "37.4219°, -122.0840°", "time": "2024-01-15T08:01:00.000Z" },
    ...
  ],
  "startTime": "...",
  "endTime": "..."
}
```

### Known `activity.topCandidate.type` values (from real data)
Grouping for display and color-coding:

| Display group | Raw type values |
|---|---|
| Driving | `IN_PASSENGER_VEHICLE`, `IN_ROAD_VEHICLE`, `IN_VEHICLE`, `MOTORCYCLING` |
| Transit | `IN_BUS`, `IN_RAIL_VEHICLE`, `IN_SUBWAY`, `IN_TRAIN`, `IN_TRAM`, `IN_FERRY` |
| Walking | `WALKING`, `ON_FOOT` |
| Running | `RUNNING` |
| Cycling | `ON_BICYCLE`, `CYCLING` |
| Flying | `FLYING` |
| Other | `STILL`, `TILTING`, `EXITING_VEHICLE`, `UNKNOWN`, `UNKNOWN_ACTIVITY_TYPE` |

### Rationale
`activity` segments are the canonical source for transport mode and distance.
`timelinePath` segments have GPS points but no mode — they must be stored as
path data without a mode label. `visit` segments provide place coordinates and
semantic labels.

### Alternatives considered
Using `timelinePath` for transport mode: not possible — the field does not exist
on those segments.

---

## 2. File Upload and Background Processing

### Decision
FastAPI `UploadFile` + `BackgroundTasks` for the manual upload endpoint.
`asyncio.to_thread` wraps the CPU-bound JSON parsing to avoid blocking the
event loop.

### Rationale
For a single-user personal tool handling files up to 50 MB, `BackgroundTasks`
is sufficient. It requires no additional infrastructure. The endpoint returns
immediately with a queued status; parsing runs in a thread pool.

### Alternatives considered
- **Celery**: requires Redis/RabbitMQ broker — three moving parts for one task.
  Rejected as over-engineered for single-user scope.
- **Synchronous parsing in endpoint**: blocks the event loop for potentially
  several seconds on large files. Rejected.

---

## 3. Background Importer Service

### Decision
Plain Python sleep loop in a dedicated Docker Compose service (`importer`).
Compose `restart: unless-stopped` keeps it running.

```python
while True:
    run_import_cycle()
    time.sleep(SYNC_INTERVAL_SECONDS)  # default 900 (15 min)
```

### Rationale
Simplest viable pattern for a single periodic job with no concurrency
requirements. Zero extra dependencies beyond what the rest of the project uses.

### Alternatives considered
- **APScheduler**: reasonable step up if cron expressions or jitter are needed
  later. Not needed for MVP.
- **Celery Beat**: overkill — requires broker and worker processes.

---

## 4. Google Drive API Change Detection

### Decision
Use Google Drive API v3 with a service account. Detect changes using
`md5Checksum` persisted between runs (stored in the `ImportRecord` table or a
JSON sidecar).

```python
# List files in folder, requesting md5Checksum
results = service.files().list(
    q=f"'{FOLDER_ID}' in parents and trashed=false",
    fields="files(id, name, modifiedTime, md5Checksum)",
).execute()
```

A file is new or changed if its `id` is unseen, or its `md5Checksum` differs
from the last recorded value.

### Rationale
`md5Checksum` is more reliable than `modifiedTime` alone for detecting actual
content changes. Drive populates it for all binary/JSON files (not Google Docs
native formats, which are not applicable here). Storing the last-seen checksum
in the `ImportRecord` table reuses existing persistence with no extra file.

### Required scope
`https://www.googleapis.com/auth/drive.readonly` — minimum needed to list and
download files. The watched folder must be shared with the service account
email.

### Python library
`google-api-python-client` + `google-auth` with `service_account.Credentials`.

### Alternatives considered
- `modifiedTime` only: catches renames and metadata edits that don't change
  content. Rejected in favour of checksum.
- Google Drive Changes API (`drive.changes.list`): more efficient for large
  drives, but requires storing a page token and is more complex to bootstrap.
  Not needed for watching a single folder.

---

## 5. Frontend Map Rendering

### Decision
`@vis.gl/react-google-maps` (official Google-maintained React wrapper). Each
movement segment rendered as a `<Polyline>` with `strokeColor` determined by
the active view mode.

**Single-day view** — color by transport mode group:
```ts
const MODE_COLORS: Record<TransportModeGroup, string> = {
  driving:  '#4285F4',  // Google Blue
  transit:  '#9C27B0',  // Purple
  walking:  '#34A853',  // Green
  running:  '#FF6D00',  // Orange
  cycling:  '#FBBC04',  // Yellow
  flying:   '#00BCD4',  // Cyan
  other:    '#9E9E9E',  // Grey
};
```

**Date-range view** — color by day index, one color per calendar date:
```ts
const DAY_PALETTE = ['#E63946', '#457B9D', '#2A9D8F', '#E9C46A', '#6A4C93', ...];
```

### Rationale
One `<Polyline>` per segment (not per day) enables fine-grained color control.
The two coloring modes are mutually exclusive and resolved at the call site by a
single discriminator (`viewMode`). The legend for date-range view is derived
directly from the active day list and palette — no separate data structure.

### Alternatives considered
- `google-map-react`: less actively maintained, not the official wrapper.
- Drawing all points as a single polyline: loses per-segment color control.

---

## 6. Activity Statistics Calculation

### Decision
Compute stats server-side from stored `activity` segments for the requested
date or date range. Return aggregated `{mode_group, distance_meters, duration_seconds}`
per group.

Stats are not pre-aggregated at import time; they are computed on query to
keep the data model simple and avoid stale aggregates.

### Rationale
Query-time aggregation over a personal dataset (single user, months to years of
data) is fast enough. Pre-aggregation adds write complexity and a secondary
table for no material benefit at this scale.

### Alternatives considered
Pre-computed stats columns on a daily summary table: premature optimization for
single-user scope.
