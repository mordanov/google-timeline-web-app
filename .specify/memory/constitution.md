<!--
SYNC IMPACT REPORT
==================
Version change: (unversioned template) → 1.0.0
Added sections:
  - Core Principles (8 principles)
  - Technology Stack
  - Development Workflow
  - Governance
Modified principles: N/A (initial ratification)
Removed sections: N/A (initial ratification)

Templates reviewed:
  ✅ .specify/templates/plan-template.md — Constitution Check section is generic;
     no stale references found. Gates will be derived from this constitution at
     plan time.
  ✅ .specify/templates/spec-template.md — No constitution-specific references;
     compatible as-is.
  ✅ .specify/templates/tasks-template.md — Testing tasks marked optional, which
     aligns with Principle VII (tests required for parsing + auth only; full UI
     coverage not required for MVP).
  ℹ️  .specify/templates/commands/ — Directory not present; skipped.

Deferred TODOs: None.
-->

# Timeline Viewer Constitution

## Core Principles

### I. Simplicity First

This is a personal tool for a single user. Features MUST be limited to those
explicitly required by the specification. The following MUST NOT be added without
a constitution amendment:

- Multi-tenancy or per-user data isolation
- User self-registration flows
- Role-based or permission-based access control
- Any complexity not driven by a stated requirement

Every design decision MUST be answerable with: "This is the minimum needed to
satisfy the requirement."

### II. Single Source of Parsing Logic

The logic that parses a Google Timeline export file into structured location
points MUST reside in exactly one shared module. Both the manual file-upload
feature and the automated Google Drive import feature MUST call this module
directly — never duplicate, wrap, or shadow it. Any change to parsing behavior
MUST be made in that one place and is immediately reflected in all ingestion
paths.

### III. Secrets via Environment Variables Only

Database credentials, the JWT signing secret, the Google Maps API key, Google
service account credentials, and the Google Drive folder ID MUST be provided
exclusively via environment variables or a `.env` file. They MUST NOT be
hardcoded in source code or committed to version control. A `.env.example` file
with placeholder values for every required variable MUST be kept up to date and
committed to the repository.

### IV. Fault Tolerance on Ingestion

A malformed, oversized, or otherwise unexpected input file MUST NOT crash the
backend or the importer service. Every ingestion path (manual upload and
Drive-sync) MUST:

- Catch all parse and I/O exceptions
- Log the failure with sufficient context to diagnose it
- Surface the failure status in the audit log (see Principle V)
- Leave the service in a running state, ready for the next request or scheduled
  cycle

Letting an exception propagate to an unhandled level is a violation of this
principle.

### V. Observability

Every attempt to import data — whether triggered manually via file upload or
automatically via the Drive-sync job — MUST be recorded in a persistent audit
log table. Each record MUST capture at minimum: timestamp, trigger source
(manual/scheduled), file identifier, and outcome (`imported` / `no_changes` /
`failed`). This table is the primary evidence that the system is operating
correctly over time and MUST NOT be made optional or ephemeral.

### VI. Minimal External Dependencies

Only two third-party services are permitted without a constitution amendment:

1. **Google Maps JavaScript API** — for map rendering in the frontend.
2. **Google Drive API** — for automatic file ingestion in the importer service.

No other external services, SaaS integrations, or third-party APIs MAY be
introduced. Internal libraries and packages do not count as external services.

### VII. Testing Expectations

Automated tests are REQUIRED for:

- **Timeline parsing logic** — correctness here is critical to the entire
  product; every supported export format variation and edge case MUST have test
  coverage.
- **Authentication flow** — login, token issuance, token validation, and
  rejection of invalid/expired tokens MUST be tested.

Full UI or end-to-end test coverage is NOT required for the initial MVP. Test
files for the above MUST be created and passing before the relevant code is
considered complete.

### VIII. Access Control

Every API endpoint EXCEPT the login endpoint MUST reject requests that do not
carry a valid, unexpired JWT bearer token with an HTTP 401 response. There are
no exceptions. Authentication MUST use JWT bearer tokens; passwords MUST be
hashed with bcrypt. Session-based auth and OAuth login for end users MUST NOT
be used.

## Technology Stack

The following stack is mandatory and non-negotiable. Deviations require a
constitution amendment.

| Layer | Technology |
|---|---|
| Frontend | React.js with Google Maps JavaScript API |
| Backend | Python 3.13, FastAPI (async) |
| Database | PostgreSQL |
| Orchestration | Docker Compose (services: `postgres`, `backend`, `frontend`, `importer`) |
| Auth | JWT bearer tokens; bcrypt password hashing |

## Development Workflow

- All secrets and credentials MUST be sourced from environment variables (see
  Principle III). The `.env` file MUST never be committed; `.env.example` MUST
  always be committed and current.
- Every parsing change MUST be verified by running the parsing test suite before
  the change is considered done (Principle VII).
- Every ingestion path change MUST be manually verified to produce an audit log
  record (Principle V).
- Docker Compose is the canonical way to run the full stack locally. The
  `docker-compose.yml` MUST remain functional at all times on the `main` branch.
- The constitution supersedes all other project conventions. Where a conflict
  exists, the constitution wins.

## Governance

Amendments to this constitution MUST be:

1. Discussed and justified before implementation begins.
2. Reflected in an updated constitution version (following semantic versioning
   below).
3. Propagated to all dependent templates and documentation on the same commit.

**Versioning policy**:
- **MAJOR** — backward-incompatible change: principle removal, redefinition, or
  a technology stack replacement.
- **MINOR** — additive change: new principle, new technology constraint, or
  materially expanded guidance.
- **PATCH** — non-semantic change: clarifications, wording, typo fixes.

**Compliance review**: Constitution Check gates in `plan-template.md` MUST be
evaluated against this document at the start of every feature plan. Violations
MUST be justified in the Complexity Tracking table or resolved before
implementation begins.

**Version**: 1.0.0 | **Ratified**: 2026-07-16 | **Last Amended**: 2026-07-16
