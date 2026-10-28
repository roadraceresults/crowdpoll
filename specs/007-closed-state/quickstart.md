# Quickstart: Poll Closed State Display

## Prerequisites

- `npm install`
- Local dev server running: `npm run dev` (or `devScripts/launch-dev.ps1` on Windows).
- An admin account (address listed in `APP_ADMINS`) to close a poll on demand via
  `/admin/poll?PID=...` → **Poll State** → **Closed** (existing control, unchanged by this
  feature).
- A second, non-admin account (or a signed-out browser/incognito window) to view the poll as
  a voter.
- Optional: set `APP_POLLING_INTERVAL` lower (e.g. `2000`) in your dev launch config while
  testing User Story 2's "closes while I'm looking at it" scenario, so you don't have to wait
  the default 5s between checks.

## US1 — Home Grid Shows Closed Polls Clearly (P1)

1. As an admin, create a poll and note its title. Leave a second poll open (untouched) for
   comparison.
2. As an admin, open the first poll's editor and set **Poll State** to **Closed**.
3. As a voter (or signed out), load `/` (the poll grid). Confirm the closed poll's card shows
   "Poll closed on `<date>`" where "Live Results" normally sits, in the same font/style, and
   shows no "Vote" button — while the still-open poll's card is unaffected (Acceptance
   Scenarios 1–3).
4. Leave the grid open, and as the admin, close the second (previously open) poll. Within one
   polling interval, confirm its card updates in place to the closed treatment too — without
   reloading the page (Acceptance Scenario 4).
5. Visit the closed poll directly via its `?PID=` link (e.g. `/?PID=<pid>`) and confirm the
   same treatment (spec.md Edge Cases — same shared card component).

## US2 — Voting Side Reacts to a Poll Closing (P2)

1. Load the grid with the closed poll from US1 step 2 still closed. Click into its card —
   since the "Vote" button isn't shown, instead open its voting side using
   `document.querySelector('.vote-btn')?.click()` in the browser console (or, more simply,
   verify via a poll that's still open in step 2 below, then close it while flipped).
2. As a voter, open the voting side of a poll that is still open (click "Vote"). While the
   voting side is showing, have the admin close that poll. Within one polling interval,
   confirm the choice options and "Submit vote" button disappear and a "This Poll closed on
   `<date>`" message appears in their place (Acceptance Scenarios 1–2).
3. From that closed voting side, use the existing back-arrow control and confirm it returns
   to the results side normally (Acceptance Scenario 3).

## US3 — No Vote Is Ever Counted After Closing (P3)

1. As a voter, open the voting side of an open poll and select a choice (don't submit yet).
2. As the admin, close that poll.
3. As the voter, click "Submit vote" before your next poll refresh picks up the closed state
   (do this quickly, or query `POST /api/polls/:pid/vote` directly while the poll is closed
   to force the race deterministically). Confirm the request is rejected (`409`, existing
   server behavior — `tests/polls-vote.test.ts`) and does not appear in the poll's results.
4. Confirm the voter's screen ends up showing the closed-poll message (US2 Acceptance
   Scenario 1) rather than a "Submit vote" button that simply re-enables with no explanation.

## Automated coverage

- Server-side vote rejection on a closed poll is already covered by
  `tests/polls-vote.test.ts` (`"409s a vote on a non-ACTIVE poll and names the state
  (FR-027)"`) — no new server tests are needed (research.md R1).
- This feature's actual work (`pollCard.js`'s `updateClosedState()`, the new
  `.poll-closed-message` elements, and the submit-rejection reaction) is DOM/visual/timing-
  level; this project has no browser/DOM test tooling (no jsdom/Playwright in `package.json`
  devDependencies), so it's validated manually per the steps above, consistent with the
  constitution's tests-OR-manual-check allowance (Principle IV) and the same approach
  `005-admin-page-improvements`/`006-poll-choices-editor` used for their own DOM-level user
  stories.
- Run `npm test` to confirm no regressions in the existing suites (none expected — this
  feature touches only `src/public/pollCard.js` and `src/public/site.css`, research.md R1).
