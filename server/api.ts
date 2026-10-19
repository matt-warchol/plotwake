import {z} from "zod";
import {compatibleSnapshot,mergeReports,signature} from "../lib/snapshots.ts";
import {defaults} from "../lib/metrics.ts";
import {connectionSchema,connectionHelp} from "../lib/connection.ts";
import {read,write} from "./store.ts";
const projectSchema=z.object({id:z.string().regex(/^[a-z0-9-]{1,80}$/),name:z.string().trim().min(1).max(80),domain:z.string().max(253).refine(v=>!v||/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/i.test(v)),color:z.string().regex(/^#[a-f0-9]{6}$/i),ga:z.string().regex(/^(properties\/\d+)?$/),gaSince:z.string().date().refine(v=>v<=new Date().toISOString().slice(0,10)).optional().or(z.literal("")),gscSince:z.string().date().refine(v=>v<=new Date().toISOString().slice(0,10)).optional().or(z.literal("")),gsc:z.string().max(500).refine(v=>!v||/^sc-domain:[a-z0-9.-]+$/i.test(v)||z.string().url().safeParse(v).success&&/^https?:\/\//.test(v))});
const reportSchema=z.object({id:z.string(),endDate:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),errors:z.array(z.string().max(1000)).max(5),days:z.array(z.object({date:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),sessions:z.number().finite().nonnegative().nullable(),clicks:z.number().finite().nonnegative().nullable(),impressions:z.number().finite().nonnegative().nullable()})).length(180)}).superRefine((r,ctx)=>{const end=Date.parse(r.endDate+"T00:00:00Z");if(!Number.isFinite(end)||r.days.some((d,i)=>d.date!==new Date(end-(179-i)*86400000).toISOString().slice(0,10)))ctx.addIssue({code:z.ZodIssueCode.custom,message:"Invalid date series"});});
function reply(data:unknown,status=200){return Response.json(data,{status,headers:{"Cache-Control":"private, no-store"}});}
async function remote(connection:{url:string;secret:string},action:string,projects?:unknown){
 const result=await fetch(connection.url,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({secret:connection.secret,action,projects}),signal:AbortSignal.timeout(150000),redirect:"follow"});
 if(!result.ok)throw new Error("Google is not responding ("+result.status+"). Check your script deployment.");
 const text=await result.text();if(text.length>1500000)throw new Error("Google response is too large");
 let data;try{data=JSON.parse(text);}catch{throw new Error("Google returned a sign-in page. Deploy the script as a web app: execute as Me, access Anyone. Your key protects the data.");}
 if(!data.ok)throw new Error(typeof data.error==="string"?data.error.slice(0,1000):"Google connection failed");return data;
}
export async function GET(){try{const [connection,projects,snapshot]=await Promise.all([read("connection",null),read("projects",[]),read("snapshot",null)]);return reply({connected:!!connection,projects,needsRefresh:snapshot?.signature!==signature(projects),snapshot:compatibleSnapshot(snapshot,projects)});}catch{return reply({error:"Could not read saved data. Please try again."},500);}}
export async function POST(request:Request){
 
 if(request.headers.get("origin")!==new URL(request.url).origin)return reply({error:"Request not allowed"},403);
 if(Number(request.headers.get("content-length"))>50000)return reply({error:"Request is too large"},413);
 try{
 const raw=await request.text();if(raw.length>50000)return reply({error:"Request is too large"},413);const body=JSON.parse(raw);
 if(body.action==="connect"){
 let connection;
 try { connection=connectionSchema.parse(body.connection); } catch(error) { if(error instanceof z.ZodError)throw new Error(error.issues.map(i=>i.message).join(' '));throw error; }
 let data;
 try { data=await remote(connection,"discover"); } catch(error) {
 const raw=error instanceof Error?error.message:'Google connection failed';
 const safe=raw.replaceAll(connection.secret,'[redacted]').slice(0,1500);
 const diagnostic={message:safe,help:connectionHelp(safe),attemptedAt:new Date().toISOString()};
 await write('connectionDiagnostic',diagnostic);
 return reply({error:diagnostic.message,help:diagnostic.help},400);
 }
 const discovery=z.object({ga:z.array(z.object({id:z.string(),name:z.string()})).max(2000),gsc:z.array(z.object({id:z.string(),name:z.string()})).max(2000),warnings:z.array(z.string()).optional()}).parse(data);
 await write("connection",connection);const previous=await read("snapshot",null);if(previous)await write("snapshot",{...previous,fetchedAt:"1970-01-01T00:00:00.000Z"});await write("connectionDiagnostic",null);return reply(discovery);
 }
 if(body.action==="discover"){const connection=await read("connection",null);if(!connection)throw new Error("Connect Google first");return reply(await remote(connection,"discover"));}
 if(body.action==="projects"){
 const projects=z.array(projectSchema).min(1).max(30).refine(a=>new Set(a.map(p=>p.id)).size===a.length).parse(body.projects);
 for(const key of ["ga","gsc"] as const){const ids=projects.map(p=>p[key]).filter(Boolean);if(new Set(ids).size!==ids.length)throw new Error("Assign each GA4 and Search Console source to just one project to avoid double-counting.");}
 await write("projects",projects);return reply({ok:true,projects});
 }
 if(body.action==="refresh"){
 const [connection,projects,cached]=await Promise.all([read("connection",null),read("projects",[]),read("snapshot",null)]);
 if(!connection)throw new Error("Connect Google in settings first");
 if(!projects.some((p:{ga:string;gsc:string})=>p.ga||p.gsc))throw new Error("Match a GA4 or Search Console source to a project in settings");
 if(cached?.signature===signature(projects)&&Date.now()-Date.parse(cached.fetchedAt)<60000)return reply(cached);
 const data=await remote(connection,"report",projects.map((p:{id:string;ga:string;gsc:string})=>({id:p.id,ga:p.ga,gsc:p.gsc})));
 const reports=z.array(reportSchema).max(30).parse(data.reports);
 if(reports.length!==projects.length||new Set(reports.map(r=>r.id)).size!==reports.length||reports.some(r=>!projects.some((p:{id:string})=>p.id===r.id)))throw new Error("Incomplete Google response — previous data preserved");
 const now=new Date().toISOString();
 const merged=mergeReports(reports,compatibleSnapshot(cached,projects),now);
 const snapshot={fetchedAt:now,signature:signature(projects),reports:merged};await write("snapshot",snapshot);return reply(snapshot);
 }
 return reply({error:"Unknown operation"},400);
 }catch(error){return reply({error:error instanceof z.ZodError?"Check your form values or the Google response format.":error instanceof Error?error.message:"Could not fetch data"},400);}
}
