# Overview: `specs/024-MATERIAL3-MERGE`

## Document History

| Record | Value |
|---|---|
| Feature directory | `specs/024-MATERIAL3-MERGE` |
| Fix file created | 2026-10-03 17:48 |
| Last updated | 2026-10-03 17:59 |

Legend: `[ ]` open · `[X]` resolved · `[-]` resolved manually (or accepted as-is) by the developer.
Tick `No Tests` to postpone this fix's automated tests; leave it empty to have them written and run as usual.

"What's next" always returns the first `[ ]` item below.

The developer is expected to create the individual fix requirements in this file, and then run the `/speckit-fix` command to have the AI implement them, one at a time.  
Each fix requirement initially carries an empty checkbox; tick it when the item is resolved or consciously accepted.  


# Fixes

## FIX01 <short title here>
[-] Resolved
[ ] No Tests
When testing this branch after merging the Material 3 changes, we found a state when a regular user can't Create a Poll, or even see the Poll Administration page.  
Here's the Reproduction Steps:

1. Create a new user and confirm the email.
2. Login as the newly created user.
3. Click the Avatar
4. Select Poll Administration from the Avatar menu.
5. The page is accessible.
6. Click the Avatar again.
7. Select Edit Profile.
8. Observe that the "Create Poll" option is available.
9. Change the email to a new valid email address.
10. Save the profile changes.
11. Click the confirm link in the email sent to the new address.
12. Close the Profile Editor.
13. Click the Avatar again.

Expected Result:
Poll Adminitration is in the avatar menu.  

Actual Result:
Poll Administration is not in the avatar menu after changing the email address.

See the screenshot for the actual result:

![Poll Administration Missing](dontTrack/userCantCreatePoll.jpg)

### RESOLUTION
Resolution: accepted as-is by the developer (2026-10-03 17:59) — Option A. Working as designed: Poll
Administration is gated by the account's current email being in `ENV_ADMINS` (`isAdminEmail`,
`src/polls/service.ts:742` → `isAdmin` on `GET /api/me`, `src/routes/api.ts:302` → the menu item,
`src/public/app.js:327`), so changing the email to one not on the list removes it. The header's
`Create Poll` link is inert in every state. Poll creation by non-administrators is out of scope for 024
(`spec.md`, Out of scope) and belongs to `designDocs/999-high-level-requirements-POLL_CREATION_ENHANCEMENT.md`.
No code, test or artifact changes.
