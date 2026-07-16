# Feature Specification: Timeline Viewer

**Feature Branch**: `001-timeline-viewer`
**Created**: 2026-07-16
**Status**: Draft

## Clarifications

### Session 2026-07-16

- Q: How should transport-mode activity breakdown be displayed? → A: Both a stats summary panel (distance/time per mode) AND color-coded path segments on the map by transport mode.
- Q: How should paths be rendered in date-range view? → A: Each day rendered in a distinct color with a map legend showing which color corresponds to which date.
- Q: What scope should the activity stats cover in date-range view? → A: Aggregate totals for the full selected period (not per-day breakdown).

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Authenticated Login (Priority: P1)

The user navigates to the app and is presented with a login form. After entering
valid credentials (username and password), they gain access to all features.
Entering invalid credentials shows an error and leaves them on the login page.
All data-access pages redirect unauthenticated visitors to the login screen.

**Why this priority**: Without authentication there is nothing else to show;
every other story depends on the user being logged in.

**Independent Test**: Visit any URL without a session → redirected to login.
Submit correct credentials → land on the map view. Submit wrong credentials →
error message, still on login page.

**Acceptance Scenarios**:

1. **Given** the user is not logged in, **When** they visit any page, **Then**
   they are redirected to the login screen.
2. **Given** the login form, **When** valid username/password is submitted,
   **Then** the user gains access and is taken to the default map view.
3. **Given** the login form, **When** invalid credentials are submitted, **Then**
   an error message is shown and no access is granted.
4. **Given** a valid session, **When** the user's session expires or they log out,
   **Then** subsequent requests are rejected and they are redirected to login.

---

### User Story 2 — View Location History on a Map (Priority: P1)

After logging in the user sees today's route and visited places plotted on a
map. Path segments are color-coded by transport mode (walking, driving, cycling,
etc.) and a stats panel shows the aggregate distance and time per transport mode
for the selected period. The user can pick any other calendar date and the map
updates. If a chosen day has no recorded data, a clear message replaces the map
or is shown alongside it.

**Why this priority**: Viewing data on the map is the core value proposition of
the entire application.

**Independent Test**: With at least one day of imported data, open the app →
today's route appears, color-coded by transport mode, with a stats panel. Select
a day with data → map updates. Select a day with no data → "no data for this
date" message shown.

**Acceptance Scenarios**:

1. **Given** the user is logged in and data exists for today, **When** the app
   loads, **Then** today's route and place visits are plotted on the map with
   path segments color-coded by transport mode and a stats panel showing
   distance/time per mode.
2. **Given** the map view, **When** the user selects a date that has data,
   **Then** the map updates to show that day's route and visits, color-coded by
   transport mode, with updated stats.
3. **Given** the map view, **When** the user selects a date with no data,
   **Then** a clear "no data for this date" message is displayed instead of a
   blank or broken map.
4. **Given** today has no recorded data, **When** the app loads, **Then** the
   "no data for this date" message is shown for today.

---

### User Story 2b — Date Range View (Priority: P2)

The user can select a start and end date to view all paths for that period on
the map simultaneously. Each day's path is rendered in a distinct color, and a
map legend identifies which color corresponds to which date. The stats panel
shows aggregate totals (distance and time per transport mode) for the entire
selected period.

**Why this priority**: Single-day view is the core interaction; date-range view
adds meaningful analytical value but the app is fully usable without it.

**Independent Test**: Select a date range covering at least 2 days with data →
map shows all days' paths, each in a different color, with a legend → stats
panel shows aggregate totals across all selected days.

**Acceptance Scenarios**:

1. **Given** the map view, **When** the user selects a date range, **Then** all
   days within that range that have data are plotted on the map simultaneously,
   each day's path in a distinct color.
2. **Given** a date-range map, **When** multiple days are shown, **Then** a
   legend is visible on the map linking each color to its corresponding date.
3. **Given** a date-range map, **When** the stats panel is shown, **Then** it
   displays aggregate totals for distance and time per transport mode across the
   full selected period (not broken down per day).
4. **Given** a date range where some days have no data, **When** the map
   renders, **Then** only days with data are plotted; missing days are not
   represented as empty paths.

---

### User Story 3 — Upload a Timeline Export File (Priority: P2)

