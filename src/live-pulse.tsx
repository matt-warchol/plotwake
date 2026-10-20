import {useEffect,useLayoutEffect,useMemo,useRef,useState} from 'react';
import {geoDistance,geoGraticule10,geoOrthographic,geoPath} from 'd3-geo';
import {Globe2,Grid2X2,HelpCircle,RefreshCw} from 'lucide-react';
import type {Project} from '../lib/metrics.ts';
import {demoRealtime,type LiveCountry,type LiveProject,type LiveSnapshot} from '../lib/realtime.ts';
import world from './world-points.json';
import './live-pulse.css';

const points=world.dots as [number,number][];
const centers=world.centers as unknown as Record<string,[number,number]>;
const countryNames=new Intl.DisplayNames(['en'],{type:'region'});
const flag=(code:string)=>/^[A-Z]{2}$/.test(code)?String.fromCodePoint(...[...code].map(letter=>127397+letter.charCodeAt(0))):'🌐';
const countryName=(code:string)=>countryNames.of(code)||code;
const count=(project:LiveProject)=>project.activeUsers||0;
const motion=()=>!window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function RollingNumber({value}:{value:number|null}){
 const previous=useRef(value),[roll,setRoll]=useState<{from:number;to:number}|null>(null);
 useLayoutEffect(()=>{
  const from=previous.current;previous.current=value;
  if(value===null||from===null||from===value||!motion()){setRoll(null);return;}
  setRoll({from,to:value});const timer=window.setTimeout(()=>setRoll(null),550);return()=>window.clearTimeout(timer);
 },[value]);
 if(value===null)return <strong className="lp-total">—</strong>;
 if(!roll)return <strong className="lp-total" aria-label={`${value} active users`}>{value}</strong>;
 const size=Math.max(String(roll.from).length,String(roll.to).length),a=String(roll.from).padStart(size,' '),b=String(roll.to).padStart(size,' ');
 return <strong className="lp-total" aria-label={`${value} active users`}>{[...b].map((digit,i)=><span className="lp-digit-window" aria-hidden="true" key={i}><span className="lp-digit-track" style={{animationDelay:`${i*25}ms`}}><span>{a[i]}</span><span>{digit}</span></span></span>)}</strong>;
}

