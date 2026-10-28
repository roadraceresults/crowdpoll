# Phase 0 Research: Simplify Poll States

**Feature**: `011-SIMPLIFY-POLL-STATES` | **Date**: 2026-08-28
**Plan**: [plan.md](./plan.md) | **Spec**: [spec.md](./spec.md)

Ten questions had to be settled before design. Nine are resolved here. One — R1, how
acceptability screening is actually performed — is deliberately left with a decision that defers
the external dependency, because the source requirements mark it as a research item and nothing
else in the feature depends on which way it goes.

---

## R1. How is Acceptability Screening performed?

**Decision**: Define screening behind a single internal interface — a function taking the poll's
title, subtitle and choice labels and returning either an empty string (acceptable) or a
human-readable objection. Ship a **local deny-list implementation** as the default, and make the
implementation selectable so a hosted or local-model screener can replace it without touching any
caller.

**Rationale**: Every other requirement in this feature — the claim, the attempt budget, the
timeout, the crashed-process recovery, the rejection reason, the retry control — is about what
happens *around* the screening call, not inside it. Those mechanics have to be correct whether the
call takes 2ms against a word list or 4 seconds against a hosted model. Building them against an
interface lets the whole state machine be implemented and tested now, deterministically, with no
network dependency and no third-party account.

A local default is the right first implementation because the alternative carries a privacy cost
the spec explicitly flags: with a hosted API, unpublished private drafts leave the system. Shipping
local-first means that cost is opted into rather than inherited.

**Alternatives considered**:

- *Hosted LLM API as the default.* Better recall on paraphrase and context. Rejected as the
  default because it makes an outbound network call a hard dependency of the test suite, requires
  credential management this feature would then have to specify, and sends private drafts to a
  third party before anyone has agreed to that.
- *Local GGUF model.* No network, no per-call cost, better than a word list. Rejected for now
  because it adds a large binary artifact, a runtime, and a substantial deployment footprint to a
  service currently running on a small managed platform — a decision worth making with usage data
  rather than ahead of it.
- *No screening; publish immediately.* Rejected: the state machine's approval path exists to
  prevent unacceptable content going public, and removing it removes the feature's quality gate.

**Consequence for the plan**: `ENV_API_CALL_TIMEOUT` and the whole failure-recovery path still
apply to the local implementation — a local screener can still throw, and the timeout wrapper is
what keeps the claim from being held forever. The interface is the deliverable; the screener behind
it is replaceable.

---

## R2. How are the three recurring background processes scheduled?

**Decision**: Plain `setInterval` timers started from `startServer()`, each wrapped in a guard that
skips a tick while the previous tick is still running, and each with its whole body inside a
`try/catch` that logs and continues.

**Rationale**: The process is a single long-lived Express server; there is no need for a scheduling
library to run three fixed-interval jobs. The overlap guard matters more than the scheduler: the
approval sweep can take as long as a screening call, and without a guard a slow call would let a
second tick start and race the first for the same poll. A boolean per sweep is sufficient because
the spec assumes a single instance.

Timers must be `unref()`d in the test environment so a test run does not hang waiting for them.

**Alternatives considered**:

- *`node-cron` or `croner`.* Rejected: adds a dependency for cron expressions nobody needs, when
  every interval here is a plain millisecond count already supplied by configuration.
- *A queue with workers.* Rejected as speculative generality — the source requirements explicitly
  defer concurrency to a future feature, and one poll per tick is a stated requirement.
- *Relying on a database change stream.* Rejected: requires a replica set, which the local
  development MongoDB is not.

---

## R3. How does a screening claim avoid being taken twice?

**Decision**: Claim with a single atomic `findOneAndUpdate` whose filter includes the condition
being claimed on — `pollState` awaiting approval **and** the approval timestamp unset — and whose
update sets the timestamp and increments the attempt counter in the same operation.

