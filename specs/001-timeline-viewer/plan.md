# Implementation Plan: Timeline Viewer

**Branch**: `001-timeline-viewer` | **Date**: 2026-07-16 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `specs/001-timeline-viewer/spec.md`

## Summary

Build a single-user private web application that parses Google Maps Timeline
JSON exports, stores location history in PostgreSQL, and renders it on a map
day-by-day or across a date range. Path segments are color-coded by transport
mode in single-day view; in date-range view each day gets a distinct color with
a legend. A stats panel shows aggregate distance and time per transport mode.
Manual file upload and an automatic Google Drive background sync both use the
same shared parsing module. Every import attempt is recorded in a persistent
audit log.

## Technical Context

**Language/Version**: Python 3.13 (backend), Node 20+ / React 18 (frontend)
**Primary Dependencies**: FastAPI (async), SQLAlchemy 2.x (async), Alembic,
  `google-api-python-client`, `google-auth`, `@vis.gl/react-google-maps`
**Storage**: PostgreSQL 16
**Testing**: pytest (parsing module + auth flow — required by constitution)
**Target Platform**: Linux (Docker Compose), modern browser
**Project Type**: web-service (backend) + web-app (frontend)
**Performance Goals**: Map loads in <3 s; 50 MB file upload+import in <60 s
**Constraints**: Single user, JWT auth (bcrypt), no multi-tenancy
**Scale/Scope**: Personal tool, single user, years of location history

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Principle | Check | Result |
|---|---|---|
| I. Simplicity First | No multi-tenancy, no registration, no roles | ✅ PASS |
| II. Single Source of Parsing | One shared parser module used by upload + importer | ✅ PASS |
| III. Secrets via Env Vars | All credentials in `.env`; `.env.example` committed | ✅ PASS |
| IV. Fault Tolerance | Upload + importer catch all exceptions; service keeps running | ✅ PASS |
| V. Observability | Every import attempt written to `import_records` table | ✅ PASS |
| VI. Minimal Dependencies | Only Google Maps JS API + Google Drive API | ✅ PASS |
| VII. Testing | Tests required for parser + auth; UI tests not required for MVP | ✅ PASS |
| VIII. Access Control | All endpoints except `/auth/login` reject requests without valid JWT | ✅ PASS |

No violations. No complexity justification required.

## Project Structure

### Documentation (this feature)

```text
specs/001-timeline-viewer/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── api.md           # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit-tasks)
```

### Source Code (repository root)

```text
backend/
├── app/
│   ├── main.py                    # FastAPI app factory, router registration
│   ├── config.py                  # Settings from environment variables
│   ├── auth/
│   │   ├── router.py              # POST /auth/login
│   │   ├── service.py             # JWT creation + validation, bcrypt verify
│   │   └── dependencies.py        # get_current_user FastAPI dependency
│   ├── locations/
│   │   ├── router.py              # GET /locations/segments, /days, /stats
│   │   └── service.py             # Query + aggregate location_segments
│   ├── importer/
│   │   ├── router.py              # POST /import/upload, GET /import/status, /history
│   │   ├── service.py             # Upload handler, background task orchestration
│   │   ├── drive_client.py        # Google Drive API wrapper (list, detect changes, download)
│   │   └── parser.py              # *** SHARED PARSER *** — only source of parsing logic
│   ├── models/
│   │   ├── user.py                # SQLAlchemy User model
│   │   ├── location_segment.py    # SQLAlchemy LocationSegment model
│   │   └── import_record.py       # SQLAlchemy ImportRecord model
│   └── db.py                      # Async engine, session factory
├── alembic/                        # Database migrations
├── tests/
│   ├── test_parser.py             # REQUIRED: parser correctness tests
│   └── test_auth.py               # REQUIRED: auth flow tests
├── scripts/
│   └── create_user.py             # CLI to provision the single user account
├── requirements.txt
└── Dockerfile

importer/
├── main.py                        # Sleep loop; calls app/importer/parser.py via shared volume or package
└── Dockerfile

frontend/
├── src/
│   ├── App.tsx
│   ├── pages/
│   │   ├── LoginPage.tsx
│   │   ├── MapPage.tsx            # Map view, date/range picker, stats panel
│   │   └── AuditLogPage.tsx       # Import history
│   ├── components/
│   │   ├── TrackMap.tsx           # Google Maps + Polyline rendering
│   │   ├── DayLegend.tsx          # Date-range color legend
│   │   ├── StatsPanel.tsx         # Distance/time per transport mode
│   │   ├── DatePicker.tsx         # Single date or range selector
│   │   └── UploadForm.tsx         # File upload UI
│   ├── services/
│   │   └── api.ts                 # Typed API client
│   └── constants/
│       └── colors.ts              # MODE_COLORS and DAY_PALETTE
├── package.json
└── Dockerfile

docker-compose.yml
.env.example
```

**Structure Decision**: Web application layout (Option 2). Backend and frontend
are separate top-level directories. The `importer` service shares the backend
`app/` package (mounted as a volume or installed as a package) so that
`app/importer/parser.py` is the single shared parsing module for both the
upload endpoint and the Drive sync job.

## Complexity Tracking

> No constitution violations. Table not required.

## Phase 0 Artifacts

- [research.md](research.md) — all technology decisions resolved.

## Phase 1 Artifacts

- [data-model.md](data-model.md) — `users`, `location_segments`, `import_records` tables
- [contracts/api.md](contracts/api.md) — full REST API surface
- [quickstart.md](quickstart.md) — end-to-end validation steps