function Globe({countries,selected,increases}:{countries:LiveCountry[];selected:string;increases:string[]}){
 const box=useRef<HTMLDivElement>(null),svg=useRef<SVGSVGElement>(null),dots=useRef<SVGGElement>(null),beacons=useRef<SVGGElement>(null),graticule=useRef<SVGPathElement>(null);
 const rotation=useRef<[number,number,number]>([99,-39,0]),previousSelected=useRef(selected),frame=useRef(0);
 const countryKey=countries.map(c=>`${c.code}:${c.count}`).join('|');
 useEffect(()=>{
  const element=dots.current;if(!element)return;
  const fragment=document.createDocumentFragment();
  points.forEach(()=>{const dot=document.createElementNS('http://www.w3.org/2000/svg','circle');dot.setAttribute('class','lp-land-dot');dot.setAttribute('r','1.05');fragment.appendChild(dot);});
  element.replaceChildren(fragment);
 },[]);
 useEffect(()=>{
  const container=box.current,canvas=svg.current,land=dots.current,marks=beacons.current,grid=graticule.current;
  if(!container||!canvas||!land||!marks||!grid)return;
  const selectedCenter=centers[selected]||centers.US||[-99,39];
  const target:[number,number,number]=[-selectedCenter[0],-Math.max(-20,Math.min(55,selectedCenter[1])),0];
  const changed=previousSelected.current!==selected;previousSelected.current=selected;
  const start:[number,number,number]=[...rotation.current];
  let width=0,height=0;
  const draw=(turn:[number,number,number])=>{
   width=container.clientWidth;height=container.clientHeight;if(!width||!height)return;
   canvas.setAttribute('viewBox',`0 0 ${width} ${height}`);
   const projection=geoOrthographic().scale(Math.min(width/2-5,height/2-5)).translate([width/2,height/2]).rotate(turn);
   const path=geoPath(projection);grid.setAttribute('d',path(geoGraticule10())||'');
   const sphere=canvas.querySelector('.lp-sphere');sphere?.setAttribute('cx',String(width/2));sphere?.setAttribute('cy',String(height/2));sphere?.setAttribute('r',String(Math.min(width/2-5,height/2-5)));
   const center=projection.invert?.([width/2,height/2]);if(!center)return;
   const nodes=land.children;
   points.forEach((point,i)=>{const dot=nodes[i] as SVGCircleElement;if(geoDistance(center,point)>=Math.PI/2){dot.style.display='none';return;}const xy=projection(point);if(!xy)return;dot.style.display='';dot.setAttribute('cx',String(xy[0]));dot.setAttribute('cy',String(xy[1]));});
   const fragment=document.createDocumentFragment();
   countries.forEach(country=>{const location=centers[country.code];if(!location||geoDistance(center,location)>=Math.PI/2)return;const xy=projection(location);if(!xy)return;
    for(const kind of ['halo','core']){const marker=document.createElementNS('http://www.w3.org/2000/svg','circle');marker.setAttribute('class',`lp-beacon-${kind}`);marker.setAttribute('cx',String(xy[0]));marker.setAttribute('cy',String(xy[1]));marker.setAttribute('r',String(kind==='halo'?(country.code===selected?11:6):(country.code===selected?3.4:2)));fragment.appendChild(marker);}
   });
   marks.replaceChildren(fragment);rotation.current=[...turn];
  };
  const animate=changed&&motion();const duration=650,begin=performance.now();
  const difference=target[0]-start[0],shortest=((difference+540)%360)-180;
  const step=(time:number)=>{const t=Math.min(1,(time-begin)/duration),ease=t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;draw([start[0]+shortest*ease,start[1]+(target[1]-start[1])*ease,0]);if(t<1)frame.current=requestAnimationFrame(step);};
  if(animate)frame.current=requestAnimationFrame(step);else draw(target);
  const observer=new ResizeObserver(()=>draw(rotation.current));observer.observe(container);
  return()=>{cancelAnimationFrame(frame.current);observer.disconnect();};
 },[selected,countryKey,countries]);
 useEffect(()=>{
  if(!increases.length||!motion()||!svg.current||!box.current)return;
  const canvas=svg.current,container=box.current,projection=geoOrthographic().scale(Math.min(container.clientWidth/2-5,container.clientHeight/2-5)).translate([container.clientWidth/2,container.clientHeight/2]).rotate(rotation.current);
  const center=projection.invert?.([container.clientWidth/2,container.clientHeight/2]);if(!center)return;
  const ripples:SVGCircleElement[]=[];
  increases.forEach(code=>{const location=centers[code];if(!location||geoDistance(center,location)>=Math.PI/2)return;const xy=projection(location);if(!xy)return;const ripple=document.createElementNS('http://www.w3.org/2000/svg','circle');ripple.setAttribute('class','lp-ripple');ripple.setAttribute('cx',String(xy[0]));ripple.setAttribute('cy',String(xy[1]));ripple.setAttribute('r','5');canvas.appendChild(ripple);ripples.push(ripple);const animation=ripple.animate([{opacity:.65,r:'5'},{opacity:0,r:'23'}],{duration:850,easing:'cubic-bezier(.2,.8,.2,1)'});animation.finished.then(()=>ripple.remove()).catch(()=>ripple.remove());});
  return()=>ripples.forEach(ripple=>ripple.remove());
 },[increases]);
 return <div className="lp-globe" ref={box}><svg ref={svg} role="img" aria-label="Dotted globe showing country-level GA4 activity"><circle className="lp-sphere"/><path ref={graticule} className="lp-graticule"/><g ref={dots}/><g ref={beacons}/></svg></div>;
}

