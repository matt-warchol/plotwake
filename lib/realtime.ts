import type {Project} from './metrics.ts';

export type LiveCountry={code:string;count:number};
export type LiveProject={id:string;activeUsers:number|null;countries:LiveCountry[];views:number[]|null;error?:string};
export type LiveSnapshot={fetchedAt:string|null;projects:LiveProject[];upgradeRequired?:boolean};

const demoSeed:Record<string,{countries:LiveCountry[];views:number[]}>= {
 makesquishy:{countries:[{code:'US',count:4},{code:'PL',count:2},{code:'GB',count:2},{code:'DE',count:1}],views:[2,5,3,7,4]},
 whoownswhat:{countries:[{code:'US',count:3},{code:'GB',count:1},{code:'DE',count:1},{code:'FR',count:2}],views:[1,2,5,3,2]},
 avo42:{countries:[{code:'PL',count:3},{code:'US',count:1},{code:'ES',count:1}],views:[1,1,2,2,3]},
 armando:{countries:[{code:'US',count:2},{code:'PL',count:1},{code:'DE',count:1}],views:[0,2,1,3,1]},
 plateweek:{countries:[{code:'PL',count:1},{code:'ES',count:1}],views:[0,1,0,2,1]},
 phonecaseinserts:{countries:[{code:'GB',count:1}],views:[0,0,1,0,1]}
};

export function demoRealtime(projects:Project[],tick=0,now=Date.now()):LiveSnapshot{
 const step=((tick%3)+3)%3;
 return {fetchedAt:new Date(now).toISOString(),projects:projects.map((project,index)=>{
  const seed=demoSeed[project.id]||{countries:[{code:'US',count:index%3+1}],views:[0,1,2,1,2]};
  const countries=seed.countries.map(country=>({...country}));
  let views=[...seed.views];
  if(step===1){
   if(project.id==='makesquishy'){countries.find(c=>c.code==='US')!.count++;countries.find(c=>c.code==='GB')!.count++;}
   if(project.id==='whoownswhat')countries.find(c=>c.code==='FR')!.count++;
   if(project.id==='avo42')countries.find(c=>c.code==='PL')!.count++;
   views=[...views.slice(1),views[4]+(index%3)+1];
  }
  if(step===2){
   if(project.id==='makesquishy'){countries.find(c=>c.code==='US')!.count--;countries.find(c=>c.code==='GB')!.count++;}
   if(project.id==='whoownswhat')countries.find(c=>c.code==='FR')!.count++;
   views=[...views.slice(2),views[4]+1,views[3]+(index%2)];
  }
  return {id:project.id,activeUsers:countries.reduce((n,c)=>n+c.count,0),countries,views};
 })};
}
