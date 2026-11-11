import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
export const STATIC_FILES = ['index.html','app.mjs','styles.css','engine.mjs','market.mjs','fixtures.mjs','manifest.webmanifest','sw.js','icon.svg'];
export const SECURITY_HEADERS = `/*
  Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'none'; frame-ancestors 'none'
  X-Content-Type-Options: nosniff
  Referrer-Policy: no-referrer
  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()
  X-Frame-Options: DENY
  X-Robots-Tag: noindex, nofollow
/sw.js
  Cache-Control: no-cache
/index.html
  Cache-Control: no-cache
`;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export async function buildPreview({source = path.join(root,'paper-trading/v3'),target = path.join(root,'.preview/public')} = {}) {
  const files = await Promise.all(STATIC_FILES.map(async name => {
    const content=await readFile(path.join(source,name));
    if (/(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|Bearer\s+[A-Za-z0-9._-]{20,}|MERITZ_(?:CLIENT_SECRET|ACCESS_TOKEN|MAC_ADDRESS)\s*[:=]\s*["'][^"']+["'])/.test(content.toString())) throw new Error(`Credential detected in publish asset: ${name}`);
    return [name,content];
  }));
  const revision=createHash('sha256').update(Buffer.concat(files.map(([,content])=>content))).digest('hex').slice(0,16);
  const worker=files.find(([name])=>name==='sw.js');
  worker[1]=Buffer.from(worker[1].toString().replace(/const CACHE='[^']+';/,`const CACHE='soxl-paper-${revision}';`));
  await rm(target,{recursive:true,force:true}); await mkdir(target,{recursive:true});
  for (const [name,content] of files) await writeFile(path.join(target,name),content);
  await writeFile(path.join(target,'_headers'),SECURITY_HEADERS);
  return {target,files:[...STATIC_FILES,'_headers']};
}
if (process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const result=await buildPreview(); console.log(`Static DEMO preview built: ${result.files.length} allowlisted files → ${result.target}`);
}
