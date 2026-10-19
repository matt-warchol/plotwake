import {totals,projectTotals,sourceIssue,status,type Project,type Report,type Metric} from './metrics.ts';
export type SummaryAction={id:string;kind:'attention'|'opportunity'|'connection'|'positive';title:string;detail:string;action:string;metric:Metric;target:'project'|'settings'|'refresh'};
const fmt=(v:number)=>new Intl.NumberFormat('en-GB').format(v);
function change(t:ReturnType<typeof totals>){return t.pct!==null?`${Math.abs(t.pct).toFixed(1)}% (${t.delta!>0?'+':''}${fmt(t.delta!)})`:`${t.delta!>0?'+':''}${fmt(t.delta!)}, from zero`;}
export function executiveSummary(projects:Project[],reports:Report[],n:number,options:{connected:boolean;loading:boolean;stale:boolean;refreshFailed:boolean;demo?:boolean}){
 const actions:SummaryAction[]=[];
 const item=(p:Project|undefined,kind:SummaryAction['kind'],title:string,detail:string,metric:Metric='sessions',target:SummaryAction['target']='project',action='Review trend')=>({id:p?.id??"all",kind,title,detail,metric,target,action});
 if(options.loading)return {tone:'neutral',headline:'Getting your daily picture ready…',description:'Reading your saved reports.',actions,growing:0,declining:0,covered:0};
 if(!options.connected)return {tone:'neutral',headline:'Connect Google to get your daily readout.',description:'Once connected, this will tell you what is growing, what needs attention, and where to focus next.',actions:[item(projects[0],'connection','Bring in your real data','One connection for GA4 and Search Console. Then match each project to its sources.','sessions','settings','Connect Google')],growing:0,declining:0,covered:0};
 if(options.stale||options.refreshFailed)return {tone:'attention',headline:'Refresh your data before making a call.',description:options.refreshFailed?'The latest refresh failed. Saved figures may still be visible, but this summary will not treat them as current.':'Your last fetch was over 36 hours ago. Refresh to get a reliable view of what needs attention.',actions:[item(projects[0],'connection','Check the connection and refresh','If it fails again, open Connections and check the Google deployment.','sessions','refresh','Retry refresh')],growing:0,declining:0,covered:0};
 const evaluated=projects.map(p=>{const r=reports.find(r=>r.id===p.id),sessions=projectTotals(p,r,'sessions',n),key:Metric=sessions.current!==null&&!sourceIssue(r,'sessions').length?'sessions':'clicks',t=projectTotals(p,r,key,n);return {p,r,key,t,state:sourceIssue(r,key).length?'Source issue':status(t)};});
 const covered=evaluated.filter(x=>x.t.current!==null&&x.t.previous!==null&&x.state!=='Source issue'&&x.t.baseline).length;
 const growing=evaluated.filter(x=>x.state==='Growing'),declining=evaluated.filter(x=>x.state==='Declining').sort((a,b)=>a.t.delta!-b.t.delta!);
 const issues=evaluated.filter(x=>x.r?.errors.length);
 const missing=evaluated.filter(x=>x.state==='No data');
 for(const x of issues)actions.push(item(x.p,'connection',`${x.p.name}: check the data source`,`${x.r!.errors.length} source warning${x.r!.errors.length===1?'':'s'}. Only affected metrics are excluded. Other sources remain usable.`,'sessions','settings','Check sources'));
 for(const x of declining)actions.push(item(x.p,'attention',`${x.p.name}: ${x.key==='sessions'?'visits':'Google clicks'} down ${change(x.t)}`,x.key==='sessions'?'Check which traffic channel or landing page lost visits, then review recent site changes. The drop alone does not tell us the cause.':'Check the pages and queries losing clicks in Search Console before deciding what to change.',x.key));
 for(const x of evaluated.filter(x=>!['Source issue','No data','Declining'].includes(x.state))){
  const impressions=projectTotals(x.p,x.r,'impressions',n),clicks=projectTotals(x.p,x.r,'clicks',n);
  if(!sourceIssue(x.r,'clicks').length&&status(impressions)==='Growing'&&clicks.current!==null&&clicks.previous!==null&&impressions.current!>=100&&impressions.previous!>=100&&clicks.current+clicks.previous>=30&&status(clicks)!=='Growing'){
   const currentCTR=clicks.current/impressions.current!,previousCTR=clicks.previous/impressions.previous!;
   if(previousCTR>0&&currentCTR<previousCTR*.8)actions.push(item(x.p,'opportunity',`${x.p.name}: more visibility, weaker click-through`,`Impressions up ${change(impressions)}, but clicks are not keeping pace. Review query mix, titles and snippets in Search Console; this is an opportunity to investigate.`,'impressions'));
  }
 }
 if(missing.length)actions.push(item(missing[0].p,'connection',`${missing.length} project${missing.length===1?' needs':'s need'} data`,`${missing.map(x=>x.p.name).join(', ')}: connect a source or fetch a complete comparison before judging growth.`,'sessions','settings','Set up sources'));
 const best=[...growing].sort((a,b)=>b.t.delta!-a.t.delta!)[0];
 if(best&&actions.length<3)actions.push(item(best.p,'positive',`${best.p.name}: ${best.key==='sessions'?'visits':'Google clicks'} up ${change(best.t)}`,'Keep an eye on the pages and channels behind this gain. They may be worth another small push.',best.key,'project','See what is growing'));
 const small=evaluated.filter(x=>x.state==='Small sample').length;
 const baseline=evaluated.filter(x=>x.state==='Collecting baseline').length;
 const incomplete=options.demo?[]:projects.filter(p=>!p.domain||!p.ga||!p.gsc);
 if(incomplete.length&&actions.length<3)actions.push(item(incomplete[0],'connection',`${incomplete.length} project${incomplete.length===1?' has':'s have'} incomplete setup`,`${incomplete.map(p=>p.name).join(', ')}: add missing domains or sources. One source is enough to start; unavailable metrics stay separate.`,'sessions','settings','Review setup')); 
 const substantive=actions.filter(a=>a.kind!=='positive').length;
 const nextStep=issues.length?'First, review the source warnings below. Healthy metrics remain available.':declining.length?`Start with ${declining[0].p.name}: review the losing channel or page before changing anything.`:baseline?'No growth verdict yet for projects collecting a baseline. Confirm tracking dates if known; otherwise let history build.':substantive?actions.find(a=>a.kind!=='positive')!.title+'.':small?'No urgent action indicated. Small samples need more traffic before judging a trend.':'No action needed based on these traffic signals. Keep monitoring.';
 const tone=issues.length||declining.length?'attention':substantive?'neutral':growing.length?'positive':'neutral';
 const headline=issues.length?`${issues.length} project${issues.length===1?' has a data issue':'s have data issues'}.`:declining.length?`${declining.length} project${declining.length===1?' needs':'s need'} a closer look.`:baseline&&covered===0?'Collecting a reliable baseline.':covered===0?'Your sources are not reporting yet.':covered===small?'Too early to call a trend.':substantive?'A few things are worth a look.':growing.length?'Your projects are moving forward.':'No meaningful declines detected.';
 const parts=[`${growing.length} growing`,`${declining.length} declining`,`${evaluated.filter(x=>x.state==='Steady').length} steady`];if(small||baseline)parts.push(`${small+baseline} too early to judge`);
 const description=`${parts.join(' · ')}. Based on visits, or Google clicks when visits are unavailable. ${covered}/${projects.length} projects have comparable data for the last ${n} days. ${substantive===0&&covered>small?'No urgent action indicated by these traffic signals.':''}`;
 return {tone,headline,description,actions:actions.slice(0,3),growing:growing.length,declining:declining.length,covered,small,baseline,nextStep,totalActions:actions.length};
}
