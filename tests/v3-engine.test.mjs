import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../paper-trading/v3/engine.mjs';
const bar=(n=0,fields={})=>({time:new Date(Date.parse('2026-11-09T14:30:00Z')+n*60000).toISOString(),open:101,high:102,low:100,close:101,volume:1000,...fields});
const config={feeBps:0,spreadBps:0,slippageBps:0,participationPct:100,maxDailyLossPct:100};
const ladder=(s,id=s.accounts[0].id,extra={})=>E.placeLadder(s,id,{support:100,step:0.5,stages:7,...extra});
test('seven isolated accounts with configurable capital and strict configuration',()=>{
 const s=E.createState(); assert.equal(s.mode,'DEMO'); assert.equal(s.accounts.length,7); assert.equal(new Set(s.accounts.map(a=>a.id)).size,7);
 for(const a of s.accounts){assert.equal(a.capital,10000);assert.equal(a.cash,10000);assert.equal(a.tp,5);assert.equal(a.sl,7);assert.deepEqual(a.orders,[]);}
 E.configureAccount(s,s.accounts[0].id,{capital:5000,tp:3,sl:10});assert.equal(s.accounts[0].cash,5000);assert.equal(s.accounts[1].capital,10000);
 for(const c of [{feeBps:NaN},{spreadBps:-1},{participationPct:101},{maxExposurePct:0},{extendedHours:'yes'},{cooldownMinutes:Infinity},{unknown:1}]) assert.throws(()=>E.createState(c));
 for(const patch of [{capital:0},{tp:11},{sl:6},{tp:NaN}]) assert.throws(()=>E.configureAccount(s,s.accounts[0].id,patch));
 assert.throws(()=>E.configureAccount(s,'missing',{tp:5}));assert.equal(E.validateConfig(s.config).feeBps,s.config.feeBps);
});
test('ladder reserves affordable staged limits without buying; invalid replacement is atomic; cancel releases',()=>{
 const s=E.createState(config),a=s.accounts[0];ladder(s);
 assert.equal(a.qty,0);assert.equal(a.orders.length,7);assert.equal(a.orders[0].price,100);assert.equal(a.orders[6].price,97);
 assert.ok(a.orders.every(o=>o.qty>0&&o.qty===o.remaining));
 assert.ok(a.orders.reduce((v,o)=>v+o.price*o.qty,0)<=a.cash+1e-8);
 const before=JSON.stringify(s);
 for(const extra of [{stages:6},{stages:11},{stages:7.5},{support:NaN},{step:0},{support:1,step:1}]) assert.throws(()=>ladder(s,a.id,extra));
 assert.equal(JSON.stringify(s),before);assert.throws(()=>ladder(s));assert.throws(()=>E.configureAccount(s,a.id,{capital:5000}));
 E.cancelOrders(s,a.id);assert.equal(a.orders.length,0);assert.equal(a.cash,10000);assert.throws(()=>E.cancelOrders(s,99));
});
test('only time-series touches fill, participation shared across accounts, fee-inclusive average and replay guard',()=>{
 const s=E.createState({...config,feeBps:10,participationPct:10});ladder(s);ladder(s,s.accounts[1].id);
 const a=s.accounts[0];E.processCandle(s,bar(0,{low:100.1}));assert.equal(a.qty,0);
 E.processCandle(s,bar(1,{volume:10}));assert.equal(a.qty,1);assert.equal(a.cost,100.1);assert.equal(a.cash,9899.9);assert.equal(s.accounts[1].qty,0);
 assert.equal(a.log[0].type,'BUY');assert.equal(a.log[0].time,bar(1).time);assert.equal(a.orders[0].remaining,a.orders[0].qty-1);
 const before=JSON.stringify(s);E.processCandle(s,bar(1,{volume:10}));assert.equal(JSON.stringify(s),before);
 assert.throws(()=>E.processCandle(s,bar(0)));assert.throws(()=>E.processCandle(s,bar(1,{close:100})));assert.throws(()=>E.processCandle(s,bar(2,{low:NaN})));assert.equal(JSON.stringify(s),before);
 const p=E.portfolioSummary(s,101);assert.ok(Math.abs(p.equity-70000.9)<1e-7);assert.equal(p.exposure,101);assert.ok(Math.abs(p.unrealized-.9)<1e-7);assert.equal(p.realized,0);assert.ok(p.pending>0);
 assert.throws(()=>E.portfolioSummary(s,NaN));
});
test('new entries cannot take same-bar profit; later TP closes once with independent account settings',()=>{
 const s=E.createState(config),a=s.accounts[0];ladder(s);E.processCandle(s,bar(0,{high:110}));assert.ok(a.qty>0);assert.equal(a.log.filter(l=>l.type==='SELL').length,0);
 const qty=a.qty;E.processCandle(s,bar(1,{open:106,low:105,high:110,close:107}));assert.equal(a.qty,0);assert.equal(a.cost,0);assert.equal(a.orders.length,0);assert.ok(Math.abs(a.realized-qty*5)<1e-7);assert.equal(a.log.at(-1).reason,'TP');
 E.processCandle(s,bar(2,{high:110}));assert.equal(a.log.filter(l=>l.type==='SELL').length,1);
});
test('stop wins ambiguous bar, adverse opening gap loses beyond old stop and cooldown cancels pending',()=>{
 for(const open of [100,80]) {
  const s=E.createState({...config,feeBps:10,spreadBps:10,slippageBps:5}),a=s.accounts[0];ladder(s);E.processCandle(s,bar(0,{low:99.8}));const qty=a.qty,cost=a.cost;
  E.processCandle(s,bar(1,{open,low:79,high:120,close:100}));assert.equal(a.qty,0);assert.equal(a.orders.length,0);assert.equal(a.log.at(-1).reason,'SL');assert.ok(a.realized<0);
  const price=a.log.at(-1).price;assert.ok(price<=Math.min(open,cost/qty*.93));if(open===80)assert.ok(price<80);
  assert.equal(a.cooldownUntil,new Date(Date.parse(bar(1).time)+30*60000).toISOString());assert.throws(()=>ladder(s));
 }
});
test('new entry is stopped on a same-bar deep low rather than retaining an impossible safe holding',()=>{
 const s=E.createState(config),a=s.accounts[0];ladder(s);E.processCandle(s,bar(0,{low:80,high:110}));assert.equal(a.qty,0);assert.equal(a.log.at(-1).reason,'SL');
});
test('entry session restrictions do not disable protective exits; extendedHours opts in but never weekends',()=>{
 const s=E.createState(config),a=s.accounts[0];ladder(s);E.processCandle(s,bar(0,{time:'2026-11-09T09:00:00.000Z'}));assert.equal(a.qty,0);assert.throws(()=>{E.cancelOrders(s,a.id);ladder(s);});
 E.processCandle(s,bar(1));ladder(s);E.processCandle(s,bar(2));assert.ok(a.qty>0);
 E.processCandle(s,bar(3,{time:'2026-11-09T22:00:00.000Z',open:80,high:81,low:79,close:80}));assert.equal(a.qty,0);assert.equal(a.log.at(-1).reason,'SL');
 for(const [time,filled] of [['2026-11-09T09:00:00.000Z',true],['2026-11-08T15:00:00.000Z',false],['2026-11-10T02:00:00.000Z',false]]) {const x=E.createState({...config,extendedHours:true});ladder(x);E.processCandle(x,bar(0,{time}));assert.equal(x.accounts[0].qty>0,filled);}
});
test('daily EQUITY drawdown includes unrealized, stays breached after recovery, resets next trading date',()=>{
 const s=E.createState({...config,maxDailyLossPct:.1}),a=s.accounts[0];ladder(s);E.processCandle(s,bar(0));assert.ok(a.qty>0);
 E.processCandle(s,bar(1,{open:98,high:99,low:98,close:98}));assert.equal(a.orders.length,0);assert.equal(a.realized,0);assert.ok(a.qty>0);assert.throws(()=>ladder(s));
 E.processCandle(s,bar(2));assert.throws(()=>ladder(s));
 E.processCandle(s,bar(3,{time:'2026-11-10T14:30:00.000Z',low:101}));assert.doesNotThrow(()=>ladder(s));
});
test('exposure caps reserve commitments across independent accounts and reject invalid placement state',()=>{
 const s=E.createState({...config,maxExposurePct:20});for(const a of s.accounts)ladder(s,a.id);
 assert.ok(E.portfolioSummary(s,100).pending<=14000+1e-7);
 E.processCandle(s,bar(0,{low:97}));for(const a of s.accounts)assert.ok(a.cost<=2000+1e-7);
 assert.ok(E.portfolioSummary(s,100).exposure<=14000+1e-7);
 const broken=E.createState(config);broken.accounts[0].cash=-1;assert.throws(()=>ladder(broken));
});
test('capital edits after first candle rebase risk without counting deposits/withdrawals as losses',()=>{
 const s=E.createState();E.processCandle(s,bar());
 E.configureAccount(s,1,{capital:5000});assert.equal(s.accounts[0].risk.startEquity,5000);assert.equal(s.risk.startEquity,65000);
 ladder(s);E.processCandle(s,bar(1,{low:99.9}));assert.equal(s.risk.breached,false);assert.equal(s.accounts[0].risk.breached,false);assert.ok(s.accounts[0].qty>0);
 const x=E.createState();E.processCandle(x,bar());x.risk.breached=true;x.accounts[0].risk.breached=true;
 E.configureAccount(x,1,{capital:15000});assert.equal(x.risk.breached,true);assert.equal(x.accounts[0].risk.breached,true);assert.equal(x.risk.startEquity,75000);
});
test('persistent restore validates complete state, accounting, timestamps and risk without mutating its input',()=>{
 const s=E.createState(config);assert.deepEqual(E.validateState(JSON.parse(JSON.stringify(s))),s);
 ladder(s);E.processCandle(s,bar(0));const good=JSON.parse(JSON.stringify(s));assert.deepEqual(E.validateState(good),s);
 for(const mutate of [x=>x.mode='LIVE',x=>x.accounts.pop(),x=>x.accounts[1].id=x.accounts[0].id,x=>x.config.feeBps=NaN,x=>x.accounts[0].cash=-1,x=>x.accounts[0].qty=Infinity,x=>x.accounts[0].cost=0,x=>x.accounts[0].cash+=100,x=>x.accounts[0].tp=100,x=>x.accounts[0].sl=2,x=>x.accounts[0].orders[0].remaining=-1,x=>x.accounts[0].orders[0].remaining=1e8,x=>x.accounts[0].orders[0].price=0,x=>x.accounts[0].orders.push({...x.accounts[0].orders[0]}),x=>x.accounts[0].orders[0].placedAfter='2027-01-01T00:00:00.000Z',x=>x.accounts[0].log[0].qty=-1,x=>x.accounts[0].log[0].time='2027-01-01T00:00:00.000Z',x=>x.accounts[0].log[0].type='LIVE_BUY',x=>delete x.risk,x=>x.risk.breached='false',x=>x.accounts[0].risk.startEquity=NaN,x=>x.accounts[0].cooldownUntil='bad',x=>x.lastCandle.low=999]) {
  const bad=structuredClone(good);mutate(bad);assert.throws(()=>E.validateState(bad));
 }
 assert.deepEqual(good,s);
 E.processCandle(s,bar(1,{high:110}));assert.deepEqual(E.validateState(JSON.parse(JSON.stringify(s))),s);
 const bad=E.createState(config);bad.accounts[0].cost=1;assert.throws(()=>ladder(bad));assert.throws(()=>E.processCandle(bad,bar(0)));
});
