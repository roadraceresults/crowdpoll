Start a new spec for these requirements called `025-USER-PERMISSIONS`.

# Overview
The purpose of this requirements doc is to describe enhancements to the Poll Creation functionality.  
Currently, the `/admin` route is only accessible to users whose email appears in the `ENV_ADMINS` environment variable.  

This requirement is about granting users various permissions.  
Specifically, it is to allow users to create polls, and to allow the creator of a poll to view and edit their own polls, even if they are not an admin.  
There will also be permissions for viewing polls and voting on polls. Banning a user from the site is a future requirement (see Exclusions).  

## New User Table Fields

### Permissions
Each user record has "permissions".  
The "permissions" can be: 
- `View Polls`
- `Vote on Polls`
- `Create Poll`

A fourth permission, `Administrator`, exists but is **derived, not stored**: it comes from the `ENV_ADMINS` environment variable (see New User Permissions) and never appears in a user's stored "permissions".

What each permission allows:

| Permission | Allows |
|---|---|
| `View Polls` | Opening **private** polls (by link or by invitation) and seeing the **My Private Polls** tab's polls — the one personal tab that lists only private polls. Favorites lists only public polls and is unaffected; Trending and Newest stay global and are unaffected. Without it, a signed-in user's My Private Polls tab is empty, and opening a private poll's link gets the same refusal the poll already gives any other visitor who isn't eligible for its visibility/sharing mode (e.g. a non-invited user hitting an invitation-only poll) — missing `View Polls` is simply one more reason inside that existing check, not a new response shape. Public polls stay viewable by everyone, guests included, as today. |
| `Vote on Polls` | Voting in any poll the user is otherwise eligible to vote in. |
| `Create Poll` | Creating polls, opening `/admin`, and acting on their own polls (see Creator actions on their own polls). Exercised together with `View Polls`: both are required to reach `/admin` or create a poll (see CREATING Polls by non-Admin users, Missing permissions). |
| `Administrator` | Everything, on every poll (derived from `ENV_ADMINS`). |

### Storage
- The `user` table gains a column `permissions`: a PostgreSQL `text[]`, `not null`, defaulting to [`View Polls`,`Vote on Polls`,`Create Poll`].
- A `CHECK` constraint — `permissions <@ ARRAY['View Polls','Vote on Polls','Create Poll']::text[]` (array containment, not equality) — limits every stored element to those three values while allowing any subset, any order, and the empty array, so `Administrator` (or a misspelt value) can never be stored.
- Not declared to BetterAuth: its Kysely adapter cannot store arrays. The column is read with the session and cached with it, so each request's check needs no extra query on a cache hit.
- Alternatives rejected: a `user_permissions` join table (an extra query on every session lookup for three values), a single role column (cannot say "may vote but not create"), and a bitmask (opaque to the testers who edit the value by hand).

## New User Permissions
Every new user is assigned the default "permissions" when their account row is created (through the column default), in both the native and the OAuth sign-in phases. A `pending` (unverified) user cannot sign in, so the grants are usable only once the account is verified:  
- `View Polls`  
- `Vote on Polls`
- `Create Poll`

On every request, a user whose email is in the `ENV_ADMINS` environment variable has the `Administrator` permission, which includes every other permission, so they can perform all actions.  
`Administrator` is never stored in the user's "permissions"; it is derived from `ENV_ADMINS`.  
This includes the permission to edit, delete or change the state of polls that any user has created.  
The full-featured Search on the Admin page is only available to users with the `Administrator` permission.  
The ability to set the permissions for any user is restricted to users with the `Administrator` permission.  

## CREATING Polls by non-Admin users 

A user who has both the `Create Poll` and `View Polls` permissions, and not the `Administrator` permission,  
can create a poll by clicking the "Create Poll" button on the home page.  
This takes them to the /admin page, which is now accessible to non-admin users.  
Except, in their case, the "Newest    Awaiting Approval   Rejected    Search" tabs will not be visible.  
Instead, non-admin users will only see the list of polls they have created.  
For a non-admin, `GET /api/admin/polls` returns only the polls whose `created_by_id` is the user's `id` (see /admin Page Layout).  

### Create Poll link

