# Quickstart

Everything runs via Docker Compose. Complete these steps once before your first `docker compose up`.

## Prerequisites

- Docker Desktop (or Docker Engine + Compose plugin) installed and running
- A Google Maps JavaScript API key
- *(Optional, for Drive sync)* A Google Cloud service account with Drive read access

---

## Step 1 — Copy the environment file

```bash
cp .env.example .env
```

---

## Step 2 — Fill in `.env`

Open `.env` and set the values below. Every other variable already has a working default.

### Required

| Variable | How to get it |
|---|---|
| `POSTGRES_PASSWORD` | Any strong password you choose |
| `JWT_SECRET` | Any long random string, e.g. `openssl rand -hex 32` |
| `VITE_GOOGLE_MAPS_API_KEY` | [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials → Create API key → restrict to **Maps JavaScript API** |
| `DATABASE_URL` | Update the password to match `POSTGRES_PASSWORD` — keep the rest unchanged |

### Optional — Google Drive sync

Skip these if you plan to upload files manually through the UI.

| Variable | How to get it |
|---|---|
| `GOOGLE_SERVICE_ACCOUNT_JSON` | See [Step 3](#step-3--set-up-google-drive-sync-optional) below |
| `GOOGLE_DRIVE_FOLDER_ID` | The ID at the end of your Drive folder URL: `drive.google.com/drive/folders/<ID>` |
| `SYNC_INTERVAL_SECONDS` | How often the importer polls Drive (default `900` = 15 min) |

---

## Step 3 — Set up Google Drive sync *(optional)*

1. In [Google Cloud Console](https://console.cloud.google.com/), create a service account (IAM & Admin → Service Accounts → Create).
2. Grant it no roles — it only needs read access to one Drive folder.
3. Create a JSON key for the service account (Keys → Add Key → JSON). Download the file.
4. Collapse the JSON to a single line (remove all newlines):
   ```bash
   cat your-key.json | tr -d '\n'
   ```
5. Paste that single-line string as the value of `GOOGLE_SERVICE_ACCOUNT_JSON` in `.env`.
6. Share the target Google Drive folder with the service account's email address (viewer permission is enough).

---

## Step 4 — Start the application

```bash
docker compose up --build
```

The first build takes a few minutes to download images and install dependencies. On subsequent starts, omit `--build`.

Once all services are healthy the app is available at:

- **Frontend** — http://localhost:3000
- **Backend API** — http://localhost:8000
- **API docs** — http://localhost:8000/docs

---

## Step 5 — Create your user account

The application has a single-user model. Run this once after the containers are up:

```bash
docker compose exec backend python scripts/create_user.py \
  --username your_username \
  --password your_password
```

You can now log in at http://localhost:3000.

---

## Step 6 — Import your Timeline data

### Option A — Manual upload

1. Export your Google Maps Timeline: Google Maps → your profile → Timeline → Export (downloads `Timeline.json`).
2. In the app, click **Upload** in the sidebar, choose the file, and wait for the import to finish.

### Option B — Google Drive sync

1. Place your `Timeline.json` in the Google Drive folder you shared with the service account.
2. The importer service will detect and import it automatically on its next cycle.
3. Re-exporting and replacing the file triggers a re-import automatically (change detection is MD5-based).

---

## Stopping and restarting

```bash
# Stop (keeps data)
docker compose down

# Stop and remove all data (full reset)
docker compose down -v
```

---

## Running database migrations

Migrations run automatically on backend startup. To run them manually:

```bash
docker compose exec backend alembic upgrade head
```
