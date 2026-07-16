# User Guide

## Logging in

Open http://localhost:3000. Enter the username and password you created with `create_user.py`. The session is stored in your browser's local storage and expires after 7 days.

---

## The map view

After logging in you land on the main map page.

### Sidebar

The left sidebar (260 px wide) contains:

- **Date / date range picker** — controls what data is shown on the map
- **Stats panel** — aggregate distances and durations by transport mode
- **Upload** button — expands the manual file upload form
- **Audit log** link — opens the import history page

### Choosing a date

Select **Single day** and pick a date from the input. The map loads all movement paths for that day. Paths are coloured by transport mode:

| Colour | Transport mode |
|---|---|
| Blue | Driving |
| Green | Walking |
| Orange | Running |
| Teal | Cycling |
| Purple | Transit (bus, train, metro) |
| Pink | Flying |
| Grey | Other / unknown |

If no data has been imported for the selected date, the map shows a "No data for this date" overlay.

### Choosing a date range

Select **Date range** and fill in a start and end date. All paths across the selected days are shown at once, each day rendered in a distinct colour. A legend in the bottom-left corner of the map maps colours to dates.

Stats in the sidebar aggregate across the entire range.

---

## Stats panel

The stats panel shows total distance (km) and total time (hours and minutes) broken down by transport mode for the currently selected date or range.

Only activity segments contribute to stats (visits and raw GPS paths are excluded).

---

## Importing data

### Manual upload

1. Click **Upload** in the sidebar.
2. Choose your `Timeline.json` export file.
3. The file is sent to the backend and processed in the background.
4. A progress indicator polls every 2 seconds and shows the result when processing finishes.

If you upload the same file twice the second import is a no-op (detected by MD5 checksum).

### Google Drive sync

If the Drive sync service is configured (see [QUICKSTART.md](QUICKSTART.md)), it polls the designated Drive folder automatically. When it finds a new or changed `Timeline.json` it imports it without any manual action.

---

## Audit log

Click **Audit log** in the sidebar (or navigate to http://localhost:3000/audit) to see a table of all import records, newest first.

Each row shows:

| Column | Meaning |
|---|---|
| Date/time | When the import was triggered |
| Source | `manual` (upload) or `scheduled` (Drive sync) |
| File | Filename or Drive file ID |
| Outcome | `imported`, `no_changes`, `failed`, or blank while in progress |
| Segments | Number of location segments stored |
| Error | Error message if the import failed |

---

## Exporting your Timeline data from Google Maps

1. Open Google Maps on your phone or at maps.google.com.
2. Tap your profile picture → **Your Timeline**.
3. Tap the three-dot menu → **Export Timeline data**.
4. A `Timeline.json` file is sent to your email or downloaded directly, depending on your device.

The app supports the `semanticSegments` format produced by current Google Maps exports.
