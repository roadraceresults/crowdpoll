---
description: "Task list for 013-UI-UX-revisions"
---

# Tasks: UI/UX Revisions

**Input**: Design documents from `/specs/013-UI-UX-revisions/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md),
[data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)

**Tests**: Included. Not a blanket TDD request — the requirements document's own Test Impact
section and `quickstart.md` name the specific suites this feature must change, and the
constitution's Principle IV requires a verifiable criterion per task. Presentation work that no
assertion can meaningfully cover is verified through `quickstart.md` instead, following 008's
precedent.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to
- Every task names an exact file path

## Path Conventions

Existing layout, unchanged: client in `src/public/` (flat, one file per component, each an IIFE
exposing at most one global, loaded `defer`), server in `src/routes/` and `src/polls/`, tests in
`tests/`. No build step for client code.

---

## Phase 1: Setup

**Purpose**: Establish a known-good baseline and a usable manual-validation environment

- [X] T001 Run `npm test` and record the passing suite count as the baseline in the PR description
- [X] T002 [P] Set `ENV_EMAIL_RATE_LIMIT_MINUTES_WINDOW=1`, `ENV_EMAIL_RATE_LIMIT_MAX_REQUESTS_PER_WINDOW=20` and `ENV_PRIVATE_VOTER_LIMIT_DEFAULT=10` in `devScripts/launch-dev.ps1` for manual validation, per `specs/013-UI-UX-revisions/quickstart.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The card shell and the session snapshot. Four of the seven stories consume one or
both, so nothing else can start until these exist.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T003 Create `src/public/cardShell.js` as an IIFE exposing `window.CardShell` with `mount(container, {title, subtitle, closeHref})` returning `{subtitle, body, actions}`, per contract C1 in `specs/013-UI-UX-revisions/contracts/ui-contracts.md`
- [X] T004 In `src/public/cardShell.js`, render only regions that have content — no empty subtitle region, no action row when there are no actions, no padding to a fixed size (FR-035)
- [X] T005 In `src/public/cardShell.js`, render the title as an `<h1>` carrying `.question` styling, not the `<p>` the poll card uses (FR-030)
- [X] T006 In `src/public/cardShell.js`, render the close control as an `<a href>` with an × glyph in `.icon-btn` chrome, `aria-label="Back to the home page"`, its SVG `aria-hidden="true"`, placed after the title in markup; add no Escape handler (research R13)
- [X] T007 In `src/public/cardShell.js`, render a `<p role="status">` below each action, present and empty from first paint, per contract C2
- [X] T008 In `src/public/cardShell.js`, make an action unavailable and show work in progress from click until its outcome arrives, so one intended action costs at most one rate-limit attempt (FR-046) — owned by the shell so all four consumers inherit it
- [X] T009 [P] Add shell rules to `src/public/site.css`: the shell wrapper and its regions, `text-decoration:none` on the close anchor, and a `:focus-visible` indicator — the app defines none today (research R13)
- [X] T010 In `src/public/site.css`, add the rules the shell's body region needs — `form`, `label`, `label.checkbox`, the input rules and `.profile-field` — re-scoped to the shell, never as bare element selectors, plus `.error` as-is minus its `#form-message` half (research R3). **Additive only**: `styles.css` keeps its copies for now, because `login.html` and `create-account.html` still depend on them until US4 rebuilds them. The re-scoped rules cannot reach those pages, so the overlap is invisible
- [X] T011 In `src/public/app.js`, own one session snapshot per page — the parsed `GET /api/me` body or `null` — and expose `getSession()` and `subscribe(fn)` on the existing client namespace, per contract C4. **Keep dispatching the existing `me-loaded` event** until `profile.html` is rebuilt in Phase 3 — `src/public/profile.html:50` is its only listener and breaks without it
- [X] T012 In `src/public/app.js`, compare a candidate snapshot against the held one by value over every field the body carries plus the `null`/not-`null` distinction; discard an identical one without re-rendering (FR-013, research R5)
- [X] T013 In `src/public/app.js`, hold the current snapshot when a refresh fails at the network level, and treat a 401 as an answer that re-renders the page as a guest (FR-017)
- [X] T014 In `src/public/pollGrid.js`, replace the `me` value captured in `init` and the `isSignedIn` closure over it with a read of `getSession()` at each evaluation (FR-009)

