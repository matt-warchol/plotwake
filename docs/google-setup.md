# Connect your own Google reports

You need a Google account with access to the GA4 properties and verified Search Console sites you want to read. The app does not create or install trackers. Either source can be used independently. Google Cloud's interface changes; the links below point to Google's own instructions.

## 1. Create the script

Open https://script.google.com/home/start and create a project named Plotwake. Replace Code.gs with [the provided script](../public/google/Code.gs).

In the script's **Project Settings** (gear), enable **Show appsscript.json manifest file in editor**. Return to the editor and replace appsscript.json with [the provided manifest](../public/google/appsscript.json). This enables the Analytics Admin/Data services and read-only Search Console scope. Do not paste the JSON into Code.gs.

## 2. Link the Google Cloud project

In Google Cloud Console, choose the intended project. Open **IAM & Admin → Settings** or the project's dashboard and copy its **Project number** (digits, not the text project ID).

Back in **Apps Script → Project Settings → Google Cloud Platform project**, choose **Change project**, enter the number and confirm. If Google asks for consent configuration first, open Google Auth Platform / OAuth consent screen for that same Cloud project, complete the required app/contact details, and add your own Google email under test users if the app is in Testing. Do not request verification or publish the consent app merely to run your own personal script unless Google requires it for your account/setup.

Enable these APIs in the same linked project:

- https://console.cloud.google.com/apis/library/searchconsole.googleapis.com
- https://console.cloud.google.com/apis/library/analyticsdata.googleapis.com
- https://console.cloud.google.com/apis/library/analyticsadmin.googleapis.com

Google's guide: https://developers.google.com/apps-script/guides/cloud-platform-projects#switching_to_a_different_standard_gcp_project

## 3. Authorize and deploy

In Apps Script, select and run **setup**. Review and authorize the requested read permissions. If your administrator blocks these scopes, stop and ask the administrator; do not bypass organizational controls.

Copy **only the 64-character connection key** from the execution log, without the time or label. It is a shared secret for the dashboard/script connection, not a Google OAuth token or Cloud API key.

Choose **Deploy → New deployment → Web app**. Execute as **Me**; access **Anyone**. The script rejects requests without the connection key. Your dashboard itself remains password-protected. If your organization prohibits this deployment setting, this script-based connection is not supported under that restriction.

Copy the URL ending in **/exec**, paste it and the connection key into Plotwake → Connections, then click **Test & connect**.

## 4. Map projects

Add a name/domain and select the intended GA4 property and/or Search Console site for each project. Use each exact source once. A GA4 property that combines multiple websites is not automatically filtered by your domain label. Search Console parent/child scopes are reconciled automatically.

Optional: confirm source tracking start dates only if you know measurement was active from those dates. Otherwise leave them blank; the app will wait for enough observed history. Save & fetch data.

## Common failures

| Message | What to check |
|---|---|
| AnalyticsAdmin / AnalyticsData is not defined | Replace the manifest, save it, authorize setup, and deploy a new version |
| Insufficient authentication scopes | The manifest needs the read-only Search Console scope; rerun setup to authorize, then redeploy |
| API disabled / never used | Enable the named API in the Cloud project number linked to this script |
| Invalid key | Use the key printed by setup in that same script project |
| Returned a sign-in page | Use the deployed /exec URL, execute as Me, access Anyone |
| No properties | Check that the authorizing Google account has access to the reports |
| Old behavior after editing | Deploy → Manage deployments → Edit → Version: New version → Deploy; saving alone does not update /exec |

Your Google OAuth token remains inside the script. Never paste the connection key into issues, screenshots, chat messages or public source. See SECURITY.md for storage/rotation guidance.

## Upgrading from 0.1.0

Back up your SQLite directory, update Plotwake, run `npm ci` and rebuild. Keep the same `.env` and database path. No destructive database migration is required.

For yesterday’s provisional figures and the new traffic detail panels, replace Code.gs in **your existing Apps Script** with the updated file here. Keep its existing manifest and script properties; the connection key and read-only OAuth scopes are unchanged. Then **Deploy → Manage deployments → Edit the existing web app → Version: New version → Deploy**. Saving the file alone does not update the deployed web app.

Keep the same /exec URL, return to Plotwake, and click Fetch latest. Older scripts still support the daily overview through a compatibility fallback, but retain their three-day delay and cannot supply detail reports. The dashboard explains when the script needs updating.

Breakdown units differ: channels/referrers/campaigns/countries/entry pages use sessions, pages use page views, and search queries use clicks. Query lists omit anonymised queries and will not add up to all search clicks. Shared GA4 properties still need to match the intended project scope.

The **Search pages** tab compares page clicks, impressions, CTR and average position with the preceding period. It flags a page when clicks fall by at least 3 and 10% while impressions remain within 5% of the previous period or grow. It compares Google's first 1,000 returned page rows from each period, so it is a practical watch list and may miss low-volume pages outside those results. Recent data can change.

If the dashboard says the feature needs a script update, replace Code.gs in the existing Apps Script with the current [Code.gs](../public/google/Code.gs), then deploy a new version of the existing web app. Keep the same manifest, project number, key and `/exec` URL; no additional OAuth scope is needed.

## Enabling Live pulse after upgrading to 0.3.0

Replace Code.gs in your **existing** Apps Script project with the current [Code.gs](../public/google/Code.gs). Keep your manifest, Google Cloud project, connection key and existing `/exec` URL. Choose **Deploy → Manage deployments → Edit the existing web app → Version: New version → Deploy**. Saving the script does not update the deployed web app. No new OAuth scope is required. If Plotwake says “Update your Google script to enable live activity,” the web app is still running an older version.

Live pulse requires each project you want to see to have a GA4 property mapped in Connections. The map shows country-level aggregates, not individual people or exact locations. GA4's realtime API normally covers the last five minutes here; it is independent of the daily reports and Search Console. The public demo always shows synthetic activity.
