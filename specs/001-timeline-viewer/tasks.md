---
description: "Task list for Timeline Viewer implementation"
---

# Tasks: Timeline Viewer

**Input**: Design documents from `specs/001-timeline-viewer/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/api.md ✅

**Tests**: Required for parser module and auth flow (constitution mandate).
Not required for UI or other endpoints.

**Organization**: Tasks grouped by user story to enable independent
implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no shared dependencies)
- **[Story]**: Which user story this task belongs to

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Repo skeleton, Docker Compose, environment config.

- [ ] T001 Create directory structure: `backend/app/`, `backend/tests/`, `backend/scripts/`, `backend/alembic/`, `importer/`, `frontend/src/`
- [ ] T002 [P] Create `docker-compose.yml` with services: `postgres`, `backend`, `frontend`, `importer` (with `restart: unless-stopped`)
- [ ] T003 [P] Create `.env.example` with placeholders: `DATABASE_URL`, `JWT_SECRET`, `GOOGLE_MAPS_API_KEY`, `GOOGLE_SERVICE_ACCOUNT_JSON`, `GOOGLE_DRIVE_FOLDER_ID`, `SYNC_INTERVAL_SECONDS`
- [ ] T004 [P] Create `backend/requirements.txt`: fastapi, uvicorn, sqlalchemy[asyncio], alembic, asyncpg, python-jose[cryptography], passlib[bcrypt], python-multipart, google-api-python-client, google-auth
- [ ] T005 [P] Create `backend/Dockerfile` (Python 3.13, installs requirements, runs uvicorn)
- [ ] T006 [P] Create `importer/Dockerfile` (Python 3.13, shares backend package)
- [ ] T007 [P] Create `frontend/package.json` with dependencies: react, react-dom, @vis.gl/react-google-maps, typescript; create `frontend/Dockerfile`
- [ ] T008 [P] Create `backend/app/config.py` — Pydantic Settings loading all env vars from `.env`
- [ ] T009 [P] Create `backend/app/db.py` — async SQLAlchemy engine and session factory using `DATABASE_URL` from config

**Checkpoint**: Docker Compose builds all four services without errors.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Database schema, auth infrastructure, and shared parser.
All user stories depend on this phase.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T010 Create SQLAlchemy models: `backend/app/models/user.py` (`id`, `username`, `password_hash`, `created_at`)
- [ ] T011 [P] Create SQLAlchemy models: `backend/app/models/import_record.py` (`id`, `triggered_at`, `trigger_source`, `file_identifier`, `file_md5`, `outcome`, `segments_imported`, `error_message`, `completed_at`)
- [ ] T012 [P] Create SQLAlchemy model: `backend/app/models/location_segment.py` (`id`, `calendar_date`, `segment_type`, `started_at`, `ended_at`, `transport_mode_raw`, `transport_mode_group`, `distance_meters`, `place_lat`, `place_lng`, `place_semantic_type`, `path_points` jsonb, `source_hash`, `import_record_id`)
- [ ] T013 Create Alembic migration in `backend/alembic/versions/001_initial_schema.py` creating all three tables with indexes defined in data-model.md
- [ ] T014 Create `backend/app/auth/service.py` — JWT creation (`python-jose`), JWT validation, bcrypt password verify (`passlib`); no external calls
- [ ] T015 Create `backend/app/auth/dependencies.py` — `get_current_user` FastAPI dependency: extracts Bearer token, validates JWT, returns user or raises 401
- [ ] T016 [P] Create `backend/scripts/create_user.py` — CLI script that accepts `--username` and `--password`, hashes password with bcrypt, inserts into `users` table
- [ ] T017 Create `backend/app/importer/parser.py` — **SHARED PARSER MODULE**: parses `semanticSegments` array; handles `activity`, `visit`, `timelinePath` segment types; maps `activity.topCandidate.type` to `transport_mode_group` using the 7-group mapping from data-model.md; returns list of `LocationSegment` dicts; raises `ValueError` on missing `semanticSegments`; skips unparseable individual points without crashing
- [ ] T018 [P] Create `backend/tests/test_parser.py` — **REQUIRED tests**: correct parsing of `activity` segments (mode, distance, calendar_date attribution); correct parsing of `visit` segments (coordinates, semantic_type); correct parsing of `timelinePath` segments (path_points); all 7 transport mode group mappings; `ValueError` on missing `semanticSegments`; partial-skip on bad GPS point string; idempotency (same data → same output)
- [ ] T019 Create `backend/app/main.py` — FastAPI app factory; include auth, locations, importer routers; global 401 handler for missing/invalid JWT

**Checkpoint**: `docker compose run backend pytest tests/test_parser.py` — all parser tests pass. Database migrations apply cleanly.

---

## Phase 3: User Story 1 — Authenticated Login (Priority: P1) 🎯 MVP

**Goal**: Full login flow — JWT issuance, protected routes, session expiry.

**Independent Test**: Visit any route unauthenticated → 401. POST `/auth/login` with correct credentials → JWT. POST with wrong credentials → 401. Use JWT on a protected endpoint → 200.

### Tests for User Story 1 ⚠️ REQUIRED by constitution

> **Write these tests FIRST, ensure they FAIL before implementing the endpoint**

- [ ] T020 [P] [US1] Create `backend/tests/test_auth.py` — **REQUIRED tests**: `POST /auth/login` with valid credentials returns 200 + JWT; with invalid password returns 401; with unknown username returns 401; protected endpoint without token returns 401; protected endpoint with expired token returns 401; protected endpoint with valid token returns 200

### Implementation for User Story 1

- [ ] T021 [US1] Create `backend/app/auth/router.py` — `POST /auth/login`: accepts `{username, password}`, calls `auth/service.py` to verify credentials and issue JWT; returns `{access_token, token_type}`
- [ ] T022 [US1] Create `frontend/src/pages/LoginPage.tsx` — login form (username + password fields, submit button, error message on failure); on success stores JWT in memory/localStorage and redirects to map view
- [ ] T023 [US1] Create `frontend/src/services/api.ts` — typed API client with `login()`, `getSegments()`, `getStats()`, `getDays()`, `uploadFile()`, `getImportStatus()`, `getImportHistory()`; attaches `Authorization: Bearer` header to all authenticated calls

**Checkpoint**: User can log in via browser, gets redirected to map view. Unauthenticated curl to any `/locations/` endpoint returns 401.

---

## Phase 4: User Story 2 — View Location History on a Map (Priority: P1) 🎯 MVP

**Goal**: Logged-in user sees today's route on the map, color-coded by transport mode, with stats panel. Can switch dates. "No data" message for empty dates.

**Independent Test**: With imported data for a known date — open app → today's route visible with colored segments and stats panel → select that date → map updates → select date with no data → "no data" message.

### Implementation for User Story 2

- [ ] T024 [US2] Create `backend/app/locations/service.py` — `get_segments(date=None, date_from=None, date_to=None)`: async query returning `location_segments` rows for the requested date/range; `get_stats(...)`: aggregates `distance_meters` and duration by `transport_mode_group` for `activity` segments only; `get_days()`: returns sorted list of distinct `calendar_date` values
- [ ] T025 [US2] Create `backend/app/locations/router.py` — `GET /locations/segments`, `GET /locations/stats`, `GET /locations/days`; all require valid JWT via `get_current_user` dependency; validates query params per contracts/api.md
- [ ] T026 [P] [US2] Create `frontend/src/constants/colors.ts` — `MODE_COLORS` (7 mode groups → hex), `DAY_PALETTE` (array of distinct hex colors for date-range view)
- [ ] T027 [P] [US2] Create `frontend/src/components/StatsPanel.tsx` — displays list of `{transport_mode_group, total_distance_meters, total_duration_seconds}` from `/locations/stats`; shows "No activity data" when empty
- [ ] T028 [P] [US2] Create `frontend/src/components/DatePicker.tsx` — single date selector (default: today); emits `onDateChange(date: string)`
- [ ] T029 [US2] Create `frontend/src/components/TrackMap.tsx` — renders `<APIProvider>` + `<Map>`; maps each segment to a `<Polyline>` with `strokeColor` from `MODE_COLORS[segment.transport_mode_group]`; renders place markers for `visit` segments; `viewMode` prop set to `'single-day'`
- [ ] T030 [US2] Create `frontend/src/pages/MapPage.tsx` — fetches `/locations/segments?date=<selected>` and `/locations/stats?date=<selected>`; renders `<TrackMap>`, `<DatePicker>`, `<StatsPanel>`; shows "No data for this date" when segments array is empty; includes link to upload and audit log

**Checkpoint**: Open app, log in, see today's route color-coded by transport mode with stats. Select a date with no data → "No data" message.

---

## Phase 5: User Story 2b — Date Range View (Priority: P2)

**Goal**: User selects a start+end date and sees all paths for that period on the map simultaneously, each day a distinct color, with a legend and aggregate stats.

**Independent Test**: Select a date range covering 2+ days with data → map shows all days' paths, distinct colors, legend visible → stats panel shows aggregate totals.

### Implementation for User Story 2b

- [ ] T031 [US2b] Update `frontend/src/components/DatePicker.tsx` — add range mode toggle; when in range mode exposes `date_from` + `date_to` inputs; emits `onRangeChange(from: string, to: string)`
- [ ] T032 [US2b] Create `frontend/src/components/DayLegend.tsx` — renders color swatch + date label for each day in the active range, using `DAY_PALETTE`
- [ ] T033 [US2b] Update `frontend/src/components/TrackMap.tsx` — add `viewMode: 'date-range'` path: color each segment by `DAY_PALETTE[segment.dayIndex % palette.length]`; render `<DayLegend>` when in range mode
- [ ] T034 [US2b] Update `frontend/src/pages/MapPage.tsx` — wire range mode: fetch `/locations/segments?date_from=&date_to=` and `/locations/stats?date_from=&date_to=`; pass `dayIndex` per segment based on `calendar_date` sort order; pass `viewMode` to `<TrackMap>`

**Checkpoint**: Select a 3-day range with data → three distinct path colors on map → legend visible → stats show combined totals for the range.

---

## Phase 6: User Story 3 — Upload a Timeline Export File (Priority: P2)

**Goal**: User uploads a Timeline JSON file via the UI; data is parsed and stored; appears on map immediately; re-uploading the same file is idempotent.

**Independent Test**: Upload a real Timeline export → `GET /import/status/<id>` eventually shows `outcome: "imported"` → browse to a date from that file → data appears on map. Upload same file again → `outcome: "imported"` but no duplicate rows.

### Implementation for User Story 3

- [ ] T035 [US3] Create `backend/app/importer/service.py` — `queue_upload(file_bytes, filename)`: creates `ImportRecord` with `outcome=NULL`, returns `import_record_id`, then calls `process_import(file_bytes, import_record_id)` via `BackgroundTasks`; `process_import`: computes MD5, checks for existing record with same MD5 (→ `no_changes`), calls `parser.py`, bulk-inserts `LocationSegment` rows, updates `ImportRecord` to `imported` or `failed`; wraps entire body in try/except
- [ ] T036 [US3] Create `backend/app/importer/router.py` — `POST /import/upload` (multipart, requires JWT): calls `service.queue_upload`, returns 202 + `import_record_id`; `GET /import/status/{id}` (requires JWT): returns `ImportRecord` row; `GET /import/history` (requires JWT): returns paginated `import_records` newest-first
- [ ] T037 [US3] Create `frontend/src/components/UploadForm.tsx` — file input (accepts `.json`), submit button, progress/status display; polls `GET /import/status/<id>` every 2 s until `outcome` is non-null; shows success message with segment count or error message
- [ ] T038 [US3] Update `frontend/src/pages/MapPage.tsx` — add `<UploadForm>` accessible from the map view (e.g., drawer or dedicated upload section)

**Checkpoint**: Upload a Timeline JSON → status shows `imported` with segment count → dates from that file browsable on map. Upload again → `no_changes` outcome → no duplicate segments.

---

## Phase 7: User Story 4 — Automatic Google Drive Sync (Priority: P2)

**Goal**: Importer service polls Drive folder, detects new/changed files via MD5, imports them automatically using the shared parser.

**Independent Test**: Drop a Timeline JSON into the Drive folder → wait one sync cycle → `GET /import/history` shows new record with `trigger_source: "scheduled"` and `outcome: "imported"`. Drop same file again → `no_changes`.

### Implementation for User Story 4

- [ ] T039 [US4] Create `backend/app/importer/drive_client.py` — `DriveClient`: authenticates via service account credentials from `GOOGLE_SERVICE_ACCOUNT_JSON` env var; `list_files(folder_id)`: calls Drive API v3 `files.list` requesting `id, name, modifiedTime, md5Checksum`; `download_file(file_id)`: returns file bytes using `MediaIoBaseDownload`
- [ ] T040 [US4] Create `importer/main.py` — sleep loop: calls `drive_client.list_files(FOLDER_ID)`, compares each file's `md5Checksum` against last known value stored in `import_records` (query by `file_identifier` = Drive file ID), skips unchanged files (creates `no_changes` record), downloads and calls `service.process_import` for new/changed files; sleeps `SYNC_INTERVAL_SECONDS` (default 900); wraps each cycle in try/except — logs error, keeps looping

**Checkpoint**: `docker compose logs importer` shows cycle completions. After dropping a file in Drive folder, `GET /import/history` shows `trigger_source: "scheduled"` record within 2 cycles.

---

## Phase 8: User Story 5 — Import Audit Log UI (Priority: P2)

**Goal**: User can view a list of all import attempts with outcomes in the web UI.

**Independent Test**: After performing a manual upload and a Drive sync, open the audit log page → both records visible with correct `trigger_source`, `outcome`, timestamp, and segment count.

### Implementation for User Story 5

- [ ] T041 [US5] Create `frontend/src/pages/AuditLogPage.tsx` — fetches `GET /import/history`; renders table with columns: timestamp, trigger source, file identifier, outcome (colored badge: green=imported, grey=no_changes, red=failed), segments imported, error message (if failed); paginated (limit/offset)
- [ ] T042 [US5] Add route and navigation link to `AuditLogPage` in `frontend/src/App.tsx`

**Checkpoint**: After a manual upload and a Drive sync cycle, audit log page shows both entries with correct outcomes and metadata.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Validation, environment wiring, and quickstart verification.

- [ ] T043 [P] Add `SYNC_INTERVAL_SECONDS` env var default (900) to `backend/app/config.py` and `importer/main.py`
- [ ] T044 [P] Add `restart: unless-stopped` to `importer` and `backend` services in `docker-compose.yml`
- [ ] T045 [P] Add `healthcheck` for `postgres` service in `docker-compose.yml` so backend waits for DB ready
- [ ] T046 [P] Update `frontend/src/App.tsx` — add route guard: redirect unauthenticated users to `LoginPage` for all routes except `/login`
- [ ] T047 Run `quickstart.md` validation end-to-end: login → upload → map view → date switch → date range view → stats panel → audit log → unauthenticated 401 check

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 — BLOCKS all user stories
- **US1 Login (Phase 3)**: Depends on Phase 2; BLOCKS Phase 4 (map needs auth)
- **US2 Map View (Phase 4)**: Depends on Phase 3 (auth); also needs data from Phase 6 (upload) for full validation
- **US2b Date Range (Phase 5)**: Depends on Phase 4
- **US3 Upload (Phase 6)**: Depends on Phase 2 (parser, DB); can proceed in parallel with Phase 4
- **US4 Drive Sync (Phase 7)**: Depends on Phase 6 (shares `service.process_import`)
- **US5 Audit Log UI (Phase 8)**: Depends on Phase 6 (needs import records to display)
- **Polish (Phase 9)**: Depends on all user story phases

### User Story Dependencies

- **US1 (P1)**: Start after Foundational
- **US2 (P1)**: Start after US1 (auth dependency); runs in parallel with US3
- **US2b (P2)**: Start after US2
- **US3 (P2)**: Start after Foundational; runs in parallel with US2
- **US4 (P2)**: Start after US3 (shares `process_import`)
- **US5 (P2)**: Start after US3 (needs import records)

### Within Each User Story

- Tests (where required) MUST be written and FAIL before implementation
- Models before services
- Services before routers
- Backend before frontend integration
- Story complete before moving to next priority

### Parallel Opportunities

```bash
# Phase 1 — all setup tasks in parallel:
T002 docker-compose.yml
T003 .env.example
T004 requirements.txt
T005 backend/Dockerfile
T006 importer/Dockerfile
T007 frontend/package.json + Dockerfile
T008 backend/app/config.py
T009 backend/app/db.py