**Checkpoint**: The shell mounts, its body styling exists, and the snapshot is readable — user stories can now begin

---

## Phase 3: User Story 1 - A verification link always reports its outcome (Priority: P1) 🎯 MVP

**Goal**: A person who follows an email-change link learns what happened, in any browser, whether
or not that browser holds a session.

**Independent Test**: Request an email change, open the link in a private window, and confirm the
outcome is stated rather than a sign-in form appearing. Repeat with a used link.

### Tests for User Story 1

- [X] T015 [P] [US1] In `tests/session.test.ts`, assert a session-less `GET /profile?changed=1` returns `200` and HTML
- [X] T016 [P] [US1] In `tests/session.test.ts`, assert a session-less `GET /profile?error=invalid-link` returns `200` and HTML
- [X] T017 [P] [US1] In `tests/session.test.ts`, assert a session-less `GET /profile?changed=2` and `GET /profile?changed=1&x=1` still redirect to `/login`, proving the match is exact (research R9)
- [X] T018 [US1] Confirm the existing `tests/session.test.ts` assertion that a bare session-less `GET /profile` redirects to `/login` still passes unchanged — it is the regression guard on the relaxation

### Implementation for User Story 1

- [X] T019 [US1] In `src/routes/pages.ts`, serve `profile.html` to a session-less `GET /profile` when and only when the query carries exactly `changed=1` or `error=invalid-link`; every other session-less request keeps redirecting to `/login`, per `specs/013-UI-UX-revisions/contracts/page-routes.md`
- [X] T020 [US1] In `src/routes/pages.ts`, log the relaxed branch at the point of serving, matching the existing `[profile]` prefix (constitution V)
- [X] T021 [US1] Create `src/public/profileCard.js` and render the verification result state from the query string **before** evaluating the session, so the same script draws the page on both paths (FR-001)
- [X] T022 [US1] In `src/public/profileCard.js`, mount the result card via `CardShell.mount` with a single "Log In" action to `/login`, and these two exact pairs (FR-004, FR-005):
  - `changed=1` → title "Email Address Changed", subtitle "Your email address has been updated. Sign in with your new address to continue."
  - `error=invalid-link` → title "Link No Longer Valid", subtitle "This verification link has expired, has already been used, has been replaced by a newer request, or the address is now in use by another account. Start the change again from your Profile page." — the four causes stated together, never identifying which occurred
- [X] T023 [US1] In `src/public/profileCard.js`, set `document.title` to match the result card's title so the tab does not read "Profile" over a completed change
- [X] T024 [US1] In `src/public/profileCard.js`, ensure the result card names no email address and reads no address from the query string (FR-006)
- [X] T025 [US1] In `src/public/profileCard.js`, mount the Profile card for a signed-in visitor — avatar right-aligned in the subtitle slot, display-name group, current-address value, change-address group, one action per group (FR-033, contract C1)
- [X] T026 [US1] In `src/public/profileCard.js`, keep both actions on the card; Save User Name reports the new name, Send Verification Link reports success on any successful response — that endpoint answers 202, not 200 — naming the address the link went to (FR-033, contract C3)
- [X] T027 [US1] In `src/public/profileCard.js`, when `/api/me` returns 200 and the query carries a verification result, render that result into the Change Email Address group's status line — the action it concerns — so a link followed in the browser that requested it is reported on the card rather than only in the session-less state (FR-007)
- [X] T028 [US1] In `src/public/profileCard.js`, hide the change-address label, box and action in `oauth` mode, where the address is provider-supplied and the endpoint refuses (FR-037)
- [X] T029 [US1] Set `min-height:640px` on the Profile card in `src/public/site.css`, overriding the inherited `min-height:420px`, and confirm it does not become its own scroll container (FR-035, FR-036, research R4)
- [X] T030 [US1] Rebuild `src/public/profile.html` on the shell: load `pollGrid.css`, `pollCard.css`, `site.css` and the Fraunces/Inter link, plus `app.js`, `cardShell.js` and `profileCard.js` deferred, and remove the inline `<script>` — this task and T026–T030 must land together, since removing the inline script is what deletes today's profile UI (research R2)

