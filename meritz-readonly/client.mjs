// Node.js 20+ ESM. Read-only client: no order endpoints.
const required = (name) => {
  const value = process.env[name];
  if (!value) throw new Error("Missing server configuration: " + name);
  return value;
};
const base = () => required("MERITZ_BASE_URL").replace(/\/$/, "");
const safeJson = async (res) => {
  if (!res.ok) throw new Error("Broker API returned HTTP " + res.status);
  return res.json();
};
export async function issueToken() {
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: required("MERITZ_CLIENT_ID"),
    client_secret: required("MERITZ_CLIENT_SECRET"),
    scope: "login"
  });
  const response = await fetch(base() + "/oauth2/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
    signal: AbortSignal.timeout(15000)
  });
  const data = await safeJson(response);
  if (typeof data.access_token !== "string" || !data.access_token) {
    throw new Error("Broker token response missing access_token");
  }
  return { token: data.access_token, expiresIn: Number(data.expires_in) || 0 };
}
export async function readHoldings(token, { maxPages = 20 } = {}) {
  if (!token) throw new Error("Bearer token required");
  const mac = required("MERITZ_MAC_ADDRESS");
  if (!/^[0-9A-Fa-f]{12}$/.test(mac)) throw new Error("MAC must contain exactly 12 hexadecimal characters");
  const holdings = [];
  let continuation = "";
  let continuationKey = "";
  const seen = new Set();
  for (let page = 0; page < maxPages; page++) {
    const url = new URL(base() + "/accounts/v1/me/holdings");
    url.searchParams.set("nthn_rmnd_incu_yn", "N");
    if (continuation) {
      url.searchParams.set("tr_cont", continuation);
      url.searchParams.set("tr_cont_key", continuationKey);
    }
    const response = await fetch(url, {
      method: "GET",
      headers: { authorization: "Bearer " + token, mac_address: mac, accept: "application/json" },
      signal: AbortSignal.timeout(15000)
    });
    const result = await safeJson(response);
    if (result.rsp_cd && String(result.rsp_cd) !== "5766") {
      throw new Error("Broker holdings response code: " + String(result.rsp_cd));
    }
    if (!Array.isArray(result.data)) throw new Error("Unexpected holdings response shape");
    holdings.push(...result.data);
    const next = String(result.tr_cont ?? "0");
    const nextKey = String(result.tr_cont_key ?? "");
    if (next !== "1") return holdings;
    if (!nextKey || seen.has(nextKey)) throw new Error("Invalid or repeated continuation key");
    seen.add(nextKey);
    continuation = next;
    continuationKey = nextKey;
  }
  throw new Error("Holdings pagination exceeded configured maximum");
}
export function summarizeHoldings(items) {
  return items.map((h) => ({
    symbol: String(h.iscd ?? ""),
    name: String(h.isnm ?? ""),
    quantity: String(h.rmnd_qty ?? ""),
    averageCost: String(h.byng_unpr ?? ""),
    currentPrice: String(h.psnt_prc ?? ""),
    valuation: String(h.vltn_amt ?? ""),
    unrealizedPnL: String(h.vltn_prls_amt ?? ""),
    returnRate: String(h.ert ?? ""),
    assetClass: String(h.pros_trgt_cls_code ?? ""),
    currency: null // API guide does not establish currency; never assume USD.
  }));
}
