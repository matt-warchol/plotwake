# Data handling

The public Plotwake demo at avo42.com/pulse uses generated report values and public project names. It does not connect to a visitor's Google account or send reports to a Plotwake service. The interface saves period, metric, project and filter preferences in browser local storage; clearing that site's storage resets them. The host may keep normal access logs. See the portfolio's privacy notice for avo42.com.

A self-hosted instance runs on infrastructure its operator chooses. Its SQLite file contains project settings, the Apps Script connection key, source IDs and aggregate daily reports. Google processes the report requests. The app does not encrypt its database; protect the directory, disk and backups. The app itself adds no visitor analytics tracker. Basic authentication is handled by the operator's server and browser; use HTTPS remotely.

The maintainer does not receive a copy of a self-hosted database. GitHub and the host process normal requests to their services; opening an external Google report is a separate visit to Google. The operator is responsible for its own access, retention and privacy information. This document describes the software, not a universal privacy policy for every installation.