The home page header's "Create Poll" link (inert today) becomes a live link to `/admin`:
- It is shown to users with `Administrator`, or with both `Create Poll` and `View Polls`, and hidden for guests and for every other signed-in user.
- It only opens `/admin`; it does not create a poll. The user creates one with the page's existing **Create New Poll** button.
- The same link is how a creator returns to manage the polls they already made.

### Creator actions on their own polls

On a poll they created, a user with `Create Poll` may take every action the admin card offers, except Re-attempt Screening:

| Action on the admin card | Route | Creator on own poll |
|---|---|---|
| Edit (edit face or wizard, Save and Publish) | edit-session, heartbeat, `publish`, `PATCH` | Yes |
| Invitation list and banned voter list | inside the edit face | Yes |
| Open / Close / Archive | `PATCH` (state) | Yes |
| Delete | `DELETE` | Yes |
| Duplicate | `POST …/duplicate` | Yes; the copy's creator is the user who duplicated it |
| Copy Link | none (browser only) | Yes |
| View Results, export JSON / Markdown | `…/results`, `/admin/poll/results`, `…/export.*` | Yes |
| Re-attempt Screening (REJECTED polls) | `POST …/rescreen` | No: admin-only |

- The existing state rules still apply unchanged (for example, Delete is offered only when `canDelete` is true, and Open only when `canOpen` is true).
- Re-attempt Screening stays admin-only: a rejection is a decision about the content, and a creator fixes a rejected poll by editing and publishing again, which screens it anyway.
- Admin-only: any user's poll, the Newest, Awaiting Approval and Rejected tabs, the admin Search, Re-attempt Screening, and the Created by panel.

### Missing permissions
- **No `Vote on Polls`:** `POST /api/polls/:pid/vote` answers `403` with `{ "error": "You do not have permission to vote.", "code": "no-vote-permission" }`. The poll card shows that sentence where it shows other vote-block reasons today, and its vote controls are withdrawn, exactly as for those reasons. This check applies only when the caller is signed in: `permissions` and its default live only on the `user` table, so a guest (no session, no user row) is governed by today's existing guest-voting eligibility rules, unchanged — this check is never the reason a guest is blocked.
- **No `Create Poll`, or no `View Polls`** (and not an admin): the Create Poll link is hidden, and `/admin` shows the existing not-authorized card at `403`; poll management needs `Administrator`, or both `Create Poll` and `View Polls`. This holds for a user who created polls earlier too; their polls stay intact, and admins can still manage them.
- **No `View Polls`:** see the Permissions table. In addition, adding a bookmark (`POST /api/polls/:pid/bookmark`) or a Live Results entry (`POST /api/live/:pid`) answers `403` with `{ "error": "You do not have permission to view polls.", "code": "no-view-permission" }`. Removing a bookmark or a Live Results entry (`DELETE` on the same routes) is never blocked. Live Results is not filtered by poll visibility: a private poll already there before the user lost `View Polls` stays until they remove it; filtering it is left to a future requirement.

### Access enforcement on the server
Hiding tabs is presentation only; the server enforces every rule.
- Every per-poll route (`/api/admin/polls/:pid/...`: edit-session, heartbeat, publish, `PATCH`, `DELETE`, results, exports, duplicate) and the `/admin/poll/results` page pass one check: an admin may act on any poll; a user with `Create Poll` only on a poll whose `created_by_id` is their `id`. Any other poll answers `404`, so its existence is not revealed.
- `POST /api/admin/polls` needs `Create Poll` and `View Polls` (or `Administrator`), matching the `/admin` page gate so one rule governs reaching `/admin` and creating a poll.
- `GET /api/admin/polls/search` and `POST /api/admin/polls/:pid/rescreen` stay admin-only.
- Route names keep their `/api/admin/` prefix although creators now use them.

### The browser's view of permissions
`GET /api/me` adds `permissions`: the user's **effective** set (including `Administrator` for an admin), beside the existing `isAdmin`. It is a rendering hint only, and is documented in `postman/openapi.json`.

# /admin Page Layout

## For admins
Unchanged. The Newest, Awaiting Approval, Rejected and Search views stay as they are, and Newest lists every poll, including the admin's own.

