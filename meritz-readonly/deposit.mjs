// Meritz deposit response adapter, server-side only.
// GET /accounts/v1/me/deposit, service obacb_balc_024r.
// The API guide does not establish a USD balance. Never label these amounts USD.
export async function readDeposit(token) {
  if (!token) throw new Error("Bearer token required");
  const base = process.env.MERITZ_BASE_URL;
  const mac = process.env.MERITZ_MAC_ADDRESS;
  if (!base || !mac) throw new Error("Missing broker server configuration");
  if (!/^[a-fA-F0-9]{12}$/.test(mac)) throw new Error("Invalid MAC address");
  const response = await fetch(base.replace(/\/$/, "") + "/accounts/v1/me/deposit", {
    method: "GET",
    headers: {
      authorization: "Bearer " + token,
      mac_address: mac,
      accept: "application/json"
    },
    signal: AbortSignal.timeout(15000)
  });
  if (!response.ok) throw new Error("Broker deposit HTTP " + response.status);
  const payload = await response.json();
  if (String(payload.rsp_cd) !== "5766" || !payload.data || typeof payload.data !== "object" || Array.isArray(payload.data)) {
    throw new Error("Broker deposit response unsuccessful or invalid");
  }
  return payload.data;
}
export function summarizeDeposit(data) {
  const numeric = (key) => {
    const value = data[key];
    if (typeof value !== "number" || !Number.isFinite(value)) throw new Error("Invalid deposit field: " + key);
    return value;
  };
  return {
    deposit: numeric("tfam"),
    cashOrderable: numeric("order_able_cash_amt"),
    withdrawable: numeric("drng_able_amt"),
    expectedD1: numeric("d1_aft_tfam"),
    expectedD2: numeric("d2_aft_tfam"),
    currency: "UNVERIFIED",
    note: "Do not treat as USD buying power until broker documentation confirms units and foreign-stock scope."
  };
}
