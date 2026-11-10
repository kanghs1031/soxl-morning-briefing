import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildPreview, STATIC_FILES } from '../scripts/build-v3.mjs';
import { mkdtemp, mkdir, writeFile, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

const scratchRoot = process.env.HERMES_SCRATCH || (process.platform === 'win32' ? 'C:/Users/sesrk/AppData/Local/hermes/cache/scratch' : tmpdir());

test('preview build copies only explicit static assets and enforces broker-free CSP', async () => {
  const root = await mkdtemp(path.join(scratchRoot, 'soxl-build-'));
  try {
    const source = path.join(root, 'src'), target = path.join(root, 'dist');
    await mkdir(source);
    for (const file of STATIC_FILES) await writeFile(path.join(source,file), file.endsWith('.json') ? '{}' : 'synthetic');
    await writeFile(path.join(source,'.env'), 'private=never-publish');
    await writeFile(path.join(source,'client-backup.mjs'), 'private backup');
    await buildPreview({source,target});
    assert.deepEqual((await readdir(target)).sort(), [...STATIC_FILES,'_headers'].sort());
    const headers = await readFile(path.join(target,'_headers'),'utf8');
    assert.match(headers,/connect-src 'self'/);
    assert.match(headers,/frame-ancestors 'none'/);
    assert.match(headers,/X-Robots-Tag: noindex/);
  } finally { await rm(root,{recursive:true,force:true}); }
});

test('built service worker cache revision changes with any shipped asset', async()=>{
 const root=await mkdtemp(path.join(scratchRoot,'soxl-cache-'));
 try {
  const source=path.join(root,'src'),target=path.join(root,'dist');await mkdir(source);
  for(const file of STATIC_FILES)await writeFile(path.join(source,file),'synthetic');
  await writeFile(path.join(source,'sw.js'),"const CACHE='soxl-paper-dev';");
  await buildPreview({source,target});const first=await readFile(path.join(target,'sw.js'),'utf8');
  await writeFile(path.join(source,'app.mjs'),'updated synthetic');
  await buildPreview({source,target});const second=await readFile(path.join(target,'sw.js'),'utf8');
  assert.notEqual(first,second);assert.match(second,/soxl-paper-[a-f0-9]{16}/);
 }finally{await rm(root,{recursive:true,force:true});}
});

test('preview build fails closed on broker secrets in publish files', async () => {
  const root = await mkdtemp(path.join(scratchRoot,'soxl-secrets-'));
  try {
    const source=path.join(root,'src'),target=path.join(root,'dist'); await mkdir(source);
    for (const file of STATIC_FILES) await writeFile(path.join(source,file),'synthetic');
    await writeFile(path.join(source,'app.mjs'),'const key = "'+'gh'+'p_'+'abcdefghijklmnopqrstuvwxyz1234567890";');
    await assert.rejects(buildPreview({source,target}),/credential/i);
  } finally { await rm(root,{recursive:true,force:true}); }
});
