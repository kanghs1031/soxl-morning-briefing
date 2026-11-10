// Read-only SOXL / overseas equity minute candles adapter.
// This is NOT an order endpoint. Run on a trusted server, never in the iPhone PWA.
// Documentation: GET /market/v1/overseas/candles/minutes
const requireEnv = (name) => { const v = process.env[name]; if (!v) throw new Error("Missing server configuration: " + name); return v; };
const number = (v) => { if (v === null || v === undefined || v === "") return NaN; return Number(v); };
export function parseEquityCandles(payload) {
  if (String(payload?.rsp_cd ?? "") !== "0000") throw new Error("Equity candles API response: " + String(payload?.rsp_cd ?? "missing"));
  if (!Array.isArray(payload.data)) throw new Error("Unexpected equity candles response shape");
  if (payload.data.length > 40) throw new Error("Unexpected candle count");
  return payload.data.map((b) => {
    const date = String(b.korea_date ?? "");
    const time = String(b.korea_hour ?? "");
    const open = number(b.oprc), high = number(b.hprc), low = number(b.lprc), close = number(b.prpr), volume = number(b.cntg_vol);
    if (!/^\d{8}$/.test(date) || !/^\d{6}$/.test(time) || ![open, high, low, close, volume].every(Number.isFinite) || low > high || open < low || open > high || close < low || close > high || volume < 0) throw new Error("Invalid equity candle");
    return { dateKST:date, timeKST:time, open, high, low, close, volume, cumulativeVolume:number(b.acml_vol), strength:number(b.rltv) };
  });
}
export async function readEquityMinuteCandles(accessToken, {symbol="SOXL", exchange="OQ", interval=60, delayed=false} = {}) {
  if (!accessToken) throw new Error("Missing access token");
  if (!/^[A-Z0-9.\-]{1,16}$/.test(symbol)) throw new Error("Invalid symbol");
  if (!["OQ","NY","AX","HK","SH","SZ","JP"].includes(exchange)) throw new Error("Invalid exchange");
  if (!Number.isInteger(interval) || interval < 1 || interval > 9999999) throw new Error("Invalid interval");
  const mac = requireEnv("MERITZ_MAC_ADDRESS");
  if (!/^[a-fA-F0-9]{12}$/.test(mac)) throw new Error("Invalid MAC address");
  const base = requireEnv("MERITZ_BASE_URL").replace(/\/$/, "");
  const url = new URL(base + "/market/v1/overseas/candles/minutes");
  for (const [key,value] of Object.entries({mrkt_div_code:"OV",mrkt_cls_code:exchange,iscd:symbol,dely_rltm_cls_code:delayed?"1":"0",hour_cls_code:String(interval)})) url.searchParams.set(key,value);
  const response = await fetch(url, {headers:{authorization:"Bearer "+accessToken,mac_address:mac,accept:"application/json"},signal:AbortSignal.timeout(15000)});
  if (!response.ok) throw new Error("Equity candles HTTP " + response.status);
  const bars = parseEquityCandles(await response.json());
  return {symbol,exchange,interval,bars,fetchedAt:new Date().toISOString(),verifiedWithLiveAPI:false};
}
