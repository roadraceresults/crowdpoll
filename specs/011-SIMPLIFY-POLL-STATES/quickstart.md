# Quickstart: Validating Simplify Poll States

**Feature**: `011-SIMPLIFY-POLL-STATES` | **Date**: 2026-08-28
**Plan**: [plan.md](./plan.md) · [data-model.md](./data-model.md) · [contracts/](./contracts/)

This guide validates all fourteen success criteria. Each check names the criterion it proves.

## Prerequisites

```
npm install
npm test          # vitest run — no local MongoDB needed (mongodb-memory-server)
npm run build     # tsc + copy src/public → dist/public
```

For the manual walkthrough you need a running server and a local MongoDB. Regenerate your
git-ignored local configs from the checked-in templates first — **they must use the new setting
names** (see [data-model.md](./data-model.md) and the rename list in the source requirements):

```
cp launch.json.example .vscode/launch.json
cp devScripts.example/launch-dev.ps1 devScripts/launch-dev.ps1
# edit both: APP_* → ENV_*, and add the six new settings
npm run dev
```

## Part 1 — Automated

```
npm test
```

| Suite | Proves |
|---|---|
| `polls-state-machine.test.ts` | Every transition in [data-model.md](./data-model.md); per-state visibility; archived is terminal — SC-003, SC-014 |
| `polls-editing-lock.test.ts` | Claim, heartbeat, ownership, stale recovery — SC-005, SC-006 |
| `polls-screening.test.ts` | Claim atomicity, attempt budget, timeout, crashed-claim recovery — SC-008, SC-009 |
| `polls-schedule-sweep.test.ts` | Schedule transitions; absent bounds; inverted-dates fail-safe — SC-007 |
| `polls-vote.test.ts` | Votes refused unless `OPEN` — SC-004 |
| `polls-admin-crud.test.ts` | Edit/update eligibility; delete restrictions — SC-001, SC-012 |
| `config.test.ts` | New names, new settings, fail-fast messages — SC-013 |

**No test may sleep.** Every time-dependent behaviour is exercised by passing a chosen timestamp
into the function under test and calling a single sweep tick directly (research R2, R10-crosscut).
A suite that waits out a real interval is a defect in the test, not a slow test.

### The three checks worth writing first

**Attempt budget terminates even when the process dies mid-call** (SC-008, SC-009). Simulate a
screener that never returns and a process that vanishes after taking the claim: run
`ENV_MAX_ACCEPTABILITY_SCREENING_ATTEMPTS + 1` recovery ticks and assert exactly *max* screening
calls were attempted and the poll ends `REJECTED`. If the counter were incremented on failure
instead of on claim, this test loops forever — that is precisely what it exists to catch.

**A stale client cannot clear a lock it no longer holds** (SC-006). Take a session as client A, let
it go stale, recover it, take a new session as client B, then send A's release. Assert B's lock is
intact and A's release reported failure.

**A deleted vote still blocks full editing** (SC-001, FR-007). Vote, delete the vote, then assert
the full edit surface is refused and the update surface is granted.

## Part 2 — Manual walkthrough

### A. Publish and screening — SC-003, SC-011

1. Create a poll. It is `INITIALIZED` and absent from the public grid.
2. Open it: the full edit page loads; `Save and Publish` and `Cancel` are **disabled**.
3. Click publish without changing anything → it stays `INITIALIZED` with the still-default message.
4. Change only the title and subtitle, publish → still `INITIALIZED`, because the choices are still
   defaults (FR-025).
5. Give it real choices and publish → returns immediately to `/admin` showing `AWAITING APPROVAL`
   and a rising waiting time.
6. Within ~5s the state resolves. Confirm it never appeared publicly while awaiting approval.
7. Publish a poll containing obviously unacceptable wording → `REJECTED`, reason shown both in the
   list and at the top of its edit page, still not public.

### B. Schedule — SC-007

Set a start ~90s out and an end ~3 min out. Without touching anything: `WAITING TO OPEN` → `OPEN` at
the start, `CLOSED` after the end, each within a minute. Then move the end further out and confirm it
returns to `OPEN`. Clear the start entirely and confirm it opens immediately on approval.

### C. Editing lock — SC-005, SC-006

1. Open a poll for editing in tab 1 → state shows `EDITING` and it leaves the public grid.
2. Open the same poll in tab 2 → refused: "This poll is currently being edited. Please try again
   shortly."
3. **Refresh tab 1** → also refused. This is correct and deliberate (FR-023).
4. Close tab 1 abruptly. Within ~40s the poll returns to its previous state and becomes editable
   (SC-005).

### D. Abandoning an edit — FR-014, FR-015

Change a field, then leave four ways — `Cancel`, `Back Arrow`, browser back, closing the tab. Each
warns. Decline once and confirm your changes are still on screen; accept and confirm the stored poll
is unchanged and its state restored.

### E. Voting gate — SC-004

Open a poll's public card in a second browser. In the admin list, close the poll. Without reloading
the card, vote → refused with "This poll is not open for voting." This is the check that listing
visibility alone would not catch.

### F. Vote preservation — SC-002

Vote several times from different accounts. Then, via the update page, change the title and extend
the end time. Confirm every vote and the full choice list survive (FR-011).

### G. Delete and archive — SC-012

- `INITIALIZED`, `REJECTED`, `ARCHIVED` → `Delete Poll` present, asks to confirm.
- `WAITING TO OPEN`, `OPEN`, `CLOSED` → **absent**.
- Archive from `CLOSED` → leaves the public grid, votes intact, and neither `Edit Poll` nor
  `Update Poll` appears afterwards (FR-052).
- Confirm archiving is offered only from `CLOSED`.

### H. List refresh — SC-010

Leave `/admin` open beside a second window. Change a poll's state there. The row updates within ~5s
with no page reload, and your scroll position and any open action menu survive (FR-048).

### I. Screening outage — SC-009

Make the screener fail. Publish a poll and watch the attempt count climb, then stop at the maximum
with the poll `REJECTED` and a reason naming the count. Confirm the re-screen control appears.
Restore the screener, click it, and confirm the poll is approved. No developer intervention was
needed at any point.

## Part 3 — Configuration rename — SC-013

```
npm test                                              # config suite covers the new names
grep -rn "APP_" src/ tests/ postman/ README.md CLAUDE.md launch.json.example devScripts.example/
```

The grep must return **nothing**. Then confirm startup fails helpfully with a required setting
removed:

```
# unset ENV_BETTER_AUTH_SECRET, then:
npm run dev     # must exit naming the missing variable
```

Update the DigitalOcean environment to the new names **before** deploying — the hard cutover
(research R6) means the old names are not read at all, so a partial rename fails at startup.

## Part 4 — Confirming what was removed — SC-014

```
grep -rn "removed" src/polls/ src/routes/pollsApi.ts
```

No `Choice.removed` or `VoteEntry.removed` should survive. Then confirm no stored document carries a
field whose only purpose is reconciling an edit against existing votes:

```
# in mongosh
db.polls.findOne()
```

The document should show the eight-state `pollState`, the five bookkeeping fields from
[data-model.md](./data-model.md), and no `removed` markers anywhere in `choices` or `currentVotes`.

Because the database is dropped and recreated rather than migrated (research R7), the cleanest check
is a fresh database: drop it, create a poll, take it through publish → approve → open → close →
archive, and confirm the stored shape matches the data model exactly.
