# Research: Admin Revisions

**Feature**: 012-ADMIN-REVISIONS | **Date**: 2026-09-03 | **Plan**: [plan.md](./plan.md)

Thirteen decisions. The specification carries no `NEEDS CLARIFICATION` markers, so none of these
resolve an open question from the spec — they record how each requirement will be met, and what was
rejected. Entries are ordered by dependency: R1 must be settled before anything else is written.

---

## R1 — Representing the five visibility values

**Decision**: Export a `const` tuple of the five literal strings from `src/polls/store.ts`, derive
the union type from it, and validate by membership in that tuple. Follow the exact pattern
`POLL_STATES` already uses.

```ts
export const POLL_VISIBILITIES = [
  "PUBLIC POLL",
  "PRIVATE POLL - ANYONE WITH THE LINK - DO NOT SHOW WHO VOTED",
  "PRIVATE POLL - ANYONE WITH THE LINK - SHOW WHO VOTED",
  "PRIVATE POLL - INVITATION ONLY - DO NOT SHOW WHO VOTED",
  "PRIVATE POLL - INVITATION ONLY - SHOW WHO VOTED"
] as const;
export type PollVisibility = (typeof POLL_VISIBILITIES)[number];
```

Two derived predicates live beside it, because the rest of the codebase asks these two questions
and never asks for a specific value:

```ts
export const isPublicVisibility = (v: PollVisibility) => v === "PUBLIC POLL";
export const isInvitationOnly = (v: PollVisibility) => v.includes("INVITATION ONLY");
```

**Rationale**: The requirements state the values are persisted and rendered verbatim with no
code-to-label map, so the stored string *is* the label. That is unusual but has direct precedent:
`pollState` already stores `"WAITING TO OPEN"` and `"AWAITING APPROVAL"` and renders them
unchanged. Deriving the union from the tuple means the literals are typed once and never retyped —
important because they are long, contain both spaces and hyphens, and appear in query filters,
radio labels and test fixtures.

**Alternatives considered**:
- *A code enum plus a display-label map* — rejected: the requirements forbid it explicitly, and it
  reintroduces exactly the two-places-to-change problem the collapse removes.
- *A structured value (`{access, disclose}`)* — rejected: it recreates two fields under one key,
  and the impossible combination comes back with it.
- *`startsWith("PRIVATE POLL")` for the private test* — rejected in favour of the negated public
  test, so adding a sixth value later cannot silently fall into "private" by prefix.

---

## R2 — Where the impossible-combination logic goes

**Decision**: Delete it. `validatePollFields`'s auto-switch block — the code that rewrites
`accessMode` when `resultsVisibility` is set to transparent, and vice versa — is removed outright,
along with the client re-fetch it forced.

**Rationale**: The block exists solely to reconcile two fields that no longer both exist. With one
field there is no combination to reconcile: every value in `POLL_VISIBILITIES` is valid, so
validation reduces to membership. FR-003's requirement that no setting change as a side effect of
another is then satisfied structurally rather than by a rule.

**Alternatives considered**:
- *Keep the block, mapping old pairs to new values* — rejected: it would only run for data that no
  longer exists, since the collections are dropped.
- *Reject the impossible combination with a 400 instead of auto-switching* — rejected: it is
  unreachable, and unreachable error handling is what Principle II calls out by name.

---

## R3 — Folding the choices save into publish

**Decision**: `POST …/publish` accepts an optional `labels: string[]`. When present and the poll is
in `EDIT` mode, `replaceChoices` runs inside the same validation pass as the other fields, and its
result joins the single `$set`. In `UPDATE` mode `labels` joins the existing disallowed-field
rejection. `PUT …/choices` is deleted.

**Rationale**: FR-013 requires a save to apply completely or not at all. Today the choices and the
poll fields are two round trips against two routes, so a rejected publish can leave choices already
persisted — a partial save the administrator has no way to detect. One route, one validation pass,
one `$set` makes partial application structurally impossible rather than merely unlikely.

