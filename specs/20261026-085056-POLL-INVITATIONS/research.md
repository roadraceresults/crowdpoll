# Research: Poll Invitations

Phase 0 of `/speckit-plan` for `specs/20261026-085056-POLL-INVITATIONS/spec.md`.
Every decision below was taken after reading the code it changes; file references are to the repository root.

## R1. Where an invitation's state lives

**Decision**: Add columns to the existing `poll_invitations` table (migration `010-invitations`):
`added_at timestamptz not null default now()`, `sent_at timestamptz`, `reminded_at timestamptz`,
`send_failed_at timestamptz`, `accepted_at timestamptz`.
`writeRoster` (`src/polls/store.ts`) changes, for `poll_invitations` only, from "delete all, insert all" to
"delete the addresses no longer listed, insert the new ones `on conflict do nothing`, update `position`", so a
row's state survives every later write of the list (the old `PATCH` path included).

**Rationale**: The table is already the one source of the invited list (rosters, `rosterCache`, `decideSharedLink`,
`deleteAccount`), keyed by `(poll_id, email)`, and deleted with its poll (`on delete cascade`).
A row per invitation is exactly the spec's Invitation entity.

**Alternatives considered**: a separate `invitation_status` table (two tables to keep in step, and a join on every
read); state in `user_polls` (its `relation` is one value per row, and it holds no times).

## R2. Matching by mailbox: the invitation adopts the account's address

**Decision**: An invitation is matched to an account by email key (`emailKey` in SQL, `emailKeyOf` in TypeScript,
`src/auth/emailKey.ts`), and on the first match it **adopts** the account's address:
`adoptInvitations(db, accountEmail)` rewrites, in one transaction, every `poll_invitations.email`, the `invited`
`user_polls` row and the empty placeholder vote whose email key equals the account's but whose address differs, then
invalidates those polls' roster cache entries.
It runs at three points: after a session is created (BetterAuth `session.create.after`, `src/auth/auth.ts`), when a
signed-in visitor opens a poll link (`decideSharedLink`, before the invitation check), and when the Shared With You
tab is requested.
Adding an address whose email key is already on the list is refused as a duplicate (FR-010).
A migration expression index on `emailKey(email)` backs the lookup.

**Rationale**: After adoption every existing exact-match reader (the vote gate's `rosterCache.isInvited`,
`decideSharedLink`, the Shared With You query, the roll's placeholder, the consumer's vote upsert on
`(poll_id, email)`) is correct unchanged.
Matching by key at each reader instead would touch the roster cache, three queries and the vote consumer, and would
leave a placeholder and a real vote as two rows of one person.
An invitee always reaches the poll through one of the three points: the email link is the second, and the first or
third covers a person already signed in who opens the tab.

**Alternatives considered**: key-matching at every reader (above); storing `email_key` in the table (the key is
derived, and the existing `008-email-key` index pattern is an expression index).

## R3. What "accepted" records

**Decision**: `accepted_at` is set (once, `where accepted_at is null`) when a signed-in invitee is shown the poll:
by `decideSharedLink` for an invited caller of an Invitation Only poll, and by the Shared With You tab route for each
invited poll it returns.
"Voted" is not written: it is read from `votes` (`cardinality(choice_ids) > 0`) for the invitation's address, and a
vote counts as acceptance when statuses and counts are computed (FR-033).

**Rationale**: `decideSharedLink` records no view for an Invitation Only poll today (`recordView` is false,
`src/polls/sharedLink.ts`), so acceptance needs its own write; the two points are exactly "from Shared With You or
the link" (FR-032).
Reading "voted" from `votes` keeps the vote consumer untouched.

