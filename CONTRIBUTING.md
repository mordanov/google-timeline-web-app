# Contributing

This is a personal project. The notes below exist to make picking it back up after a break as smooth as possible.

---

## Local development setup

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -i https://pypi.org/simple -r requirements.txt
```

The backend expects a running PostgreSQL instance. The easiest way is to start only that service:

```bash
docker compose up postgres -d
```

Then run the backend directly (hot reload):

```bash
DATABASE_URL="postgresql+asyncpg://timeline:changeme@localhost:5432/timeline" \
JWT_SECRET="dev-secret" \
uvicorn app.main:app --reload
```

Or just use Docker Compose for everything (see [QUICKSTART.md](QUICKSTART.md)).

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Vite proxies `/api` requests to `http://backend:8000` inside Docker. For standalone frontend dev against a local backend, add a temporary `server.proxy` override in `vite.config.ts` pointing at `http://localhost:8000`.

---

## Running tests

```bash
cd backend
python -m pytest tests/ -v
```

No environment setup needed — `conftest.py` sets `DATABASE_URL` and `JWT_SECRET` automatically. Tests use an in-memory SQLite database; no running PostgreSQL is required.

To run a single test file:

```bash
python -m pytest tests/test_parser.py -v
python -m pytest tests/test_auth.py -v
```

---

## Project structure

```
backend/
  app/
    auth/           JWT login endpoint and token verification dependency
    importer/       Upload endpoint, background processor, Drive client
                    parser.py ← shared parser used by both upload and Drive sync
    locations/      Map data endpoints (segments, days, stats)
    models/         SQLAlchemy ORM models
    config.py       Pydantic Settings (reads from .env)
    db.py           Async engine and session factory
    main.py         FastAPI app, CORS, router registration
  alembic/          Database migrations
  scripts/
    create_user.py  One-time user provisioning script
  tests/
    test_auth.py    6 auth flow tests (login, protected endpoints)
    test_parser.py  27 parser tests (segment types, mode mapping, edge cases)

frontend/
  src/
    components/     TrackMap, DatePicker, StatsPanel, UploadForm, DayLegend
    pages/          LoginPage, MapPage, AuditLogPage
    services/api.ts Typed API client
    constants/      Transport mode colours, day palette

importer/
  main.py           Sleep loop that polls Google Drive and calls the shared parser
```

---

## Key architectural decisions

**Shared parser** — `backend/app/importer/parser.py` is the single source for parsing Timeline JSON. Both the manual upload endpoint (`importer/service.py`) and the Drive sync service (`importer/main.py`) call `parse_timeline()`. Do not duplicate parsing logic.

**Transport mode groups** — Raw Google Maps type strings (e.g. `IN_PASSENGER_VEHICLE`, `IN_BUS`) are normalised to seven groups (`driving`, `transit`, `walking`, `running`, `cycling`, `flying`, `other`) at parse time. The groups are stored in `location_segments.transport_mode_group`. Do not store raw strings as the authoritative mode.

**SQLAlchemy `JSON` vs `JSONB`** — The ORM model uses `JSON` for `path_points` so that tests can run against SQLite. The Alembic migration uses `JSONB` for production PostgreSQL. Do not change the model column to `JSONB`; it would break tests.

**bcrypt directly, not passlib** — `auth/service.py` imports `bcrypt` directly. passlib is not compatible with bcrypt 4.x on Python 3.13. Do not add passlib back.

---

## Making changes

### Adding a new API endpoint

1. Add a route function in the appropriate router (`auth/router.py`, `locations/router.py`, or `importer/router.py`).
2. Add or update the schema in `contracts/api.md`.
3. Add tests if the endpoint has non-trivial logic.

### Changing the data model

1. Edit the SQLAlchemy model in `app/models/`.
2. Generate a new Alembic migration:
   ```bash
   alembic revision --autogenerate -m "describe the change"
   ```
3. Review the generated migration before committing — autogenerate is not always complete.

### Changing the parser

The parser has 27 tests covering all segment types and edge cases. Run them after any change:

```bash
python -m pytest tests/test_parser.py -v
```

---

## Environment variables reference

All variables live in a single `.env` file at the repo root. See `.env.example` for the full list with comments.

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `POSTGRES_USER/PASSWORD/DB` | Yes | Used by the postgres Docker service |
| `JWT_SECRET` | Yes | Signs JWT tokens — keep secret and long |
| `VITE_GOOGLE_MAPS_API_KEY` | Yes | Maps JavaScript API key for the frontend |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | No | Enables Drive sync; entire JSON as one line |
| `GOOGLE_DRIVE_FOLDER_ID` | No | Drive folder to monitor for Timeline exports |
| `SYNC_INTERVAL_SECONDS` | No | Drive poll interval (default 900) |

---

## Docker Compose services

| Service | Port | Description |
|---|---|---|
| `postgres` | 5432 | PostgreSQL 16 with health check |
| `backend` | 8000 | FastAPI app with hot reload |
| `importer` | — | Drive sync loop (no exposed port) |
| `frontend` | 3000 | Vite dev server |

The `importer` build context is the repo root (not `./importer`) so it can copy `backend/requirements.txt`. Its Dockerfile is at `importer/Dockerfile`.