**Checkpoint**: `/profile` is whole — the card for a signed-in visitor, the result state for anyone following a link. Independently shippable.

---

## Phase 4: User Story 2 - Open windows reflect the current session (Priority: P1)

**Goal**: No window is left showing a signed-out header, guest-gated cards or a stale address after
an email link is followed elsewhere.

**Independent Test**: Open two windows, sign in through the link in one, confirm the other updates
without a reload; then repeat with the link opened in a different browser and confirm the first
updates on regaining focus.

### Tests for User Story 2

- [X] T031 [P] [US2] In `tests/poll-card-assets.test.ts`, assert `app.js` as served carries the `auth-state` channel name and the `authStateChangedAt` fallback key, so the transport cannot be silently renamed. Keep it in this suite — its HTTP-fetched-asset mechanism is exactly right, proving the file is actually served — but widen the suite's header comment, which currently describes it as guarding the poll card only, to cover shipped client assets generally; T051–T053 add stylesheet assertions to the same suite

### Implementation for User Story 2

- [X] T032 [US2] In `src/public/app.js`, publish every self-obtained snapshot on a same-origin `BroadcastChannel("auth-state")`, sending the snapshot itself rather than a signed-in flag (FR-012, contract C4)
- [X] T033 [US2] In `src/public/app.js`, subscribe to `auth-state` on load and adopt a differing received snapshot without re-publishing it, so one change cannot echo between windows (FR-012)
- [X] T034 [US2] In `src/public/app.js`, fall back to writing a differing value to `localStorage["authStateChangedAt"]` and listening for `storage` where `BroadcastChannel` is unavailable; the key carries no session data and listeners answer by re-fetching `/api/me` (FR-016, research R6)
- [X] T035 [US2] In `src/public/app.js`, remove `authStateChangedAt` when the snapshot it would publish is `null`, so sign-out is published by the removal (research R6, R8)
- [X] T036 [US2] In `src/public/app.js`, refresh on `visibilitychange` to `visible` and on `pageshow` with `event.persisted`, and add no timer (FR-010, FR-011)
- [X] T037 [US2] In `src/public/app.js`, drop a refresh that arrives while another is in flight rather than queueing it (spec Assumptions)
- [X] T038 [US2] In `src/public/app.js`, publish `null` as soon as `POST /api/auth/logout` succeeds and before navigating home (FR-015)
- [X] T039 [US2] In `src/public/app.js`, on adoption navigate to `/` from a page whose only purpose is obtaining a session, and to `/login` from a page requiring one — immediately, discarding unsaved text (FR-014)
- [X] T040 [US2] In `src/public/profileCard.js`, on an adopted snapshot whose `emailAddress` differs, update the displayed address and clear the change-address box; leave the box alone when only other fields differ (FR-018)
- [X] T041 [US2] In `src/public/profileCard.js`, do not overwrite the display-name box while it holds focus (FR-019)
- [X] T042 [US2] In `src/public/app.js`, re-render the header from an adopted snapshot so the name and avatar update in place (FR-014)

**Checkpoint**: US1 and US2 both work independently.

---

## Phase 5: User Story 3 - Administrators can tell who was invited from who has voted (Priority: P2)

**Goal**: Every participant row says whether the address was invited, has voted, or both.

**Independent Test**: Open an invitation-only poll with some invitees who have voted and some who
have not; confirm each row's labels, including an address invited in the current unsaved session.

### Implementation for User Story 3

- [X] T043 [US3] In `src/public/adminPoll.js`, remove the `if (!participantsInviteOnly)` guard so the voted set is loaded for every visibility (FR-025)
- [X] T044 [US3] In `src/public/adminPoll.js`, build invitation-only rows from the invited list held in the editor — the only source reflecting unsaved invitations — and use the voted set only to decide the second suffix; do not consume `notYetVoted` (research R11)
- [X] T045 [US3] In `src/public/adminPoll.js`, render rows as `emailAddress <userName>` where a name is known, else the address alone, with the angle brackets as literal text (FR-022, FR-023)
- [X] T046 [US3] In `src/public/adminPoll.js`, append ` - Invited` to every invitation-only row and ` - Voted` where the address is in the voted set; append ` - Voted` to every link-only and public row (FR-020, FR-021)
- [X] T047 [US3] In `src/public/adminPoll.js`, sort every participant list by code-point order on the lower-cased address, replacing the `userName.localeCompare` comparator (FR-024, research R11)
- [X] T048 [US3] In `src/public/adminPoll.js`, apply the same sort to the banned list and leave its rows unlabelled and without a display name (FR-026)
- [X] T049 [P] [US3] In `src/public/admin-poll.html`, rename the invited-address "Add" button to "Invite" (FR-027)