**Alternatives considered**: a `linked` relation for Invitation Only polls (it would also change the Shared With You
tab's rules); setting `accepted_at` in the vote consumer (a write on the hot path for a value that can be derived).

## R4. The invitee route: one write path that never takes the edit session

**Decision**: `POST /api/admin/polls/:pid/invitees` with `{ add?: string, remove?: string[], resend?: string,
timeZone?: string }`, behind `requireOwnPoll` (`src/routes/pollsApi.ts`), and `GET /api/admin/polls/:pid/invitees`
for the list with statuses (contracts A1, A2).
The write runs in one transaction in a new `src/invitations/invitations.ts`: it validates and adds, removes (and
their placeholder votes and `invited` rows), updates `polls.invited_count`, bumps the poll's counts version, and
invalidates the roster cache.
It never sets `pollState`, never touches the edit-session fields and never queues screening.
It refuses `409` on a CLOSED or ARCHIVED poll and `400` on a poll that is not Invitation Only.

**Rationale**: FR-014 and the requirements' UA11; the bar-colour route (feature 029) is the precedent for an edit
with its own route.
The read-only admin card face, where the panel lives, does not hold an edit session, so nothing pauses voting.

**Alternatives considered**: the existing `PATCH` with `invitedVoterList` (it replaces the whole list, and on a poll
with votes it is reached only through the edit session).

## R5. Parsing and refusing addresses

**Decision**: The server parses the `add` text: split on commas, whitespace and new lines, trim, lower-case, drop
empties; each address gets one outcome, in input order: `added`, or refused with a reason code —
`invalid` (`EMAIL_PATTERN`, length ≤ 200), `duplicate` (email key already listed, or repeated in the input),
`banned` (on the poll's ban list by email key), `voter-limit` (the list is full at `voterCountLimit`, falling back
to `ENV_PRIVATE_VOTER_LIMIT_DEFAULT`), `not-launched` (`isAllowed` is false while the allowlist is on).
The daily allowance refuses no add: on an OPEN poll an address past it is `added` with `waiting: true` (R7, TWEAK01).
The response lists every outcome (contract A2).

**Rationale**: One parser, on the server, so the rules (email key, allowlist, limit) are never copied into the
browser; the reasons are the spec's FR-009 list.

## R6. When emails are sent: claimed, then sent, by the route and by a sweep

**Decision**: `sendPendingInvitations(deps, pid?)` in `src/invitations/sender.ts` claims rows with
`update poll_invitations set sent_at = now() where sent_at is null and send_failed_at is null and poll is OPEN
… returning`, oldest `added_at` first, limited by the creator's remaining daily allowance (R7), then sends each
through the mailer and, on a failure, sets `send_failed_at`.
It is called after the route's transaction commits when the poll is OPEN (an address added to an open poll is
emailed straight away) and by a new sweep, `invitationSweep`, every 5 seconds under advisory lock 12
(`SWEEP_LOCKS.invitations`, `src/polls/sweeps.ts`), which sends whatever is pending on every OPEN poll.
A poll that reaches OPEN by any path — publish, approval sweep, schedule sweep, the Open state button — has its
pending invitations sent by the next sweep tick; a poll returning to OPEN from EDITING has none pending, so nothing
is resent (FR-016).

**Rationale**: The claim is atomic, so the route and the sweep, on any instance, can never send one invitation
twice.
Hooking every path into OPEN would touch four call sites and the store layer; the sweep is one place, and "OPEN"
is read at send time, so a poll that closes first never sends (edge case).
The interval is a constant, not a setting: the spec asks only "straight away" for open polls, which the route gives.

**Alternatives considered**: a hook in `updatePoll`'s entry-into-OPEN branch (the store would call the mailer);
sending inside the route's transaction (an SES call holding a transaction open).

## R7. The daily invitation limit

**Decision**: `ENV_MAX_INVITATIONS_PER_DAY` (default `200`, a positive integer, validated by `loadConfig`) bounds the
invitation and reminder emails one creator sends in a rolling 24 hours.
Each attempted send inserts a row into a new table `invitation_emails (creator_id, sent_at)`; the allowance is the
limit minus the rows of the last 24 hours.
- On an OPEN poll, an add takes every address; those past the allowance, in input order, are marked `waiting` and stay
  `Not sent yet` until the sweep claims them as the window frees up (FR-025, TWEAK01).
- On a poll not yet open, adds are not limited: their emails are not sent yet.
  When the poll opens, the sweep claims at most the creator's allowance, oldest `added_at` first; what does not fit
  stays `Not sent yet` and is claimed on later ticks as the window frees up (Clarification 1).
- A resend over the allowance is refused `429 daily-limit` with `retryAt`.
- `retentionSweep` deletes rows older than 24 hours.

**Rationale**: The table holds no address, so it adds nothing to the Privacy Policy, and a removed invitation still
counts (counting `poll_invitations` would let removing and re-adding evade the limit).

**Alternatives considered**: a Valkey counter (absent in development and tests, and lost on restart); counting
`sent_at`/`reminded_at` (evaded by removal).