**Rationale**: Read-then-write cannot be made safe here without a lock. A document-level atomic
find-and-update is exactly the primitive MongoDB provides for this, and it collapses three
requirements into one operation: it selects the poll, takes the claim, and counts the attempt.
That last point is what makes FR-036 implementable — the attempt is counted *because* the claim was
taken, in the same write, so no failure mode exists in which a claim is held without a counted
attempt.

The same pattern handles the crashed-process recovery query, filtered on the timestamp being older
than twice the call timeout.

**Alternatives considered**:

- *Read, then update.* Rejected: two ticks can read the same unclaimed poll before either writes.
- *A separate locks collection.* Rejected: adds a collection and a cleanup problem to solve
  something a filtered update already solves atomically.
- *Incrementing the attempt counter after the call returns.* Rejected — this is the specific bug
  the source requirements were revised to prevent. A process killed mid-call would never increment,
  never reach the maximum, and cycle forever.

---

## R4. How is the editing lock enforced and released safely?

**Decision**: Store the owning client's identifier on the poll. Every heartbeat and every release
is a conditional update filtered on that identifier *and* on the state still being the editing
state. A release whose filter does not match makes no change and reports failure.

**Rationale**: Only the holder may release the lock. Without the identifier in the filter, a stale
client returning from a network partition could clear a lock that the recovery sweep had already
released and another administrator had since taken — silently reverting the second administrator's
state. Making the identifier part of every write's filter makes that impossible rather than
unlikely.

Generating the identifier per page load, rather than per user or per session, is what implements
the deliberate non-re-entrancy in FR-023: a refresh produces a new identifier, which will not match,
so the refreshing administrator is correctly refused their own stale lock.

**Alternatives considered**:

- *Key the lock to the administrator's identity.* Rejected: makes the lock re-entrant across tabs,
  which is precisely the case the spec wants refused, since two tabs would both believe they held it.
- *Release without checking ownership.* Rejected for the overwrite scenario above.

---

## R5. How does the approval queue order polls when a start time may be absent?

**Decision**: Sort ascending on the start time. In MongoDB, a missing or null field sorts before
any date in ascending order, which is exactly the ordering the spec requires — a poll with no start
time opens the moment it is approved, so it is the most urgent.

**Rationale**: The required ordering and the database's natural ordering coincide, so no sentinel
value, no computed sort key and no application-side sorting is needed. This is worth recording
because the source requirements previously specified a `DateTime.MinValue` sentinel; that has been
removed, and the plan must not reintroduce it.

An index on state plus start time supports the query.

**Alternatives considered**:

- *A sentinel date for missing start times.* Rejected: writes a fake value into stored data to
  express something the sort already expresses, and the value then has to be recognised and hidden
  everywhere the field is displayed.
- *Sorting in the application.* Rejected: requires loading every awaiting-approval poll to pick one.

---

## R6. How is the configuration rename carried out without breaking startup?

**Decision**: A hard cutover — `loadConfig()` reads only the new names, with no fallback to the old
ones. Rename every occurrence across the codebase, tests, the API description, the developer
scripts and the documentation in the same change, and update the deployment environment before
release.

**Rationale**: A fallback would mean both names work, which guarantees the old names survive
indefinitely and makes FR-058 unverifiable — the check "no superseded name remains" only has an
answer if there is exactly one accepted name. The system has no production users, and a startup
failure that names the missing setting is a good failure: loud, immediate, and self-explaining.

The existing fail-fast pattern in `loadConfig()` already produces exactly that message for the
required settings, so this is a rename within an established mechanism rather than a new one.

The two interpolated OAuth variable names are built from a template at runtime, so the rename must
change the template that builds them, not only literal occurrences.

**Alternatives considered**:

- *Accept both names for a deprecation period.* Rejected for the reason above, and because there is
  no population to deprecate for.
- *Rename in a separate feature.* Rejected: this feature adds six new settings, and adding them
  under the new convention while leaving fifteen under the old one entrenches the split.

---

## R7. What happens to the stored data that the simplification removes?

**Decision**: Remove the per-choice and per-vote `removed` markers from the stored shape outright,
along with the reconciliation logic they supported. Do not migrate existing documents; the
development database is dropped and recreated.