## For non-admin creators
- **Toolbar:** the Back arrow and **Create New Poll**, as today.
- **No tab bar and no search form:** `#adminTabBar` and `#adminSearchForm` are not rendered at all (not merely hidden). The admin search route refuses non-admins in any case.
- **One list, the polls they created:**
  - newest first by `created_at`;
  - every state, including INITIALIZED, REJECTED, CLOSED and ARCHIVED;
  - at most `ENV_MAX_POLLS_ADMIN_SEARCH_RESULTS` polls;
  - refreshed every `ENV_POLL_ADMIN_PAGE_REFRESH_INTERVAL`, as the admin's Newest view is.
- **Messages:**
  - empty list: "You haven't created any polls yet."
  - at the cap: "Only your newest N polls are shown." (no "Use Search" hint)

# Assumptions

- **No new environment variable.** `ENV_ADMINS` keeps its format and meaning; it now also grants the `Administrator` permission.
- **A user's `uid`** is `user.id`. A poll's `creator_id` is `polls.created_by_id`, which is already written whenever a poll is created.
- **Polls with no creator** (`created_by_id` is empty: seeded or old data) belong to no one; only admins can manage them.
- **No limit on the number of polls a creator may make** in this feature. Public polls still pass Acceptability Screening before they appear, and the existing request floors and budgets still apply.
- **Admins are unaffected.** For a user in `ENV_ADMINS`, every existing `/admin` behaviour and route stays as it is today.


# Exclusions

## ADMIN Page to Create User Permissions
The stored value of the "permissions" field in the user record for new users, and for admins, is:
[`View Polls`,`Vote on Polls`,`Create Poll`]
An admin's `Administrator` permission is not stored: `ENV_ADMINS` adds it, on every request.

These requirements do not include a page for admins to create or edit user permissions.  
That feature will be added in a future requirement.

To test permission combinations, a test admin can manually edit the "permissions" column in the `user` table to any subset of the three grants.  
A hand edit takes effect within `ENV_SESSION_CACHE_TTL`, or at once after the user signs in again, because permissions travel with the cached session. The future permissions page will call the existing `forgetUserSessions(userId)` after a change so it takes effect at once. A change to `ENV_ADMINS` needs a restart, as today.

## Anonymous Votes for creators
A poll's creator can view their poll's results page, which shows who voted and what they chose, exactly as an administrator sees it — including when the poll's Anonymous Votes setting is "Yes". This is accepted as a known limitation of 025 (decided 2026-10-04). Enforcing Anonymous Votes for creators is a future requirement.

## Banned From Site
Banning a user from the whole site is a future requirement. It needs decisions not made here: whether sign-in is refused, what happens to the user's polls and votes, and whether the email may make a new account.

## The new-poll card prototype
The new-poll card designed in `prototypes/POLL-CARD-MATERIAL3/NON-ADMIN-POLL-EDITING/` (the wizard, the read-only face with its tappable summary, and the admin-only Created by panel; `accepted-recommendations.md` A23–A32) is **not** ported by 025. Creators use today's admin card, scoped to their own polls. The port is a separate, following feature.

## No Data Migration Necessary
The SUD is still in development, and the database model is still evolving.
For all the requirements in this document, if the underlying database model needs to be changed, there is no need to migrate data from the old model to the new model.

For 025 specifically:
- One schema change: the `user` table gains a `permissions` column whose default is [`View Polls`,`Vote on Polls`,`Create Poll`]. Existing users receive that default when the column is added, so no data step is needed.
- No poll, vote or vote-history row is changed or deleted. 025 renames no stored constants.
- The `session`, `verification` and `email_change_requests` tables are not touched.

# Breaking Changes
- **`/admin` and `/api/admin/*` no longer refuse every non-admin.** A user with both `Create Poll` and `View Polls` gets `/admin`, `POST /api/admin/polls` and their own polls. The tests that expect every non-admin to be refused (`tests/polls-admin-crud.test.ts`, `tests/pages.test.ts`) are rewritten for four cases: a guest (401/403), a user without `Create Poll` (403), a user with `Create Poll` but not `View Polls` (403), and a creator on another user's poll (404). New tests cover the creator's own list and actions.
- **The API contract changes.** The vote route can answer `403 no-vote-permission`, `POST /api/polls/:pid/bookmark` and `POST /api/live/:pid` can answer `403 no-view-permission`, and `GET /api/me` adds `permissions`; `postman/openapi.json` and `tests/openapi-contract.test.ts` follow.
- **The `user` table changes shape.** A new migration adds the `permissions` column with its default; existing rows receive the default grants and no data is lost.
