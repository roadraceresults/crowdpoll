# Phase 0 Research: UI/UX Revisions

**Feature**: 013-UI-UX-revisions | **Date**: 2026-09-07 | **Plan**: [plan.md](./plan.md)

No `NEEDS CLARIFICATION` markers were carried into Technical Context. The requirements document
had already been through two architecture passes, so what follows records the decisions that were
settled there, the evidence behind them, and the alternatives that were rejected — plus the two
questions `/speckit-clarify` did not reach.

---

## R1 — The card shell is a sibling of `PollCard`, not a reuse of it

**Decision**: Extract a shell — one face, a title row with a close control, an optional subtitle, a
body region, an optional action row — sharing `pollCard.css`'s tokens and its `.card-face`,
`.question`, `.subtitle`, `.btn-primary.btn-vote` and `.icon-btn` rules. Do not instantiate
`PollCard`.

**Rationale**: `PollCard` carries two faces, a flip transform, flip state and its own polling timer
(`pollCard.js`). A login form needs none of it. Reusing `POLL_CARD_TEMPLATE` would import all of it
and couple four static pages to a component that exists to render live poll results.

**Alternatives considered**: Parameterising `PollCard` to render one face — rejected because every
subsequent poll-card change would have to be checked against four pages that are not polls.
Copying the markup per page — rejected because it puts the card's structure in four places.

---

## R2 — The shell ships as one global-exposing file, and each page gets its own script

**Decision**: `src/public/cardShell.js`, an IIFE exposing `window.CardShell`, loaded
`<script src="/cardShell.js" defer>` after `/app.js`. Each consuming page gets its own deferred
script — `loginCard.js`, `createAccountCard.js`, `profileCard.js`, `notAuthorizedCard.js` —
replacing the inline `<script>` blocks those pages carry today.

**Rationale**: Two reasons, one conventional and one load-bearing. The convention: every client
component in this project is one file exposing at most one global (`window.PollCard`,
`pollCard.js:1267`), loaded `defer`, and the build copies `src/public` wholesale, so a new file
needs no build change. The load-bearing reason: **an inline `<script>` executes during parsing,
before any deferred script has run**, so inline page code cannot see `window.CardShell` or the
shared session snapshot. Today's inline blocks get away with it only because they depend on
nothing. Once these pages read the snapshot, they cannot stay inline.

**Alternatives considered**: Putting the shell in `app.js` — rejected because `app.js` loads on
every page including the admin surface, which has no cards. A fourth stylesheet for the shell —
rejected because it would have to be added to the head of every consuming page, the heads the
stylesheet directive has just finished specifying; the shell's rules go in `site.css` instead.

---

## R3 — Nothing element-level moves from `styles.css` to `site.css`

**Decision**: The three card pages stop loading `styles.css`. Of its 53 lines: `:root` custom
properties, `*{box-sizing}`, `body{}` and `button{}`/`button:hover` **do not move** (dead or
harmful on a rebuilt card page); `form`, `label`, `label.checkbox`, the input rules and
`.profile-field` **move re-scoped to the shell's body region**; `.error` moves as-is minus its
`#form-message` half; `main.narrow` is **deleted outright**.

**Rationale**: `index.html`'s own head comment records the hazard: *"styles.css (the auth pages'
sheet) is deliberately NOT loaded here — its element-level rules (button padding/hover, input
padding) bleed into the reference components"*. `site.css:339` records the same failure concretely
— a `button` rule *"crushed the card's `.icon-btn` svg"*. These three pages become reference-
component pages, so they inherit that hazard. Framing the rule as *nothing element-level moves*
makes it checkable by reading a selector; "did we bring everything?" is only checkable by
rendering three pages and looking.

Verified against the tree: `*{box-sizing}` is already in `pollGrid.css:26` and `pollCard.css:30`;
`html,body` is already in `pollGrid.css:27`; `--accent` and `--bg` are referenced nowhere outside
`styles.css`; `main.narrow` is used by exactly the three pages being rebuilt.

**Sequenced in two steps, not one.** The rules are added to `site.css` in the foundational phase
and removed from `styles.css` in US4, after `login.html` and `create-account.html` are rebuilt.
Doing both at once would strip those two pages of their layout and field styling for the four
phases between the migration and their rebuild. The overlap is invisible while it lasts, because
the copies in `site.css` are re-scoped to the shell's body region and cannot reach a page that has
not been rebuilt.