Folding also fixes FR-012 for free: the choices textarea currently feeds a separate save button
rather than the page's `dirty` flag, which is why editing only the choices leaves Save and Publish
disabled. One write path means one dirty flag.

**Alternatives considered**:
- *Keep both routes, wire the choices box to the shared dirty flag* — rejected: it fixes the dirty
  flag but leaves the partial-save window open, and the requirements delete the route explicitly.
- *Wrap the two calls in a transaction* — rejected: it needs a replica set, and one document is
  being written, so a single `updateOne` is already atomic.

---

## R4 — Manual state transitions and sweep convergence

**Decision**: No override flag. Each transition writes the schedule fields so that
`evaluateSchedule(startAt, endAt, now)` independently re-derives the state the administrator chose:

| Transition | Allowed from | Writes | Why the sweep then agrees |
|---|---|---|---|
| OPEN | `WAITING TO OPEN`, `CLOSED` | `startAt := null`; `endAt := null` **iff** `endAt < now` | no start ⇒ not waiting; no past end ⇒ not closed |
| CLOSED | `WAITING TO OPEN`, `OPEN` | `endAt := now`; `startAt := null` **iff** `startAt > now` | end is past on the next tick; no pending start |
| ARCHIVED | `CLOSED` | `pollState` only | `ARCHIVED` is outside the sweep's candidate filter |

**Rationale**: The sweep re-derives state from the schedule every
`ENV_POLL_DATE_CHECK_POLLING_INTERVAL` and *writes* the result, so a manual state that contradicts
the schedule is reverted within one tick. The case that makes the rules mandatory rather than
cosmetic: reopening a closed poll whose `endAt` is in the past. Without clearing that end, the very
next tick re-closes the poll and the administrator sees the button do nothing.

An override flag was the obvious alternative and is worse: it needs its own lifecycle (cleared
when? by a schedule edit? by archiving?), and it lets a poll's stored dates disagree with its
stored state indefinitely.

Archiving stops stamping `endAt = now`. That is a data-integrity fix independent of this feature —
a poll that closed on the 1st and is archived on the 20th currently has its recorded close date
rewritten to the 20th, and the JSON and Markdown exports carry the wrong date permanently.

**Consequence to state in the spec, and it is stated (Edge Cases)**: reopening a poll whose end has
passed leaves it with no end at all.

**Verification**: `polls-schedule-sweep.test.ts` gains a case per transition — perform the
transition at injected time T, run the sweep at T + interval, assert the state is unchanged.

**Alternatives considered**:
- *A `manualOverride` boolean* — rejected above.
- *Exclude recently-changed polls from the sweep for one interval* — rejected: time-based
  exclusion is a race, not a rule, and it only defers the revert.

---

## R5 — Blank voter count limit means 500 on private polls

**Decision**: Store `null`; resolve to 500 at vote time. A single exported constant
`PRIVATE_VOTER_LIMIT_DEFAULT = 500` serves as both the resolved default and the accepted maximum.
The public→private auto-fill in `validatePollFields` is deleted.

```ts
const effectiveLimit = isPublicVisibility(poll.pollVisibility)
  ? null
  : poll.voterCountLimit ?? PRIVATE_VOTER_LIMIT_DEFAULT;
```

**Rationale**: The requirements say two things that only reconcile this way — "the field will not
be auto-filled with 500" (so the stored value stays `null`) and "if the field is left blank, then
the limit will be 500" (so the effective value is 500). Storing `null` and resolving at the point
of use satisfies both, and keeps the stored document honest about what the administrator actually
entered.

FR-010's enforcement widens from one private value to all four: today the vote-time check is gated
on `PRIVATE_POLL_ANYONE_WITH_THE_LINK` alone.

**Alternatives considered**:
- *Persist 500 on save* — rejected: contradicts "will not be auto-filled", and makes a deliberate
  500 indistinguishable from an untouched field.