**Checkpoint**: Rosters answer the question the feature was raised for.

---

## Phase 6: User Story 4 - Sign-in, account creation and profile editing look like the rest of the app (Priority: P2)

**Goal**: Three plain forms become three cards in the product's established style.

**Independent Test**: Visit each page, submit successfully and unsuccessfully, and use each close
control.

### Tests for User Story 4

- [X] T050 [P] [US4] In `tests/poll-card-assets.test.ts`, assert `site.css` carries the promoted `.error` rule, widening the suite's header comment here if T032 has not already
- [X] T051 [P] [US4] In `tests/poll-card-assets.test.ts`, assert `styles.css` no longer carries `main.narrow` — passes only once T062 lands, which is the intended within-phase order
- [X] T052 [P] [US4] In `tests/poll-card-assets.test.ts`, assert `login.html`, `create-account.html` and `profile.html` no longer link `styles.css`
- [X] T053 [US4] Confirm the existing `tests/pages.test.ts` assertion that a guest's `GET /login` contains `login-form` still passes — the rebuilt form keeps that id

### Implementation for User Story 4

- [X] T054 [P] [US4] Create `src/public/loginCard.js`, mounting the Login card with its subtitle, address field, stay-signed-in checkbox and one action, keeping `id="login-form"` on the form
- [X] T055 [P] [US4] Create `src/public/createAccountCard.js`, mounting the Create Account card with its subtitle, address field and one action
- [X] T056 [US4] In `src/public/loginCard.js` and `src/public/createAccountCard.js`, await the response and stay on the card in every case: on success report "Check your inbox — click the link we sent you to sign in" / "…to activate your account" and settle the action so the link cannot be requested twice; on 429 or 400 render the reason in the action's status line (FR-032)
- [X] T057 [US4] In `src/public/loginCard.js`, `src/public/createAccountCard.js` and `src/public/profileCard.js`, render a page-load notice into the status line of the action it concerns, or the first where it concerns none — `/login?error=invalid-link` concerns no action, and those two cards have only one status line anyway (FR-034)
- [X] T058 [US4] In `src/public/loginCard.js`, `src/public/createAccountCard.js` and `src/public/profileCard.js`, discard unsubmitted text on any navigation away, with no confirmation and no restore (FR-047)
- [X] T059 [P] [US4] Rebuild `src/public/login.html` on the shell: the four-stylesheet head, `app.js` + `cardShell.js` + `loginCard.js` deferred, inline `<script>` removed, oauth provider branch carried across so the card offers only what the configured mode supports (FR-037)
- [X] T060 [P] [US4] Rebuild `src/public/create-account.html` on the same pattern
- [X] T061 [US4] Drop the inherited `min-height:420px` on the Login and Create Account cards in `src/public/site.css`, so each takes its height from its contents (FR-035)
- [X] T062 [US4] In `src/public/styles.css`, now delete `main.narrow` and the rules T010 copied into `site.css`, closing the temporary overlap — **only after T060 and T061**, since until they land those two pages still render through them. Ends with each rule defined once, in one sheet (research R3)
- [X] T063 [US4] In `src/public/loginCard.js`, hold the action and the stay-signed-in checkbox and label unavailable until the address field has text, and unavailable again when it is emptied; the gate is a third state in `src/public/cardShell.js`, separate from in-flight and settled (FR-048)
- [X] T064 [US4] In `src/public/createAccountCard.js` and `src/public/profileCard.js`, hold each action unavailable while the field it acts on is empty; the profile card re-evaluates both gates on every adopted snapshot, since adoption writes the name and can clear the change-address box (FR-048)