**Alternatives considered**: Copying rather than moving **as an end state** — rejected because the
four admin pages load both sheets and two definitions would drift; the transient overlap above is
closed within the feature and leaves each rule defined once. Deleting from `styles.css` in the
foundational phase — rejected for the regression window it opens. Retiring `styles.css` entirely —
rejected as out of scope; the admin pages' `admin.css` rules sit on top of its element-level layer.

---

## R4 — Width and centring come from `.card-viewport`; height differs per card

**Decision**: The three cards use `.card-viewport` (`pollCard.css:64`) — `width:100%`,
`max-width:420px`, `margin:0 auto`. Login and Create Account drop the inherited `.card-flip`
`min-height:420px`; Profile sets `min-height:640px`. A card taller than the viewport scrolls the
page and never becomes its own scroll container.

**Rationale**: `.card-viewport`'s own comment says it exists for this case — *"this wrapper just
caps and centers it, standing in for whatever container it sits in on a real page (a grid cell, a
modal, a sidebar, etc.)"*. The requirement's prose ("sized appropriately", "centered horizontally")
describes exactly what that rule does, so no new width rule is invented.

**Alternatives considered**: A per-page width rule — rejected as a second place for the 420px cap
to live. A card-level `overflow:auto` — rejected because it would clip the Profile card's last
action on short viewports.

---

## R5 — One session snapshot per page, compared whole

**Decision**: `app.js` owns the parsed `GET /api/me` body (or `null`) and exposes a getter plus a
subscribe function. `pollGrid.js` reads it rather than closing over the value captured in `init`.
Comparison is by value over **every field the body carries**, not an enumerated list.

**Rationale**: Today `app.js:9` fetches once at load and `pollGrid.js:32-33` captures the result
into a closure, so the header and the grid's gating can disagree within one page and neither
notices a change. Comparing the whole body removes the "does this field belong in the list?"
question permanently. Notably `status` **cannot** differ within a session — it flips `pending` →
`active` in the session-creation hook (`auth.ts:135`), *before* the session exists, so the first
`/api/me` of any session already reports `active`.

**Alternatives considered**: An enumerated field tuple — rejected because the next field added to
`/api/me` is compared only if someone remembers. A shallow reference check — rejected because each
fetch produces a new object and every response would re-render.

---

## R6 — The cross-window transport carries a snapshot on the channel and a bare signal in the fallback

**Decision**: `BroadcastChannel("auth-state")` carries the snapshot itself. Where it is
unavailable, `app.js` writes a differing value to a single `localStorage` key
(`authStateChangedAt`) and listeners answer by re-fetching `/api/me`. The key carries no session
data and is removed when the session ends.

**Rationale**: On the channel the payload must be the snapshot, not a "signed in" flag — an email
change and a name change alter the body without altering signed-in-ness. In the fallback the
opposite is true: `localStorage` persists across sessions, so storing the snapshot would put an
email address on the device and create a value that could be mistaken for a cache. A ping costs one
extra request on a path that is already rare and removes both problems. Removing the key fires a
`storage` event of its own, so removal *is* the sign-out publish.

**Alternatives considered**: Storing the snapshot in the fallback — rejected on privacy and on the
stale-cache risk. `SharedWorker` — rejected as far more machinery than a page-visibility problem
needs.

---

## R7 — Re-checks are event-driven; nothing polls

**Decision**: Refresh on load, on `visibilitychange` to `visible`, on `pageshow` with
`event.persisted`, and after the page's own successful `PATCH /api/me`. No timer.

**Rationale**: The re-check is what covers a link consumed in a *different* browser, where no
channel and no cookie jar are shared — and the moment that matters is when the person returns to
the window, which is exactly when `visibilitychange` fires. `pageshow` with `persisted` covers a
back/forward-cache restore, which fires no `visibilitychange`. A timer would add request volume for
a state that changes at most a few times a session, against the constitution's efficiency standard.

**Alternatives considered**: A polling interval like the poll grid's — rejected as above.
Server-sent events — rejected as new infrastructure for a rare event.

---

## R8 — Sign-out is published before the navigation, not as a side effect of it

