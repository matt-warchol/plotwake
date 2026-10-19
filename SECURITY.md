# Security

Plotwake 0.1.x is a single-owner self-hosted app. Report vulnerabilities privately to m@avo42.com with “Plotwake security” in the subject. Please do not publish credentials, database files or exploitable details in a public issue. No response-time guarantee is offered.

## Deployment boundary

The Node server authenticates both static files and API routes using HTTP Basic authentication. It fails closed without a unique 16+ character password, compares credentials with a constant-time comparison, limits failed attempts in bounded process memory, and checks the Origin on mutations. Restarting clears the attempt counter; use a reverse proxy's rate limits for an exposed deployment. There is no public signup or cross-user isolation: everyone given the owner password shares the board.

Use HTTPS for remote access. The localhost quick start uses HTTP only on your own device. Do not forward the app's port publicly without TLS. Set APP_ORIGIN to the exact browser origin. Reverse-proxy authentication or a private VPN can provide additional protection.

The SQLite file contains the Google deployment URL, connection key, source IDs and aggregate reports. They are not encrypted by the app. The process uses restrictive file permissions; protect the disk, its directory, snapshots and backups. Do not commit them. Use your host's encryption/secret controls where appropriate. The Google OAuth token stays in your Apps Script account; the separate connection key authorizes report requests. Rotate it in Apps Script and replace the dashboard connection if exposed.

The synthetic demo is static and contains no owner database, source IDs, credentials or report endpoint. Do not upload a live database into a public static host. Client-side demo flags are not an access-control mechanism for a backend; the demo build simply has no backend attached.

This release has automated regression checks and launch smoke tests. It has not had an independent penetration test. See docs/release-checklist.md for verified boundaries and limits.
