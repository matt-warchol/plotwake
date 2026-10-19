# 0.1.0 release checks

Local release verification is recorded at publication. This is a first release, not a claim of independent security review.

- Source copied into a fresh repository with no private Git history, hosting identity, database or environment file.
- Public demo uses generated figures and public project names, with explicit synthetic-data labels.
- Normal server requires an owner password; the demo is a separate static build.
- Type checking, calculation/connection/summary/snapshot regressions, standalone server tests and both builds must pass before publication.
- Browser checks cover the demo's metric/period/project controls, executive summary and responsive cards.
- Docker configuration is provided; container execution is unverified unless recorded below.
- Google setup derives from the working private integration, but a new Google account's complete authorization flow is not re-run for every release.
- No scheduled fetch happens while the app is closed. No independent penetration/load audit has been performed.

## Verified for 0.1.0

Type check: PASS. Five automated test files: PASS, including a real temporary Node/SQLite server with unauthenticated access, CSRF, persistence and rate-limit assertions. Owner frontend build: PASS. Static demo build at /pulse/: PASS. Desktop demo metric, period and project controls: PASS, recorded from the actual interface. Docker execution: UNVERIFIED (Docker is not installed in the release environment). Fresh Google-account authorization: UNVERIFIED; the original personal connection was previously working.