- *Two constants, a default and a maximum* — rejected: they would always hold the same value, and
  one name that means both is what the requirements describe.

---

## R6 — Admitting polls under edit to the public listings

**Decision**: Both `GET /api/polls` and `GET /api/polls/:pid` admit `pollState === "EDITING"` when
`pollStateBeforeEditUpdate` is one of the three public states. The field is used **only** as a
filter input and is never included in a voter-facing response.

```ts
{ $or: [
    { pollState: { $in: [...PUBLIC_STATES] } },
    { pollState: "EDITING", pollStateBeforeEditUpdate: { $in: [...PUBLIC_STATES] } }
] }
```

**Rationale**: FR-042's "momentarily unavailable" card cannot render if the poll is absent from the
grid, and 011 FR-003 withholds `EDITING` from the listings entirely — so without this the card
*vanishes* instead of showing the message, and the standalone `?PID=` view 404s. Gating on the
pre-edit state preserves 011's actual intent, which is that a poll the public has never seen stays
unseen: an `INITIALIZED` or `REJECTED` poll under edit remains hidden.

The non-emission rule matters because this is the first time an internal restore field influences a
public read. `buildPollDetail` does not currently include it, and a test asserts it stays that way.

**Alternatives considered**:
- *Admit all `EDITING` polls* — rejected: leaks the existence of unpublished and rejected polls.
- *Have the client keep the card when it disappears from the list* — rejected: the client cannot
  distinguish "being edited" from "deleted" or "archived", and R8 makes the list the single source
  of grid membership.

---

## R7 — How the card learns to show the unavailable message

**Decision**: The vote route gains an `EDITING` branch *before* the generic not-open refusal,
returning 409 with both the message and a machine-readable discriminator:

```json
{ "error": "This poll is momentarily unavailable to cast a vote. Please try again shortly.",
  "code": "POLL_EDITING" }
```

The card branches on `code`, never on the message text.

**Rationale**: FR-044 requires the card to react differently to "being edited" (return to the front
face, keep the selection, retry later) than to "this poll has closed" (the existing closed-state
treatment). Both are 409s from the same route today. String-matching the message would couple the
client to copy that the requirements have already reworded once in this feature's lifetime.

This closes window W4 — the poll entering `EDITING` between the click and the handler — which no
client-side check can close, because the client's information was already stale when it acted.

**Alternatives considered**:
- *A distinct status code (423 Locked)* — rejected: it is semantically apt but the codebase uses
  409 for every state refusal, and one exception invites the client to switch on status.
- *Match on the message string* — rejected above.

---

## R8 — Grid membership polling without an N + 1

**Decision**: `GET /api/polls` resolves the caller's session and returns complete `PollDetail`
objects including `myChoiceIds`. `pollGrid.js` re-fetches it every `ENV_POLLING_INTERVAL`, diffs by
`pid`, and feeds surviving cards from the list payload. The per-card `GET /api/polls/:pid` polling
loop is removed; the route stays for the standalone `?PID=` view.

**Rationale**: R13 as written adds one request per interval on top of the N the cards already make.
The list response already carries the identical payload from the identical builder, so the same
change can collapse N + 1 into 1 instead of adding to it — and it removes a real inconsistency
window where a card and the grid disagree about the same poll because they were fetched at
different moments.

The only field the per-card fetch adds today is `myChoiceIds`, which requires the caller's email.
`GET /api/polls` is public but reading a session on a public route is already what
`GET /api/polls/:pid` does, and the response for a signed-out visitor is unchanged.

**Alternatives considered**:
- *Keep both loops* — rejected: N + 1 requests every five seconds per open tab, for data already in
  hand.
- *Server-sent events or WebSockets* — rejected: a large architectural change for a feature the
  requirements describe as polling, and the constitution's efficiency section favours the
  lighter-weight mechanism.

