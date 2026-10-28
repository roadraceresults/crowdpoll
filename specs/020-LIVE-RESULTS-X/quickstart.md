# Quickstart: Validating Live Results X

Runnable scenarios that prove the feature works end to end, one section per user story. Details
live in [data-model.md](./data-model.md) and [contracts/ui-contracts.md](./contracts/ui-contracts.md)
rather than being repeated here.

## Prerequisites

```
npm install
npm test                # all suites on an embedded PostgreSQL; no local services needed
npm run build           # tsc + devScripts/build-assets.ts
```

For manual validation you need a running server, one ordinary account and one admin identity
(listed in `ENV_ADMINS`) to close a poll and to open one for editing. Regenerate the git-ignored
dev tooling from the checked-in templates, then:

```
npm run dev             # needs ENV_*; use devScripts/launch-dev.ps1 on Windows
```

Settings worth changing while validating:

| Setting | Set to | Why |
|---|---|---|
| `ENV_MIN_MANUAL_REFRESH_INTERVAL` | `2000` | Removals and additions are not held up while you click through the scenarios |
| `ENV_MAX_LIVE_RESULTS_PER_USER` | `5` (default) | Three polls are enough for the focus cases |
| `ENV_EMAIL_RATE_LIMIT_MINUTES_WINDOW` / `…_MAX_REQUESTS_PER_WINDOW` | `1` / `20` | You sign in as two identities |

Have at least three open public polls available (`devScripts/populate/`, or create them on the
admin page).

## Automated checks

```
npx vitest run tests/client-home.test.ts tests/poll-card-assets.test.ts
npm test
```

Expected: the Live Results block passes with its rewritten assertions (the link carries the X and
the "Remove from Live Results" name on that tab, the bars and "Add to Live Results" elsewhere, no
`.card-close-btn` anywhere in the document, a closed-while-watched poll can still be removed, and
Space removes a poll and places focus on the next card's link); every pre-existing suite passes
unchanged (SC-006).

## US1 — Take a poll off the tab from the bottom row

Sign in. On Trending, press **Live Results** on three cards, then open the Live Results tab.

1. Each card's bottom row reads **× Live Results** at the left with **Vote** at the right; the
   title row shows only the Favorites star — no X in the corner (FR-001, FR-003, FR-004).
2. Measure with the browser's element inspector: the × is 14 × 14 with the same 8 px gap to the
   label that the bars have on Trending, and the label's left edge is in the same place on both
   tabs (FR-002).
3. Hover the link on both tabs: the label takes the same underline, and the icon does not change
   (FR-008).
4. Press the link on the middle card: that card goes, the other two stay, the tab stays open, and
   the removal is the same one the corner X performed — check the network panel for
   `DELETE /api/live/<pid>` (FR-006, SC-001).
5. Press it twice quickly on another card: the second press is refused with the usual "please
   wait" notice and sends nothing (edge case).
6. Remove the last card: the tab stays open with "Press Live Results on a poll to watch it here."
   (US1 scenario 4).
7. Go back to Trending, Newest, My Private Polls, Favorites and Search: every card's bottom row
   still shows the animated bars and adds the poll when pressed (FR-005, SC-004).

## US2 — The control is there whatever the poll is doing

With two polls on the Live Results tab, open a second browser signed in as the admin.

1. Close one of the watched polls from the admin page. Back on the Live Results tab (wait for its
   refresh): the card shows **Poll closed on …** *and* the × link, side by side in the bottom row;
   the Vote button is gone (FR-010, FR-011).
2. Press the link on that closed card: it is removed exactly as an open one is (SC-003) — this is
   the case that made the feature more than a move.
3. Open the other watched poll for editing from the admin page (do not publish). The card shows
   the editing note *and* the link; press it: removed (FR-010).
4. On Trending, find a closed poll: its bottom row shows **no** Live Results link, unchanged from
   today (FR-012).
5. Watch a poll you are banned from or not invited to (admin: ban yourself from it): the blocked
   note shows, Vote is gone, and the link is still there (US2 scenario 3).
6. Press **Vote** on a Live Results card to flip it: the bottom row shows Back and Submit vote and
   no removal control; press Back: the × link is there again (FR-013).

## US3 — Keyboard, and where focus lands

With three polls on the Live Results tab and the mouse untouched from here on:

1. Press Tab until the first card's link has focus — it shows the focus indication (FR-014).
2. Press **Space**: the poll is removed and the page does not scroll (FR-014).
3. Look at the focus ring without touching the mouse: it is on the *next* card's link, so pressing
   Space again removes that one too (FR-015, SC-005).
4. With two polls left, Tab to the **bottom** card's link and press **Enter**: the poll is removed
   and focus lands on the **previous** card's link (the clarification's case).
5. Remove the last poll from the keyboard: focus lands on the tab's empty-state line, and Tab from
   there continues into the page normally (FR-015).
6. On Trending, Tab to a card's link and press Enter, then Space on another: both add the poll and
   switch to the Live Results tab, exactly as a click does (US3 scenario 6).

## Coverage map

| Story | Automated | Manual only |
|---|---|---|
| US1 | `client-home` (the link's icon, name and click on Live Results; the bars and name elsewhere; no `.card-close-btn`; the empty line) | the 14 px geometry, the hover treatment, the refusal notice |
| US2 | `client-home` (a closed-while-watched poll shows the link and can be removed) | the editing and blocked cases, the flipped face |
| US3 | `client-home` (Space removes; `document.activeElement` is the next card's link, the previous card's link, or the empty line) | the visible focus ring, tabbing out of the empty line |
