Build "Timeline Viewer," a personal web application that lets me privately
view my own Google Maps location history, browsable one day at a time on a
map.

Background: Google no longer stores my Maps Timeline history in the cloud —
it lives only on my phone. Google's Maps app lets me manually export this
history as a JSON file ("Export Timeline data"). I'm worried about losing
years of location history if something happens to my phone, so I want my
own private web app where I can bring that exported data in and always be
able to see it.

Who uses this: just me, the owner. It must be protected by a
username/password login — nobody else should be able to view my location
history.

Core user stories:
- As the user, I log in with a username and password before I can see or
  upload anything.
- As the user, I can upload a Timeline export file through the web UI, and
  its contents become available for viewing.
- As the user, when I open the app, I see my route/places for today by
  default, plotted on a map.
- As the user, I can pick any other date and see that day's route/places
  instead.
- As the user, if a chosen day has no recorded data, I see a clear "no data
  for this date" message instead of an empty or broken map.
- As the user, I want to point the app at a folder in my personal Google
  Drive where I'll periodically drop a fresh Timeline export file. The app
  should periodically check that folder on its own, notice when a new or
  changed file appears, and import it automatically — without me needing to
  manually upload it through the UI every time.
- As the user, I want to be able to see a record of every automatic import
  attempt (found new data and imported it / checked and found nothing new /
  failed with an error) so I can trust that the automatic sync is actually
  working, rather than silently doing nothing.

About the input data: the file I export from Google Maps ("Export Timeline
data") is JSON containing a top-level `semanticSegments` array. Each entry
in that array describes either:
- a period of movement, with a `timelinePath` — an ordered list of GPS
  points (as "latitude°, longitude°" strings) with timestamps, or
- a stay at a place, with a `visit` object containing the place's
  coordinates, a semantic label (e.g. home, inferred work), and a
  confidence score.

The system must correctly interpret both kinds of entries as points
belonging to a specific calendar day, so that a day's "route" can include
both travel paths and place visits.

Acceptance criteria:
- Unauthenticated requests to any data endpoint are rejected.
- A valid username/password produces a working login session.
- Uploading a real Google Timeline export file results in that day's (and
  all other days') data becoming viewable on the map.
- The default view on opening the app is today's route.
- Switching the selected date updates the map to that day's data, or shows
  a "no data" message if none exists.
- Once a Google Drive folder is configured, the app detects new or changed
  files there on its own schedule and imports them without manual action.
- If the Drive file hasn't changed since the last check, no duplicate
  import happens, and this is still recorded as a checked-but-no-changes
  event.
- Every import attempt (manual or automatic) is visible in some form of
  log/history, including failures.

Out of scope for this version:
- User registration/sign-up flow (a single account is provisioned ahead of
  time).
- Editing or deleting previously imported location data.
- Multi-user support, roles, or sharing.
- Polished visual design — a functional UI is sufficient.
- Any direct, real-time connection to a phone; all data arrives via the
  exported JSON file, either uploaded manually or dropped into the watched
  Google Drive folder.