---

## R9 — Preserving a selection across a forced flip

**Decision**: Hold the in-progress selection in a per-card variable that is independent of the
flip state, and restore it when the card returns to its back face. The current rule — preserve the
selection *only while the card is flipped* — is replaced.

**Rationale**: FR-045 requires the selection to survive a flip that the system itself forces
(W1/W3, poll enters `EDITING`) and to be restored when the poll reopens (W5). The existing rule
reads the flip state as a proxy for "the voter is mid-vote", and this feature breaks that proxy by
introducing a flip the voter did not ask for. The spec records this as an intentional override of
the earlier rule.

**Verification**: assert across a forced flip, not only across a refresh — the existing test only
covers the latter.

---

## R10 — One admin predicate, two callers

**Decision**: Extract `isAdminEmail(email: string | undefined, config: AppConfig): boolean` from
`createRequireAdmin` into `src/polls/service.ts`. `createRequireAdmin` calls it; `GET /api/me` calls
it to produce `isAdmin`.

**Rationale**: The requirements ask for exactly this and give the reason — the two must never
drift. `config.admins` is already trimmed and lower-cased at load, so the predicate's only job is
to normalise the incoming address the same way, which is what the inline check does today. This is
a refactor with no behaviour change.

`isAdmin` is a rendering hint only. Every admin route and page keeps `requireAdmin`, so forging the
flag in devtools reveals a menu entry whose target still returns 403.

**Alternatives considered**:
- *Compute `isAdmin` inline in the `/api/me` handler* — rejected: two copies of the comparison is
  precisely the drift the requirements call out.

---

## R11 — Icons without an icon library

**Decision**: Hand-author the four action icons and the pen icon as inline SVG, defined once per
page in a hidden `<svg><symbol>` block and referenced with `<use href="#icon-copy">`. Each is
wrapped in a `<button>` carrying a `title` attribute for the tooltip.

**Rationale**: The requirements name Font Awesome classes as a *visual* reference and then state
plainly that Font Awesome is not present in the project and icons are inline SVG. Adding an icon
package for five glyphs would breach Principle II and the CSP-free static-page model the client
already uses. `<symbol>`/`<use>` keeps one definition per icon regardless of row count.

Accessible names are explicitly not required at this stage per the spec's assumptions; `title`
alone is therefore sufficient, and the future accessibility work has an obvious hook.

---

## R12 — Zebra striping with variable-height rows

**Decision**: `tbody tr:nth-child(even)` on the existing table. The title, subtitle and optional
screening line are stacked inside the first cell of a single `<tr>`.

**Rationale**: The requirements stress that striping alternates per poll rather than per rendered
line, because rows are now variable height. Keeping one `<tr>` per poll makes that automatic —
`nth-child` counts rows, not lines. The alternative shape, one `<tr>` per line with `rowspan` on
the other columns, would make striping a manual calculation and break the column alignment that
FR-024's always-rendered greyed buttons exist to preserve.

Colours come from the existing `admin.css` surface tokens; no new colour is introduced.

---

## R13 — Migration, or the absence of one

**Decision**: None. Drop `polls` and `voteHistory` at deploy. No dual-read, no back-fill, and no
tolerance in the code for documents carrying `accessMode` or `resultsVisibility`.

**Rationale**: The source requirements open by authorising exactly this — "Old data in all
collections can simply be deleted." Writing a mapping layer for a field that exists only to be read
once would be speculative work of the kind Principle II forbids.

Because no document survives, the invariant "no code reads the old fields" is checkable by grep
rather than by query, which is how the quickstart verifies it.

**Consequence**: irreversible for any real data in the target environment. The quickstart's deploy
step says so in as many words rather than leaving it to be discovered.

**Alternatives considered**:
- *A one-shot migration script mapping the six old pairs to five new values* — rejected: not
  requested, and it would need to survive in the repository long after the last document it could
  convert was gone.
