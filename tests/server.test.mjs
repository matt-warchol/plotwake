import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const temp=await mkdtemp(join(tmpdir(),'plotwake-test-'));
const port=String(18000+Math.floor(Math.random()*15000)),origin=`http://127.0.0.1:${port}`;
const env={...process.env,PORT:port,HOST:'127.0.0.1',APP_ORIGIN:origin,PLOTWAKE_USERNAME:'test-owner',PLOTWAKE_PASSWORD:'this-is-only-a-local-test-password',PLOTWAKE_DB:join(temp,'test.sqlite')};
const child=spawn(process.execPath,['server/index.ts'],{env,stdio:['ignore','pipe','pipe']});
let output='';child.stderr.on('data',d=>output+=d);child.stdout.on('data',d=>output+=d);
const authorization='Basic '+Buffer.from(`${env.PLOTWAKE_USERNAME}:${env.PLOTWAKE_PASSWORD}`).toString('base64');
try{
 let ready=false;for(let i=0;i<100;i++){if(child.exitCode!==null)throw Error(output);try{const r=await fetch(origin+'/api/pulse');if(r.status===401){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,50));}assert.ok(ready,'Server starts');
 assert.equal((await fetch(origin+'/api/pulse')).status,401,'Unauthenticated reports denied');
 assert.equal((await fetch(origin+'/')).status,401,'Static app denied without owner authentication');
 const get=await fetch(origin+'/api/pulse',{headers:{authorization}});assert.equal(get.status,200);assert.deepEqual((await get.json()).projects,[],'No personal defaults in a new installation');
 const project={id:'test',name:'Example',domain:'example.com',color:'#123456',ga:'',gsc:''};
 const post=(body,requestOrigin=origin)=>fetch(origin+'/api/pulse',{method:'POST',headers:{authorization,origin:requestOrigin,'content-type':'application/json'},body:JSON.stringify(body)});
 assert.equal((await post({action:'projects',projects:[project]},'https://other.example')).status,403,'Cross-origin mutations denied');
 assert.equal((await post({action:'projects',projects:[project]})).status,200);
 assert.equal((await (await fetch(origin+'/api/pulse',{headers:{authorization}})).json()).projects[0].name,'Example','Settings persist in SQLite');
 assert.equal((await post({action:'refresh'})).status,400,'No connection must not erase projects');
 assert.equal((await (await fetch(origin+'/api/pulse',{headers:{authorization}})).json()).projects.length,1);
 const invalid=await post({action:'projects',projects:[{...project,gaSince:'2099-01-01'}]});assert.equal(invalid.status,400);
 assert.equal((await fetch(origin+'/%2e%2e%2f.env',{headers:{authorization}})).status,403,'Static traversal denied');
 for(let i=0;i<20;i++)await fetch(origin+'/api/pulse',{headers:{authorization:'Basic '+Buffer.from('wrong:wrong').toString('base64')}});
 assert.equal((await fetch(origin+'/api/pulse',{headers:{authorization:'Basic '+Buffer.from('wrong:wrong').toString('base64')}})).status,429);
 console.log('OK: standalone server auth, CSRF, SQLite persistence, validation, report preservation, static-file boundary and failed-login rate limit.');
}finally{if(child.exitCode===null){child.kill();await new Promise(r=>child.once('exit',r));}await rm(temp,{recursive:true,force:true});}
