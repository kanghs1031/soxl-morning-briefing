// Educational deterministic synthetic prices, unrelated to actual SOXL quotes.
const time=i=>new Date(Date.parse('2026-11-09T14:30:00Z')+i*60000).toISOString();
export const DEMO_CANDLES=Array.from({length:40},(_,i)=>{
 const open=100+Math.sin(i*.38)*2-i*.03,close=100+Math.sin((i+1)*.38)*2-(i+1)*.03;
 return {time:time(i),open:+open.toFixed(2),high:+(Math.max(open,close)+.45).toFixed(2),low:+(Math.min(open,close)-.55).toFixed(2),close:+close.toFixed(2),volume:2000+(i*137)%3000};
});
export const TRADE_FIXTURE=[
 {time:time(0),open:101,high:102,low:99.8,close:101,volume:10000},
 {time:time(1),open:106,high:108,low:105.5,close:107,volume:10000}
];
// Deliberately adverse synthetic gap, never a historical SOXL quote.
export const STOP_FIXTURE=[
 {...TRADE_FIXTURE[0]},
 {time:time(1),open:80,high:110,low:79,close:90,volume:10000}
];
