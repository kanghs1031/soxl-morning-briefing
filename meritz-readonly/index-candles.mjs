// Read-only overseas INDEX minute bars; not SOXL ETF minute bars.
// Node.js 20+ server only. Credentials and token must never be exposed in PWA.
const required = name => { const v = process.env[name]; if (!v) throw new Error("Missing server configuration: " + name); return v; };
const ymd = v => /^\d{8}$/.test(v);
export function parseIndexCandles(payload) {
  if (String(payload?.rsp_cd ?? "") !== "0000") throw new Error("Index candles API response code: " + String(payload?.rsp_cd ?? "missing"));
  if (!Array.isArray(payload.data)) throw new Error("Unexpected index candles response shape");
  return payload.data.map((bar) => {
    const date = String(bar.date ?? "");
    const time = String(bar.cntg_hour ?? "");
    const o = Number(bar.oprc), h = Number(bar.hprc), l = Number(bar.lprc), c = Number(bar.prpr), v = Number(bar.cntg_vol);
    if (!ymd(date) || !/^\d{6}$/.test(time) || ![o,h,l,c,v].every(Number.isFinite) || l > h || o < l || o > h || c < l || c > h || v < 0) throw new Error("Invalid index candle");
    return { date, time, open:o, high:h, low:l, close:c, volume:v };
  });
}
export async function readOverseasIndexCandles(token, { symbol, interval = 60, from, to, includePast = false } = {}) {
  if (!token) throw new Error("Missing bearer token");
  if (!symbol || !/^[A-Za-z0-9@._-]{1,12}$/.test(symbol)) throw new Error("Invalid index code");
  if (!Number.isInteger(interval) || interval < 1 || interval > 9999999) throw new Error("Invalid minute interval");
  if (from && !ymd(from)) throw new Error("Invalid from date");
  if (to && !ymd(to)) throw new Error("Invalid to date");
  if (from && to && from > to) throw new Error("Invalid date range");
  const mac = required("MERITZ_MAC_ADDRESS");
  if (!/^[0-9a-fA-F]{12}$/.test(mac)) throw new Error("Invalid MAC address");
  const url = new URL(required("MERITZ_BASE_URL").replace(/\/$/, "") + "/market/v1/overseas/index/candles/minutes");
  url.searchParams.set("iscd", symbol);
  url.searchParams.set("hour_cls_code", String(interval));
  if (from) url.searchParams.set("from", from);
  if (to) url.searchParams.set("to", to);
  if (includePast) url.searchParams.set("past_data_incu_yn", "Y");
  const res = await fetch(url, { method:"GET", headers:{authorization:"Bearer "+token,mac_address:mac,accept:"application/json"},signal:AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error("Index candles HTTP " + res.status);
  return { symbol, interval, bars: parseIndexCandles(await res.json()), fetchedAt:new Date().toISOString(), liveVerified:false };
}
