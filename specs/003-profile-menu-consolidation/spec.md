# Feature Specification: Profile Menu Consolidation

**Feature Branch**: `003-profile-menu-consolidation`

**Created**: 2026-08-10

**Status**: Draft

**Input**: User description: "using ./designDocs/high-level-requirements.md" (delta against
the implemented `001-user-auth` demo client: (1) the source document's header-links list no
longer lists `Logout` and `Edit Profile` as standalone header links; those two actions move
into the avatar-triggered profile menu exclusively, which now lists `Edit Profile` followed
by `Logout`; (2) the source document adds a new rule that a signed-in user who navigates
directly to the Login page is redirected to the home page instead of seeing the login form)

**Source doc note (added 2026-08-20)**: `designDocs/high-level-requirements.md` no longer
exists under that name — it evolved in place across 001–004, then was split/renamed. The
closest surviving snapshot of what this spec actually read is
`designDocs/001-high-level-requirements-user-auth.md`, captured at this spec's own
commit (003) as a stable copy split off the still-evolving original.

## Clarifications

### Session 2026-08-11

- Q: User Story 2 requires that a signed-in user who navigates to the Login page never sees
  the login form (FR-008, SC-004 = 100%). Given `login.html` is a static file whose `<form>`
  is always present unconditionally in the markup, a client-side check would risk a brief
  flash of the form before redirecting. Should the redirect be enforced server-side (mirroring
  the existing `/profile` route guard, which checks the session before sending the HTML) or
  client-side (via `app.js` after page load)? → A: Server-side guard, mirroring the existing
  `/profile` route pattern — the server checks the session and redirects before ever sending
  the Login page's HTML.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Manage Account via a Single Profile Menu (Priority: P1)

A signed-in user sees their `userName` and `profileAvatar` in the header, with no separate
`Logout` or `Edit Profile` links alongside them. Clicking the avatar opens a menu listing
`Edit Profile` and `Logout`. Choosing `Edit Profile` navigates to the profile page; choosing
`Logout` ends the session and returns the guest experience.

**Why this priority**: This is the primary scope of the feature — the header currently
duplicates account actions both as standalone links and inside the avatar menu, and this
story removes that duplication.

**Independent Test**: Sign in, confirm the header shows only the avatar and userName (no
standalone `Logout`/`Edit Profile` links), open the avatar menu, and confirm both actions
are present and work correctly from there.

**Acceptance Scenarios**:

1. **Given** a signed-in user, **When** the header renders, **Then** no standalone `Logout`
   or `Edit Profile` link appears in the main header nav.
2. **Given** a signed-in user, **When** they click the `profileAvatar`, **Then** a menu opens
   listing `Edit Profile` followed by `Logout`, and no other items.
3. **Given** the open profile menu, **When** the user selects `Edit Profile`, **Then** they
   are taken to the profile page, matching existing `001-user-auth` behavior.
4. **Given** the open profile menu, **When** the user selects `Logout`, **Then** their session
   ends and they see the guest header and guest content, matching existing `001-user-auth`
   logout behavior.
5. **Given** a signed-out (guest) visitor, **When** the header renders, **Then** it is
   unchanged from `001-user-auth` (`Login` and, in native mode, `Create Account`).

---

### User Story 2 - Signed-In Users Cannot Land on the Login Page (Priority: P2)

A user who is already signed in somehow ends up navigating to the Login page (e.g. a stale
bookmark, browser back button, or manually typed URL). Instead of seeing the login form, they
are redirected straight to the home page.

**Why this priority**: A signed-in user has no valid reason to see the login form, and letting
them reach it invites confusing states (e.g. submitting a second login while already
authenticated). This is independent of the profile-menu reorganization in User Story 1 and can
ship on its own.

**Independent Test**: Sign in, then navigate directly to the Login page URL. Confirm the user
is redirected to the home page and never sees the login form.

**Acceptance Scenarios**:

1. **Given** a signed-in user, **When** they navigate to the Login page, **Then** they are
   redirected to the home page without seeing the login form.
2. **Given** a signed-out (guest) visitor, **When** they navigate to the Login page, **Then**
   the login form renders normally (unchanged from `001-user-auth`).

---

### Edge Cases

- Clicking outside the open profile menu closes it without taking any action (existing
  `001-user-auth` behavior, unchanged).
- Clicking the avatar again while the menu is open closes it (toggle behavior, unchanged).
- OAuth sign-in mode: the profile menu behaves identically — this feature does not alter
  which fields are editable or how avatars are sourced, only where the `Edit Profile` and
  `Logout` actions live in the UI.
- A signed-in user's session expires (or is invalidated on another device via the
  single-session rule) while they are on a page that links to the Login page; navigating to
  that stale link is treated as a guest visit at that point, not a redirect loop.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The header's main nav MUST NOT render a standalone `Logout` link for signed-in
  users.
- **FR-002**: The header's main nav MUST NOT render a standalone `Edit Profile` link for
  signed-in users.
- **FR-003**: The avatar-triggered profile menu MUST list exactly two items for a signed-in
  user: `Edit Profile` and `Logout`, in that order.
- **FR-004**: Selecting `Edit Profile` from the profile menu MUST navigate to the same
  profile page used by the prior standalone link.
- **FR-005**: Selecting `Logout` from the profile menu MUST end the session using the same
  logout behavior as the prior standalone link (immediate session termination, redirect to
  the guest experience).
- **FR-006**: The guest (signed-out) header — `Login` and, in native sign-in mode, `Create
  Account` — MUST remain unchanged.
- **FR-007**: The avatar's existing open/close toggle behavior (click to open, click outside
  to close) MUST be preserved for the consolidated menu.
- **FR-008**: When a signed-in user navigates to the Login page, the system MUST redirect
  them to the home page instead of rendering the login form.
- **FR-009**: When a signed-out (guest) visitor navigates to the Login page, the system MUST
  render the login form unchanged from `001-user-auth`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of signed-in header renders contain zero standalone `Logout` or `Edit
  Profile` links outside the profile menu.
- **SC-002**: A signed-in user can reach either account action (edit profile or log out) in
  exactly two clicks (open avatar menu, then select the action).
- **SC-003**: Logout and profile-edit behavior are unchanged from `001-user-auth` from the
  user's perspective — only the entry point moved.
- **SC-004**: 100% of Login-page visits by a signed-in user result in a redirect to the home
  page, with the login form never rendered to them.

## Assumptions

- This is a UI-reorganization-only change to the `001-user-auth` demo client; no API,
  session, or data-model changes are required (`/api/auth/logout` and the profile page are
  reused as-is).
- The existing avatar-menu open/close interaction and its CSS hook (`avatar-menu`) are kept;
  only its contents and the removal of the duplicate header-level links are in scope.
- Menu item order follows the revised source document: `Edit Profile` first, `Logout`
  second.
- The Login-page redirect (User Story 2) is enforced server-side, mirroring the existing
  `/profile` route guard: the server checks the signed-in session before serving the Login
  page and redirects to the home page when a session is present, so the login form is never
  sent to a signed-in user's browser — no new session-detection mechanism is introduced.
- No accessibility work beyond the project's existing standard-semantic-HTML baseline is
  introduced by this change (per the source document's stated exclusion of formal a11y
  compliance).
