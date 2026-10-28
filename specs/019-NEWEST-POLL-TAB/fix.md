# Overview: `specs/019-NEWEST-POLL-TAB`

## Record

| Record | Value |
|---|---|
| Feature directory | `specs/019-NEWEST-POLL-TAB` |
| Fix file created | 2026-09-21 17:52 |
| Last updated | 2026-09-22 09:23 |

Legend: `[ ]` open · `[X]` resolved · `[-]` resolved manually (or accepted as-is) by the developer.

"What's next" always returns the first `[ ]` item below.

The developer is expected to create the individual fix requirements in this file, and then run the `/speckit-fix` command to have the AI implement them, one at a time.  
Each fix requirement initially carries an empty checkbox; tick it when the item is resolved or consciously accepted.  


# Fixes

## FIX01 Newest Polls Not Appearing 
[-] Resolved

I set "ENV_NEWEST_POLLS_RECOMPUTE_INTERVAL": "5000"   
The screenshot in:  
`designDocs/dontTrack/newestPollsBug01.jpg`  
shows 3 open polls on the poll admin page in the right panel.  
The left panel shows the Newest tab with the message "No polls have been launched yet."  
After several minutes, the Newest tab still shows the same message.  

The stdout of the server shows the following log entries:  
```
[sweeps] newestSweep: 3 change(s)
[controller] R=0 B=1250 S=0/2000 V=0 a=1.00 k=1/1/1
[sweeps] newestSweep: 3 change(s)
[sweeps] newestSweep: 3 change(s)
[sweeps] newestSweep: 3 change(s)
[sweeps] newestSweep: 3 change(s)
[sweeps] newestSweep: 3 change(s)
[sweeps] newestSweep: 3 change(s)
[sweeps] newestSweep: 3 change(s)
[sweeps] newestSweep: 3 change(s)
[sweeps] newestSweep: 3 change(s)
[sweeps] newestSweep: 3 change(s)
[sweeps] trendingSweep: 200 change(s)
[sweeps] newestSweep: 3 change(s)
[sweeps] newestSweep: 3 change(s)
[controller] R=0 B=1250 S=0/2000 V=0 a=1.00 k=1/1/1
[sweeps] newestSweep: 3 change(s)
[sweeps] newestSweep: 3 change(s)
[sweeps] newestSweep: 3 change(s)
[sweeps] newestSweep: 3 change(s)
[sweeps] newestSweep: 3 change(s)
[sweeps] newestSweep: 3 change(s)
```

When the Refresh icon is clicked, the 3 new polls are displayed.  

### RESOLUTION

**Deferred to a future requirement by the developer (2026-09-22 08:39).** No code, test or
artifact was changed for this fix; the working tree holds only the 019 implementation.

The developer's words: *"I will resolve this in a future requirement. The issue is that the
Newest tab is not being updated automatically when new polls are launched. The fix will involve
ensuring that the Newest tab refreshes its content at the specified interval, and that it
correctly displays the newly launched polls without requiring a manual refresh. The current
requirement stated that 'Newest' would be exactly like Trending, but it actually has
requirements closer to real-time update."*

Analysis carried forward for that requirement: the server side is correct — `newestSweep`
republishes every `ENV_NEWEST_POLLS_RECOMPUTE_INTERVAL` (the log's "3 change(s)" is the
listing's size) and Refresh renders the three polls, so the published objects are right. The tab
never asks again on its own because `newest.js` fetches only on first activation, on a tab click
when the held copy is older than the manual floor, and on Refresh — which is what FR-021 and the
UI contract's "Return to the window adds no request of the tab's own" specify, inherited from
TRENDING (017 FR-017/FR-018). An open, untouched tab meets none of those triggers.

The recommended shape, if it still fits when the new requirement is written: a visibility-guarded
timer in `newest.js` that refetches the counts object once per recompute interval while Newest is
the active tab and the document is visible (and once immediately when the page becomes visible
again), outside the manual-floor bucket since it is the tab's own cadence rather than a visitor
action; the cards object only on a membership change and the overlay only for a member whose held
ids changed, as today. That requirement will need to change FR-021 in `spec.md`, the "Return to
the window" row of `contracts/ui-contracts.md`, quickstart US3, and the matching bullet in
`designDocs/019-high-level-requirements-NEWEST-POLL-TAB.md`.

## FIX02 Poll State CLOSED and STARTED
[X] Resolved
On the Poll Admin page,
the screenshot in:  
`designDocs/dontTrack/newestPollsBug02.jpg`  
shows a poll that is in state = CLOSED  
yet at the same time, Start = 'started'  

### RESOLUTION

**Option A — the admin card's Start wording is now state-aware.**

`src/public/adminCard.js`: `formatStart(value, pollState)` returns the date when there is one,
`started` when the poll is OPEN and has none, and `not scheduled` in every other state; the call
site passes `current.pollState`. The grey `admin-date-absent` styling is unchanged.

Cause: 012's Open transition deliberately clears `start_at` (`service.ts:695`, so the schedule
sweep re-derives OPEN instead of pulling the poll back to WAITING TO OPEN) and the Close
transition only clears a *future* start, so every hand-opened poll that is later closed has
`start_at` NULL — and 012 FR-038 rendered NULL as `started` in every state. Nothing in 019
caused it; the column has read this way since 012.

