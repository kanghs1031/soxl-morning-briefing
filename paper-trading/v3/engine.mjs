import {validateCandle,marketSession,tradingDate} from './market.mjs';
const DEFAULTS={feeBps:1,spreadBps:2,slippageBps:1,maxExposurePct:100,maxDailyLossPct:5,cooldownMinutes:30,participationPct:10,extendedHours:false};
function number(v,min,max,name){if(typeof v!=='number'||!Number.isFinite(v)||v<min||v>max) throw Error(`Invalid ${name}`);return v;}
export function validateConfig(config={}) {
 if(!config||typeof config!=='object'||Array.isArray(config)) throw Error('Invalid config');
 for(const k of Object.keys(config)) if(!(k in DEFAULTS)) throw Error(`Unknown config ${k}`);
 const c={...DEFAULTS,...config};
 for(const k of ['feeBps','spreadBps','slippageBps']) number(c[k],0,1000,k);
 for(const k of ['maxExposurePct','maxDailyLossPct','participationPct']) number(c[k],Number.EPSILON,100,k);
 number(c.cooldownMinutes,0,10080,'cooldownMinutes');
 if(typeof c.extendedHours!=='boolean') throw Error('Invalid extendedHours');
 return c;
}
export function createState(config={}) {
 return {mode:'DEMO',config:validateConfig(config),accounts:Array.from({length:7},(_,i)=>({id:i+1,capital:10000,cash:10000,qty:0,cost:0,realized:0,orders:[],log:[],tp:5,sl:7,cooldownUntil:null})),lastCandle:null};
}
export function validateState(state) {
 if(!state||state.mode!=='DEMO'||!Array.isArray(state.accounts)||state.accounts.length!==7)throw Error('Invalid DEMO state');
 validateConfig(state.config);
 const stamp=t=>{if(typeof t!=='string'||!Number.isFinite(Date.parse(t))||new Date(t).toISOString()!==t)throw Error('Invalid state timestamp');};
 if(state.lastCandle)validateCandle(state.lastCandle);
 const risk=r=>{if(!r||r.date!==tradingDate(state.lastCandle.time)||typeof r.breached!=='boolean')throw Error('Invalid daily risk');number(r.startEquity,0,1e16,'startEquity');};
 if(state.lastCandle)risk(state.risk);else if(state.risk)throw Error('Unexpected daily risk');
 const close=(a,b)=>Math.abs(a-b)<=1e-6*Math.max(1,Math.abs(a),Math.abs(b));
 for(const [i,a] of state.accounts.entries()) {
  if(!a||a.id!==i+1)throw Error('Invalid account identity');
  for(const k of ['capital','cash','qty','cost'])number(a[k],k==='capital'?1:0,1e15,k);
  number(a.realized,-1e15,1e15,'realized');number(a.tp,3,10,'tp');
  if(![5,7,10].includes(a.sl)||!Array.isArray(a.orders)||!Array.isArray(a.log)||a.orders.length>10)throw Error('Invalid account data');
  if((a.qty===0)!==(a.cost===0)||!close(a.cash+a.cost,a.capital+a.realized))throw Error('Accounting mismatch');
  if(a.cooldownUntil!==null)stamp(a.cooldownUntil);
  if(state.lastCandle)risk(a.risk);else if(a.risk||a.log.length)throw Error('Unexpected account history');
  const ids=new Set();
  for(const o of a.orders) {
   if(!o||typeof o.id!=='string'||ids.has(o.id))throw Error('Duplicate order');ids.add(o.id);
   for(const k of ['price','qty','remaining'])number(o[k],Number.EPSILON,1e15,k);
   if(o.remaining>o.qty)throw Error('Invalid order remainder');
   if(o.placedAfter!==null){stamp(o.placedAfter);if(!state.lastCandle||o.placedAfter>state.lastCandle.time)throw Error('Future order');}
  }
  let previous=null,quantity=0,pnl=0;
  for(const l of a.log) {
   stamp(l.time);if(!state.lastCandle||l.time>state.lastCandle.time||previous&&l.time<previous)throw Error('Invalid log chronology');previous=l.time;
   if(!['BUY','SELL'].includes(l.type)||!(l.type==='BUY'?l.reason==='LIMIT':['TP','SL'].includes(l.reason)))throw Error('Invalid log type');
   number(l.qty,Number.EPSILON,1e15,'log qty');number(l.price,Number.EPSILON,1e15,'log price');number(l.pnl,-1e15,1e15,'log pnl');
   if(l.type==='BUY'&&l.pnl!==0)throw Error('Invalid buy pnl');quantity+=l.type==='BUY'?l.qty:-l.qty;pnl+=l.pnl;
   if(quantity< -1e-6)throw Error('Oversold log');
  }
  if(!close(quantity,a.qty)||!close(pnl,a.realized))throw Error('History mismatch');
 }
 return state;
}
function account(state,id){const a=state.accounts.find(a=>a.id===id);if(!a)throw Error('Unknown account');return a;}
export function configureAccount(state,id,patch) {
 const a=account(state,id);
 if(!patch||Object.keys(patch).some(k=>!['capital','tp','sl'].includes(k))) throw Error('Invalid account configuration');
 if('capital' in patch){number(patch.capital,1,1e9,'capital');if(patch.capital!==a.capital&&(a.qty||a.orders.length||a.log.length))throw Error('Capital locked after activity');}
 if('tp' in patch)number(patch.tp,3,10,'tp');
 if('sl' in patch&&![5,7,10].includes(patch.sl))throw Error('Invalid sl');
 if('capital' in patch){const delta=patch.capital-a.capital;a.cash+=delta;a.capital=patch.capital;if(a.risk)a.risk.startEquity+=delta;if(state.risk)state.risk.startEquity+=delta;}
 if('tp' in patch)a.tp=patch.tp;if('sl' in patch)a.sl=patch.sl;
 return state;
}
function pending(a,fee){return a.orders.reduce((v,o)=>v+o.price*o.remaining*(1+fee),0);}
function entriesAllowed(time,c) {const session=marketSession(time);return session==='regular'||c.extendedHours&&['pre','after'].includes(session);}
function exposure(state,price){return state.accounts.reduce((n,a)=>n+a.qty*price,0);}
function totalCapital(state){return state.accounts.reduce((n,a)=>n+a.capital,0);}
function equity(a,price){return a.cash+a.qty*price;}
// Daily baseline is previous candle's close on NY date rollover. Stress-mark at bar low;
// breach is sticky for that NY date even after recovery, and cancels entry commitments.
function updateRisk(state,b,c) {
 const date=tradingDate(b.time),baseline=state.lastCandle?.close??b.open;
 if(state.risk?.date!==date)state.risk={date,startEquity:state.accounts.reduce((n,a)=>n+equity(a,baseline),0),breached:false};
 for(const a of state.accounts) {
  if(a.risk?.date!==date)a.risk={date,startEquity:equity(a,baseline),breached:false};
  if(equity(a,b.low)<=a.risk.startEquity*(1-c.maxDailyLossPct/100))a.risk.breached=true;
  if(a.risk.breached)a.orders=[];
 }
 if(state.accounts.reduce((n,a)=>n+equity(a,b.low),0)<=state.risk.startEquity*(1-c.maxDailyLossPct/100))state.risk.breached=true;
 if(state.risk.breached)for(const a of state.accounts)a.orders=[];
}
export function placeLadder(state,id,{support,step,stages}={}) {
 validateState(state);
 const a=account(state,id),c=validateConfig(state.config);
 for(const x of state.accounts)for(const k of ['cash','qty','cost'])number(x[k],0,1e15,k);
 if(state.risk?.breached||a.risk?.breached)throw Error('Daily equity loss limit');
 if(state.lastCandle&&!entriesAllowed(state.lastCandle.time,c))throw Error('Entry session closed');
 number(support,Number.EPSILON,1e9,'support');number(step,Number.EPSILON,1e9,'step');
 if(!Number.isInteger(stages)||stages<7||stages>10||support-step*(stages-1)<=0)throw Error('Invalid ladder');
 if(a.orders.length)throw Error('Cancel pending orders first');
 if(a.cooldownUntil&&(!state.lastCandle||state.lastCandle.time<a.cooldownUntil))throw Error('Stop cooldown');
 const fee=c.feeBps/10000;
 const mark=state.lastCandle?.close??support;
 const reserved=state.accounts.reduce((n,x)=>n+pending(x,fee),0);
 const budget=Math.min(a.cash,a.capital*c.maxExposurePct/100-a.qty*mark,totalCapital(state)*c.maxExposurePct/100-exposure(state,mark)-reserved);
 if(budget<=0)throw Error('No buying power');
 a.orders=Array.from({length:stages},(_,i)=>{const price=support-step*i,qty=budget/stages/(price*(1+fee));return {id:`${a.id}-${a.log.length}-${state.lastCandle?.time??'initial'}-${i}`,price,qty,remaining:qty,placedAfter:state.lastCandle?.time??null};});
 return state;
}
export function cancelOrders(state,id) {account(state,id).orders=[];return state;}
export function portfolioSummary(state,price) {
 number(price,Number.EPSILON,1e12,'price');
 return state.accounts.reduce((p,a)=>{p.equity+=a.cash+a.qty*price;p.exposure+=a.qty*price;p.realized+=a.realized;p.unrealized+=a.qty*price-a.cost;p.pending+=pending(a,state.config.feeBps/10000);return p;},{equity:0,exposure:0,realized:0,unrealized:0,pending:0});
}
function impact(c){return (c.spreadBps/2+c.slippageBps)/10000;}
// Protective exits assume executable market liquidity, independent of entry participation.
// Every exit cancels pending buys. Stops precede targets and may execute outside entry sessions.
function exit(a,b,c,allowTarget=true) {
 if(!a.qty)return false;
 const average=a.cost/a.qty,stop=average*(1-a.sl/100),target=average*(1+a.tp/100),drag=impact(c);
 const reason=b.low*(1-drag)<=stop?'SL':allowTarget&&b.high*(1-drag)>=target?'TP':null;
 if(!reason)return false;
 const price=reason==='SL'?Math.min(b.open,stop)*(1-drag):target;
 const qty=a.qty,pnl=qty*price*(1-c.feeBps/10000)-a.cost;
 a.cash+=qty*price*(1-c.feeBps/10000);a.realized+=pnl;a.qty=0;a.cost=0;a.orders=[];
 a.log.push({time:b.time,type:'SELL',qty,price,pnl,reason});
 if(reason==='SL')a.cooldownUntil=new Date(Date.parse(b.time)+c.cooldownMinutes*60000).toISOString();
 return true;
}
export function processCandle(state,input) {
 validateState(state);
 const b=validateCandle(input),c=validateConfig(state.config);
 if(state.lastCandle) {
  if(b.time<state.lastCandle.time)throw Error('Out-of-order candle');
  if(b.time===state.lastCandle.time){if(['open','high','low','close','volume'].every(k=>b[k]===state.lastCandle[k]))return state;throw Error('Conflicting replay');}
 }
 updateRisk(state,b,c);
 const fee=c.feeBps/10000;let volume=b.volume*c.participationPct/100;
 for(const a of state.accounts) {
  if(exit(a,b,c))continue;
  if(!entriesAllowed(b.time,c)||state.risk.breached||a.risk.breached||a.cooldownUntil&&b.time<a.cooldownUntil)continue;
  let bought=false;
  for(const o of a.orders) {
   if(b.low*(1+impact(c))>o.price||volume<=0||o.placedAfter&&b.time<=o.placedAfter)continue;
   const price=Math.min(o.price,b.open*(1+impact(c))),mark=Math.max(price,b.close);
   const qty=Math.min(o.remaining,volume,a.cash/(price*(1+fee)),Math.max(0,a.capital*c.maxExposurePct/100-a.qty*mark)/mark,Math.max(0,totalCapital(state)*c.maxExposurePct/100-exposure(state,mark))/mark);
   if(qty<=0)continue;
   bought=true;
   const cost=qty*price*(1+fee);a.cash-=cost;a.qty+=qty;a.cost+=cost;o.remaining-=qty;volume-=qty;
   a.log.push({time:b.time,type:'BUY',qty,price,pnl:0,reason:'LIMIT'});
   updateRisk(state,b,c);
   if(state.risk.breached||a.risk.breached)break;
  }
  a.orders=a.orders.filter(o=>o.remaining>1e-10);
  if(bought)exit(a,b,c,false);
 }
 state.lastCandle=b;return state;
}
