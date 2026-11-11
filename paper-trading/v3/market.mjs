// Strict normalized UTC candles. Holidays are intentionally not modeled.
export function validateCandle(c) {
 if(!c || typeof c.time!=='string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{3})?Z$/.test(c.time)) throw Error('UTC candle time required');
 const t=new Date(c.time);
 if(!Number.isFinite(+t) || t.toISOString().replace('.000Z','Z')!==c.time.replace('.000Z','Z')) throw Error('Invalid calendar time');
 for(const k of ['open','high','low','close','volume']) if(typeof c[k]!=='number'||!Number.isFinite(c[k])||(k==='volume'?c[k]<0:c[k]<=0)) throw Error(`Invalid ${k}`);
 if(c.low>Math.min(c.open,c.close)||c.high<Math.max(c.open,c.close)||c.low>c.high) throw Error('Invalid OHLC range');
 return {...c,time:t.toISOString()};
}
export function parseMeritzCandles(payload) {
 if(!payload||payload.rsp_cd!=='0000'||!Array.isArray(payload.data)||payload.data.length>40) throw Error('Invalid equity response');
 const unique=new Map();
 for(const r of payload.data) {
  if(!r||typeof r.korea_date!=='string'||typeof r.korea_hour!=='string'||!/^\d{8}$/.test(r.korea_date)||!/^\d{6}$/.test(r.korea_hour)) throw Error('Invalid Korean time');
  const d=r.korea_date,h=r.korea_hour;
  const wall=`${d.slice(0,4)}-${d.slice(4,6)}-${d.slice(6)}T${h.slice(0,2)}:${h.slice(2,4)}:${h.slice(4)}Z`;
  const c={time:wall};
  for(const [key,field] of Object.entries({open:'oprc',high:'hprc',low:'lprc',close:'prpr',volume:'cntg_vol'})) {
   const v=r[field];
   if(!['string','number'].includes(typeof v)||(typeof v==='string'&&!/^\d+(?:\.\d+)?$/.test(v))) throw Error(`Invalid ${field}`);
   c[key]=Number(v);
  }
  validateCandle(c);
  if(Number(d.slice(0,4))<1900) throw Error('Invalid year');
  c.time=new Date(Date.parse(wall)-9*60*60*1000).toISOString();
  if(unique.has(c.time)&&JSON.stringify(unique.get(c.time))!==JSON.stringify(c)) throw Error('Conflicting duplicate');
  unique.set(c.time,c);
 }
 return [...unique.values()].sort((a,b)=>a.time.localeCompare(b.time));
}
const ny=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',weekday:'short',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
function parts(time) {
 const d=new Date(time); if(!Number.isFinite(+d)) throw Error('Invalid session time');
 return Object.fromEntries(ny.formatToParts(d).map(p=>[p.type,p.value]));
}
export function marketSession(time) {
 const p=parts(time);
 if(p.weekday==='Sat'||p.weekday==='Sun') return 'closed';
 const m=Number(p.hour)*60+Number(p.minute);
 return m<240||m>=1200?'closed':m<570?'pre':m<960?'regular':'after';
}
export function tradingDate(time) {
 const p=parts(time); return `${p.year}-${p.month}-${p.day}`;
}