**Rationale**: The spec states there are no production users and that simplifying the stored shape
is an intended outcome rather than a cost. Keeping the markers "just in case" would preserve exactly
the complexity the feature exists to remove, and every code path that reads them would have to keep
handling both shapes.

Deleting a vote outright is now correct rather than lossy: the append-only vote history collection
already retains the audit trail, so "delete the current vote" does not destroy the record that a
vote occurred — which is also what makes the "has this poll ever been voted on" check dependable.

**Alternatives considered**:

- *Soft-delete with a migration.* Rejected: no data to protect, and it retains the complexity.
- *Keep the markers unused.* Rejected: dead fields in a stored shape are read as meaningful by the
  next person to open the file.

---

## R8. How is "has this poll ever received a vote" determined reliably?

**Decision**: Test for the existence of any history entry for the poll, not for entries in the
poll's current votes.

**Rationale**: This is the whole basis of the edit-versus-update split, and it must stay true after
a vote is deleted or a voter is banned — both of which remove current votes. The history collection
is append-only and is never pruned by those operations, so it answers the question correctly in
exactly the cases FR-007 calls out. An index on the poll identifier already exists for this lookup.

**Alternatives considered**:

- *A boolean flag on the poll set on first vote.* Rejected: a second source of truth that can drift
  from the history, for a lookup that is already indexed and cheap.
- *Counting current votes.* Rejected: wrong by construction after a deletion — the case the spec
  explicitly requires to be handled.

---

## R9. How does the client warn about unsaved changes on every exit route?

**Decision**: Two mechanisms, because no single one covers every route. In-application exits (the
cancel control, the back control, the publish control) are intercepted by the page's own handlers
and use in-application navigation. Browser-level exits — closing the tab, navigating to another
URL, the back button — use the browser's built-in unsaved-changes prompt, with a history entry
pushed on first edit so the back button triggers it too.

**Rationale**: The browser's prompt cannot be given custom wording and cannot be triggered by the
application on demand; the in-application dialog can, and is the one an administrator will meet in
normal use. Using each where it works is what satisfies FR-014 across all the listed routes rather
than most of them.

FR-016's requirement to navigate rather than use history is what keeps the two mechanisms from
interfering: an in-application exit leaves no history entry that would later fire the browser prompt
spuriously.

**Alternatives considered**:

- *Only the in-application dialog.* Rejected: cannot intercept a tab close.
- *Only the browser prompt.* Rejected: cannot be worded, cannot offer the required Yes/No semantics,
  and does not fire on in-application navigation.

---

## R10. How does the poll list stay current?

**Decision**: Continue the existing client-side polling approach, on its own interval, re-rendering
changed rows in place rather than replacing the list.

**Rationale**: The codebase already polls for live results; adding a second, different transport
for the admin list would mean maintaining two. The spec requires the two intervals to stay
independently configurable, which is a straightforward second interval rather than an architectural
change. Re-rendering in place, rather than rebuilding the list, is what preserves the
administrator's scroll position and any open menu.

**Alternatives considered**:

- *Server-sent events or websockets.* Rejected as disproportionate: the admin list has a handful of
  concurrent viewers at most, and this would add a connection lifecycle to manage for a five-second
  refresh.
- *Reusing the existing polling interval.* Rejected: the spec requires them to remain distinct.

---

## Cross-cutting: how are the time-dependent behaviours tested?

**Decision**: Every function whose behaviour depends on the current time takes the current time as
a parameter, defaulting to now. Sweeps are exported as single-tick functions, so tests call one tick
directly rather than starting a timer and waiting.

**Rationale**: This is the pattern the codebase already uses for schedule evaluation, and it makes
the whole feature testable without sleeping: the 40-second lock recovery, the screening timeout, the
attempt budget and the schedule transitions all become ordinary assertions about a function called
with a chosen timestamp. A test suite that waits out real intervals would take minutes and be
flaky; one that injects time takes milliseconds and is deterministic.
