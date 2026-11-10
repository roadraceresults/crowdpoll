# Quickstart: Snackbar Hourglass

## Automated

```
npx tsc --noEmit
npx vitest run tests/client-sign-in-notice.test.ts tests/m3-assets.test.ts
npm test
```

Expected:
- `client-sign-in-notice` passes with the 7 000 ms timer and the hourglass markup (C2);
- `m3-assets` pins the sheet rules (C3, C4) with unchanged page lists;
- the full suite stays green.

## In a browser

Prerequisites: the development app running (`devScripts/launch-dev.ps1` or the VS Code launch configuration), with `ENV_SIGNIN_METHOD` set to `oauth` or `both`, and at least Google configured.

A provider login is the real path. To repeat a check without logging in again, sign in once, then open `http://localhost:<port>/?signedIn=1` (the same mark the provider's callback carries).

| # | Check | Expected | Spec |
|---|---|---|---|
| 1 | Log in with Google on an account that has accepted the Terms | the top notice shows "Logged in as <email>" with the hourglass at its right end, full at the top | FR-001, Story 1 #1 |
| 2 | Watch the notice | the sand drains smoothly, with a thin stream between the bulbs, once, no restart | FR-003 |
| 3 | Time it (DevTools Performance, or a screen recording) | the top bulb empties within 0.2 s of the fade starting, about 7 s after the notice appears | FR-002, SC-002 |
| 4 | Inspect the bar in DevTools | 48 px tall on one line; hourglass 22 × 32; 12 px gap | FR-005, SC-003 |
| 5 | Device width 320 px, long address | text wraps, hourglass keeps 22 × 32 | FR-006 |
| 6 | Switch the site to the dark theme (settings) and reload `/?signedIn=1` | light bar, dark outline, dark-green sand, clearly visible | FR-004, SC-004 |
| 7 | Emulate `prefers-reduced-motion: reduce` (DevTools › Rendering) | hourglass still, full at the top, no stream; notice leaves after 7 s | FR-007, SC-005 |
| 8 | Screen reader (NVDA or VoiceOver) | announces "Logged in as <email>" only | FR-008 |
| 9 | Log in by emailed link | the notice with the hourglass, as in row 1 | FR-009 |
| 9a | Reload any page | no notice | FR-009 |
| 10 | On the admin page, copy a poll link | "Link copied" snackbar unchanged, no hourglass | FR-010 |
| 11 | DevTools › Network on `/?signedIn=1` | no request beyond those before the feature; no image request for the hourglass | FR-011, SC-006 |
| 12 | Open `/?signedIn=1` in a background tab, wait, then switch to it | the notice and a full hourglass start only when the tab is shown | Edge case |
