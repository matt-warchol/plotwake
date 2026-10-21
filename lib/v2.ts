import {projectTotals,sourceIssue,type Project,type Report,type Metric} from './metrics.ts';

export const kinds=['channels','referrers','campaigns','pages','landing','countries','queries','search-pages'] as const;
export type Kind=typeof kinds[number];
export type V2Report=Report & {freshness?:{gaThrough?:string;gscThrough?:string;firstIncompleteDate?:string;gaTimezone?:string}};
export type BreakdownRow={label:string;value:number;impressions?:number;project?:string;previousValue?:number;previousImpressions?:number;ctr?:number;previousCtr?:number;position?:number;previousPosition?:number;flagged?:boolean};
export type Breakdown={rows:BreakdownRow[];errors:string[];upgradeRequired?:boolean;startDate?:string;endDate?:string;unit?:string};
export function dateOffset(date:string,days:number){return new Date(Date.parse(date+'T00:00:00Z')+days*86400000).toISOString().slice(0,10);}
export function through(reports:Report[],metric:Metric,settled:boolean,now=new Date()){
 const ceiling=dateOffset(now.toISOString().slice(0,10),settled?-3:-1);
 const ends=reports.map(r=>r.days.filter(d=>d.date<=ceiling&&d[metric]!==null).at(-1)?.date).filter((x):x is string=>!!x);
 return ends.length?ends.sort()[0]:null;
}
export function windowReport(report:Report|undefined,end:string|null){return report&&end?{...report,days:report.days.filter(d=>d.date<=end),endDate:end}:undefined;}
export function scopeTotals(projects:Project[],reports:Report[],key:Metric,n:number,end:string|null){
 const rows=projects.map(p=>{const r=windowReport(reports.find(r=>r.id===p.id),end);return {p,r,t:projectTotals(p,r,key,n)};});
 const healthy=rows.filter(x=>x.t.current!==null&&!sourceIssue(x.r,key).length);
 const comparable=healthy.filter(x=>x.t.baseline&&x.t.previous!==null);
 const current=healthy.length?healthy.reduce((s,x)=>s+x.t.current!,0):null;
 const previous=comparable.length?comparable.reduce((s,x)=>s+x.t.previous!,0):null;
 const comparableCurrent=comparable.reduce((s,x)=>s+x.t.current!,0);
 const delta=previous!==null?comparableCurrent-previous:null;
 return {current,previous,delta,pct:previous!==null&&previous>0?delta!/previous*100:null,covered:healthy.length,comparable:comparable.length,total:projects.length,rows};
}
// Setup reminders are scoped to a source configuration, so a changed source resurfaces.
export function setupKey(p:Project){return ['setup',p.id,p.domain,p.ga,p.gsc].join('|');}
export const metricNames:Record<Metric,string>={sessions:'Visits',clicks:'Google clicks',impressions:'Search impressions'};