**Decision**: On a successful `POST /api/auth/logout` the page publishes `null` immediately, before
navigating home.

**Rationale**: Sign-out would otherwise propagate only after the signing-out window navigates and
the new page's `/api/me` returns — leaving other windows showing a signed-in header for a session
the server has already revoked. Publishing on the response closes that gap. This is a publish, not
a re-broadcast: the no-echo rule forbids re-sending a snapshot a page *received*.

**Alternatives considered**: Relying on the post-navigation load to publish — rejected for the
latency gap. Doing nothing and letting the next re-check catch it — rejected because a stale
signed-in header invites actions that will fail.

---

## R9 — `GET /profile` is relaxed narrowly, and the match is exact

**Decision**: `pages.ts` serves `profile.html` to a session-less request **only** when the query
carries `changed=1` or `error=invalid-link`, matched exactly. Every other session-less request
still redirects to `/login`.

**Rationale**: There are two redirects, not one. `profile.html:52` redirects from the client, and
`pages.ts:66` redirects from the server *before the file is sent* — so removing only the client one
leaves the result card unreachable in the exact case it exists for. Narrow keeps FR-014's behaviour
everywhere else, and it keeps `tests/session.test.ts:132` passing unchanged, where it becomes the
regression guard on the relaxation itself. An exact match matters: a guard accepting `changed` with
any value turns one condition into an open door. The relaxed branch discloses nothing — it sends a
static file, `/api/me` still 401s, and the result card names no address.

**Alternatives considered**: Making `/profile` public and letting the client decide — rejected: it
spends a documented guard, leaves page JavaScript as the only thing between a guest and a profile
editor, and would require deleting the guest-redirect test.

---

## R10 — `createRequireAdmin` gains a parameter; the API instance is untouched

**Decision**: The factory takes an argument selecting the refusal shape. `pages.ts:38` builds a
page-shaped instance that sends `not-authorized.html`; `pollsApi.ts:118` builds today's
JSON-shaped instance, unchanged.

**Rationale**: This is the feature's one real trap. `createRequireAdmin` (`service.ts:697`) is a
single factory with two call sites, and the obvious way to implement the refusal page — edit the
factory — silently rewrites every `/api/admin/*` refusal into HTML, which no caller expects. The
status stays **403**: the request is still refused, a `200` would tell caches and monitoring the
page loaded normally, and `tests/pages.test.ts:41-52` asserts 403 for both a non-admin and a guest
while asserting nothing about the body — so 403-with-HTML keeps both green and a 200 breaks both.

**Alternatives considered**: A separate handler in `pages.ts` duplicating the session lookup and
allow-list check — rejected as two copies of an authorization decision. Branching inside the
existing handler on `req.path` or `Accept` — rejected as implicit where a parameter is explicit.

---

## R11 — The roster's authority is the invited list, and `notYetVoted` already exists

**Decision**: Rows come from the invited list held in the editor; the voted set decides the second
suffix. Rows read `emailAddress <userName>` on every poll type, sorted by code-point order on the
lower-cased address. The banned list keeps its current rendering and takes the same sort.

**Rationale**: The requirement's "merge the Voted list into the Invited list" describes work the
server already does. On every save of an invitation-only poll, `service.ts:550-563` reconciles
`currentVotes` to the invited list — banned voters' votes deleted, votes from addresses no longer
invited dropped, a placeholder added for every invited address without a vote — and
`pollsApi.ts:616-631` returns that reconciliation already split into `voted` and, **for
invitation-only polls only**, `notYetVoted`. So a voter outside the invited list cannot occur.

The invited list is still the authority because it is the only one of the three sources reflecting
the current editing session: an address invited a moment ago is in the draft and in neither server
field until save. `notYetVoted` therefore needs no handling — an invited address absent from
`voted` has not voted, placeholder or not.

Collation is code-point order rather than `localeCompare` because `localeCompare` orders by the
*viewer's* locale, so two admins reading the same roster to each other could see different orders.
Case never varies — addresses are lower-cased at all four entry points (`api.ts:36`,
`service.ts:69`, `adminPoll.js:818`, `pollsApi.ts:76`) — so folding is a no-op, specified anyway.

