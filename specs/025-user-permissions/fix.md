# Overview: `specs/025-user-permissions`

## Document History

| Record | Value |
|---|---|
| Feature directory | `specs/025-user-permissions` |
| Fix file created | 2026-10-05 11:18 |
| Last updated | 2026-10-05 13:53 |

Legend: `[ ]` open · `[X]` resolved · `[-]` resolved manually (or accepted as-is) by the developer.
Tick `No Tests` to postpone this fix's automated tests; leave it empty to have them written and run as usual.

"What's next" always returns the first `[ ]` item below.

The developer is expected to create the individual fix requirements in this file, and then run the `/speckit-fix` command to have the AI implement them, one at a time.  
Each fix requirement initially carries an empty checkbox; tick it when the item is resolved or consciously accepted.  


# Fixes

## FIX01 Poll Administration Link
[X] Resolved
[ ] No Tests
For a non-Admin Poll Creator, the Avatar menu should have a "Poll Adminitration" link as the 2nd item under Edit Profile.

### RESOLUTION
- `src/public/app.js` (`renderSiteHeader`): the avatar menu's "Poll Administration" entry is now shown under `canCreatePolls(me)` — administrators, and users holding both Create Poll and View Polls — instead of `me.isAdmin`. It keeps its place, second under Edit Profile and before Logout, and the existing spelling "Poll Administration". Users without both grants still get no entry (absent, not disabled); `/admin` still enforces access on the server. The comment above it was corrected to match.
- Tests: `tests/pages.test.ts` — the source check now looks for `if (canCreatePolls(me))`; `tests/client-home.test.ts` — new case: a creator's menu reads Edit Profile, Poll Administration (`/admin`), Logout; a user lacking Create Poll gets Edit Profile, Logout only. Affected suites 89/89; full suite 52 files passed, 1 skipped / 800 tests passed, 15 skipped.
- Artifacts: `contracts/ui-contracts.md` C2 (now administrators and creators); `research.md` R7 (revision note); `plan.md` (design note and `app.js` line in Project Structure); `spec.md` FR-003 (the profile-menu entry); `tasks.md` T042 added, count 42; `quickstart.md` Q1 (checks the menu too); `README.md` (For poll creators).
- This changes what the requirements doc says (it named the header link as the creator's only way back to `/admin`); `designDocs/025-high-level-requirements-USER-PERMISSIONS.md` was not edited.

2026-10-05 11:55

## FIX02 What does it mean? Wording on the "Who" button
[X] Resolved
[ ] No Tests

Change the wording for "What does it mean?" on the "Who" button of a poll card to:
```
Anyone you send the link to
Your poll is private: it is listed only in the "Shared With You" tab for the people you share it with, and is not listed in Trending, Newest or Search. Anyone who has the link can open it and vote.
Only people you invite
Your poll is private: it is listed only in the "Shared With You" tab for the people you share it with, and is not listed in Trending, Newest or Search. Only the people whose email addresses you invite can vote. You add them after the poll is created.
Everyone on CrowdPoll
Your poll is public: anyone on CrowdPoll can find it and vote. Public polls appear after they are reviewed and approved.
```

### RESOLUTION
- Option A (the developer's wording, verbatim). `src/public/adminCard.js` `WHO_OPTIONS`: the three `help` strings shown under "What does this mean?" on the wizard's Who step now read exactly as above — "Shared With You" in quotation marks, "whose email addresses you invite", and "Public polls appear after they are reviewed and approved." The option labels, the short support lines under each radio button and the "Users can see who voted" entry are unchanged.
- Note: the app has no "Shared With You" tab yet — these polls are listed in "My Private Polls". The name is the one planned in `designDocs/9998-high-level-requirements-accepted-recommendations.md` (A3); the help text already used it before this fix.
- Tests: `tests/client-admin-wizard.test.ts` — new case asserting the summary label and the three explanation pairs; suite 26/26. Full suite 52 files passed, 1 skipped / 801 tests passed, 15 skipped.
- Artifacts: `tasks.md` T043 added (Polish), count 43. No spec, plan or contract specifies this text.

2026-10-05 12:19

## FIX03 Editing Poll Card Radio Buttons
[X] Resolved
[X] No Tests

All radio buttons on the Editing Poll Card do not show a current selection.  
See the screenshot below:  
![Editing Poll Card Radio Buttons](dontTrack/radioButtonsBug.jpg)

### RESOLUTION
- Cause: four doubled selectors in `src/public/admin-card-m3.css` (lines 363, 372–374), carried over from the prototype. `.m3-radio::before::before` and `.m3-radio:checked::before:checked::before` are invalid CSS, so the browser dropped both rules — the radio's inner dot was never drawn and never scaled in when chosen; only the (valid but doubled) `:checked:checked` border colour applied, which is the green ring without a dot in the screenshot.
- Fix: the four selectors now read `.m3-radio::before`, `.m3-radio:checked`, `.m3-radio:checked::before` and `.m3-radio:focus-visible`. The chosen button in every radio group on the card (Who, How, When) shows the 10px primary-colour dot inside its ring. No other rule changed. The prototype (`prototypes/POLL-CARD-MATERIAL3/ADMIN-CARDS/admin-card-m3.css`) still carries the mistake and was left alone.
- Tests: postponed by the developer (No Tests). Written, not run: `tests/m3-assets.test.ts` — "draws the chosen radio button's dot: no doubled pseudo-selector drops the rule". The fix is therefore unverified by a test run and by a browser check.
- Artifacts: `tasks.md` T044 added (Polish), count 44. No spec, plan or contract describes the radio styling.

2026-10-05 12:28


## FIX04 Shared Link Not Working
[X] Resolved
[ ] No Tests

The link copied from the "Copy Link" button on the Edit Poll Card "Who" tab  
does not work.

This is also the case for the "copy Link" icon on the non-edit face of the Admin Poll Card.

Navigating to the link should navigate to the "My Private Polls" tab on the home page. 
Note: the "My Private Polls" tab will change its name to "Shared With You" in the future to match the wording in the help text.

For exmaple:
http://localhost:9999/?PID=e795118c-7dca-41fe-b23c-b1f48f464659

### CLARIFICATIONS
Why it fails today: `src/routes/pages.ts:65` redirects every `/?PID=…` to `/` and drops the id (017 retired the standalone poll view; `tests/pages.test.ts` asserts the redirect). Opening the My Private Polls tab alone would not be enough: that tab lists a link-only poll only after the user created, voted in or bookmarked it, so a first-time recipient would still see nothing.

Answer each with a letter, or in your own words. A recommendation is marked.

- **Q1. First-time recipient.** When someone opens the link to a link-only private poll they have never touched, should the poll be **added** to their My Private Polls (a new stored relation, "linked" — the behaviour planned for "Shared With You" in `designDocs/9998-high-level-requirements-accepted-recommendations.md` A15)?
  (A) Yes, add it, then open the tab — *recommended; otherwise the link still looks broken to every new recipient.*
  (B) No; open the tab only, and the poll appears once they vote in or bookmark it.
- **Q2. Guest.** The personal tabs need a signed-in user.
  (A) Send the guest to sign in, then return to the link, which then adds the poll and opens the tab — *recommended.*
  (B) Open the home page as a guest and show "Sign in to see this poll."
- **Q3. Which polls.** Copy Link is offered for every poll on the admin card.
  - Invitation-only poll, opened by someone not invited: refuse with the existing "You are not invited to this poll." notice and stay on the home page — *recommended*; an invitee already sees it in the tab.
  - Public poll: (A) out of scope for FIX04 — the link opens the home page as today — *recommended, to keep this fix small*; (B) bookmark it and open Favorites; (C) your own rule.
- **Q4. Without the View Polls grant** (025 FR-012): refuse with "You do not have permission to view polls." and add nothing — *recommended.*
- **Q5. Landing.** On arrival in the tab:
  (A) open that poll's card maximized — *recommended; it puts the shared poll front and centre.*
  (B) scroll its card into view only.
  (C) just open the tab.

**Developer's answers (2026-10-05):** Q1 A (add the poll as "linked", then open the tab) · Q2 A (guest signs in, then returns to the link) · Q3 A (non-invited: "You are not invited to this poll."; public links out of scope) · Q4 yes (refuse without View Polls, add nothing) · Q5 B (scroll the card into view).

### RESOLUTION
- `src/routes/pages.ts`: `GET /?PID=<id>` now serves the home page instead of redirecting to `/` (017's retired-view redirect is gone).
- `src/routes/tabsApi.ts`: new `POST /api/me/polls/:pid/link`, signed in, limited as a page load rather than by the manual refresh floor. Without View Polls → `403 no-view-permission`, nothing stored (Q4). Unknown poll, or one not yet shown to voters (`isPubliclyListable`) → `404`. Public poll → `{ tab: null }`, nothing stored (Q3). Invitation-only poll, caller neither invited nor creator → `403 "You are not invited to this poll."` (Q3, via `checkViewEligibility`). Otherwise `{ tab: "private" }`, and for a link-only poll the caller did not create a `linked` relation is stored (Q1).
- `src/db/schema.ts`, `src/polls/store.ts`: `UserPollRelation` gains `"linked"` (the column is plain text — no migration). `src/polls/userPolls.ts`: `privateTab()` lists `linked` polls.
- `src/public/tabs.js` (`init`, before the `?q=` arrival): takes `PID` from the address and removes it. A guest's id is kept in `localStorage` (`crowdpoll:sharedPid`) and the page goes to `/login`; the next signed-in home-page load in that browser picks it up (Q2). A signed-in visitor's id goes to the new route; on `tab: "private"` My Private Polls opens and the card is scrolled into view (Q5); a refusal shows as the tab notice and Trending opens. `src/public/pollCard.js`: the card says "shared with you" for a `linked` poll.
- Limitation: a guest who opens the link and signs in on another device or browser lands on the home page as usual (recorded as an edge case in `spec.md`).
- Tests: `tests/polls-discovery.test.ts` — new block "Opening a shared poll link", 6 cases; `tests/client-home.test.ts` — new block "a shared poll link in a browser", 3 cases (signed-in arrival, guest then signed-in arrival, refusal); `tests/pages.test.ts` — the retired-redirect test now expects the home page. Full suite 52 files passed, 1 skipped / 811 tests passed, 15 skipped (this run also ran FIX03's postponed radio-dot check, which passed).
- Artifacts: `spec.md` (new FR-020; new edge case); `data-model.md` (`user_polls`: the `linked` relation); `contracts/admin-api.md` (A8); `contracts/ui-contracts.md` (C7); `plan.md` (Project Structure); `tasks.md` (T045–T047, count 47); `quickstart.md` (Q12); `postman/openapi.json` (the new route); `README.md`; `ARCHITECTURE.md`.
- This brings forward the shared-link behaviour planned for "Shared With You" in `designDocs/9998-high-level-requirements-accepted-recommendations.md` A15, and changes what `designDocs/025-high-level-requirements-USER-PERMISSIONS.md` covers; neither was edited.

2026-10-05 12:46

## FIX05 View Polls Permission Removed
[X] Resolved
[X] No Tests

This is a change to the requirements.  
A user who has "View Polls" permission removed should not be able to see any Poll Cards at all.  
Even though they can log out and see Polls on the home page,  
by not showing them any Poll Cards, the app enforces the "View Polls" permission correctly, and sends a message to the user that they are "persona non grata" for viewing polls.  

### RESOLUTION
- Option B (the page, plus the server wherever it knows the user). Requirement change: a signed-in user without View Polls (and not an administrator) now sees no poll cards at all.
- `src/public/tabs.js`: `viewerBarred()` reads `/api/me`'s `permissions`; when barred, `createGrid`'s render mounts no cards and removes any it holds (a maximized card included), and `emptyState` shows "You do not have permission to view polls." on every tab — Trending, Newest, My Private Polls, Favorites, Live Results and Search all render through these two functions. Guests have no `permissions`, so nothing changes for them.
- `src/routes/tabsApi.ts`: Favorites refresh and Live Results refresh answer as empty for such a user (My Private Polls already did); Search (`/api/search`, `/api/search/refresh`) answers `403 no-view-permission`; guest search is unchanged. Nothing the user bookmarked or watched is deleted. Trending and Newest are shared objects, the same for everyone, so the page is the only place they can be withheld — signing out shows public polls, as the requirement accepts.
- Tests: postponed by the developer (No Tests). Written, not run: `tests/client-home.test.ts` — "shows a user without View Polls no poll cards at all, only the reason"; `tests/search-home.test.ts` — "refuses a signed-in searcher without the View Polls grant, and still answers a guest"; `tests/live-results.test.ts` — "refreshes nothing for a watcher who has lost the View Polls grant"; `tests/polls-discovery.test.ts` — the Favorites case now expects an empty tab (renamed "empties both My Private Polls and Favorites without the View Polls grant"). Only the type-check and a syntax check of `tabs.js` were run. The fix is therefore unverified by a test run and by a browser check.
- Artifacts: `spec.md` (User Story 3 text, Independent Test, Acceptance Scenarios 2–3, the bookmarks edge case and a new Trending/Newest edge case, FR-013, FR-014, the Live Results assumption, and a note dating the change); `plan.md` (Summary, design note, Project Structure, test list, Scale/Scope, documentation ranges); `contracts/admin-api.md` (A9); `contracts/ui-contracts.md` (C8); `tasks.md` (T048, T028 marked as reversed, count 48); `quickstart.md` (Q9); `postman/openapi.json` (the search routes' 403); `README.md`; `ARCHITECTURE.md`.
- This reverses FR-014 as first written; `designDocs/025-high-level-requirements-USER-PERMISSIONS.md` still says "Public polls stay viewable by everyone" and was not edited.

2026-10-05 12:55


## FIX06 Create Poll Button Relocation
[X] Resolved
[X] No Tests

Please move the "Create New Poll" button on the Poll Admin page to the location shown in the screenshot below.

![Create New Poll Button](dontTrack/create-new-poll-button.jpg)

### RESOLUTION
- `src/public/admin.css`: from 560px wide, `.admin-toolbar` is a three-column grid (`minmax(0,1fr) minmax(0,420px) minmax(0,1fr)`) whose middle column matches the cards' centred 420px column. Back stays at the left edge and Create New Poll sits in the middle column, its left edge lined up with the cards', as in the screenshot. Narrower windows, where the cards already fill the width, keep today's row (Back and the button side by side). CSS only — no markup or script change. It applies to administrators as well as creators; the admin tab bar and search form below the toolbar do not move.
- Tests: postponed by the developer (No Tests); none written, since a jsdom test cannot check layout. The placement is checked in the browser by `quickstart.md` Q3 and Q11. The fix is therefore unverified by a test run and by a browser check.
- Artifacts: `contracts/ui-contracts.md` C3 (Toolbar row); `quickstart.md` Q3 and Q11; `tasks.md` T049 (Polish), count 49.

2026-10-05 12:57

## FIX07 Lower Private Voter Limit
[X] Resolved
[X] No Tests

Please change the default for the environment variable `ENV_PRIVATE_VOTER_LIMIT_DEFAULT` from 500 to 100.

### RESOLUTION
- Option A (the code default and the deployed value). `src/config.ts`: the default is now 100. `src/polls/service.ts`: `PRIVATE_VOTER_LIMIT_FALLBACK` (used only where no config is passed) is 100. `src/public/adminCard.js`: the browser's placeholder before `/api/config` answers is 100. `.do/app.yaml`: the deployment sets `ENV_PRIVATE_VOTER_LIMIT_DEFAULT` to `"100"` (was `"500"`) — it takes effect on the next autodeploy from `dev`. The comments that stated 500 as the default (`service.ts`, `store.ts`) now say the configured default. The env tables in `README.md` and `CLAUDE.md` show `100`.
- Effect on existing private polls: no vote is removed; a blank-limit poll refuses new voters past 100; a stored limit above 100 keeps working until the poll is next saved, when it must be 100 or less; a Participants or Banned Voter List longer than 100 shows as too large to display. The separate cap of 500 invited addresses (`MAX_INVITED`) is unchanged.
- Tests: postponed by the developer (No Tests). Written, not run: `tests/config.test.ts` — "defaults to 100"; `tests/polls-admin-crud.test.ts` — a cleared private limit binds at 100, and the two out-of-range cases now test 101 at the new boundary. Only the type-check and a syntax check of `adminCard.js` were run. The fix is therefore unverified by a test run.
- Artifacts: `spec.md` (a new Assumption recording the lower default and its effects); `tasks.md` T050 (Polish), count 50. The local templates (`launch.json.example`, `devScripts.example/launch-dev.ps1`) set `10` for testing and were left alone; 012's documents record that feature's history and were left alone.

2026-10-05 13:06

## FIX08 Icon Sizes
[X] Resolved
[X] No Tests

Please make the "refresh" icon on the home page slightly larger.  
And suggest a more prominent rendering for it that still adheres to Marerial 3 guidelines, if there is one.  

And then do the same for the "Back" icon on the Poll Admin page.  Make the size match the "refresh" icon on the home page. 

### RESOLUTION
- Option B, a Material 3 filled tonal icon button (M3's medium-emphasis icon button), for both icons, at 48px (M3's minimum touch target) with a 28px icon — up from a 40px button with a 24px icon for Refresh, and a 32px square with a 20px icon for Back.
- `src/public/header-tab-bar-m3.css` (Refresh): `--md-sys-color-secondary-container` background and `--md-sys-color-on-secondary-container` icon; the existing hover, focus and press state layers and focus outline are unchanged; while waiting (disabled) it follows M3 — a 12% on-surface container with a 38% icon. The tab bar's 48px row height is unchanged.
- `src/public/admin.css` (`/admin`'s Back link): the same size, shape and colours, with M3 hover, focus and press state layers and the same 3px focus outline the header uses; its discard-confirmation behaviour is untouched.
- Tests: postponed by the developer (No Tests); none written, since jsdom cannot check size or colour. Checked in the browser by `quickstart.md` Q13. The fix is therefore unverified by a test run and by a browser check.
- Artifacts: `quickstart.md` Q13; `tasks.md` T051 (Polish), count 51; `plan.md` (documentation range Q1–Q13).

2026-10-05 13:14

## FIX09 Refresh Icon Padding
[X] Resolved
[X] No Tests

There needs to be some padding below the "refresh" icon on the home page.  
It is touching the line below it.

### RESOLUTION
- Cause: FIX08 made Refresh a 48px circle, vertically centred in the 48px tab row whose divider line sits at the row's bottom edge (`.tab-bar-wrap::after`, `bottom:0`), so the circle filled the row and touched the line.
- Option B: both icons now use Material 3's own icon-button size — a 40px circle (M3's container, inside the 48px row that serves as its touch area) with a 26px icon, still larger than the original 24px. That leaves 4px between the Refresh circle and the line, keeps it centred on the tab labels, and leaves the row's height, and the cards below it, where they were. FIX08's filled tonal styling (soft-green circle, dark-green icon, M3 state layers) is unchanged. `/admin`'s Back link was resized the same way so the two still match, as FIX08 asked. This adjusts FIX08's sizes; FIX08's own record is left as written.
- Files: `src/public/header-tab-bar-m3.css` (Refresh), `src/public/admin.css` (Back).
- Tests: postponed by the developer (No Tests); none written, since jsdom cannot check layout. Checked in the browser by `quickstart.md` Q13 (now quoting 40px/26px and the gap). The fix is therefore unverified by a test run and by a browser check.
- Artifacts: `quickstart.md` Q13; `tasks.md` T052 (Polish), count 52.

2026-10-05 13:30

## FIX10 Leave Site Dialog
[X] Resolved
[X] No Tests

Repro:
1. Edit a poll
2. Make any change
3. Click the CrowdPoll banner to navigate to the home page.

Result:
A "Leave Site?" dialog appears, warning that unsaved changes will be lost if the user navigates away.

a. The navigation isn't actually leaving the site. The dialog is misleading because it suggests the user is leaving the site, when in fact they are only navigating within it.  
b. The dialog isn't using Material 3 styling.

See the screenshot below:
![Leave Site Dialog](leave-site-dialog-box.jpg)

### RESOLUTION
Option A: every link that stays on the site now asks with the in-page Material 3 dialog.
- `src/public/adminList.js`: `guardNavigation()` is one delegated `click` listener on the document instead of one on `.admin-back-link`. While a poll is being edited it catches any same-origin `a[href]` (the CrowdPoll banner, the header's Create Poll link, the avatar menu entries, Back). If there are edits it shows the existing "Discard changes?" dialog (Keep editing / Discard), then releases the edit session and goes to the link. Skipped: `#` links (Logout keeps its own handler), links with another `target`, modified or non-primary clicks, and clicks another handler already cancelled.
- `src/public/adminCard.js`: `releaseSession()` now calls `disarmExitGuards()` first. Before this, choosing Discard on Back still left `beforeunload` armed, so the browser's "Leave site?" appeared a second time.
- `beforeunload` stays for what a page cannot intercept (reload, closing the tab, a typed address). There the browser draws its own dialog, which no page can reword or restyle.
- Tests: postponed by the developer (No Tests); written, not run. `tests/client-admin-discard.test.ts` gains two tests (with edits the banner is held until Discard; without edits it navigates at once). `tests/polls-editing-eligibility.test.ts` gets its back-arrow source checks rewritten for the delegated listener, plus a check that `releaseSession()` disarms the guard. The fix is therefore unverified by a test run and by a browser check.
- Artifacts: `quickstart.md` Q14; `tasks.md` T053 (Polish), count 53.

2026-10-05 13:53
