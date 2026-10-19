import {sourceIssue,type Project,type Report} from './metrics.ts';
export type SavedSnapshot={fetchedAt:string;signature:string;reports:Report[]};
export function signature(projects:Project[]){return JSON.stringify(projects.map(({id,ga,gsc})=>({id,ga,gsc})));}
export function compatibleSnapshot(snapshot:SavedSnapshot|null,projects:Project[]):SavedSnapshot|null{
 if(!snapshot)return null;
 let old:Project[];try{old=JSON.parse(snapshot.signature);}catch{return null;}
 const reports=projects.flatMap(p=>{
  const source=old.find(x=>x.id===p.id),r=snapshot.reports.find(r=>r.id===p.id);if(!source||!r)return [];
  const ga=source.ga===p.ga,gsc=source.gsc===p.gsc;if(!ga&&!gsc)return [];
  return [{...r,errors:r.errors.filter(e=>e.startsWith('GA4:')?ga:e.startsWith('Search Console:')?gsc:true),days:r.days.map(d=>({...d,sessions:ga?d.sessions:null,clicks:gsc?d.clicks:null,impressions:gsc?d.impressions:null})),fetched:{ga:ga?r.fetched?.ga||snapshot.fetchedAt:undefined,gsc:gsc?r.fetched?.gsc||snapshot.fetchedAt:undefined}}];
 });
 return {...snapshot,reports};
}
export function mergeReports(fresh:Report[],previous:SavedSnapshot|null,now:string):Report[]{
 return fresh.map(r=>{
  const old=previous?.reports.find(x=>x.id===r.id),gaFailed=!!sourceIssue(r,'sessions').length,gscFailed=!!sourceIssue(r,'clicks').length;
  const oldDays=new Map(old?.days.map(d=>[d.date,d])||[]);
  return {...r,fetched:{ga:gaFailed?old?.fetched?.ga:now,gsc:gscFailed?old?.fetched?.gsc:now},days:r.days.map(d=>{
   const o=oldDays.get(d.date);return o?{...d,sessions:gaFailed?d.sessions??o.sessions:d.sessions,clicks:gscFailed?d.clicks??o.clicks:d.clicks,impressions:gscFailed?d.impressions??o.impressions:d.impressions}:d;
  })};
 });
}
