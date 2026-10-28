# Data Model: Admin Page Improvements

No new entities, collections, or indexes. User Stories 1–3 only change how an existing
field's value is computed (`Poll.title`, on duplication) and how existing data is presented
(admin list Actions column, site header) — they do not change what is stored. User Story 4
does change one existing field's type/default (`Poll.voterCountLimit`) and adds a validation
invariant across two existing fields (`resultsVisibility`/`accessMode`) — see below.

## Poll (existing — `src/polls/store.ts`)

Fields relevant to this feature:

| Field | Type | Relevance to this feature |
|---|---|---|
| `_id` | `string` (UUID/PID) | Identifies the poll a menu action or duplication targets |
| `title` | `string` | FR-001/002: source for the duplicate's title; FR-003: compared across every poll's `title` for uniqueness |
| `pollState` | `"ACTIVE-POLL-STATE" \| "CLOSED-POLL-STATE" \| "ARCHIVED-POLL-STATE"` | FR-003: the uniqueness check MUST NOT filter by this field — every state participates |
| `resultsVisibility` | `"ANONYMOUS-POLL" \| "TRANSPARENT-POLL"` | US4: cannot be `"TRANSPARENT-POLL"` at the same time `accessMode` is `"PUBLIC_POLL"` (FR-014–016) |
| `accessMode` | `"PUBLIC_POLL" \| "PRIVATE_POLL_ANYONE_WITH_THE_LINK" \| "PRIVATE_POLL_INVITATION_ONLY"` | US4: drives `voterCountLimit`'s default on every Public↔private transition (FR-018/019) and participates in the invariant above; unchanged: still locked once the poll has ever received a vote (`004-realtime-poll-voting` FR-048) |
| `voterCountLimit` | `number \| null` (**was `number`** — narrowed by US4, no migration: existing positive-integer values are still valid, `null` is simply now also valid) | US4: `null` = blank/no cap; only enforced while `accessMode` is `"PRIVATE_POLL_ANYONE_WITH_THE_LINK"` (FR-017–021); `createDefaultPoll()` now sets it to `null` since new polls default to `"PUBLIC_POLL"` |

### Cross-field invariant (US4, FR-014–016)

`resultsVisibility === "TRANSPARENT-POLL"` and `accessMode === "PUBLIC_POLL"` MUST never
both hold. `validatePollPatch()` (`src/polls/service.ts`) enforces this by auto-correcting
whichever field the caller did **not** just set, computed from the *effective* post-patch
values (the just-set field if present in the request body, else the poll's current stored
value) — not by rejecting the request, except when Access Mode is locked (the poll has ever
received a vote) and satisfying the invariant would require changing it, in which case the
request is rejected with the existing 409 accessMode-lock error. This runs once, server-side,
so it holds for every caller (Edit Poll UI or a direct API request alike) — see
`contracts/ui-contracts.md`'s "Poll editor HTTP contract".

### `voterCountLimit` auto-default (US4, FR-018/019)

Whenever `accessMode`'s value actually changes (directly, or as a side effect of the
invariant above) and the same PATCH request does not also explicitly set
`voterCountLimit`, `validatePollPatch()` sets it to `500` if the poll is transitioning away
from `"PUBLIC_POLL"`, or `null` if transitioning to `"PUBLIC_POLL"`.

### Null-safety fix required by the type change

`validateVoteSubmission()`'s `PRIVATE_POLL_ANYONE_WITH_THE_LINK` participant-cap check
(`distinctVoters >= poll.voterCountLimit`) is now guarded with `poll.voterCountLimit !==
null` — without this guard, a blank limit would coerce to `0` in the comparison and block
every new voter immediately, which is the opposite of "blank means unlimited."

No new derived/computed field is persisted — the disambiguated title (`"X Copy"`, `"X Copy
1"`, ...) is computed at duplicate-time and written into the new poll's own `title` field
exactly as any other title would be; it is not tracked as "generated" or linked back to its
source beyond what `duplicatePoll()` already does today (a fresh, independent `Poll`
document).

## New pure function (business logic, not a data-model change)

`nextAvailableCopyTitle(baseTitle: string, existingTitles: string[]): string` —
see [research.md § R1](./research.md#r1--duplicate-poll-title-uniqueness). Takes the source
poll's title and the list of already-used titles matching the `"<base> Copy"` /
`"<base> Copy <N>"` pattern (fetched from every poll regardless of state), returns the next
free one. Pure input/output, no I/O — lives in `src/polls/service.ts` alongside the existing
`duplicatePoll()` it complements.
