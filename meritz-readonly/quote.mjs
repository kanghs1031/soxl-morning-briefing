// Meritz overseas equity quote: server-side read-only adapter (Node.js 20+).
// Never import into a browser/PWA. No order endpoint or live account action.
import { issueToken } from "./client.mjs";

const required = (key) => {
  const value = process.env[key];
  if (!value) throw new Error("Missing server configuration: " + key);
  return value;
};
export function parseQuote(payload, requestedSymbol = "SOXL") {
  if (String(payload?.rsp_cd ?? "") !== "0000") {
    throw new Error("Quote API rejected request: " + String(payload?.rsp_cd ?? "unknown"));
  }
  const data = payload?.data;
  if (!data || Array.isArray(data) || typeof data !== "object") throw new Error("Unexpected quote response");
  if (String(data.iscd ?? "").toUpperCase() !== requestedSymbol.toUpperCase()) throw new Error("Unexpected symbol in quote");
  const price = Number(data.prpr);
  if (!Number.isFinite(price) || price <= 0) throw new Error("Invalid quote price");
  const numberOrNull = (v) => v === "" || v == null || !Number.isFinite(Number(v)) ? null : Number(v);
  return {
    symbol: requestedSymbol.toUpperCase(),
    price,
    previousClose: numberOrNull(data.prdy_clpr),
    changePercent: numberOrNull(data.prdy_ctrt),
    cumulativeVolume: numberOrNull(data.acml_vol),
    open: numberOrNull(data.oprc),
    high: numberOrNull(data.hprc),
    low: numberOrNull(data.lprc),
    source: "Meritz Open API",
    fetchedAt: new Date().toISOString(),
    // API response sample does not provide a market-data timestamp or guarantee feed latency.
    exchangeTimestamp: null,
    feedDelayVerified: false
  };
}
export async function readSoxlQuote(token, { exchange = "OQ", realtimeCode = "0" } = {}) {
  if (!token) throw new Error("Missing bearer token");
  const mac = required("MERITZ_MAC_ADDRESS");
  if (!/^[0-9a-fA-F]{12}$/.test(mac)) throw new Error("MERITZ_MAC_ADDRESS must be 12 hex digits");
  if (!/^[A-Z]{2}$/.test(exchange)) throw new Error("Invalid exchange code");
  if (!["0", "1"].includes(realtimeCode)) throw new Error("Invalid delay code");
  const url = new URL(required("MERITZ_BASE_URL").replace(/\/$/, "") + "/market/v1/overseas/prices");
  url.searchParams.set("mrkt_div_code", "OV");
  url.searchParams.set("mrkt_cls_code", exchange);
  url.searchParams.set("iscd", "SOXL");
  url.searchParams.set("dely_rltm_cls_code", realtimeCode);
  const response = await fetch(url, {
    method: "GET",
    headers: { authorization: "Bearer " + token, mac_address: mac, accept: "application/json" },
    signal: AbortSignal.timeout(15000)
  });
  if (!response.ok) throw new Error("Meritz quote HTTP " + response.status);
  return parseQuote(await response.json());
}
export async function readSoxlQuoteWithToken() {
  const { token } = await issueToken();
  return readSoxlQuote(token);
}
