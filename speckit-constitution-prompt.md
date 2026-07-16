This project is "Timeline Viewer" — a personal, single-user web application
for privately viewing my own Google Maps Timeline location history on a map.

Technology stack (mandatory, non-negotiable):
- Frontend: React.js, using the Google Maps JavaScript API for map rendering.
- Backend: Python 3.13, FastAPI (async).
- Database: PostgreSQL.
- Local orchestration: Docker Compose (services: postgres, backend, frontend,
  and a background "importer" service).
- Authentication: JWT bearer tokens; passwords hashed with bcrypt.
  No session-based auth, no OAuth login for end users.

Architectural principles:

1. Simplicity first: this is a personal tool for a single user. Do not add
   multi-tenancy, user self-registration flows, roles/permissions, or other
   complexity not explicitly required by the specification.

2. Single source of parsing logic: the logic that parses a Google Timeline
   export file into structured location points must live in exactly one
   shared module. Both the manual file-upload feature and the automated
   Google Drive import feature must call this same module — never duplicate
   parsing logic.

3. Secrets via environment variables only: database credentials, JWT
   signing secret, Google Maps API key, Google service account credentials,
   and Google Drive folder ID must be provided via environment variables /
   a `.env` file, never hardcoded or committed to source control. Provide a
   `.env.example` with placeholders for all of them.

4. Fault tolerance on ingestion: a malformed, oversized, or unexpected input
   file must never crash the backend or the importer service. Failures must
   be caught, logged, and surfaced; the service must keep running and retry
   on its next scheduled cycle.

5. Observability: every attempt to import data — whether triggered manually
   via upload or automatically via the Drive-sync job — must be recorded in
   a persistent audit log table with its outcome (imported / no changes /
   failed), so the user can verify the system is working correctly over
   time.

6. Minimal external dependencies: only the Google Maps JavaScript API (for
   rendering) and the Google Drive API (for automatic ingestion) may be used
   as third-party services. Do not introduce other external services
   without updating this constitution first.

7. Testing expectations: automated tests are required for the Timeline
   parsing logic (its correctness is critical to the product) and for the
   authentication flow. Full UI test coverage is not required for the
   initial MVP.

8. Access control: every API endpoint except the login endpoint must reject
   requests without a valid JWT with a 401 response.
