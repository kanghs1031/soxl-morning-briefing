# Issue #2 — SOXL v3 delivery contract

- Branch: feature/soxl-paper-trading-v3; extend existing draft PR #1, never merge.
- Existing v2.2 application source/deployment is not present in this repository. Do not infer its origin or alter it. Preserve all briefing files/workflows and existing meritz-readonly files.
- New standalone static PWA under paper-trading/v3/, only synthetic deterministic OHLCV; no network broker access, OAuth, accounts or real-order controls. Clearly state DEMO and no live verification.
- Seven independent USD 10,000 accounts; 7–10 buy stages; fee-inclusive average, partial volume fills, idempotent chronological candles; conservative stop-before-target and no same-bar target on new entry; gap/spread/slippage; exposure/daily equity loss/cooldown/session controls; cancellation/logs.
- Korean mobile four-tab app, chart/support levels, timestamps/session, per-account controls, visible pending/fill/holding/realized/unrealized balances; local-only versioned persistence and export, no implied cross-device sync.
- TDD vertical slices: engine/data tests before implementations. Browser tests for seven accounts, full deterministic buy/sell round trip, persistence, tabs, responsive layout and offline PWA.
- Build only allowlisted static assets. Separate free credential-free Netlify preview, no production site/DNS/repository-linkage changes. Read back deploy and test actual remote URL.
- Acceptance report: URL/access policy, demo/live distinction, local/remote test commands and results, branch/PR, limits and screenshots; distinguish emulated WebKit from physical iPhone.
