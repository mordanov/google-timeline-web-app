# Quickstart: Timeline Viewer

Use this to verify the system is working end-to-end after implementation.

## Prerequisites

- Docker and Docker Compose installed
- A `.env` file at the repo root (copy from `.env.example` and fill values)
- A Google Maps API key (for frontend map rendering)
- Optional: A Google service account JSON key and a Drive folder ID for
  auto-sync

## 1. Start the stack

```bash
docker compose up --build
```

Wait until all four services are healthy:
- `postgres` — database ready
- `backend` — FastAPI listening on port 8000
- `frontend` — React dev server on port 3000
- `importer` — background sync service started

## 2. Provision the user account

```bash
docker compose exec backend python scripts/create_user.py \
  --username admin \
  --password changeme
```

## 3. Verify login

```bash
curl -s -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"changeme"}' | python -m json.tool
```

Expected: `{ "access_token": "...", "token_type": "bearer" }`

## 4. Import a Timeline file

Open `http://localhost:3000` in a browser, log in, and upload a Timeline JSON
export via the upload UI. After uploading, the audit log should show
`outcome: "imported"` and today's date (if data exists for today) should render
on the map.

Alternatively, via API:

```bash
TOKEN="<paste access_token here>"
curl -s -X POST http://localhost:8000/import/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/path/to/Timeline.json" | python -m json.tool
```

Expected: `{ "status": "queued", "import_record_id": <N> }`

## 5. Check import status

```bash
curl -s http://localhost:8000/import/status/<import_record_id> \
  -H "Authorization: Bearer $TOKEN" | python -m json.tool
```

Poll until `outcome` is `"imported"` or `"failed"`.

## 6. View today's map

Open `http://localhost:3000`. The map should show today's route, color-coded by
transport mode, with the stats panel visible.

## 7. Check the audit log

```bash
curl -s http://localhost:8000/import/history \
  -H "Authorization: Bearer $TOKEN" | python -m json.tool
```

Expected: at least one record with `outcome: "imported"`.

## 8. Verify access control

```bash
curl -s http://localhost:8000/locations/segments?date=$(date +%Y-%m-%d)
```

Expected: `401 Unauthorized` (no token provided).

## 9. (Optional) Verify Drive auto-sync

1. Set `GOOGLE_DRIVE_FOLDER_ID` and `GOOGLE_SERVICE_ACCOUNT_JSON` in `.env`
2. Drop a Timeline JSON file into the configured Drive folder
3. Wait one sync interval (default 15 min) or restart the `importer` container
4. Check `GET /import/history` — a new record with `trigger_source: "scheduled"`
   should appear

## Validation checklist

- [ ] Login returns a JWT
- [ ] Unauthenticated request to any data endpoint returns 401
- [ ] Upload queues successfully and completes with `outcome: "imported"`
- [ ] Map shows today's data (or "no data" message if no data for today)
- [ ] Switching dates updates the map
- [ ] Date range view shows each day in a distinct color with a legend
- [ ] Stats panel shows distance/time by transport mode
- [ ] Audit log shows every import attempt
