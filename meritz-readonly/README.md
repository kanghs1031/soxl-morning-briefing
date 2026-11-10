# Meritz Open API read-only holdings integration (draft)

This module is **server-side only**. Never bundle it in the iPhone PWA, commit credentials, or expose an unauthenticated proxy. It performs GET requests only and has no order endpoints.

## Confirmed from the user's API guide
- Token: POST /oauth2/token, application/x-www-form-urlencoded; grant_type=client_credentials, scope=login.
- Holdings: GET /accounts/v1/me/holdings, authorization: Bearer token, mac_address: 12-character MAC without punctuation.
- Optional query: nthn_rmnd_incu_yn, tr_cont, tr_cont_key. Response: data[], rsp_cd, rsp_msg, tr_cont, tr_cont_key.
- Holdings fields: iscd, isnm, rmnd_qty, byng_unpr, psnt_prc, vltn_amt, vltn_prls_amt, ert.
- For overseas stocks, iscd can contain symbol/exchange info. Do not match SOXL by substring without verifying exchange.

## Prerequisites
- Node.js 20+ on a trusted backend, not in browser.
- Environment secrets: MERITZ_BASE_URL, MERITZ_CLIENT_ID, MERITZ_CLIENT_SECRET, MERITZ_MAC_ADDRESS.
- Confirm actual API base URL, network access/MAC rules and foreign-currency valuation conventions with broker documentation.
- This module has not been tested against a live account.

## Security
Credentials and bearer tokens must remain server-side. Do not log token or account data. Restrict endpoint access with user authentication. Encrypt stored data if persisted. Use a read-only broker permission when supported.