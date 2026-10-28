# Research: Poll Closed State Display

## R1 — Purely client-side; no server changes needed

**Decision**: This feature requires no changes to `src/routes/pollsApi.ts`, `src/polls/service.ts`,
or `src/polls/store.ts`, and no new/changed HTTP contract.

**Rationale**: Everything the spec needs is already in place:
- `buildPollDetail()` (`pollsApi.ts`) already includes `pollState` (via `deriveState()`) and
  `endAt` in every voter-facing poll payload — both the grid (`GET /api/polls`) and the
  single-poll fetch (`GET /api/polls/:pid`) reuse this same function, so both already carry
  everything FR-001–007 need without any change.
- `FR-045` (`004-realtime-poll-voting`) already stamps `endAt = now` the moment a poll
  becomes `CLOSED-POLL-STATE`, whether by schedule or an explicit admin action — so
  `poll.endAt` is already a reliable "closed on" date in both cases (spec.md Assumptions).
- `validateVoteSubmission()` (`service.ts`) already rejects a vote on a non-`ACTIVE-POLL-STATE`
  poll with `409` and an error message containing "closed" — this is FR-008, already covered
  by an existing test (`tests/polls-vote.test.ts`, `"409s a vote on a non-ACTIVE poll and
  names the state (FR-027)"`). Nothing here needs to change for FR-008/009.

The gap is entirely that `src/public/pollCard.js` — the one component that renders every poll
card, on both the grid and the standalone `?PID=` view (`pollGrid.js`) — never reads
`poll.pollState` at all today. All of this feature's work is adding that missing read and the
UI it drives.

**Alternatives considered**:
- *Add a dedicated `closedAt`/`closedMessage` field to the API response.* Rejected — `endAt`
  already means exactly this once a poll is closed (FR-045), and adding a redundant field
  would be exactly the kind of unrequested "flexibility" the constitution's Simplicity First
  principle rules out.

## R2 — Rendering approach: one `render()`-driven state, not a separate code path

**Decision**: Add one function, `updateClosedState()`, called at the end of the existing
`render()` in `initPollCard()` (`pollCard.js`) — the same function that already runs after
every `fetchPoll()` (on mount, on each poll tick, and after a submit response) and after every
local selection change. It reads `poll.pollState` and toggles four things:
- Front face: hides `.live-link` and `.vote-btn`, shows a `.poll-closed-message` in their
  place (FR-001/002).
- Back face: hides `.voting-scroll-wrap` (the choice bars) and `.submit-vote-btn`, shows a
  `.poll-closed-message` in their place (FR-004/005/006); `.back-btn` is left untouched, so
  the existing "flip back without voting" control keeps working (FR-007).

Because this hangs off the existing `render()`/`fetchPoll()` cycle rather than a new one, User
Story 1 (grid load), User Story 2 Acceptance Scenario 2 (poll closes while flipped — caught by
the next poll tick, same `APP_POLLING_INTERVAL` the rest of the card already uses), and the
"submit rejected because closed" reaction (FR-009) are all the *same* code path, not three.

**Handling FR-009 specifically**: the existing `submitBtn` click handler's failure branch
(`catch`/non-`ok` → falls through to `updateSubmitState()`) changes to call `fetchPoll()`
instead — a full re-fetch-and-render, exactly like every other place on this page that
recovers from a server disagreement. If the poll turns out closed, `updateClosedState()`
(now running as part of that `render()`) shows the closed message; if the rejection was for
some other reason (already voted, not yet started — neither in this feature's scope per
spec.md Assumptions), the existing generic behavior is unchanged. This avoids the client
having to string-match the rejection's error message to guess *why* it failed — it just asks
the server what's true now, which it already does everywhere else on this page.

**Alternatives considered**:
- *A separate `checkClosed()` poller independent of `render()`.* Rejected — duplicates the
  polling/re-render machinery `fetchPoll()`/`render()` already provide; two timers doing
  overlapping work is exactly the kind of avoidable complexity Simplicity First rules out.
- *String-match the vote rejection's error message to detect "closed" specifically before
  deciding how to react.* Rejected in favor of re-fetching and trusting `pollState` directly
  — matches this file's own existing pattern (the submit handler already re-fetches on
  success) and doesn't couple client behavior to exact server error wording.

## R3 — Styling: one small app-owned addition, not a reference-file edit

**Decision**: `pollCard.css` is a verbatim-adopted reference stylesheet (existing project
convention — see `site.css`'s own header: "App-owned additions layered over the verbatim
reference sheets... Only rules with no reference source belong here"). The new
`.poll-closed-message` rules go in `site.css`, not `pollCard.css`, matching that existing
split. The front-face variant's typography (font-family, weight, size, letter-spacing, color)
mirrors `.live-link-label`'s existing declarations exactly, satisfying FR-001's "same font and
style" requirement without duplicating a full new type scale.

**Rationale**: Consistent with how this codebase already keeps every reference file
(`pollGrid.css`, `pollCard.css`) untouched and layers app-specific rules in `site.css` — see
`005-admin-page-improvements`/`006-poll-choices-editor`'s own plans for the same pattern.

**Alternatives considered**:
- *Edit `pollCard.css` directly.* Rejected — breaks the established "reference files stay
  byte-identical to designDocs" convention this project has followed since
  `004-realtime-poll-voting`.

**Addendum, found during implementation**: `pollCard.css`'s reference rules for `.live-link`
and `.btn-primary` (which both `.vote-btn` and `.submit-vote-btn` carry) set `display:flex`
unconditionally. Since an author-origin CSS rule always wins over the UA-stylesheet
`[hidden]{ display:none }` rule regardless of specificity, setting `.hidden = true` on these
three elements alone would not actually hide them — `site.css` needed an explicit
`.live-link[hidden], .vote-btn[hidden], .submit-vote-btn[hidden]{ display:none; }` override
(higher specificity than the bare-class reference rules, so no `!important` needed). The same
class of bug as `006-poll-choices-editor`'s `#saveChoicesBtn:disabled` fix. `.voting-scroll-wrap`
has no competing reference rule and needed no such override.

## R4 — Date format: reuses the existing locale-formatting convention, applied date-only

**Decision**: Format `poll.endAt` with `new Date(poll.endAt).toLocaleDateString()` (no time
component), matching spec.md's resolved FR-003 decision. This mirrors the exact pattern
already used elsewhere in the app for the fuller version (`adminList.js`'s `fmt()` uses
`toLocaleString()`) — same mechanism (locale-aware, browser-native formatting), just the
date-only variant, rather than inventing a new formatting approach for this one feature.

**Alternatives considered**: none — this was the subject of `/speckit-specify`'s one
clarification question; see spec.md's Clarifications section for the tradeoffs considered
there (date+time vs. relative wording).

## Out of scope / no change

- **`postman/openapi.json`**: no HTTP contract changes (R1) — nothing to update.
- **MongoDB schema**: no new fields; `pollState`/`endAt` already exist and are already
  computed/stamped correctly by existing code (R1).
- **Pending-state and archived-state display**: explicitly out of scope per spec.md
  Assumptions — unchanged by this feature.