The user can upload a Google Maps Timeline JSON export file through the web UI.
After a successful upload, the data from that file is parsed and stored, and the
newly imported days become browsable on the map immediately.

**Why this priority**: Manual upload is the primary data-ingestion path for
initial setup and ad hoc updates.

**Independent Test**: Upload a real Timeline export file → upload succeeds →
select a date covered by that file → route/visits appear on the map.

**Acceptance Scenarios**:

1. **Given** the upload UI, **When** a valid Timeline JSON file is submitted,
   **Then** a success message is shown and the data becomes viewable on the map.
2. **Given** the upload UI, **When** a malformed or unrecognized file is
   submitted, **Then** a clear error message is shown and no partial data is
   stored.
3. **Given** an existing import, **When** the same file is uploaded again,
   **Then** the data is not duplicated (idempotent import).
4. **Given** a successful upload, **When** the user browses to a date from the
   uploaded file, **Then** the map shows data for that date.

---

### User Story 4 — Automatic Google Drive Sync (Priority: P2)

The user configures a Google Drive folder (via environment variable). The
importer service periodically checks that folder, detects new or changed
Timeline export files, and imports them automatically without any manual action
from the user.

**Why this priority**: Automatic sync removes the recurring manual step once the
user has a working Drive setup, but the app is fully usable without it.

**Independent Test**: Drop a Timeline JSON file into the configured Drive folder
→ wait one sync cycle → the file's data appears on the map without any manual
upload.

**Acceptance Scenarios**:

1. **Given** a configured Drive folder, **When** a new or changed Timeline file
   appears, **Then** the importer detects and imports it on its next scheduled
   check.
2. **Given** a file that has not changed since the last check, **When** the
   importer runs, **Then** no duplicate import occurs and the event is logged
   as "no changes."
3. **Given** a malformed file in the Drive folder, **When** the importer
   processes it, **Then** the failure is caught, logged, and the service
   continues running normally.
4. **Given** the Drive folder is unreachable (network error, revoked token),
   **When** the importer runs, **Then** the error is logged and the service
   retries on its next scheduled cycle.

---

### User Story 5 — Import Audit Log (Priority: P2)

The user can view a record of every import attempt — both manual uploads and
automatic Drive-sync events — including the outcome (data imported / no changes
found / failed with error). This log lets the user verify the system is working
correctly over time.

**Why this priority**: Without the audit log the user has no way to trust that
automatic sync is functioning; it is required by the constitution.

**Independent Test**: Perform a manual upload and a Drive-sync cycle → both
events appear in the audit log with their correct outcomes. Introduce a
malformed file → the failure event appears in the log.

**Acceptance Scenarios**:

1. **Given** a completed manual upload, **When** the user views the audit log,
   **Then** an entry exists recording the timestamp, trigger source (manual),
   file identifier, and outcome.
2. **Given** a completed Drive-sync check, **When** the user views the audit log,
   **Then** an entry exists regardless of whether data was imported or not.
3. **Given** a failed import attempt, **When** the user views the audit log,
   **Then** the entry shows outcome "failed" with enough context to diagnose the
   issue.
4. **Given** multiple import attempts, **When** the user views the audit log,
   **Then** entries are ordered by recency with the most recent at the top.

---

### Edge Cases

- What happens when the uploaded file is valid JSON but does not contain a
  `semanticSegments` array? → Treated as malformed; error returned to the user.
- What happens when a `timelinePath` GPS point string cannot be parsed? →
  That point is skipped; remaining valid points in the file are still imported;
  the partial skip is noted in the audit log.
- What happens when a `visit` entry has no coordinate data? → That entry is
  skipped; the rest of the file is still processed.
- What happens when the Drive folder contains multiple new files? → Each file
  is processed independently; each generates its own audit log entry.
- What happens when the database is unavailable during import? → The import
  attempt fails gracefully, is logged as failed, and the service keeps running.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST require a valid username/password login before any
  data or upload functionality is accessible.
- **FR-002**: Every API endpoint except the login endpoint MUST reject requests
  without a valid session token with an unauthorized response.
- **FR-003**: The system MUST display today's route and visited places on a map
  as the default view upon login.
- **FR-004**: The system MUST allow the user to select any calendar date and
  display that day's route and place visits on the map.
