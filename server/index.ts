import {createServer} from 'node:http';
import {timingSafeEqual} from 'node:crypto';
import {readFile,stat} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {GET,POST} from './api.ts';
const password=process.env.PLOTWAKE_PASSWORD||'',username=process.env.PLOTWAKE_USERNAME||'admin';
if(password.length<16||password.startsWith('change-me'))throw Error('Set PLOTWAKE_PASSWORD to a unique password of at least 16 characters in .env. For a public synthetic demo use npm run build:demo and npm run preview:demo.');
const root=resolve('dist'),port=Number(process.env.PORT||3000),host=process.env.HOST||'127.0.0.1';
const origin=process.env.APP_ORIGIN||`http://localhost:${port}`;
const expected=Buffer.from(`${username}:${password}`);
const failures=new Map<string,{count:number;until:number}>();
const mime:Record<string,string>={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.gif':'image/gif','.webp':'image/webp','.ttf':'font/ttf','.txt':'text/plain; charset=utf-8','.gs':'text/plain; charset=utf-8'};
const server=createServer(async(req,res)=>{
 res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('X-Frame-Options','DENY');res.setHeader('Cache-Control','private, no-store');
 res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");
 const ip=req.socket.remoteAddress||'unknown',now=Date.now(),failed=failures.get(ip);
 if(failed&&failed.until>now&&failed.count>=20){res.writeHead(429,{'Retry-After':'900'});res.end('Too many attempts. Try again in 15 minutes.');return;}
 let supplied=Buffer.alloc(0);try{const header=req.headers.authorization||'';if(header.startsWith('Basic '))supplied=Buffer.from(header.slice(6),'base64');}catch{}
 if(supplied.length!==expected.length||!timingSafeEqual(supplied,expected)){
  if(supplied.length){if(failures.size>=1000)for(const [key,value] of failures)if(value.until<=now)failures.delete(key);if(failures.size<1000)failures.set(ip,{count:failed&&failed.until>now?failed.count+1:1,until:failed&&failed.until>now?failed.until:now+900000});}
  res.writeHead(401,{'WWW-Authenticate':'Basic realm="Plotwake", charset="UTF-8"'});res.end('Sign in to your private Plotwake dashboard.');return;
 }
 failures.delete(ip);
 try{
  const url=new URL(req.url||'/',origin);
  if(url.pathname==='/api/pulse'){
   if(!['GET','POST'].includes(req.method||'')){res.writeHead(405,{Allow:'GET, POST'});res.end();return;}
   const chunks:Buffer[]=[];let size=0;
   for await(const chunk of req){size+=chunk.length;if(size>50000){res.writeHead(413);res.end('Request too large');return;}chunks.push(chunk);}
   const request=new Request(url,{method:req.method,headers:new Headers(Object.entries(req.headers).filter(([,v])=>typeof v==='string') as [string,string][]),...(req.method==='POST'?{body:Buffer.concat(chunks).toString()}: {})});
   const result=req.method==='POST'?await POST(request):await GET();res.writeHead(result.status,Object.fromEntries(result.headers));res.end(await result.text());return;
  }
  if(!['GET','HEAD'].includes(req.method||'')){res.writeHead(405,{Allow:'GET, HEAD'});res.end();return;}
  const pathname=decodeURIComponent(url.pathname);const filename=resolve(root,'.'+pathname);
  if(filename!==root&&!filename.startsWith(root+sep)){res.writeHead(403);res.end();return;}
  let target=filename;try{if((await stat(target)).isDirectory())target=resolve(target,'index.html');}catch{if(!extname(pathname))target=resolve(root,'index.html');}
  const content=await readFile(target);res.writeHead(200,{'Content-Type':mime[extname(target)]||'application/octet-stream'});res.end(req.method==='HEAD'?undefined:content);
 }catch(error){res.writeHead(500,{'Content-Type':'text/plain'});res.end('Could not complete the request. Check the server and retry.');console.error('Plotwake request failed:',error instanceof Error?error.name:'Error');}
});
server.requestTimeout=160000;server.headersTimeout=20000;
server.listen(port,host,()=>console.log(`Plotwake is listening on ${host}:${port}. Put HTTPS in front of remote deployments.`));
