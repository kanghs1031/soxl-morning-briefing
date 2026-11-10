import http from 'node:http';
import path from 'node:path';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {STATIC_FILES,SECURITY_HEADERS} from './build-v3.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../paper-trading/v3');
const types={'.html':'text/html; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.webmanifest':'application/manifest+json','.svg':'image/svg+xml'};
export async function startServer({port=4173,source=root}={}) {
 const server=http.createServer(async(req,res)=>{
  for(const line of SECURITY_HEADERS.split('\n')) {
   const match=/^  ([\w-]+): (.+)$/.exec(line);
   if(match && !['Cache-Control'].includes(match[1])) res.setHeader(match[1],match[2]);
  }
  res.setHeader('Cache-Control','no-cache');
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return;}
  let name;
  try{name=decodeURIComponent(new URL(req.url,'http://localhost').pathname).slice(1)||'index.html';}catch{res.writeHead(400);res.end();return;}
  if(!STATIC_FILES.includes(name)){res.writeHead(404);res.end('Not found');return;}
  try{const data=await readFile(path.join(source,name));res.setHeader('Content-Type',types[path.extname(name)]||'application/octet-stream');res.writeHead(200);res.end(req.method==='HEAD'?undefined:data);}
  catch{res.writeHead(404);res.end('Not found');}
 });
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',resolve);});
 return server;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
 const server=await startServer({port:Number(process.env.PORT||4173),source:process.env.PREVIEW_DIR||root});
 console.log(`SOXL DEMO: http://127.0.0.1:${server.address().port}`);
}
