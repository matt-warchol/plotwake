import {z} from 'zod';
export const connectionSchema=z.object({
 url:z.string().trim().regex(/^https:\/\/script\.google\.com\/macros\/s\/[a-zA-Z0-9_-]{10,300}\/exec$/,'Use the deployed Google Web app URL ending in /exec. Do not use the editor URL or /dev test URL.'),
 secret:z.string().trim().regex(/^[a-f0-9]{64}$/i,'Paste only the 64-character connection key printed by setup, without the log time or label.')
});
export function connectionHelp(message:string){
 if(/Invalid connection key/i.test(message))return 'The script rejected the key. Run setup again in that same Apps Script project, then copy only its 64-character key. Make sure the /exec URL belongs to that project.';
 if(/insufficient authentication scopes|ACCESS_TOKEN_SCOPE_INSUFFICIENT|AnalyticsAdmin is not defined|AnalyticsData is not defined/i.test(message))return 'In Apps Script, replace appsscript.json with the supplied manifest (it declares AnalyticsAdmin, AnalyticsData and the read-only Search Console scope). Save, run setup and authorize the requested permissions. Then use Deploy → Manage deployments → Edit → New version → Deploy. Retry with the same /exec URL.';
 if(/accessNotConfigured|SERVICE_DISABLED|has not been used|is disabled/i.test(message))return 'One of the Google APIs is not enabled in the Cloud project linked to this script. Check the project number and enable the API named in the error, then retry.';
 if(/Google returned|sign-in|HTTP 401|HTTP 403|permission|not have access|authorization/i.test(message))return 'Check the Apps Script Web app deployment: Execute as Me; Who has access Anyone. Run setup and grant access with the Google account that can read your Analytics and Search Console. After code changes, update the deployment to a new version.';
 if(/timeout|abort|timed out/i.test(message))return 'Google took too long to respond. Wait a moment and try again. Your existing connection has not been replaced.';
 return 'Open Apps Script → Executions to see the failed call. If you recently pasted or edited the code, use Deploy → Manage deployments → Edit → New version → Deploy, then retry.';
}