## R8. Statuses and counts

**Decision**: The status of an invitation is computed on read, in this order:
`Voted` (a vote with choices on its address) → `Accepted` (`accepted_at`) → `Not delivered` (`send_failed_at`) →
`Invited` (`sent_at`) → `Not sent yet`.
`acceptedCount` = invitations accepted or voted; it is added to the admin list row beside `invitationCount`
(contract A3).
The Invitees panel reads the whole list from `GET …/invitees` and pages it in the browser by
`participantsViewportSize` from `/api/config`; the card refetches it on each admin list refresh
(`ENV_POLL_ADMIN_PAGE_REFRESH_INTERVAL`).

**Rationale**: A list is at most the voter limit (100 by default), small enough to send whole; paging matches the
Participants list (FR-004); refreshing with the admin list needs no new timer (FR-006).

## R9. The invitation email

**Decision**: `invitationMessage({ creatorName, creatorEmail, title, link, origin, anonymous, reminder, launchedAt,
endAt, timeZone })` in `src/email/templates.ts`, built with `layout()`, producing exactly the approved wording
(contracts M1, M2; the requirements' UA15 to UA18); a new mailer type `"invitation"` with `sendInvitation(to,
message)`.
- `layout()` gains an optional `headingLine2`: written after a `<br>` inside the `<h1>`, and on its own line after the
  heading in the plain-text part. Every other message leaves it out, so their output is byte-for-byte unchanged
  (FR-017).
- The dates are the last paragraphs before the button: `Poll Started: <launched>` and, when `endAt` is set,
  `Poll Ends: <end>`, read from the poll when the message is built, i.e. at each send (FR-019).
- The link is `${ENV_PUBLIC_ORIGIN}/?PID=<pid>`; the existing feature-026 flow takes a signed-out invitee through
  sign-in and back to the poll (FR-034).
- The anonymity paragraph appears when the poll's `voteAnonymity` hides voters from the creator.
- Logs mask the recipient (`maskAddress`), as every send does.

**Rationale**: The approved draft (`requirements/20261026-085056-poll-invitations/invitation-email.html`) was
rendered by `devScripts/render-invitation-email.ts`, which carries a draft `invitationMessage` and adds the second
heading line to `layout()`'s output from outside.
Moving that function into `templates.ts`, with `headingLine2` as a real `layout()` input, and having the script
import it, keeps the draft and production from drifting: re-running the script redraws the draft from production
code (SC-007).

**Alternatives considered**: two functions, `invitationMessage` and `invitationReminderMessage` (they differ in four
strings; one function with `reminder` mirrors the draft); keeping the second line as a post-process (string surgery
on escaped HTML in production code).

## R10. Removing, banning and deleting accounts

**Decision**: Removing an invitee deletes the invitation, its `invited` row and its placeholder vote; when the
invitee has voted, the route requires `confirmVoted: true` and then also deletes the vote (FR-028; the requirements'
BC1), decrementing the counters through the existing vote-replacement path.
A ban keeps working through `updatePoll` as today, which removes the address from the invited list; `writeRoster`'s
new diff keeps the other rows' state.
`deleteAccount` (`src/legal/deleteAccount.ts`) matches invitations, and their history (R15), by email key instead of
exact address (FR-036).

## R11. The stand-alone admin card

**Decision**: Done before this plan, as the requirements asked (UA2, UA3, AM1, IN1):
`requirements/20261026-085056-poll-invitations/` holds `admin-card.html`, `admin-card.css`, `admin-card.js` and
`fonts/`, captured from `renderReadOnly()` by `devScripts/capture-admin-card.ts` (jsdom, the real script, fixture
data, the used rules of the production sheets in all three theme states), with the Invitees panel drawn on it.
Its markup and class names (`card-invitees-panel`, `invitees-input`, `invitees-invite-btn`, `invitees-results`,
`invitee-list`, `invitee-row`, `invitee-chip`, `invitee-confirm`, `invitees-pager`) are what `adminCard.js` adopts
(contracts C2–C5).
The capture script refuses to overwrite without `--force`, since that would wipe the drawn panel.

**Rationale**: FR-038, FR-039; the panel's design is settled before production changes.

## R12. The Privacy Policy

**Decision**: `src/public/privacy.html` gains an `id="invitations"` paragraph naming the invitation email and its one
reminder, sent at a poll creator's request; that the address is used only for that poll; that the poll keeps a
removed invitee's address, as an email key, only so it is not emailed again (R15); and how an address with no
account is removed (write to `privacy@crowdpoll.vote`; removed with the poll in any case).
The invitation email's personal-data sentence links straight to it, `<origin>/privacy#invitations` (M1, M2).
`TERMS_VERSION` is unchanged (FR-037).
No cookie or storage key is added, so the Cookie Use table and `tests/cookie-use-list.test.ts` are unchanged.

