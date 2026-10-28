# Feature Specification: User Permissions

**Feature Branch**: `dev` (no dedicated branch created for this feature)

**Created**: 2026-10-04

**Status**: Draft

**Input**: User description: "designDocs/025-high-level-requirements-USER-PERMISSIONS.md"

**Source requirements**: `designDocs/025-high-level-requirements-USER-PERMISSIONS.md` (all inconsistencies,
ambiguities, unspecified aspects and clarifications resolved during architecture review).
**Architecture**: `architecture/025-user-permissions/architecture.md`. One inconsistency, one ambiguity,
three unspecified aspects and one clarification were raised and all resolved.

## Clarifications

### Session 2026-10-04

- Q: Does losing the poll-viewing ability block the bookmark/Live-Results-subscribe action itself,
  or only suppress the tab's display of items bookmarked/subscribed earlier? → A: Block the action
  itself, with a clear refusal — the same pattern already used for the voting-permission refusal.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A trusted user creates and manages their own polls (Priority: P1)

Today, only the handful of email addresses in the site's admin list can create a poll at all. A
signed-in user who has been granted poll-creation ability can now click "Create Poll" on the home
page, land on a scoped version of the authoring page, create a poll, and edit, open, close,
archive, duplicate, delete, or view the results of any poll they personally created — all without
an administrator's involvement. They never see, and cannot act on, polls created by anyone else.

**Why this priority**: This is the feature. Everything else in this spec exists to support or
guard this capability.

**Independent Test**: Grant a non-admin user the ability to create polls. Sign in as that user,
confirm the "Create Poll" entry point is visible, create a poll through to publication, then edit
and close it — all without using an admin account. Separately, confirm the same user cannot see or
act on a poll created by someone else.

**Acceptance Scenarios**:

1. **Given** a signed-in user who has been granted the ability to create and view polls, **When**
   they visit the home page, **Then** they see a "Create Poll" entry point that takes them to the
   authoring page.
2. **Given** a signed-in user without that grant, or a guest, **When** they visit the home page,
   **Then** no "Create Poll" entry point is shown.
3. **Given** a user with the creation grant on the authoring page, **When** they look at the page,
   **Then** they see only the polls they personally created — never the full moderation queue, and
   no search tool — and can create, edit, publish, open, close, archive, duplicate, delete, or view
   results/exports for any of them.
4. **Given** that same user, **When** they try to open, edit, or act on a poll they did not create
   (by guessing or constructing a link), **Then** the system responds as if that poll does not
   exist.
5. **Given** a poll that was rejected during content review, **When** its creator looks at it,
   **Then** they can edit and republish it (which is reviewed again), but cannot force a second
   review attempt without editing — that action stays reserved for administrators.
6. **Given** an administrator, **When** they use the authoring page, **Then** nothing changes:
   they still see every poll from every creator, the full moderation queue, and the search tool.

---

### User Story 2 - Voting can be restricted to users who are allowed to vote (Priority: P2)

A signed-in user can be denied the ability to vote. When such a user tries to vote in any poll,
they see a clear, on-screen reason they can't — the same way the product already explains other
reasons a vote isn't accepted (poll closed, already voted, not invited, etc.) — and their voting
controls are withdrawn. Anonymous (guest) visitors are never affected by this: voting already
requires signing in, and a guest who tries to vote is still asked to sign in, exactly as today.

**Why this priority**: It's a narrower, independent grant from poll creation, and is the simplest
of the three to verify in isolation.

**Independent Test**: Deny a signed-in test user the ability to vote, have them open a poll they'd
otherwise be eligible to vote in, and confirm they see an explanation and cannot submit a vote.
Separately, confirm a guest visitor who tries to vote is asked to sign in, as before, and never
sees the permission explanation.

**Acceptance Scenarios**:

1. **Given** a signed-in user who has been denied the ability to vote, **When** they open a poll
   they would otherwise be allowed to vote in, **Then** they see an explanation and no working vote
   controls.
2. **Given** that same user, **When** they attempt to submit a vote directly, **Then** the attempt
   is refused with a clear reason.
3. **Given** an anonymous visitor (not signed in), **When** they try to vote on a public poll,
   **Then** nothing changes from today's behavior — they are asked to sign in, and this restriction
   never applies to them.

---

### User Story 3 - Viewing private polls and personal activity can be restricted (Priority: P3)

A signed-in user can be denied the ability to view polls. Without that ability, opening a
private (link-only or invitation-only) poll's link is refused the same way an ineligible visitor
is refused today, and the user sees no poll cards at all — on any tab, public polls included —
only the message "You do not have permission to view polls." in their place. Guests are
unaffected: anyone who is signed out still sees public polls as before.

**Why this priority**: The least commonly exercised of the three grants, and the one with the
smallest visible surface — most users keep this ability by default.

**Independent Test**: Deny a signed-in test user the ability to view polls, then confirm a
private poll's link is refused for them and every tab shows the message instead of poll cards,
while a guest still sees public polls.

