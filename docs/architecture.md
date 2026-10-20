# Architecture

The React interface renders aggregate reports and a deterministic executive summary. Vite builds static assets. The Node 24+ HTTP server authenticates every request, serves those files, validates API operations with Zod, and stores JSON records in SQLite using Node's built-in SQLite library.

- `src/overview.tsx` and `src/overview.css`: v2 overview, multi-project chart selection, scoped metrics, breakdowns, briefing, source health and reminders.
- `src/dashboard.tsx`: connection setup, project editing, settings drafts and Cancel.
- `lib/metrics.ts`: source-specific errors, comparison coverage, signal thresholds, disjoint Search Console scopes and synthetic fixtures.
- `lib/summary.ts`: legacy briefing helpers. `lib/v2.ts`: shared v2 date windows, scope totals and reminder keys; the briefing uses these deterministic signals. No LLM calls.
- `lib/snapshots.ts`: retain only compatible source mappings and preserve last successful data on partial failures.
- `server/api.ts`: discover sources, save projects, fetch and validate 180-day reports, v2 detail reports and saved reminder preferences. Remote calls accept only the canonical Google Apps Script deployment format.
- `server/index.ts`: authenticated HTTP boundary, bounded failed-login tracking, static-file boundary, HTTP headers and request-size limit.
- `server/store.ts`: SQLite persistence, parameterized statements and restrictive file permissions.
- `public/google/`: the script and OAuth manifest users install in their own Google account.

## Separate public demo

`npm run build:demo` compiles with Vite's demo mode. It starts from six public project names and synthetic fixtures. It skips the saved-data fetch and refresh path. Connection controls link to this repository instead of accepting credentials. Deploy only `demo-dist/` to a static host. The production owner build is `dist/`, served by the authenticated Node server.

No runtime database, infrastructure identity or private report snapshot is packaged into either frontend build. The public demo's numbers are not traction claims.

## Updating the original private version

This repository was extracted from a personal dashboard. The original private deployment uses its own authentication and storage adapters; neither its hosting identity nor its database is in this repository. The standalone release uses Node/SQLite so other people can run it without that original host.
