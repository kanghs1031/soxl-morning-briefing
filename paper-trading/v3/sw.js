const CACHE='soxl-paper-v3.0-1';
const ASSETS=['./','./index.html','./app.mjs','./styles.css','./engine.mjs','./market.mjs','./fixtures.mjs','./manifest.webmanifest','./icon.svg'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('soxl-paper-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);
 if(event.request.method!=='GET'||url.origin!==self.location.origin)return;
 event.respondWith(fetch(event.request).catch(async()=>{
  const cached=await caches.match(event.request);
  if(cached)return cached;
  if(event.request.mode==='navigate')return caches.match('./index.html');
  return Response.error();
 }));
});