# Phase 2 — models in parallel, then parser:
T010 models/user.py  |  T011 models/import_record.py  |  T012 models/location_segment.py
T013 alembic migration (after all models)
T014 auth/service.py  |  T015 auth/dependencies.py  |  T016 scripts/create_user.py
T017 importer/parser.py  →  T018 tests/test_parser.py

# Phase 3 — US1:
T020 tests/test_auth.py (write first, must fail)
T021 auth/router.py  |  T022 LoginPage.tsx  |  T023 api.ts (after tests written)

# Phase 4+5 — US2 frontend components in parallel:
T026 colors.ts  |  T027 StatsPanel.tsx  |  T028 DatePicker.tsx
(then T029, T030 after T026-T028)
```

---

## Implementation Strategy

### MVP First (US1 + US2 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories)
3. Complete Phase 3: US1 Login → validate independently
4. Complete Phase 4: US2 Map View → validate with pre-seeded DB data
5. **STOP AND VALIDATE**: Log in, view map, switch dates, confirm "no data" message
6. This MVP demonstrates the entire core product value

### Incremental Delivery

1. Setup + Foundational → foundation ready
2. US1 → authentication works end-to-end
3. US2 → map view works (MVP!)
4. US3 → manual upload unlocks self-service data ingestion
5. US2b → date range view adds analytical value
6. US4 → Drive sync removes recurring manual work
7. US5 → audit log adds operational trust
8. Polish → production-ready

### Parallel Team Strategy (if applicable)

After Foundational phase completes:
- Developer A: US1 + US2 (auth + map)
- Developer B: US3 (upload + parser service) ← can start immediately after Foundational

---

## Notes

- `[P]` tasks = different files, no shared in-flight dependencies
- `[Story]` label maps each task to its user story for traceability
- `backend/app/importer/parser.py` is the constitution-mandated single shared module — both the upload service and the Drive importer MUST call it; never duplicate its logic
- Parser tests (T018) and auth tests (T020) are constitutionally required; all others are optional
- Commit after each checkpoint
- Stop at any checkpoint to demo/validate independently
