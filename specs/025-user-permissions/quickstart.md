# Quickstart: validating User Permissions (025)

## Automated

```text
npm test        # every suite, including the four updated below
npm run build   # tsc + fingerprinted assets
```

Expected: every suite passes, including `tests/polls-admin-crud.test.ts`, `tests/pages.test.ts`,
`tests/polls-vote.test.ts`, `tests/bookmarks.test.ts`, `tests/live-results.test.ts` and
`tests/openapi-contract.test.ts` (research R9).

## Manual (real browser, two accounts)

Prerequisite: `npm run dev` with the usual `ENV_*` settings; two signed-in accounts, neither in
`ENV_ADMINS` — call them Creator and Other. Grant Creator the default permissions (every account
gets them automatically, FR-002/FR-018) and confirm via a direct row check:

```sql
SELECT email, permissions FROM "user" WHERE email IN ('creator@example.com', 'other@example.com');
```

| # | Do | Expect |
|---|---|---|
| Q1 | Sign in as Creator, load the home page | The header's "Create Poll" link is live (not greyed out), and goes to `/admin`; the avatar menu lists Edit Profile, then Poll Administration (also to `/admin`), then Logout (C1, C2, FR-003) |
| Q2 | On `/admin`, click Create New Poll, publish it | No admin account was used anywhere in this step (FR-004, SC-001) |
| Q3 | As Creator, reload `/admin` | No tab bar, no search box, no other account's polls — just Creator's own list; on a wide window Create New Poll sits directly above the cards, its left edge lined up with theirs (C3, FR-005) |
| Q4 | As Other (also holding default permissions), create a poll; note its id | — |
| Q5 | As Creator, visit `/admin/poll/results?pid=<Other's poll id>` directly | Refused as if the poll doesn't exist — no title, no data (A3, FR-008, SC-002) |
| Q6 | By hand, remove `Create Poll` from Other's stored `permissions`, then have Other sign out and back in | Other's "Create Poll" header link disappears; `/admin` now shows the not-authorized card for Other (FR-003, edge case) |
| Q7 | By hand, remove `Vote on Polls` from Other's `permissions`, re-sign-in, open any poll Other could vote in | Other sees "You do not have permission to vote." and no working vote controls (A6, FR-010) |
| Q8 | Open the same poll as a guest (no sign-in at all) in a private window and try to vote | Exactly as before this feature: the guest is sent to sign in, and never sees Q7's "You do not have permission to vote." — guests cannot vote today, and the grant never applies to them (FR-011, SC-004) |
| Q9 | By hand, remove `View Polls` from Other's `permissions`, re-sign-in | A link to a private (invitation-only) poll is refused for Other the same way it already refuses any other ineligible visitor; no tab shows any poll card — Trending, Newest, My Private Polls, Favorites, Live Results and Search each read "You do not have permission to view polls." — and a search is refused; signed out in a private window, public polls show as usual (FR-012, FR-013, FR-014, C8) |
| Q10 | Still as Other (from Q9), try to bookmark a public poll or add it to Live Results; then remove an existing bookmark and an existing Live Results entry | Adding is refused with a clear message — not a silent no-op; removing both still works (A7, FR-019, SC-007) |
| Q11 | As an `ENV_ADMINS` account, repeat Q3 | Nothing changed: full tab bar, search, every poll from every creator — apart from Create New Poll's position, which is the same as in Q3 (A3/A4, FR-009, SC-005) |
| Q12 | As Creator, make an "Anyone you send the link to" poll and publish it; use Copy Link. Open the link signed in as Other (with View Polls restored), then in a private window as a guest and sign in as Other there | Signed in: My Private Polls opens with the poll's card in view, marked "shared with you", and the address bar shows `/`. Guest: sent to sign in; after signing in, the same tab opens at the poll. An invitation-only poll's link opened by someone not invited says "You are not invited to this poll." and stays on Trending (A8, C7, FR-020) |
| Q13 | Load the home page (Ctrl+F5), then `/admin` | The Refresh button beside the tabs and the Back arrow on `/admin` are the same size: a 40px soft-green circle with a 26px dark-green icon, with a clear gap between the Refresh circle and the line under the tabs; hovering, focusing with Tab and pressing each shows the usual Material 3 feedback, and Refresh turns grey while it is waiting (fix.md FIX08, FIX09) |
| Q14 | On `/admin`, open a poll's editor and change its title; click the CrowdPoll banner, then the header's Create Poll link and an avatar menu entry; finally reload the page | Each link opens the in-page Material 3 "Discard changes?" dialog (Keep editing / Discard), never the browser's "Leave site?"; Keep editing stays put with the edit intact, Discard goes to the link with no second prompt. With nothing edited each link navigates at once. Only the reload still shows the browser's own prompt, which a page cannot restyle (fix.md FIX10) |

Restore Other's three grants by hand afterward (`permissions = '{"View Polls","Vote on Polls","Create Poll"}'`)
if reusing the account for further testing.
