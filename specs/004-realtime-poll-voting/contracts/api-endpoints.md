# Contract: Poll API Endpoints

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Date**: 2026-08-12

New router, `src/routes/pollsApi.ts`, mounted separately from `001-user-auth`'s
`src/routes/api.ts` (which stays scoped to auth/profile — research.md/plan.md rationale:
surgical, domain-separated files). `postman/openapi.json` gets the formal OpenAPI entries for
these routes during implementation (tasks.md), matching how `001-user-auth` handled it —
this file is the design-time contract.

Every response omits `(removed)` choices/votes from voter-facing payloads (FR-041) unless
noted. All poll-scoped routes 404 on an unknown `PID`.

## Voter-facing (no admin gate)

### `GET /api/polls`

List eligible `PUBLIC_POLL`s for the home grid (FR-032/033) — no pagination (Assumptions).
- `200` `{ polls: PollSummary[] }` — `PollSummary`: `pid`, `title`, `subtitle`, `choices`
  (active only, with computed `pct`), `totalVoted`.
- No auth required (guests see results per FR-017).

### `GET /api/polls/:pid`

Single poll's voter-facing state — used by both the grid card and the `?PID=` standalone view
(page-routes.md).
- `200` `PollDetail` — `PollSummary` fields plus `choiceMode`, `voteMutability`, `pollState`,
  `startAt`/`endAt` (UTC; client converts to local), `totalNotYetVoted` (invitation-only
  only, FR-022), and — if signed in — `myChoiceIds` (current selection, empty if none/removed).
- `401`-equivalent handling: **not** a hard 401 — a guest gets `200` with results for
  `PUBLIC_POLL`, but `403 { error: "Sign in to view this poll" }` for
  `PRIVATE_POLL_ANYONE_WITH_THE_LINK`/`PRIVATE_POLL_INVITATION_ONLY` (FR-017).
- `403 { error: "You are not invited to vote in this poll" }` for a signed-in, non-invited
  user on `PRIVATE_POLL_INVITATION_ONLY` (FR-030) — still allowed to know the poll exists,
  matching the source doc's "leaked URL" framing, but not to see results/vote.
- `404` if `pollState` is `ARCHIVED-POLL-STATE` (hidden from all voter-facing views, FR-045).

### `POST /api/polls/:pid/vote` 🔒

Body: `{ choiceIds: string[] }` (≥1 entry; FR-023 disables the client control below that, but
the server independently rejects empty).
- `200` updated `PollDetail` (same shape as `GET`).
- `400` empty `choiceIds`, or >1 entry while `choiceMode=SINGLE-CHOICE-POLL`.
- `401` guest (FR-016).
- `403` banned (FR-028), not invited (FR-030), or (`PRIVATE_POLL_ANYONE_WITH_THE_LINK` only)
  voter cap reached for a *new* voter (FR-029) — re-voting by an existing voter is never
  capped.
- `409` poll not in `ACTIVE-POLL-STATE` (FR-027) — response names the actual state (pending
  vs. closed).
- `409` already voted on a `FINAL-VOTE-POLL` and current vote is not `(removed)` (FR-012) —
  re-vote after choice-removal reset is explicitly exempt (FR-042).

## Admin (all routes below require `requireAdmin`, research.md R6)

`403 { error: "Not authorized" }` for any signed-in non-admin; guests get the same via the
existing session check (no distinct guest-vs-non-admin messaging needed — FR-035 doesn't
require it, and the header nav has no entry point to these routes to accidentally reach).

### `POST /api/admin/polls`

Create with FR-036's defaults; no body.
- `201` `{ pid }` — client navigates to `/admin/poll?PID=<pid>`.

### `GET /api/admin/polls`

- `200` `{ polls: AdminPollSummary[] }` sorted `createdAt` desc (FR-037) — `title`, `subtitle`,
  `pollState`, `createdAt`, `startAt`, `endAt`, `pid`.

### `GET /api/admin/polls/:pid`

Full edit-view detail (FR-039–054), including `(removed)` choices (FR-041) and the raw
`invitedVoterList`/`bannedVoterList`.
- `200` full `polls` document shape (data-model.md), minus `currentVotes` (see
  `.../results` below for participant detail).

### `PATCH /api/admin/polls/:pid`

Body: any subset of `{ title, subtitle, choiceMode, resultsVisibility, voteMutability,
accessMode, voterCountLimit, startAt, endAt, pollState }`. Auto-saved on field blur
client-side (FR-036-AC2) — this endpoint is the single save call per edited field/group.
- `200` updated poll.
- `400` validation failure (length limits, `startAt`/`endAt` ordering, `pollState` not one of
  `CLOSED-POLL-STATE`/`ARCHIVED-POLL-STATE`).
- `409` `choiceMode→SINGLE-CHOICE-POLL` rejected (FR-047), `accessMode` change after first
  vote (FR-048), or `startAt` moved into the future after a vote + already-passed start
  (FR-046).

**Superseded by `005-admin-page-improvements` US4** (contracts/ui-contracts.md "Poll editor
HTTP contract" there): `voterCountLimit` now also accepts `null` (clears it); a
`resultsVisibility`/`accessMode` combination that would leave the poll `TRANSPARENT-POLL` +
`PUBLIC_POLL` is auto-corrected server-side rather than accepted as-is, and that
auto-correction can itself set `voterCountLimit`. The `200`/`400`/`409` shapes above are
otherwise unchanged.

### `POST /api/admin/polls/:pid/choices`

Body: none (label defaults to `"Choice #N"`, FR-039).
- `201` new `Choice`.
- `409` already at 50 choices (FR-005).

### `PATCH /api/admin/polls/:pid/choices/:choiceId`

Body: `{ label }`.
- `200` updated `Choice`.
- `400` empty or duplicate-among-active label (FR-006).

### `DELETE /api/admin/polls/:pid/choices/:choiceId`

- `204` if the choice had no votes (hard-removed from `choices`).
- `200 { removed: true }` if it had votes (soft-`removed`, FR-040; any affected `VoteEntry`s
  reset per FR-042).
- `409` would drop active-choice count below 2 (FR-005).

### `POST /api/admin/polls/:pid/duplicate`

- `201` `{ pid }` — new poll per FR-044 defaults.

### `GET /api/admin/polls/:pid/results`

- `200` `{ ...PollSummary fields, voted: Participant[], notYetVoted: Participant[]? }` —
  `notYetVoted` only for `PRIVATE_POLL_INVITATION_ONLY` (FR-022/054); banned emails excluded
  from both (FR-054).

### `GET /api/admin/polls/:pid/export.json`

- `200`, `Content-Type: application/json`, `Content-Disposition: attachment` — current
  (non-removed) config + results (FR-055).

### `GET /api/admin/polls/:pid/export.md`

- `200`, `Content-Type: text/markdown`, `Content-Disposition: attachment` — same content as
  the JSON export, Markdown-formatted (FR-055).

### `POST /api/admin/polls/:pid/invited`

Body: `{ emailAddress }` — `PRIVATE_POLL_INVITATION_ONLY` only.
- `201` — vote record pre-seeded (FR-031).
- `400` >200 chars or malformed.
- `409` already on `invitedVoterList` (FR-057/US8-AC7).

### `DELETE /api/admin/polls/:pid/participants/:emailAddress`

Removes a participant from the invited/voter list for any access mode (FR-050) — their vote
(if any) is dropped from results and the address moves to `bannedVoterList`.
- `204`.

### `DELETE /api/admin/polls/:pid/banned/:emailAddress`

Un-ban (FR-052) — does **not** restore the vote or re-add to `invitedVoterList`.
- `204`.
