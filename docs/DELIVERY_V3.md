# SOXL v3.0 delivery evidence

## Scope

- Issue #2; branch `feature/soxl-paper-trading-v3`; extend draft PR #1, no merge.
- Standalone app: `paper-trading/v3/`. Existing `paper-trading/index.html`, `meritz-readonly/`, briefing generator and scheduled workflows remain unchanged in this delivery.
- v2.2 production source and deployment linkage were not found; compatibility with that app is unverified.

## Local execution

- `npm run check`: 18 Node unit/build/server tests passed; allowlisted static build succeeded; 14 Playwright tests passed (seven scenarios each on Chromium and iPhone 13 emulated WebKit).
- `python -m unittest discover -s tests -v`: 4 existing briefing tests passed.
- `npm audit`: 0 vulnerabilities reported.
- `node --check`: all six application/build/server modules passed.
- Additional integrated engine check: 480 processed candles across 12 seven-account scenarios (exposure 20/70/100%, ladder 7/8/9/10 stages); state validation passed after each candle.
- Initial RED: persistence test failed because `validateState` was missing; completed implementation passes malformed-state/accounting/history cases.
- Browser scenarios: deterministic buy→TP exit, seven-account isolation, persistence, four-tab responsive layout, capital/ladder/cancellation/risk controls, JSON/CSV download, offline reload, corrupt-state quarantine.
- Separate WebKit screenshot smoke: home / completed trade / market; zero JavaScript page errors. Emulation is **not a physical iPhone Safari test**.
- Final built `.preview/public/` artifact separately exercised on Chromium and WebKit: buy→TP, CSP headers and offline reload passed, zero page errors. Cache revision is derived from asset content.
- Independent-review regressions reproduced RED before fixes: capital adjustment now rebases daily-risk baselines without clearing existing breaches; saved progress must match its scenario candle; blocked storage still permits JSON memory backup.

## Isolated draft deployment

- URL: https://6af2b9659ee0d7d886f4f7fe--soxl-v3-paper-preview.netlify.app
- Deploy ID: `6af2b9659ee0d7d886f4f7fe`; API read-back state `ready`, expected separate site ID, no root publication.
- Existing site publication IDs and Git linkage metadata compared before/after; unchanged across all four sites, including the separate preview site.
- Shared/site-specific environment lists empty. Exactly ten allowlisted static files uploaded, no server functions, broker adapters or credentials in payload.
- Fresh browser redirected to **Netlify Team protection / This site is private**. Owner/invited Netlify account login is required; visibility was not weakened. Upload/readiness is verified; **post-login remote application behavior is not verified**.

## Intentional limitations

- DEMO only: 40 deterministic synthetic one-minute candles, manually advanced; no live quotes, broker authentication, actual orders or background execution.
- Local browser storage with JSON/CSV export, not multi-device/backend sync.
- DST/weekend sessions but no exchange holidays/early closes. Conservative intrabar/gap/fee assumptions are not actual market execution.
- Meritz official specification commit verified: `a93c6409db73ea97ad15f7b7186f36c9f32ecd89`. Successful authenticated/live access remains unverified and is not required to use DEMO.

Remote GitHub Actions results must be read from the PR's current commit; this document's local results do not imply remote CI success.
