# Self-hosting and backups

Build with Node 24+, configure `.env`, and run `npm start` as described in the README. Keep a writable persistent disk. Ephemeral serverless filesystems will lose the SQLite database and are not a supported deployment target for this adapter.

## Reverse proxy

Bind the app to loopback and put your HTTPS reverse proxy in front. With Caddy, a typical configuration is:

```text
analytics.your-domain.example {
    reverse_proxy 127.0.0.1:3000
}
```

Set `APP_ORIGIN=https://analytics.your-domain.example`. Your browser's Basic authentication dialog is the owner login. HTTPS is required for remote access. Do not copy the public demo's no-backend deployment approach for your connected private data.

Docker uses the `/data` volume and the non-root `node` user. A named volume is the easiest starting point. For bind mounts, ensure the container's node user can write the directory. Check Docker and TLS behavior on your own host before sending real credentials.

## Backup and restore

The database holds settings, the connection key and aggregate reports. Treat backups as secrets. Stop the app, back up the whole database directory (including SQLite sidecar files if present), then restart. Restore into the same configured directory with owner-only access. Never upload a backup to a GitHub issue. For live backups, use SQLite's supported backup tooling rather than copying a database during an active write.

Upgrades: stop the app, keep a private backup, check out the release, run `npm ci && npm run build`, then start. The first release creates one table automatically and has no destructive migration. To roll back code, check out the prior release and rebuild; retain your backup if future versions change the schema.

## Troubleshooting

- **Browser repeatedly asks for login:** check username/password and whether your proxy forwards Authorization.
- **Saving returns Request not allowed:** APP_ORIGIN must exactly match the browser's scheme, hostname and port.
- **Read-only database:** check volume ownership and PLOTWAKE_DB.
- **Charts say Collecting baseline:** see the README's coverage rules; do not enter an invented tracking date to force a green signal.
- **Refresh fails:** old reports remain available. Open the source issue details and follow Google setup troubleshooting.