**Alternatives considered**: Using `voted` + `notYetVoted` as the row source — rejected because it
loses unsaved invitations. Keeping `userName.localeCompare` (`adminPoll.js:573`) — rejected for the
locale-dependence above.

---

## R12 — The header reorder is source order alone, and is a no-op below 768 px

**Decision**: Move `.header-nav` after `.header-search` in `SITE_HEADER_MARKUP`. No spacer, no
`margin-left:auto`, no change to `justify-content`. `<div class="brand">` becomes
`<a class="brand" href="/">` with both SVGs as decorative children.

**Rationale**: `.header-search` already carries `flex:1 1 auto` and `max-width:640px`
(`site.css:76`), making it the only flexible child, so it absorbs the slack and separates the two
clusters on its own. Below 768 px `site.css:176` gives it `order:3`, `flex:1 1 100%` and
`max-width:none`, which **explicitly overrides source order** — so the narrow arrangement is
identical before and after, and the reorder is a no-op there. Worth recording so nobody later
"fixes" the media block that makes it safe.

**Alternatives considered**: A flex `order` change instead of source order — rejected because it
leaves reading order disagreeing with visual order. A spacer element — rejected; nothing needs it.

---

## R13 — One close control, named for its destination, with no Escape handler

**Decision**: An anchor to `/` carrying an × glyph in the poll card's `.icon-btn` chrome, with
`aria-label="Back to the home page"` and `aria-hidden="true"` on its SVG. It sits after the title
in markup, is the card's first focusable element, and takes a visible focus indicator added in
`site.css`. Escape does nothing.

**Rationale**: The app's convention names the destination — `"Back to poll list"`,
`"Back to results without voting"` — and a control announcing itself as "Close" would promise a
dismissal it cannot perform; it navigates. `.icon-btn` (28 px bordered chip) rather than
`.admin-back-link` (32 px borderless) because these are cards, and a chip reads as a control
against the card's paper surface. The app defines **no** `:focus-visible` rule anywhere today
(only `.header-search:focus-within`, `site.css:89`), so a new interactive control needs one.
Escape is deliberately inert: these are pages, not dialogs, and binding it to navigation would let
a habitual keypress discard a part-typed address.

**Alternatives considered**: `aria-label="Close"` — rejected as above. A `<button>` with
`location.href` — rejected against the declared-destination rule, which wants a real `href`.

---

## R14 — A submission disables its own action and shows progress

**Decision** (from `/speckit-clarify`, Session 2026-09-07): while a submission awaits its outcome
the action is unavailable and shows that work is in progress; no further submission is possible
until the outcome arrives.

**Rationale**: The email-sending endpoints are rate-limited to 2 requests per 15 minutes by
default (`ENV_EMAIL_RATE_LIMIT_*`), so a double-click can consume a person's whole allowance and
lock them out for the window. One disabled attribute prevents it, and the poll card already treats
its Vote action this way.

**Alternatives considered**: Disabling without a progress indication — rejected as indistinguishable
from a dead control. Leaving the action enabled — rejected: it makes the rate limit reachable by
accident.

---

## R15 — Two clarification questions left open, and the defaults taken

`/speckit-plan` was invoked before the clarification loop finished, so both remaining questions
were resolved here by default. The loop was then resumed and both were confirmed by the product
owner, so each is now a stated requirement. The reasoning is kept below.

**A — Unsaved text when leaving a card.** *Decided* in `/speckit-clarify`, Session 2026-09-07,
and now stated as FR-047 rather than assumed: leaving discards it silently. The close
control and the brand link are plain navigations, as specified. *Rationale*: every other navigation
in the product behaves this way, including the poll editor's own back control, and a confirmation
flow is exactly the speculative addition Simplicity First rules out. *Reversal cost*: one branch in
the shell's close handler.

**B — A session change arriving mid-edit on a page that requires a session.** *Decided* in
`/speckit-clarify`, Session 2026-09-07, and now stated in FR-014 rather than assumed: the page
navigates to sign-in immediately and in-progress text is lost, consistent with A.
*Rationale*: the session is already gone; keeping the person on a page whose every action will now
fail is worse than moving them. *Reversal cost*: one branch in the snapshot-adoption path.

Both are now stated requirements — FR-047 and FR-014 respectively — and `plan.md`'s Open
Assumptions section records that nothing remains open.