**Checkpoint**: All four P1/P2 stories deliverable.

---

## Phase 7: User Story 5 - The header reads as one arrangement (Priority: P3)

**Goal**: The header's clusters read as intended and the product mark leads home.

**Independent Test**: Load any page and confirm the arrangement; click the mark.

- [X] T065 [US5] In `src/public/app.js`, move `.header-nav` after `.header-search` in `SITE_HEADER_MARKUP` — source order only, no spacer, no `margin-left:auto`, no `justify-content` change (FR-038, research R12)
- [X] T066 [US5] In `src/public/app.js`, change `<div class="brand">` to `<a class="brand" href="/">`, keeping `display:flex` and the 6 px gap, both SVGs decorative children (FR-039)
- [X] T067 [US5] Leave `src/public/site.css`'s `max-width:767.98px` block untouched — its `order:3` on `.header-search` is what keeps the narrow arrangement identical, and the reorder is a no-op there (research R12)

**Checkpoint**: Header verified on wide and narrow viewports.

---

## Phase 8: User Story 6 - Leaving the administration pages (Priority: P3)

**Goal**: The administration list has a way home that is not the browser's back button.

**Independent Test**: Open `/admin` and use the back control.

- [X] T068 [US6] In `src/public/admin.html`, add a back control reusing `.admin-back-link` with the same arrow glyph, `href="/"`, left-justified above the "Create New Poll" button (FR-040)

**Checkpoint**: Every page this feature touches has a declared way home.

---

## Phase 9: User Story 7 - A refusal that explains itself (Priority: P3)

**Goal**: A non-administrator sees a page, not a data fragment.

**Independent Test**: Visit each administration page signed out and as a non-administrator.

### Tests for User Story 7

- [X] T069 [P] [US7] In `tests/pages.test.ts`, assert `/admin` still returns `403` to a signed-in non-administrator and to a guest, and that the body is now HTML rather than JSON
- [X] T070 [P] [US7] In `tests/pages.test.ts`, assert `/admin/poll`, `/admin/poll/update` and `/admin/poll/results` answer the same way
- [X] T071 [P] [US7] In `tests/polls-admin-crud.test.ts`, assert an `/api/admin/*` route still refuses with `403` and `{"error":"Not authorized"}` as JSON — the guard against editing the shared factory (research R10)

### Implementation for User Story 7

- [X] T072 [US7] In `src/polls/service.ts`, give `createRequireAdmin` a parameter selecting the refusal shape, leaving the JSON shape as the behaviour `pollsApi.ts:118` receives — **do not change the factory's existing output** (research R10)
- [X] T073 [US7] In `src/routes/pages.ts`, build the page-shaped instance so all four `/admin*` routes send `not-authorized.html` at `403`, and log the refusal (FR-042, FR-043)
- [X] T074 [P] [US7] Create `src/public/not-authorized.html` with the four-stylesheet head and `app.js` + `cardShell.js` + `notAuthorizedCard.js` deferred, so the standard header renders (FR-042)
- [X] T075 [P] [US7] Create `src/public/notAuthorizedCard.js`, mounting the card with title "Not Authorized", subtitle "You do not have permission to access this page." and `closeHref: "/"` — no body, no actions (FR-042, FR-044)
- [X] T076 [US7] In `src/routes/pages.ts`, confirm the single refusal branch serves `src/public/not-authorized.html` to a guest and to a signed-in non-administrator alike, revealing neither which they are nor whether signing in would help (FR-044)

**Checkpoint**: All seven stories independently functional.

---

## Phase 10: Polish & Cross-Cutting Concerns

