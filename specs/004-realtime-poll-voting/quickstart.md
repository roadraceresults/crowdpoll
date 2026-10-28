# Quickstart: Real-Time Opinion Poll System

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Date**: 2026-08-12

Manual + automated validation guide. Automated coverage (Vitest+supertest, per
`Testing` in plan.md) exercises the API contract directly; the scenarios below layer
browser-level validation on top, one per user story's Independent Test (spec.md).

## Prerequisites

```
devScripts/launch-dev.ps1   # starts local MongoDB + the server (APP_PORT default 9999)
```

Two browser profiles (or one regular + one incognito) to act as two different logged-in
users; use the existing native-mode magic-link flow (`001-user-auth`) to sign in as each —
check the terminal/Mailtrap inbox for the login link.

One of the two accounts' email must be in `APP_ADMINS` (dev default:
`roadraceresults@gmail.com`) to exercise the admin scenarios.

## US1 — Vote on a Public Poll and See Live Results (P1)

1. As the admin, create a poll via `/admin` → "Create New Poll", rename it, leave defaults
   (`SINGLE-CHOICE-POLL`, `PUBLIC_POLL`, `FINAL-VOTE-POLL`).
2. As User A (non-admin, logged in), open `/`, find the poll card, flip it, select a choice,
   submit. **Expect**: results side shows 1 participant, 100% on that choice, your own choice
   highlighted.
3. Open the same poll as User B in the second browser profile, vote for a different choice.
4. Back on User A's still-open tab: within one `APP_POLLING_INTERVAL` (default 5s), **expect**
   the percentages to update to reflect User B's vote — no manual reload.
5. Open the poll as a guest (logged out). **Expect**: results visible, "Vote" prompts sign-in
   instead of flipping to the voting side.

## US2 — Multiple-Choice Voting and Changing Your Vote (P2)

1. As admin, create a poll; edit `Choice Mode` → `MULTIPLE-CHOICE-POLL`, `Vote Mutability` →
   `DYNAMIC-VOTE-POLL`.
2. As User A, select two choices, submit. **Expect**: both choices' counts include User A;
   percentages sum against 1 total participant, not 2 selections.
3. Reopen the poll as User A. **Expect**: voting side pre-populated with both prior choices.
4. Change to a single different choice, submit. **Expect**: results now reflect only the new
   choice for User A.

## US3 — Discover Polls via the Home Grid and Direct Links (P3)

1. As a guest, load `/`. **Expect**: responsive grid of public poll cards with live results.
2. Copy a poll's direct link (`Copy Poll Link` from the admin list, or construct
   `/?PID=<pid>` manually) and open it in a fresh tab. **Expect**: the same card renders
   standalone.
3. Resize the browser window narrower/wider. **Expect**: card columns adjust responsively
   (CSS `auto-fill` grid, no reshuffled data).

## US4 — Admin Creates and Configures a Poll (P4)

1. `/admin` → "Create New Poll". **Expect**: lands on `/admin/poll?PID=...` with title "New
   Poll <timestamp>", two choices "Choice 1"/"Choice 2", all documented defaults.
2. Edit the title, tab out. **Expect**: saved without a Save button (network tab shows a
   `PATCH` on blur).
3. Add a third choice. **Expect**: "Choice 3" appended, immediately editable.
4. Try removing down to 1 choice. **Expect**: blocked with a minimum-2 message.
5. Add choices up to 50, try a 51st. **Expect**: blocked with a maximum-50 message.
6. Try renaming a choice to an existing label. **Expect**: rejected with feedback.
7. Back to `/admin`. **Expect**: the new poll listed first (most-recent-first).

## US5 — Admin Manages Choice Removal and Poll Duplication (P5)

1. Vote for a specific choice as User A, then remove that choice as admin. **Expect**: choice
   disappears from voter-facing results/voting; User A's vote shows `(removed)`, User A can
   vote again even though the poll is `FINAL-VOTE-POLL`.
2. Reopen `/admin/poll` for that poll. **Expect**: the `(removed)` choice still visible,
   labeled accordingly, for audit.
3. `Duplicate Poll` from the admin list. **Expect**: new `PID`, no votes, no `(removed)`
   choices carried over, `ACTIVE-POLL-STATE`.

## US6 — Admin Manages Poll Lifecycle and Scheduling (P6)

1. Set a future `START_DATE_TIME`. **Expect**: voters told it hasn't started
   (`PENDING-POLL-STATE`).
2. Set a past `END_DATE_TIME` on another poll. **Expect**: vote attempts rejected, "closed"
   message.
3. Manually set `POLL_STATE` → `ARCHIVED-POLL-STATE`. **Expect**: disappears from `/` and any
   poll link for non-admins; still visible/editable in `/admin`.

## US7 — Restricted-Access Polls (P7)

1. Create a `PRIVATE_POLL_ANYONE_WITH_THE_LINK` poll, set `VoterCountLimit` to 2. Vote as User
   A and User B via the direct link. **Expect**: a third user is blocked with a "poll is full"
   message.
2. Create a `PRIVATE_POLL_INVITATION_ONLY` poll, invite only User A's email. **Expect**: User
   B (logged in, direct link) is told they're not invited; User A can vote.

## US8 — Admin Manages Participants, Bans, and Result Exports (P8)

1. Open `/admin/poll?PID=...` (Edit Poll Configuration) for a poll with votes and remove one
   voting participant from its Participants section. **Expect**: their vote no longer counts;
   they appear under "Banned Voter List"; a repeat vote attempt from that account is rejected.
2. Un-ban them from the same section. **Expect**: they may be invited/vote again from scratch
   (no restored vote).
3. Open `/admin/poll/results?PID=...` for the same poll. **Expect**: aggregate results + a
   "voted" list with choices (read-only — no remove/ban controls on this page).
4. `Export JSON` and `Export Markdown`. **Expect**: both downloads contain current
   (non-removed) config + results, no `(removed)` choices.

## Automated coverage

`npm test` runs the full suite including new `tests/polls-*.test.ts` files covering the
contract in `contracts/api-endpoints.md` — see tasks.md for the specific test files this
feature adds.