Test: `tests/client-home.test.ts` → `describe("the Start field on an admin card")` — an OPEN poll
with no start reads `started`, a CLOSED one reads `not scheduled`, a WAITING TO OPEN one reads
its scheduled date. Suite green: 42 files / 649 tests passed, 15 skipped.

Artifacts: `specs/012-ADMIN-REVISIONS/spec.md` FR-038 and its acceptance scenario 6, and
`specs/012-ADMIN-REVISIONS/contracts/ui-contracts.md` (column 7 and the "Empty dates" note) now
carry the state qualifier and cite this fix. 019's own artifacts are untouched — the admin card
is not part of this feature.

Not done, deliberately: the true start of a hand-opened poll is still not stored anywhere after
it closes (019 clears `launched_at` on close, FR-003). Recording it would mean changing 012's
`startAt: null` open transition — rejected here as out of proportion to a wording defect. An
EDITING poll with no start now reads `not scheduled` until its edit is published; the admin list
payload does not carry `pollStateBeforeEditUpdate`, and adding it for that nuance was not worth
a contract change. (2026-09-22 08:57)

## FIX03 Add updated_at To Admin Card
[X] Resolved
Currently, the admin card has a State group, including Created Date, Open/Close/Archive buttons, and Start/End dates.  
Please add an Launched = updated_at.  
The order of the fields is: Launched, Start, End.  

### RESOLUTION

**Option A — the admin card's date row is now Launched · Start · End, fed by `launched_at`.**

Read as `launched_at`, not `updated_at`: the `polls` table has no `updated_at` column (only
`user_polls` does, meaning "when this person's relation to the poll last changed"), and
`launched_at` — added by 019, stamped on every entry into OPEN, cleared on entry into CLOSED —
is the column that means what the label asks for.

- `src/routes/pollsApi.ts`: `adminListRow` carries `launchedAt: p.launched_at`.
- `src/public/adminCard.js`: `formatLaunched(value)` → the localised date, or `not launched`;
  the field is rendered first in `.card-dates`, greyed with `admin-date-absent` when absent.
  Only the read-only card shows it — the editor's own schedule form is unchanged.
- `postman/openapi.json`: `AdminPollSummary.launchedAt` (nullable date-time).

Test: `tests/client-home.test.ts` → `describe("the date fields on an admin card")` now asserts the
labels read Launched · Start · End in that order, a running poll shows its launch date, and a
closed and a waiting poll both read `not launched`. Suite green: 42 files / 649 tests passed,
15 skipped; `tsc` clean.

Artifacts: `specs/012-ADMIN-REVISIONS/contracts/ui-contracts.md` (the column table gains row 7
and the later rows and two section headings are renumbered) and `specs/019-NEWEST-POLL-TAB/spec.md`
FR-001 (the launch timestamp is now displayed).

Known consequence, accepted with option A: `launched_at` is NULL for a closed poll (019 FR-003)
and for every poll that was already open when 019 deployed (no backfill, FR-006), so those cards
read `not launched`. Option B — keeping the value through the close, since the Newest query
already excludes closed polls by state — was offered and not taken. (2026-09-22 09:23)

