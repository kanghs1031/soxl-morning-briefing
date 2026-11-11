# Deposit read-only integration

Based on Meritz Open API screenshot: GET /accounts/v1/me/deposit (service ID obacb_balc_024r), required authorization and mac_address headers, no request body. Success rsp_cd=5766. The response data object includes tfam, order_able_cash_amt, drng_able_amt, d1_aft_tfam, d2_aft_tfam.

Import `readDeposit` and `summarizeDeposit` in a secure server runtime only. Never call from a public PWA or expose credentials. No trading orders are implemented.

**Important:** The screenshot does not establish that these amounts represent USD or overseas-stock buying power. UI must show currency as unverified pending a foreign-stock API review. No live account call has been executed.