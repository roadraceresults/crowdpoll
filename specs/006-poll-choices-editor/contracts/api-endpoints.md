# Contract: Poll Choices Editor API Changes

**Feature**: [spec.md](../spec.md) | **Plan**: [plan.md](../plan.md) | **Date**: 2026-08-13

Changes to `src/routes/pollsApi.ts` (existing router, `004-realtime-poll-voting`). All
routes below require the existing `requireAdmin` gate. `postman/openapi.json` is updated to
match during implementation (tasks.md).

## Removed

- `POST /api/admin/polls/:pid/choices` (`addChoice`)
- `PATCH /api/admin/polls/:pid/choices/:choiceId` (`editChoice`)
- `DELETE /api/admin/polls/:pid/choices/:choiceId` (`removeChoice`)

These three per-choice operations are superseded entirely by the single endpoint below
(research.md R1/R2) — the Edit Poll page's Choices section no longer has row-level
add/edit/remove controls to call them (spec.md FR-001).

## Added

### `PUT /api/admin/polls/:pid/choices`

Replaces the poll's entire active choice list in one call (spec.md FR-002/006).

Body: `{ labels: string[] }` — the "Save Choices" box's content, one entry per non-blank
line (client-trimmed; server re-validates independently, never trusting client
sanitization).

- `200` `{ choices: Choice[] }` — the poll's full choices array *after* the save (fresh
  active choices first, then any pre-existing removed/audited ones unchanged — data-model.md).
- `400` — `labels` isn't an array; fewer than 2 or more than 50 non-blank labels after
  trimming; a label over 100 characters (data-model.md `replaceChoices()` validation 1–3).
- `401` — not signed in.
- `403` — signed in but not an admin.
- `404` — unknown `PID`.
- `409` — two labels identical after trimming (data-model.md validation 4).

**Side effect, not just a `choices` update**: every `currentVotes` entry with a non-empty
`choiceIds` is reset (`choiceIds: []`, `removed: true`) as part of the same request —
**every voter on the poll is left "not yet voted," not only ones whose specific choice was
removed** (research.md R1 — the full consequence of the resolved reconciliation strategy).
The MongoDB update accordingly `$set`s both `choices` and `currentVotes` together, matching
the pattern the now-removed `DELETE .../choices/:choiceId` route already used for its own
(narrower) vote-reset.

## Unchanged

Every other route on this poll (`PATCH /api/admin/polls/:pid`, the participant/invited/
banned routes, results/export, duplicate) is untouched by this feature.
