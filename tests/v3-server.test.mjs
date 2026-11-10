import {test} from 'node:test';
import assert from 'node:assert/strict';
import { startServer } from '../scripts/serve-v3.mjs';

test('preview server serves static shell and rejects traversal/unsupported methods',async()=>{
 const server=await startServer({port:0});
 try {
  const base=`http://127.0.0.1:${server.address().port}`;
  const shell=await fetch(base+'/'); assert.equal(shell.status,200); assert.match(await shell.text(),/SOXL/);
  const module=await fetch(base+'/app.mjs'); assert.equal(module.headers.get('content-type'),'text/javascript; charset=utf-8');
  assert.equal((await fetch(base+'/%2e%2e%2fpackage.json')).status,404);
  assert.equal((await fetch(base+'/package.json')).status,404);
  assert.equal((await fetch(base+'/',{method:'POST'})).status,405);
  assert.match(shell.headers.get('content-security-policy'),/connect-src 'self'/);
 } finally {await new Promise(resolve=>server.close(resolve));}
});