**Acceptance Scenarios**:

1. **Given** a signed-in user who has been denied the ability to view polls, **When** they open a
   link to a private (link-only or invitation-only) poll, **Then** they are refused exactly as any
   other ineligible visitor would be.
2. **Given** that same user, **When** they open any tab (Trending, Newest, My Private Polls,
   Favorites, Live Results or Search), **Then** no poll card is shown, only "You do not have
   permission to view polls.", regardless of what was there previously.
3. **Given** a guest (not signed in), **When** they open the home page, **Then** public polls are
   shown exactly as before — this ability never applies to them.
4. **Given** that same user, **When** they try to bookmark a poll or subscribe to its Live Results,
   **Then** the action is refused with a clear explanation — not a silent no-op — matching the
   pattern already used to refuse a blocked vote attempt.

---

### Edge Cases

- A guest who opens a shared poll link and then signs in on a different device or browser lands
  on the home page as usual; the poll opens only when sign-in completes in the browser that opened
  the link (FR-020).
- A poll with no recorded creator (older or seed data): only an administrator can manage it; a
  non-admin creator never sees it in their own-polls list.
- A change to a user's grants made directly in storage (ahead of a future management screen) takes
  effect the next time that user signs in, or within the existing session-caching window — not
  necessarily instantly.
- A user who loses the ability to create polls after already creating some keeps nothing extra:
  their existing polls remain exactly as they were, and an administrator can still manage them; the
  user who lost the grant can no longer reach the authoring page at all.
- When a creator duplicates one of their own polls, the new copy belongs to them, same as today's
  duplicate behavior for an administrator.
- A user who loses the poll-viewing ability keeps whatever they'd already bookmarked or subscribed
  to in Live Results — that data isn't deleted, only no longer shown — and cannot bookmark or
  subscribe to anything new until the ability is restored, when it all shows again.
- The Trending and Newest tabs are the same for everyone, so a signed-in user without the
  poll-viewing ability is kept from their cards by the page itself; signing out shows them, as for
  any guest (FR-014).
- A non-admin creator's own-polls list can grow past the display cap; when it does, the page says
  so plainly rather than silently truncating.
- An administrator's own email in the admin list always grants every ability, on every poll,
  regardless of whatever is stored for their account individually.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST allow a signed-in user's account to carry three independent,
  individually grantable abilities: viewing private polls and personal activity, voting, and
  creating/managing polls. A fourth ability, full administrative control, is never stored per
  account — it is granted automatically to every address on the site's existing admin list.
- **FR-002**: Every new account MUST start with all three grantable abilities already granted.
- **FR-003**: The system MUST provide a "Create Poll" entry point on the home page, visible only to
  an administrator or to a user holding both the poll-creation and poll-viewing abilities; hidden
  for guests and every other signed-in user. The same users also see a "Poll Administration" entry
  in their profile menu, directly under Edit Profile, leading to the same page.
- **FR-004**: A user holding the poll-creation ability (and poll-viewing ability) MUST be able to
  reach the authoring page and create a new poll without administrator involvement.
- **FR-005**: On the authoring page, a non-administrator creator MUST see only the polls they
  personally created, newest first, with no access to the full moderation queue or the search tool
  available to administrators.
- **FR-006**: A non-administrator creator MUST be able to take every authoring action (edit,
  publish, open, close, archive, duplicate, delete, view results and exports, manage invitation and
  banned-voter lists) on a poll they created, under the same conditions that already govern each
  action today (e.g., deletion is only offered when deletion is currently allowed for that poll).
- **FR-007**: Forcing a second content-review attempt on a rejected poll MUST remain available to
  administrators only; a non-administrator creator may still edit and republish a rejected poll,
  which triggers review again through the normal publish path.
- **FR-008**: The system MUST refuse a non-administrator's attempt to view or act on a poll they
  did not create as though that poll does not exist, revealing nothing about it.
- **FR-009**: An administrator's experience of the authoring page and every authoring action MUST
  remain exactly as it is today, including seeing every poll from every creator.
- **FR-010**: A user denied the voting ability MUST be refused when attempting to vote in any poll,
  with an on-screen explanation shown the same way other vote-blocking reasons are already
  explained, and with voting controls withdrawn.
- **FR-011**: The voting-ability restriction MUST apply only to signed-in users; anonymous (guest)
  voting on public polls MUST be entirely unaffected by this feature.
- **FR-012**: A user denied the poll-viewing ability MUST be refused when opening a private
  (link-only or invitation-only) poll's link, using the same refusal an ineligible visitor already
  receives today.
- **FR-013**: A signed-in user denied the poll-viewing ability MUST see no poll cards on any tab —
  Trending, Newest, My Private Polls, Favorites, Live Results and Search — and each tab MUST show
  "You do not have permission to view polls." instead. The listings that know who is asking MUST
  refuse too: My Private Polls, Favorites and Live Results answer as empty, and a search is refused.
  Nothing the user had bookmarked or added to Live Results is removed (FR-019 never blocks removal).