## R13. Where the panel appears for a poll that is not open

**Decision**: The Invitees panel is shown whenever the **stored** poll is Invitation Only (`pollVisibility` `Private
Poll`, `pollSharingMode` `Invitation Only`) and its worded state is not CLOSED or ARCHIVED (read-only there): on the
read-only face, below the counts panel, and on a new poll's wizard (INITIALIZED), below the wizard once the poll has
been saved as Invitation Only.
A choice in the wizard that is not saved yet does not show or hide the panel.

**Rationale**: FR-013 allows editing before launch, and an INITIALIZED poll shows the wizard, not the read-only face
(feature 024 R18).
Reading the stored poll, not the wizard's unsaved answer, keeps the panel's list and the server's rules in step.

## R14. The creator's time zone and the email's dates

**Decision**: `polls.time_zone text null` (migration `010-invitations`), an IANA name.
`adminCard.js` sends `timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone` in the body of every write it
makes to a poll — `PATCH /api/admin/polls/:pid`, `/save`, `/publish`, `/colors` and `/invitees` — and each route
stores it when it is a valid zone (`new Intl.DateTimeFormat("en-US", { timeZone })` does not throw), ignoring it
otherwise; it never changes the poll's content version (`timeZone` is in `NON_CONTENT_FIELDS` in `src/polls/store.ts`), state or review (FR-024).
`formatPollDate(date, timeZone)` in `src/email/templates.ts` writes `Monday, October 26, 2026, 12:59 PM EDT` from
`Intl.DateTimeFormat("en-US", { weekday: "long", year, month: "long", day, hour, minute: "2-digit",
timeZoneName: "short" }).formatToParts`, in `time_zone`, or `UTC` when it is null (FR-020).
The short name is the one in force on that date, so a poll spanning a clock change reads `EDT` and `EST` (UA18).
`Poll Started` is `polls.launched_at`; `Poll Ends` is `polls.end_at`.

**Rationale**: The sweep sends without a browser, so the zone must be stored; the admin card is the creator's only
place to edit a poll, so its writes are where the zone is known.
An administrator acting on another's poll sets their own zone (spec Assumptions).

**Alternatives considered**: UTC (rejected in UA17); a zone on `user` (one more profile field, and the creator may
travel); a request header (one place to add it, but a body field is visible in `openapi.json` beside the others).

## R15. Adding back a removed address

**Decision**: A new table `invitation_history (poll_id text FK → polls.id on delete cascade, email_key text,
sent_at timestamptz, reminded_at timestamptz, primary key (poll_id, email_key))`.
When an invitation that had been sent is deleted — by the invitee route's remove, or by `writeRoster`'s diff (a ban
or the old `PATCH`) — its `sent_at` and `reminded_at` are upserted there under `emailKey(email)`.
When an address is added, a history row with its key restores `sent_at` and `reminded_at` on the new invitation and
is deleted, so no new invitation email is sent and the reminder allowance and its 24-hour wait carry over
(Clarification 2, FR-027).
Account deletion deletes history rows by email key (FR-036).

**Rationale**: Keeping deleted invitations as rows with a `removed_at` would make every exact-match reader (R2)
filter them; a separate table leaves those readers untouched and holds only a key and two times.

**Alternatives considered**: soft-deleted invitation rows (above); counting from `invitation_emails` (it holds no
address by design, R7).

## R16. Resend only while the poll is open

**Decision**: The reminder rule (data-model) adds "the poll is OPEN": otherwise A1's `canResend` is false with
`resendBlockedReason` `"The poll is not open."` (or `"The poll is closed."` on CLOSED or ARCHIVED), and A2 `resend`
answers `409 resend-unavailable` with that reason. Nothing is queued (Clarification 3).

**Rationale**: Every email in this feature is sent only while the poll is open (R6); a reminder to a poll that
cannot be opened would lead nowhere.
