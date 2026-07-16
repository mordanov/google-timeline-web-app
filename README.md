# Timeline Viewer

A personal web application for visualising your Google Maps location history on an interactive map.

## What it does

- Displays your movement paths on a Google Map, colour-coded by transport mode (driving, walking, cycling, transit, flying)
- Shows aggregate distance and duration stats per transport mode for any day or date range
- Supports manual JSON upload or automatic sync from Google Drive
- Keeps a full audit log of every import

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 / TypeScript / Vite |
| Map | `@vis.gl/react-google-maps` |
| Backend | Python 3.13 / FastAPI (async) |
| Database | PostgreSQL 16 |
| Orchestration | Docker Compose |

## Quick start

See [QUICKSTART.md](QUICKSTART.md) for step-by-step setup instructions.

## Project layout

```
backend/        FastAPI app, shared parser, Alembic migrations
frontend/       React / TypeScript UI
importer/       Scheduled Google Drive sync service
specs/          Feature specifications and implementation plan
```

## Running tests

```bash
cd backend
python -m pytest tests/ -v
```

No environment variables need to be exported manually — `conftest.py` sets test defaults.
