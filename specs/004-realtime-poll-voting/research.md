# Research: Real-Time Opinion Poll System

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Date**: 2026-08-12

Format: Decision / Rationale / Alternatives considered.

## R1: Real-time results delivery — client polling, not push

**Decision**: Results refresh via client-side `setInterval` polling `GET /api/polls/:pid` (or
a batch endpoint for the grid) every `APP_POLLING_INTERVAL` ms (default 5000).

**Rationale**: FR-026 explicitly mandates polling on this exact, already-existing env var
(`config.pollingIntervalMs`, defined in `001-user-auth`'s `config.ts` for this stated future
purpose). No new dependency, no persistent-connection infrastructure (WebSocket/SSE) to
operate or scale to SC-010's 10,000-concurrent-voters target.

**Alternatives considered**: WebSocket/SSE push — rejected: not requested by any FR, adds
persistent-connection state the constitution's "Simplicity First" and "Performance &
Operational Efficiency" sections argue against absent a stated need, and is harder to reason
about at the stated scale (10k connections/poll) than stateless polling.

## R2: Poll storage layout — two collections, not one document per poll

**Decision**: Two MongoDB collections:
- `polls` — one document per poll (`_id` = `PID`), holding config, choices, and each
  participant's *current* vote state only (`currentVotes: [{ emailAddress, userName,
  choiceIds, votedAt, removed }]`).
- `voteHistory` — append-only, one document per vote-submission event (`pid`, `emailAddress`,
  `userName`, `choiceIds`, `votedAt`). Never read on the hot path (results/vote rendering);
  exists solely to satisfy FR-018's "keep prior submissions in history" requirement.

**Rationale**: The source doc's literal wording ("Each PID identifies a unique document...
includes the configuration as well as the record of votes") is satisfied by `polls` holding
the authoritative current-vote record — that's what every results/vote read needs, and it
stays small (bounded by participant count, not by revote count). Embedding *full* history
(every superseded vote, kept indefinitely per the Assumptions' no-purge policy, FR-018) in
that same document risks the hard 16MB BSON document-size limit at SC-010's stated scale
(10,000 participants on a `DYNAMIC-VOTE-POLL`, revoted repeatedly over an indefinitely-long
poll lifetime). Splitting history into its own collection removes that ceiling — collections
scale far past 16MB — without changing anything the spec observes: `currentVotes` alone
already yields all FR-019–022 results/percentage calculations, and nothing in the spec ever
reads superseded history back out.

**Alternatives considered**: Single document per poll (whole history embedded) — rejected for
the size-limit risk above. Full history in `polls.currentVotes` truncated to only the last N
per participant — rejected as an arbitrary cap not asked for by any FR, and history is never
actually queried, so there's no reason to keep it anywhere but out of the hot path.

## R3: PID generation

**Decision**: `crypto.randomUUID()` (Node built-in), used as `_id` on the `polls` document
and as the value of the `PID` in URLs (`?PID=<uuid>`).

**Rationale**: FR-001 only requires uniqueness; the project already uses system-assigned GUIDs
for `clientId`/`clientSecret` (`001-user-auth` data-model.md), so this matches existing
convention with zero new dependencies.

**Alternatives considered**: Short nanoid-style IDs for prettier URLs — rejected, would add a
new dependency for a cosmetic benefit no FR asks for (Simplicity First).

## R4: Direct-link parameter shape

**Decision**: Query string `?PID=<uuid>` on the home page (`/?PID=...`), confirmed verbatim by
the source doc ("the base URL with the `PID=` parameter"). The home page, when given `?PID=`,
renders that single poll's card standalone (US3-AC2) instead of the grid.

**Rationale**: Explicit in the source requirements doc (`high-level-requirements.md` lines
54, 168); no ambiguity to resolve, just carrying the decision into the plan.

## R5: Results/percentage computation — query-time, not denormalized counters

**Decision**: Every choice's vote count and percentage (FR-021) is computed by iterating
`polls.currentVotes` at request time — no separately maintained running counters.

**Rationale**: At the stated scale (≤10,000 entries), an in-memory pass over the array is
sub-millisecond; denormalized counters would need to stay in sync with every vote/removal/ban
mutation, adding drift risk and code for no measurable benefit (Simplicity First).

**Alternatives considered**: Denormalized per-choice counters updated atomically on each vote
— rejected, unnecessary complexity at this scale and a source of subtle bugs (e.g., choice
removal, ban, and re-vote all touch counts and would each need separate counter-adjustment
logic instead of one canonical aggregation function).

## R6: Admin route protection

**Decision**: A new `requireAdmin` Express middleware, comparing the signed-in session's
`emailAddress` (lowercased) against `config.admins` (already parsed/lowercased in `config.ts`
since `001-user-auth`, but never consumed until now).

**Rationale**: Mirrors the existing `nativeOnly`-style guard idiom already in `src/routes/api.ts`
(session fetch via `auth.api.getSession`, 401/403 on failure). Depends on `emailAddress` being
reliably present regardless of `APP_SIGNIN_METHOD` — true as of the `001-user-auth` contract
fix made earlier in this session (`/api/me` and the underlying session data now expose
`emailAddress` in both native and OAuth modes).

## R7: Reference UI files are visual/interaction references only, not wired components

**Decision**: `poll-card.html/css/js` and `responsive-grid.html` are adopted for markup,
styling, and interaction mechanics (flip animation, bar sizing/scroll, grid responsiveness)
as-is. Their bundled JS data layer is not adopted — `poll-card.js`'s `ensurePollData()`
generates random placeholder data and its `submitVoteBtn` handler is an explicit no-op stub
("Placeholder behavior for now — submitting will eventually trigger a results update; for
this revision it just flips back"). The real implementation replaces that data layer with
live fetch/poll calls against `GET /api/polls/:pid` and wires `submitVoteBtn` to
`POST /api/polls/:pid/vote`.

**Rationale**: Confirmed by reading both files in full — there is no existing data contract
to preserve; the component was explicitly built decoupled from any backend pending this
implementation.

**Alternatives considered**: N/A — this is a factual finding about the reference files, not a
choice between options.

## R8: Site header — existing session-driven logic mounted into the adopted header markup

**Decision**: The adopted header (from `responsive-grid.html`) supplies the markup/CSS
(brand, greyed-out "Create Poll" link, greyed-out "Search CrowdPoll" input, greyed-out filter
bar). The *logged-in vs. guest* portion (Login/Create-Account links vs. avatar+dropdown menu)
is still rendered by the existing `app.js` `renderHeader()` logic against live session state
via `/api/me` — not the reference file's static "Log In"/"Create Account to Vote" buttons,
which have no session awareness.

**Rationale**: Spec Assumptions state the existing login/session/profile capabilities are
"retained and reused as-is... rather than rebuilt." The reference header's login buttons are
static demo markup with no backing logic; reusing the app's own already-correct session-driven
header logic (avatar dropdown, `/profile`, `/api/auth/logout`) is the literal reading of that
Assumption, applied to the one part of the adopted header that has a real backend behind it.

## R9: "Live Results" card link/button — greyed-out, inert (established precedent)

**Decision**: The poll card's "Live Results" action (present on `poll-card.html`'s results
face) is rendered greyed-out/disabled, not wired to any route.

**Rationale**: Its backing feature (the `Live Results Page`) is explicitly out of scope for
this implementation (spec Assumptions, FR-011). This session already resolved three other
instances of the identical situation — an adopted reference-UI element whose backing feature
has no requirement in this spec — the same way: "Create Poll" nav link, "Search CrowdPoll"
input, and the category filter bar are all greyed-out/inert per source-doc `EXCLUSIONS`
wording and this session's clarification. Applying the same, now well-established pattern
here rather than re-asking. **Flagged for user review** in the plan's completion report since
it was applied by precedent rather than a fresh clarification round.

## R10: `(removed)` choice-label truncation

**Decision**: `label = originalLabel.slice(0, 100 - " (removed)".length) + " (removed)"` when
`originalLabel.length + " (removed)".length > 100`; otherwise append unchanged.

**Rationale**: Direct implementation of FR-040's stated rule (truncate so the suffixed label
is ≤100 chars).

## R11: Timezone conversion

**Decision**: `START_DATE_TIME`/`END_DATE_TIME` stored as native MongoDB `Date` (UTC);
converted to the viewer's local time only in the browser via `Date`/`Intl.DateTimeFormat`,
using the browser's detected timezone. No new dependency.

**Rationale**: FR-015 requires UTC storage + browser-local display; JS `Date` already does
both conversions natively (`new Date(iso).toLocaleString()` or `Intl.DateTimeFormat`), matching
the project's existing zero-new-dependency pattern for the auth features.

## R12: Export formats

**Decision**: Hand-built string/JSON generation for `Export JSON` (direct
`JSON.stringify` of the poll's current, non-removed config+results) and `Export Markdown`
(a small hand-rolled Markdown table generator). No templating library.

**Rationale**: Output is small (≤50 choices, ≤10,000 participants) and structurally simple;
adding a templating dependency for two straightforward, one-shot string-building functions
would violate Simplicity First.