- **FR-004b**: The system MUST allow the user to select a date range (start date
  + end date) and display all paths for every day within that range on the map
  simultaneously, with each day rendered in a distinct color and a legend
  identifying each color by date.
- **FR-005**: The system MUST display a clear "no data for this date" message
  when a selected date has no recorded location data.
- **FR-006**: The system MUST provide a file-upload interface for submitting a
  Google Maps Timeline JSON export.
- **FR-007**: The system MUST parse both `timelinePath` movement segments and
  `visit` place segments from a valid Timeline export and store them as
  discrete location points attributed to specific calendar days. Each movement
  point MUST retain its transport mode (e.g., walking, driving, cycling) where
  available in the source data, so path segments can be color-coded by mode and
  activity statistics can be computed.
- **FR-007b**: The system MUST display a stats panel alongside the map showing
  aggregate distance and time broken down by transport mode for the currently
  selected date or date range.
- **FR-008**: The parsing logic MUST reside in a single shared module used by
  both the manual upload path and the automatic Drive-sync path.
- **FR-009**: Uploading a file that has already been imported MUST NOT create
  duplicate records.
- **FR-010**: The system MUST include an importer service that periodically
  checks a configured Google Drive folder for new or changed Timeline export
  files and imports them automatically.
- **FR-011**: The importer MUST skip files that have not changed since the last
  successful check (determined by file hash or Drive file revision metadata).
- **FR-012**: Every import attempt (manual or automatic) MUST be recorded in a
  persistent audit log with at minimum: timestamp, trigger source, file
  identifier, and outcome (`imported` / `no_changes` / `failed`).
- **FR-013**: The audit log MUST be viewable by the logged-in user through the
  web UI.
- **FR-014**: A malformed, oversized, or unexpected input file MUST NOT crash
  the backend or importer; failures MUST be caught, logged, and the service
  MUST continue running.

### Key Entities

- **LocationPoint**: A single GPS coordinate with a timestamp; the atomic unit
  of location history. Belongs to a calendar day. Carries a transport mode
  (e.g., walking, driving, cycling) where available in the source data, enabling
  color-coding and activity statistics. May also carry a semantic place label
  (e.g., home, work) if derived from a `visit` entry.
- **ImportRecord**: An audit log entry recording one import attempt. Captures
  source, file identifier, timestamp, outcome, and an optional error message.
- **User**: A single application account used for authentication. Created by the
  operator ahead of time; no self-registration.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A logged-in user can open the app and see today's location data
  plotted on the map, color-coded by transport mode, within 3 seconds on a
  standard broadband connection.
- **SC-002**: Selecting a different date or date range updates the map and stats
  panel (or shows the no-data message) without a full page reload.
- **SC-002b**: The stats panel correctly reports aggregate distance and time per
  transport mode for any selected single day or date range, matching values
  derivable from the raw import data.
- **SC-003**: A Timeline JSON export file of typical size (up to 50 MB) uploads
  and is fully importable within 60 seconds.
- **SC-004**: A malformed or unrecognized file upload completes with a visible
  error message and zero partial data written to storage.
- **SC-005**: After a new file is placed in the configured Drive folder, the
  importer detects and processes it within two scheduled check cycles.
- **SC-006**: Every import attempt (successful, no-change, or failed) is
  traceable in the audit log; zero attempts are silently omitted.
- **SC-007**: An unauthenticated request to any data endpoint receives an
  unauthorized response 100% of the time.

## Assumptions

- A single user account is provisioned directly in the database by the operator
  before first use; there is no registration UI.
- "Today's data" is determined by the server's local date at the time of the
  request.
- Google Drive folder access is granted via a service account whose credentials
  are provided through environment variables.
- The sync interval for the Drive importer is configured via an environment
  variable; a reasonable default (e.g., every 15 minutes) is used if not set.
- "New or changed file" detection uses the Drive file's modification timestamp
  or revision ID rather than a content hash, to avoid downloading the full file
  before deciding to import it.
- The app is deployed on a private network or behind authentication; HTTPS is
  assumed to be handled at the infrastructure level (e.g., reverse proxy) and
  is out of scope for the application itself.
- Polished visual design is out of scope; a functional, readable UI is
  sufficient.
- Editing or deleting previously imported location data is out of scope for
  this version.
- Any direct real-time connection to a mobile device is out of scope; all data
  arrives as exported JSON files.
