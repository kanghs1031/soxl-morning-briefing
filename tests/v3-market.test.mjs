import test from 'node:test';
import assert from 'node:assert/strict';
import {parseMeritzCandles, validateCandle, marketSession} from '../paper-trading/v3/market.mjs';
const row=(date='20261109',hour='233000')=>({korea_date:date,korea_hour:hour,oprc:'100',hprc:'102',lprc:'99',prpr:'101',cntg_vol:'1200'});
test('Meritz equity bars normalize KST, sort and deduplicate identical timestamps',()=>{
 const bars=parseMeritzCandles({rsp_cd:'0000',data:[row('20261109','233100'),row(),row()]});
 assert.deepEqual(bars,[{time:'2026-11-09T14:30:00.000Z',open:100,high:102,low:99,close:101,volume:1200},{time:'2026-11-09T14:31:00.000Z',open:100,high:102,low:99,close:101,volume:1200}]);
});
test('reject malformed equity shape, calendar, nonfinite and conflicting duplicates',()=>{
 const good={rsp_cd:'0000',data:[row()]};
 for(const payload of [{...good,rsp_cd:'9999'},{data:[row()]},{...good,data:{}},{...good,data:Array(41).fill(row())},...['20260230','20261301','00001109'].map(d=>({...good,data:[row(d)]})),...['240000','236000','235960','9'].map(h=>({...good,data:[row('20261109',h)]})),...['','NaN','Infinity',null,0,-1].map(v=>({...good,data:[{...row(),oprc:v}]})),{...good,data:[{...row(),lprc:'105'}]},{...good,data:[{...row(),cntg_vol:'-1'}]},{...good,data:[row(),{...row(),prpr:'100'}]}]) assert.throws(()=>parseMeritzCandles(payload));
 assert.deepEqual(parseMeritzCandles({...good,data:[]}),[]);
 const c=parseMeritzCandles(good)[0]; assert.equal(validateCandle(c).close,101);
 for(const bad of [{...c,time:'2026-02-30T14:30:00Z'},{...c,time:'2026-11-09'},{...c,open:NaN},{...c,volume:Infinity},{...c,close:103}]) assert.throws(()=>validateCandle(bad));
});
test('New York DST-aware half-open session boundaries and weekends',()=>{
 for(const [time,session] of [['2026-11-09T08:59:00Z','closed'],['2026-11-09T09:00:00Z','pre'],['2026-11-09T14:29:00Z','pre'],['2026-11-09T14:30:00Z','regular'],['2026-11-09T21:00:00Z','after'],['2026-11-10T01:00:00Z','closed'],['2026-07-06T13:30:00Z','regular'],['2026-11-08T15:00:00Z','closed']]) assert.equal(marketSession(time),session);
 assert.throws(()=>marketSession('bad'));
});