- **FR-014**: Public polls MUST remain fully visible to guests, exactly as today. The Trending and
  Newest listings are the same for everyone, so for a signed-in user denied the poll-viewing ability
  the page itself withholds their cards (FR-013).
- **FR-015**: The system MUST expose a user's current effective abilities (including full
  administrative control when applicable) somewhere the user interface can read them, so visibility
  decisions like the "Create Poll" entry point can be made consistently with what the server will
  actually allow.
- **FR-016**: This feature MUST NOT include any user-facing screen for granting or revoking these
  abilities; until such a screen exists, changing a user's abilities is an out-of-band
  administrative action.
- **FR-017**: This feature MUST NOT include any ability to ban a user from the site; that remains a
  separate, future capability.
- **FR-018**: Every existing account MUST receive the default set of grantable abilities
  automatically when this feature ships, with no manual data correction required.
- **FR-019**: A user denied the poll-viewing ability MUST be refused, with a clear explanation,
  when attempting to bookmark a poll or subscribe to its Live Results — the action itself is
  blocked, not merely hidden from the resulting tab, matching the refusal pattern already used for
  a blocked vote attempt (FR-010). Removing an existing bookmark or Live Results entry is never
  blocked.
- **FR-020**: Opening a poll's shared link MUST take a signed-in user to their "My Private Polls"
  tab with that poll's card scrolled into view. A link-only private poll the user had no relation to
  MUST be added to that tab when its link is first opened. A guest MUST be sent to sign in first,
  and the poll MUST open once they are signed in in the same browser. A user who may not see the
  poll (not invited to an invitation-only poll, or denied the poll-viewing ability) MUST be told
  why and stay on the home page, with nothing added. A public poll's link opens the home page
  unchanged.

### Key Entities

- **User account**: gains a small set of independently grantable abilities (view polls, vote,
  create/manage polls) that determine what the account can do beyond today's baseline; a separate,
  never-stored "administrator" status is derived from the site's existing admin list and overrides
  all three.
- **Poll**: already records who created it; that existing fact is what now determines whether a
  non-administrator may manage it. A poll with no recorded creator can be managed only by an
  administrator.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user granted the creation ability can go from "no polls" to "one published poll"
  entirely on their own, with zero administrator steps in between.
- **SC-002**: 100% of attempts by a non-administrator to view, edit, delete, or otherwise act on a
  poll they did not create are refused, with nothing about that poll disclosed in the refusal.
- **SC-003**: A user denied the voting ability sees, within the same page they'd normally vote on,
  a reason they can't — not a dead end or a silent failure.
- **SC-004**: Anonymous visitors experience zero change in their ability to vote on public polls,
  verified before and after this feature ships.
- **SC-005**: An administrator's own view of the authoring page and every action on it is
  unchanged, verified by exercising every existing admin action after this feature ships.
- **SC-006**: A non-administrator creator with more polls than the display cap sees a plain
  on-screen notice that older polls are not shown, rather than an incomplete list with no
  explanation.
- **SC-007**: A user denied the poll-viewing ability who tries to bookmark a poll or subscribe to
  its Live Results sees a clear refusal, not a silent no-op.

## Assumptions

- "Administrator" is never stored on a user's account; it is always derived, on every request,
  from the site's existing admin allow-list, exactly as it is today.
- A poll already records who created it; this feature changes how that fact is used, not how or
  when it is recorded.
- There is no limit introduced by this feature on how many polls one creator may make; existing
  content-review and rate/volume protections continue to apply unchanged.
- A future, separate feature will add a user-facing screen for administrators to grant or revoke
  these abilities, and will also decide what site-wide banning means; neither is in scope here.
- A future, separate feature will give non-administrator creators a dedicated authoring
  experience; this feature reuses today's authoring page/screen for them, scoped to their own
  polls.
- For a user who holds the poll-viewing ability, Live Results is not filtered by poll visibility;
  filtering it is left to a future feature. A user without the ability sees nothing there (FR-013).
- FR-013 and FR-014 were changed after implementation by fix.md FIX05 (2026-10-05): until then, a
  user denied the poll-viewing ability still saw public polls and their Favorites.
- The private-poll voter ceiling (`ENV_PRIVATE_VOTER_LIMIT_DEFAULT`) defaults to 100, lowered from
  500 by fix.md FIX07 (2026-10-05), including in the deployment's own setting. It is both the limit a
  blank field means and the largest value that may be entered. Existing private polls keep their
  votes; a blank-limit poll refuses new voters past 100, a stored limit above 100 keeps working until
  the poll is next saved, when it must be 100 or less, and a Participants or Banned Voter List
  longer than 100 shows as too large to display. The separate cap of 500 invited addresses is
  unchanged.
- A poll's creator sees who voted on their poll's results page, as an administrator does, even
  when the poll's Anonymous Votes setting is "Yes". Accepted by the developer on 2026-10-04 as a
  known limitation; enforcing Anonymous Votes for creators is left to a future feature.