export default function LivePulse({projects,demo,connected}:{projects:Project[];demo:boolean;connected:boolean}){
 const [view,setView]=useState<'world'|'activity'>(()=>{try{return localStorage.getItem('plotwake-live-view')==='activity'?'activity':'world';}catch{return 'world';}});
 const [selected,setSelected]=useState('US'),[cell,setCell]=useState<{id:string;minute:number;country:boolean}|null>(null);
 const [visible,setVisible]=useState(false),[live,setLive]=useState<LiveSnapshot|null>(null),[error,setError]=useState(''),[upgrade,setUpgrade]=useState(false),[tick,setTick]=useState(0);
 const [delta,setDelta]=useState<number|null>(null),[increases,setIncreases]=useState<string[]>([]),[changedCells,setChangedCells]=useState<string[]>([]),[flash,setFlash]=useState(false);
 const root=useRef<HTMLElement>(null),previous=useRef<{snapshot:LiveSnapshot;scope:string}|null>(null);
 const scopeKey=projects.map(p=>p.id+':'+p.ga).join('|'),hasGa=projects.some(p=>p.ga);
 const demoSnapshot=useMemo(()=>demo?demoRealtime(projects,tick):null,[demo,scopeKey,tick]);
 const snapshot=demo?demoSnapshot:live;
 useEffect(()=>{const element=root.current;if(!element)return;const observer=new IntersectionObserver(entries=>setVisible(entries[0]?.isIntersecting||false),{rootMargin:'100px'});observer.observe(element);return()=>observer.disconnect();},[]);
 useEffect(()=>{
  if(demo||!connected||!hasGa||!visible||upgrade)return;
  let active=true,busy=false;const load=async()=>{if(busy||document.visibilityState!=='visible')return;busy=true;try{
   const response=await fetch('/api/pulse',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'realtime'})});
   const data=await response.json() as LiveSnapshot&{error?:string};if(!response.ok)throw Error(data.error||'Live data is unavailable.');
   if(!active)return;if(data.upgradeRequired){setUpgrade(true);return;}setLive(data);setError('');
  }catch(e){if(active)setError(e instanceof Error?e.message:'Live data is unavailable.');}finally{busy=false;}};
  void load();const interval=window.setInterval(()=>void load(),60000),onVisibility=()=>{if(document.visibilityState==='visible')void load();};
  document.addEventListener('visibilitychange',onVisibility);
  return()=>{active=false;window.clearInterval(interval);document.removeEventListener('visibilitychange',onVisibility);};
 },[demo,connected,hasGa,visible,upgrade]);
 const shown=useMemo(()=>projects.map(project=>({project,live:snapshot?.projects.find(row=>row.id===project.id)})),[projects,snapshot]);
 const reporting=shown.filter(row=>row.live?.activeUsers!==null&&row.live?.activeUsers!==undefined);
 const total=reporting.length?reporting.reduce((n,row)=>n+count(row.live!),0):null;
 const countries=useMemo(()=>{const counts=new Map<string,number>();shown.forEach(({live})=>live?.countries.forEach(country=>counts.set(country.code,(counts.get(country.code)||0)+country.count)));return [...counts].map(([code,count])=>({code,count})).sort((a,b)=>b.count-a.count);},[shown]);
 const currentCountries=countries.map(c=>`${c.code}:${c.count}`).join('|');
 useEffect(()=>{if(countries.length&&!countries.some(c=>c.code===selected))setSelected(countries[0].code);},[currentCountries,selected]);
 useEffect(()=>{
  if(!snapshot?.fetchedAt)return;
  const old=previous.current;previous.current={snapshot,scope:scopeKey};
  if(!old||old.scope!==scopeKey||old.snapshot.fetchedAt===snapshot.fetchedAt){setDelta(null);setIncreases([]);setChangedCells([]);return;}
  const past=old.snapshot.projects.filter(p=>projects.some(project=>project.id===p.id));
  const pastTotal=past.reduce((n,p)=>n+count(p),0);
  setDelta(total===null?null:total-pastTotal);
  const former=new Map<string,number>();past.forEach(p=>p.countries.forEach(c=>former.set(c.code,(former.get(c.code)||0)+c.count)));
  setIncreases(countries.filter(c=>c.count>(former.get(c.code)||0)).map(c=>c.code));
  setChangedCells(shown.flatMap(({project,live})=>live?.views?.flatMap((n,i)=>n!==past.find(p=>p.id===project.id)?.views?.[i]?[`${project.id}:${i}`]:[])||[]));
  if(motion()){setFlash(true);const timer=window.setTimeout(()=>setFlash(false),900);return()=>window.clearTimeout(timer);}
 },[snapshot?.fetchedAt,scopeKey]);
 const views=[0,0,0,0,0];shown.forEach(({live})=>live?.views?.forEach((n,i)=>views[i]+=n));const maxViews=Math.max(1,...views);
 const selectedCountry=countries.find(c=>c.code===selected);
 const activeRow=shown.find(({project})=>project.id===cell?.id)||shown[0];
 const activeMinute=cell?.minute??4;
 const missing=projects.filter(p=>!p.ga).length,failed=shown.filter(({live,project})=>project.ga&&live?.activeUsers===null).length;
 const status=!projects.length?'No projects selected.':demo?'Sample data · click to simulate a live update':!connected?'Connect Google to see live activity.':!hasGa?'Link a GA4 property in Connections to see live activity.':upgrade?'Update your Google script to enable live activity.':error?error:!snapshot?'Waiting for live GA4 data…':`${reporting.length}/${projects.length} projects reporting · updated ${new Intl.DateTimeFormat('en-GB',{hour:'2-digit',minute:'2-digit'}).format(new Date(snapshot.fetchedAt!))}`;
 const changeView=(next:'world'|'activity')=>{setView(next);try{localStorage.setItem('plotwake-live-view',next);}catch{/* storage may be disabled */}};
 return <section className={'lp-widget'+(flash?' is-refreshed':'')} aria-label="Live pulse" ref={root}>
  <header className="lp-header"><div className="lp-title"><h2><i className={'lp-live-dot'+(flash?' is-refreshed':'')}/>Live pulse</h2><span>Active in the last 5 minutes <span className="lp-help" tabIndex={0} aria-label="About live active users"><HelpCircle size={14}/><span role="tooltip">GA4 active-user totals are summed across selected properties. Someone visiting multiple projects may appear more than once. Country counts may not add to the property total.</span></span></span></div>
  <div className="lp-tabs" role="tablist" aria-label="Realtime view"><button type="button" role="tab" aria-selected={view==='world'} onClick={()=>changeView('world')} onKeyDown={e=>{if(e.key==='ArrowRight'){changeView('activity');(e.currentTarget.nextElementSibling as HTMLButtonElement)?.focus();}}}><Globe2 size={15}/>World</button><button type="button" role="tab" aria-selected={view==='activity'} onClick={()=>changeView('activity')} onKeyDown={e=>{if(e.key==='ArrowLeft'){changeView('world');(e.currentTarget.previousElementSibling as HTMLButtonElement)?.focus();}}}><Grid2X2 size={15}/>Activity</button></div>
  <div className="lp-headcount"><div className="lp-count-row">{delta!==null&&delta!==0&&<span className="lp-delta" title="Change since the previous live sample">{delta>0?'+':'−'}{Math.abs(delta)}</span>}<RollingNumber value={total}/></div><span>{reporting.length}/{projects.length} GA4 reporting</span><div className="lp-trail" role="img" aria-label={`Page views per minute over the last five minutes: ${views.join(', ')}`}>{views.map((n,i)=><span key={i} className={flash?'is-refreshed':''} style={{height:`${Math.max(12,n/maxViews*100)}%`,animationDelay:`${i*42}ms`}}/>)}</div><small>Views / min</small></div></header>
  <div className="lp-body">{(!projects.length||(!demo&&(!connected||!hasGa||upgrade))||!snapshot)?<div className="lp-empty">{status}{upgrade&&<a href={import.meta.env.BASE_URL+'google/Code.gs'} target="_blank" rel="noreferrer">Get the updated script</a>}</div>:view==='world'?<div className="lp-world" role="tabpanel" aria-label="World activity"><Globe countries={countries} selected={selected} increases={increases}/><div className="lp-countries">{countries.slice(0,6).map(country=><button key={country.code} type="button" aria-pressed={country.code===selected} onClick={()=>setSelected(country.code)} className={flash&&increases.includes(country.code)?'is-refreshed':''}><span className="lp-flag" aria-hidden="true">{flag(country.code)}</span><span className="lp-country-name"><span>{countryName(country.code)}</span><abbr title={countryName(country.code)}>{country.code}</abbr></span><strong>{country.count}</strong></button>)}{!countries.length&&<span className="lp-quiet">Quiet right now. No active countries reported.</span>}{countries.length>6&&<span className="lp-more">+{countries.length-6} more countries</span>}</div></div>:<div className="lp-matrix" role="tabpanel" aria-label="Project activity matrix"><div className="lp-matrix-row lp-matrix-head"><span>Project</span><span>Live</span><span>4m</span><span>3m</span><span>2m</span><span>1m</span><span>Now</span><span>Top</span></div>{shown.map(({project,live},rowIndex)=>{const top=live?.countries[0];return <div className="lp-matrix-row" key={project.id} style={{'--project':project.color} as React.CSSProperties}><button className="lp-project-name" title={project.name} onClick={()=>setCell({id:project.id,minute:4,country:false})}><i/>{project.name}</button><strong>{live?.activeUsers===null||live?.activeUsers===undefined?'—':live.activeUsers}</strong>{Array.from({length:5},(_,i)=>{const n=live?.views?.[i];return <button type="button" key={i} disabled={n===undefined} className={'lp-cell'+(flash&&changedCells.includes(`${project.id}:${i}`)?' is-refreshed':'')} style={{'--intensity':`${n===undefined?0:Math.min(.55,.1+n/maxViews*.3)}`,'--delay':`${rowIndex*45+i*25}ms`} as React.CSSProperties} aria-pressed={cell?.id===project.id&&cell.minute===i&&!cell.country} aria-label={`${project.name}, ${i===4?'current minute':`${4-i} minutes ago`}: ${n===undefined?'unavailable':`${n} page views`}`} onClick={()=>setCell({id:project.id,minute:i,country:false})}>{n===undefined?'—':n||'·'}</button>;})}<button type="button" className="lp-top-country" title={top?`${countryName(top.code)} · ${top.count} active users`:'No country data'} disabled={!top} onClick={()=>setCell({id:project.id,minute:4,country:true})}>{top?flag(top.code):'—'}</button></div>;})}</div>}</div>
  <div className="lp-detail" aria-live="polite">{view==='world'?selectedCountry?<><span>{flag(selected)} {countryName(selected)} · {selectedCountry.count} active</span>{shown.filter(({live})=>live?.countries.some(c=>c.code===selected)).map(({project,live})=><span key={project.id} className="lp-detail-project" style={{'--project':project.color} as React.CSSProperties}><i/>{project.name} {live!.countries.find(c=>c.code===selected)?.count}</span>)}</>:<span>{projects.length?'No active users reported.':'No projects selected.'}</span>:activeRow?<span>{activeRow.project.name} · {cell?.country?(activeRow.live?.countries[0]?`${flag(activeRow.live.countries[0].code)} ${countryName(activeRow.live.countries[0].code)}`:'No active countries'):`${activeMinute===4?'Current minute':`${4-activeMinute} min ago`} · ${activeRow.live?.views?.[activeMinute]??'—'} page views`} · {activeRow.live?.activeUsers??'—'} active / 5 min</span>:null}</div>
  <footer className="lp-footer"><span>{status}{missing>0&&snapshot&&!demo?` · ${missing} without GA4`:''}{failed>0&&snapshot&&!demo?` · ${failed} unavailable`:''}</span>{demo&&projects.length>0&&<button type="button" onClick={()=>setTick(n=>n+1)}><RefreshCw size={15}/>Simulate live update</button>}</footer>
 </section>;
}
