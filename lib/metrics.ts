export type Project = { id:string; name:string; domain:string; color:string; ga:string; gsc:string; gaSince?:string; gscSince?:string };
export type Day = { date:string; sessions:number|null; clicks:number|null; impressions:number|null };
export type Report = { id:string; days:Day[]; errors:string[]; endDate:string; fetched?:{ga?:string;gsc?:string} };
export type Metric = "sessions"|"clicks"|"impressions";
export const defaults:Project[] = [
 {id:"makesquishy",name:"MakeSquishy",domain:"makesquishy.com",color:"#e4a858",ga:"",gsc:""},
 {id:"whoownswhat",name:"WhoOwnsWhat",domain:"whoownswhat.xyz",color:"#a5a6ed",ga:"",gsc:""},
 {id:"avo42",name:"avo42",domain:"avo42.com",color:"#8dbd74",ga:"",gsc:""},
 {id:"armando",name:"Armando",domain:"armando.avo42.com",color:"#df8c89",ga:"",gsc:""},
 {id:"plateweek",name:"Plateweek",domain:"",color:"#81babb",ga:"",gsc:""},
 {id:"phonecaseinserts",name:"Phone Case Inserts",domain:"phonecaseinserts.com",color:"#d5a2be",ga:"",gsc:""},
 {id:"padeltune",name:"PadelTune",domain:"",color:"#b3a087",ga:"",gsc:""}
];
export function sourceIssue(report:Report|undefined,key:Metric) {
 const prefix=key==='sessions'?'GA4:':'Search Console:';
 return report?.errors.filter(e=>e.startsWith(prefix)||!e.startsWith('GA4:')&&!e.startsWith('Search Console:'))||[];
}
export function totals(report:Report|undefined,key:Metric,n:number,since?:string) {
 const days=report?.days||[],a=days.slice(-n),b=days.slice(-2*n,-n);
 const sum=(d:Day[])=>d.length===n&&d.every(x=>x[key]!==null)?d.reduce((s,x)=>s+(x[key] as number),0):null;
 const current=sum(a),previous=sum(b);
 // A recorded event proves measurement existed by that date; zero padding does not.
 const evidence=since||days.find(d=>(key==='sessions'?d.sessions:(d.impressions??d.clicks))!>0)?.date;
 const baseline=!!evidence&&b.length===n&&evidence<=b[0].date;
 const delta=baseline&&current!==null&&previous!==null?current-previous:null;
 return {current,previous,baseline,delta,pct:delta!==null&&previous!>0?delta/previous!*100:null};
}
export function projectTotals(p:Project,r:Report|undefined,key:Metric,n:number){return totals(r,key,n,key==='sessions'?p.gaSince:p.gscSince);}
export function status(t:{current:number|null;previous:number|null;delta:number|null;pct:number|null;baseline?:boolean}) {
 if(t.current===null||t.previous===null)return 'No data';
 if(t.baseline===false)return 'Collecting baseline';
 if(t.current+t.previous<30)return 'Small sample';
 if(t.previous===0&&t.current>=30)return 'Growing';
 if(t.pct!==null&&t.pct>=10&&t.delta!>=5)return 'Growing';
 if(t.pct!==null&&t.pct<=-10&&t.delta!<=-5)return 'Declining';
 return 'Steady';
}
function contains(parent:string,child:string){
 try{
 if(parent.startsWith('sc-domain:')){
  const domain=parent.slice(10).toLowerCase();
  const host=child.startsWith('sc-domain:')?child.slice(10).toLowerCase():new URL(child).hostname.toLowerCase();
  return host===domain||host.endsWith('.'+domain);
 }
 return !child.startsWith('sc-domain:')&&child.startsWith(parent);
 }catch{return false;}
}
export function overlapChildren(p:Project,projects:Project[]){
 if(!p.gsc)return [];
 const children=projects.filter(c=>c.id!==p.id&&c.gsc&&c.gsc!==p.gsc&&contains(p.gsc,c.gsc));
 return children.filter(c=>!children.some(other=>other.id!==c.id&&contains(other.gsc,c.gsc)));
}
// Keep raw reports intact; subtract only direct child scopes so nested projects count once.
export function disjointReports(projects:Project[],reports:Report[]):Report[]{
 return reports.map(r=>{
  const p=projects.find(p=>p.id===r.id);if(!p)return r;
  const children=overlapChildren(p,projects);if(!children.length)return r;
  const childReports=children.map(c=>reports.find(r=>r.id===c.id));
  let incomplete=childReports.some(r=>!r||sourceIssue(r,'clicks').length);
  const days=r.days.map(d=>{
   const childDays=childReports.map(r=>r?.days.find(x=>x.date===d.date));
   const values={} as Pick<Day,'clicks'|'impressions'>;
   for(const key of ['clicks','impressions'] as const){
    if(incomplete||d[key]===null||childDays.some(x=>x?.[key]==null)){values[key]=null;continue;}
    const v=d[key]!-childDays.reduce((sum,x)=>sum+x![key]!,0);
    if(v<0){incomplete=true;values[key]=null;}else values[key]=v;
   }
   return {...d,...values};
  });
  return {...r,days,errors:incomplete?[...r.errors,'Search Console: Overlapping reports could not be reconciled. Refresh the parent and child sources.']:r.errors};
 });
}
export function reportLink(p:Project,key:Metric){return key==='sessions'&&p.ga?`https://analytics.google.com/analytics/web/#/p${p.ga.replace('properties/','')}/reports/reportinghub`:p.gsc?`https://search.google.com/search-console/performance/search-analytics?resource_id=${encodeURIComponent(p.gsc)}`:null;}
export function demoReports(projects:Project[]):Report[] {
 const end=new Date(); end.setUTCDate(end.getUTCDate()-3);
 return projects.map((p,k)=>({id:p.id,endDate:end.toISOString().slice(0,10),errors:[],days:Array.from({length:180},(_,i)=>{
 const d=new Date(end);d.setUTCDate(d.getUTCDate()-179+i);
 const wave=Math.sin(i*1.2+k)*.16+Math.cos(i*.43)*.12;
 const trend=k===2?1-i/250:k===3?1:i/160+.25;
 const sessions=Math.max(0,Math.round((k===0?940:k===1?380:k===2?270:k===3?40:120)*trend*(1+wave)));
 return {date:d.toISOString().slice(0,10),sessions,clicks:Math.round(sessions*.61),impressions:Math.round(sessions*17.2)};
 })}));
}