- [X] T077 [P] Update `specs/013-UI-UX-revisions/contracts/page-routes.md` if any route behaviour landed differently from the contract
- [X] T078 [P] Confirm `postman/openapi.json` needs no change — it documents `/api/*` only and no endpoint changed (contract page-routes.md)
- [X] T079 Run `npm test`; every suite passes and the count is at or above the T001 baseline
- [X] T080 Work through `specs/013-UI-UX-revisions/quickstart.md` scenarios S1–S10
- [X] T081 Run the accessibility pass in `specs/013-UI-UX-revisions/quickstart.md`: close control first in tab order with visible focus, refusals announced, result pages announced as content, Escape inert
- [X] T082 Run the quickstart `curl` against `/api/admin/polls` and confirm JSON — the last check that the shared guard was parameterised, not edited
- [ ] T083 [P] Visually check `index.html`, the one page whose CSS exposure widens, since it loads `site.css` and not `styles.css` (research R3, BC-2)
- [X] T084 [P] Run `git diff --stat -- src/routes/api.ts src/auth/` and confirm both are untouched — no verification link changes how it is issued or consumed, which is what makes the `/profile` guard the whole of this feature's server surface (FR-008)
- [X] T085 [P] Run `git grep -n 'history\.back(' -- src/public` and confirm no match — every navigation this feature adds is a declared destination (FR-041, contract C6)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies
- **Foundational (Phase 2)**: depends on Setup — **blocks every user story**. It now carries the
  additive half of the stylesheet migration (T010) and the shell's in-flight action state (T008),
  because every card with fields needs them, not only the three rebuilt in US4. The matching
  deletions from `styles.css` stay in US4 (T062), after the pages that still depend on them are
  rebuilt
- **US1 (Phase 3)** … **US7 (Phase 9)**: depend only on Foundational, and on nothing else
- **Polish (Phase 10)**: depends on every story being taken

### User Story Dependencies

- **All seven stories are independent of one another.** Each owns the files it rebuilds, with the
  two overlaps noted below
- **US1 owns `src/public/profileCard.js` and `src/public/profile.html` outright.** T025–T030 must
  land together: removing the inline `<script>` is what deletes today's profile UI, so the card
  that replaces it ships in the same increment. US4 touches `profileCard.js` only through T057 and
  T058, which add behaviour shared by all three card scripts
- **US2** touches `src/public/app.js` alongside US5 (T065–T066, header markup) — different regions
  of the same file, so sequence or merge carefully
- **US7** is independent, but its T072 touches the guard factory that `pollsApi.ts` shares; T071
  exists to catch a mistake there

### Within Each Story

- Tests before the implementation they cover
- Shell, promoted styles and snapshot (Phase 2) before anything that mounts a card or reads a
  session; the `styles.css` deletions (T062) after the last page that depends on them is rebuilt
- Server route changes before the client code that depends on being served

### Parallel Opportunities

- T009 with T003–T008 (different files)
- T015–T017 together (same file, independent cases — coordinate the single edit)
- T050–T052 together, T054 with T055, T059 with T060, T069–T071 together, T074 with T075
- **US3, US5 and US6 can be taken by three people in parallel immediately after Phase 2** — they
  share no file with each other or with anything else

## Parallel Example: User Story 3

```
After Phase 2 completes, one developer takes all of US3:
  T043 → T044 → T045 → T046 → T047 → T048   (all in src/public/adminPoll.js, sequential)
  T049                                        (src/public/admin-poll.html, parallel with any of the above)
```

## Implementation Strategy

**MVP scope**: Phase 1 + Phase 2 + Phase 3 (US1). That delivers the only change in the feature
where information is currently lost — a completed email change that tells the person nothing — and
leaves `/profile` whole for signed-in visitors, because the Profile card ships in the same phase
that rebuilds the page. Independently shippable.

**Incremental delivery**:

1. Setup + Foundational + US1 → ship the MVP; `/profile` is fully rebuilt
2. Add US2 → every email-link journey now finishes cleanly in both windows
3. Add US3 → the administration blind spot closes; no dependency on US1 or US2
4. Add US4 → Login and Create Account rebuilt on the shell; Profile is already done
5. Add US5, US6, US7 → small independent finishes, any order

**Two things to get wrong once and never again**, both recorded in `research.md`:

- **T072** — `createRequireAdmin` is one factory with two instances. Editing it rewrites every
  `/api/admin/*` refusal into HTML. T071 and T082 both exist to catch that.
- **T010/T062** — nothing element-level moves from `styles.css` to `site.css`. `site.css:339`
  records this failing once already: a `button` rule crushed the card's `.icon-btn` svg. The two
  halves are deliberately split across phases: add in Phase 2, delete in US4.
