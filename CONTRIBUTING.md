# Contributing

Small, concrete improvements are welcome. Open an issue first for a new integration or architectural change. Explain the problem, a reproducible example, and what a user should see instead.

1. Fork and clone the repository; use Node24+.
2. Run `npm ci`. For frontend work, `npx vite --mode demo` uses synthetic data without Google access.
3. Run `npm run typecheck`, `npm test`, `npm run build` and `npm run build:demo`.
4. Include a regression check for changed calculation, persistence or authentication behavior. Include a screenshot for a UI change.
5. Keep Google secrets, personal reports, databases and `.env` files out of commits and issues.

Prefer fewer controls and clearer decisions. Do not add a dependency for a few lines of code. Keep missing data distinct from zero, identify the scope of a number, and preserve previous reports on failure.

By contributing, you agree to license your contribution under this repository's MIT license. Respect other contributors; critique the code, not the person.
