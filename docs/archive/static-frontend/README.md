# Static Frontend Archive

Phase 12 moved the pre-React static frontend here for reference only.

## Contents

- `files/`: archived standalone pages, CSS, image assets, and browser JavaScript from the pre-React frontend.
- `docs/`: historical audit and migration documents that describe the static frontend state before React migration.

## Serving Status

These files are not served by the Express production frontend middleware. Production serving uses the React build in `frontend/dist`, while selected old page URLs are retained only as HTTP redirects to their React route equivalents.

Do not add new runtime dependencies on this archive.
