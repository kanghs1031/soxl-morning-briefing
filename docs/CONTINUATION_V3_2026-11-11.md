# SOXL v3 continuation — 2026-11-11

## Delivered change

- Home now offers example account 1–7 and example outcome: buy→take-profit or buy→stop-loss with an adverse synthetic opening gap.
- Existing destructive example behavior remains explicit: all seven accounts/orders/history are reset only after confirmation. Added backup reminder; canceling confirmation preserves stored state.
- New `stop` scenario is persisted/restored and shown with the correct two-candle chart. Existing normal/example fixtures and storage schema remain compatible.
- DEMO only. No broker network connection, real-order capability, production source/DNS/site visibility changes or automatic merge.

## Verification actually executed

- `npm run check`: 18 Node tests, static allowlisted build, **60 Playwright tests** passed.
- Browser coverage: Chromium mobile viewport + iPhone 13 emulated WebKit. Every account 1–7 exercised via UI for TP and SL scenarios, record restoration, manual ladder placement, differing-price fee-inclusive weighted-average display, cancellation and no later fills, with untouched-account assertions.
- UI ladder stages are selected across the suite (7/8/9/10), not all four stage options independently on every account. This is not a full parameter-combination proof.
- New selected-stop UI test first failed due to missing selector (RED), then passed after implementation (GREEN).
- `python -m unittest discover -s tests -v`: 4 existing briefing tests passed.
- `npm audit`: 0 vulnerabilities. Current working tree/history credential-pattern scan: no matches.
- Actual publish artifact locally exercised on Chromium/WebKit: default TP, selected account 7 SL, CSP headers and offline reload passed, zero page errors.

| Accounts | Ladder placement | Weighted-average display | TP | SL | Pending cancellation |
|---|---|---|---|---|---|
| Each of 1–7 | Browser PASS | Browser PASS, fees + multiple prices | Browser PASS | Browser PASS | Browser PASS |

## Preview / access boundary

https://6af3b3bc338ef6c47807799e--soxl-v3-paper-preview.netlify.app

- Separate Netlify draft deploy `6af3b3bc338ef6c47807799e`, API readback `ready`; upload artifact hashes match local publish assets.
- Fresh browser reached Netlify Team protection / This site is private. Sign in with owning/invited Netlify account on iPhone Safari. Access protection was not relaxed.
- Existing site published-deploy IDs and Git linkage metadata unchanged before/after; shared/site environment variable lists empty.
- **Not verified:** post-login deployed app interactions, physical iPhone Safari, actual broker authentication/live data, multi-device synchronization. WebKit emulation is not physical-device acceptance.
- This new deploy URL uses a different origin, so prior preview localStorage is not automatically shared. Export old records before leaving the old preview if needed. No backup import is claimed.

## GitHub

Continue the existing `feature/soxl-paper-trading-v3` / draft PR #1. Remote CI must be checked against the new head SHA; the previous delivery's passing runs do not prove this continuation. Existing v2.2 source was not present in this repo; compatibility remains unverified. No existing briefing/adapter/old application files were edited.
