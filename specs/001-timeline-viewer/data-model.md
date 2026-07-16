# Data Model: Timeline Viewer

## Entities

### `users`

Single row; provisioned by the operator before first use.

| Column | Type | Constraints |
|---|---|---|
| `id` | `serial` | PK |
| `username` | `varchar(100)` | UNIQUE NOT NULL |
| `password_hash` | `varchar(255)` | NOT NULL (bcrypt) |
| `created_at` | `timestamptz` | NOT NULL DEFAULT now() |

---

### `location_segments`

One row per parsed segment from a Timeline export. Covers all three importable
segment types: `activity`, `visit`, and `timelinePath`.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `bigserial` | PK | |
| `calendar_date` | `date` | NOT NULL, INDEX | Day the segment belongs to |
| `segment_type` | `varchar(20)` | NOT NULL | `activity` / `visit` / `timeline_path` |
| `started_at` | `timestamptz` | NOT NULL | `startTime` from source |
| `ended_at` | `timestamptz` | NOT NULL | `endTime` from source |
| `transport_mode_raw` | `varchar(50)` | NULL | Raw `activity.topCandidate.type` value; NULL for `visit` and `timeline_path` |
| `transport_mode_group` | `varchar(20)` | NULL | Normalized group: `driving`, `transit`, `walking`, `running`, `cycling`, `flying`, `other` |
| `distance_meters` | `float` | NULL | `activity.distanceMeters`; NULL for non-activity segments |
| `place_lat` | `double precision` | NULL | `visit.topCandidate.placeLocation.latLng` latitude |
| `place_lng` | `double precision` | NULL | `visit.topCandidate.placeLocation.latLng` longitude |
| `place_semantic_type` | `varchar(50)` | NULL | e.g. `TYPE_HOME`, `TYPE_WORK` |
| `path_points` | `jsonb` | NULL | Array of `{lat, lng, ts}` for `timeline_path` and `activity` segments that carry GPS breadcrumbs |
| `source_hash` | `varchar(64)` | NULL | MD5 of the source file used to prevent duplicate imports |
| `import_record_id` | `bigint` | FK → `import_records.id` | Which import produced this row |

**Indexes**:
- `(calendar_date)` — primary query axis
- `(calendar_date, segment_type)` — for date-range aggregation queries
- `(source_hash)` — for idempotency check on re-upload

**Uniqueness / idempotency**: Before inserting, check that no row with the same
`source_hash` + `started_at` + `segment_type` already exists. If the whole
file's hash matches a prior `import_record`, skip re-parsing entirely.

---

### `import_records`

Audit log. One row per import attempt (manual or automatic).

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `bigserial` | PK | |
| `triggered_at` | `timestamptz` | NOT NULL DEFAULT now() | When the attempt started |
| `trigger_source` | `varchar(20)` | NOT NULL | `manual` / `scheduled` |
| `file_identifier` | `varchar(500)` | NOT NULL | Filename (manual) or Drive file ID (scheduled) |
| `file_md5` | `varchar(32)` | NULL | MD5 checksum of the file; used for change detection on Drive |
| `outcome` | `varchar(20)` | NOT NULL | `imported` / `no_changes` / `failed` |
| `segments_imported` | `integer` | NULL | Count of new `location_segments` rows created |
| `error_message` | `text` | NULL | Set when `outcome = 'failed'` |
| `completed_at` | `timestamptz` | NULL | Set when processing finishes |

**Index**: `(triggered_at DESC)` — audit log is queried newest-first.

---

## Relationships

```
users               (1) ─── standalone (single-user app; no FK to other tables)
import_records      (1) ──< location_segments  (one import produces many segments)
```

---

## Transport Mode Group Mapping

Applied at parse time; stored in `transport_mode_group`:

| Group | Raw type values |
|---|---|
| `driving` | `IN_PASSENGER_VEHICLE`, `IN_ROAD_VEHICLE`, `IN_VEHICLE`, `MOTORCYCLING` |
| `transit` | `IN_BUS`, `IN_RAIL_VEHICLE`, `IN_SUBWAY`, `IN_TRAIN`, `IN_TRAM`, `IN_FERRY` |
| `walking` | `WALKING`, `ON_FOOT` |
| `running` | `RUNNING` |
| `cycling` | `ON_BICYCLE`, `CYCLING` |
| `flying` | `FLYING` |
| `other` | `STILL`, `TILTING`, `EXITING_VEHICLE`, `UNKNOWN`, `UNKNOWN_ACTIVITY_TYPE`, any unrecognized value |

---

## State Transitions: ImportRecord

```
(attempt starts)
      │
      ▼
  [in-progress]  ← row inserted with outcome=NULL on start
      │
   ┌──┴──────────────────────┐
   ▼                         ▼
[imported]              [no_changes]
   │                         │
   └────────────┬────────────┘
                │
             [failed]  ← on any unhandled exception; error_message set
```

`in-progress` is not a stored `outcome` value — the row is inserted with
`outcome = NULL` at start, then updated to a terminal value on completion.
This lets the app detect crashed mid-import records.
