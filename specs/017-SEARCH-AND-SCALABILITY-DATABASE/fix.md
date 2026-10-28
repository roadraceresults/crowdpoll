# Overview
This file documents code changes, fixes, enhancements that were requested and made during manual testing.


## FIX001 Bookmarking Bug
[x] Implemented
Bookmarking a poll does not automatically make it appear on the "My FAVOURITES" tab.
See the screenshot in designDocs/dontTrack/bookmarkBug.jpg

### IMPLEMENTATION REPORT
**Cause** (client only; the server was already right — `POST /api/polls/:pid/bookmark`
writes the `bookmarked` relationship and the Favourites lookup lists it). Two things in
`src/public/tabs.js` combined:
1. A bookmark only updated the overlay of cards the tabs already held; it never added the poll
   to the Favourites (or My PRIVATE POLLS) copy, and never marked that copy as needing a refresh.
   Switching to Favourites re-rendered the held copy and sent nothing while the copy was younger
   than the manual floor.
2. The bookmark itself is a *refresh*-kind request and takes the session's manual floor, so a
   Favourites refresh sent right after it was refused with `429 too-soon`; for a tab that had
   already been served once, that refusal was not retried. The poll then only appeared after a
   later tab switch or a manual Refresh once the floor had passed.

**Fix** (`src/public/tabs.js`):
- After a successful bookmark the poll's card (projection, live counts, overlay) is copied from
  whichever tab holds it — TRENDING, Search or Live Results — and placed at the top of the
  personal tab that lists it: Favourites for a public poll, My PRIVATE POLLS for a private one.
  It shows there at once, with `Un-bookmark`, without a request (FR-019's "updated in the
  browser from the user's own actions").
- Both personal tabs are marked *due*: their next activation sends a confirming refresh at the
  first allowed moment (waiting out the floor the bookmark took, using the bookmark response's
  `nextRefreshMs`, and retrying a refusal once the wait passes). The server's ordered list then
  replaces the local placement. Un-bookmark only marks the tabs due — whether the poll stays
  (created or voted in) is the server's answer — and the poll leaves when that answer arrives.
- No server, API or contract change; `postman/openapi.json` is unchanged.

**Tests** (`tests/client-home.test.ts`, jsdom): a public poll bookmarked from TRENDING is in
Favourites immediately (no request inside the floor), is confirmed by one request after the
floor, and leaves after Un-bookmark once the server answers; a private poll bookmarked from
Live Results lands in My PRIVATE POLLS and not in Favourites. Full suite: 40 files, 591 tests
passing.

## FIX002 Un-Bookmarking
[x] Implemented
REPRO:
1. View the "Favourites" tab.
2. Click the "Un-bookmark" button on a poll.
EXPECTED: The poll is removed from the current "Favourites" tab immediately, and the server is updated.
ACTUAL: The poll is not removed from the current "Favourites" tab for 5 seconds or more.

It is understandable that the Favourites tab in another browser window may not be updated immediately, but the current tab should be updated immediately, even if it is just a client-side ressponse to confirm the Poll has been un-bookmarked.

### CLARIFICATIONS
None needed. One judgement call, made as follows: Favourites lists polls the user created,
voted in **or** bookmarked (spec US7, FR-020), so un-bookmarking does not always mean the
poll leaves. The browser knows whether the user voted (the overlay), but not whether they
created the poll (the card projection carries no creator). Implemented: a poll the user
voted in stays listed and its button reverts to `Bookmark`; any other poll leaves at once,
and if the server still lists it (the user created it) the confirming refresh brings it
back after the floor. Alternative not taken: always removing locally, which would make voted
polls vanish and reappear five seconds later.

### IMPLEMENTATION REPORT
**Cause**: FIX002 deliberately left un-bookmarking to the server — the tab was only marked
*due* and the poll left when the confirming refresh answered, which the manual floor
(`ENV_MIN_MANUAL_REFRESH_INTERVAL`, 5 s, stretchable) delays.

**Fix** (`src/public/tabs.js`): each personal tab gained `remove(pid)`, which drops the card
from the tab's copy and re-renders (showing "Nothing here yet." when the tab empties). On a
successful `DELETE /api/polls/:pid/bookmark` the poll is removed from Favourites / My PRIVATE
POLLS immediately unless the overlay says the user voted in it; both tabs remain marked due,
so the server's list is still confirmed at the first allowed moment (and restores a poll the
user created). The server write was already immediate; no API or contract change.

**Tests** (`tests/client-home.test.ts`): the FIX002 scenario now asserts the poll leaves
Favourites at once (empty state shown, no extra request inside the floor) and stays gone after
the confirmation; a new case un-bookmarks a poll the user voted in and checks it stays listed
with the button reading `Bookmark`. Full suite: 40 files, 592 tests passing.

## FIX003 Bookmark Icon
[x] Implemented
Currently, the bottom row of a Poll Card has the "Live Results" button, the "Bookmark" button and the "Vote" button.
These don't all fit, so this fix will move the "Bookmark" button to the top row of the Poll Card, right justified, next to the Title.
The "Bookmark" button will be a small SVG icon that looks like the image in designDocs/dontTrack/unbookmarked.png.  
When the poll is bookmarked, the icon will be an SVG that looks like the image in designDocs/dontTrack/bookmarked.png.
The current logic that displays either the "Bookmark" or "Un-bookmark" button will be used to determine which icon is displayed.

### IMPLEMENTATION REPORT
- `src/public/pollCard.js`: the front face's title is now wrapped in a `.question-row` with the
  `.bookmark-btn` at its right; the button left the `.actions` row, which holds Live Results
  and Vote only. The button holds one inline SVG (24×24 viewBox): a tag outline with its hole
  at the top right and a heart at the lower right, drawn over a paper-coloured halo so the
  heart knocks the tag's edge out where they overlap, as in the reference images. The existing
  bookmarked/un-bookmarked logic is unchanged and still sets `aria-pressed`; the visible
  "Bookmark"/"Un-bookmark" text became the button's `aria-label` and `title` (tooltip), so
  screen readers and hover keep the words.
- `src/public/site.css`: `.question-row` is a flex row (title grows, icon fixed); the button is
  a bare 28 px icon control. `aria-pressed="false"` → tag, hole and heart outline in the muted
  grey; `aria-pressed="true"` → tag and hole in ink, heart filled and stroked `#E0342C` red.
  Hover/focus darken the grey.
- No change to the tab logic, the API or the contract. Both states were rasterised and checked
  against `designDocs/dontTrack/unbookmarked.png` / `bookmarked.png`.
- Tests: `tests/client-home.test.ts` now asserts the button's `aria-label` instead of its text
  (the icon has none); `tests/pages.test.ts` continues to check the card ships the control. Full
  suite: 40 files, 592 tests passing.

## FIX004 Bookmark Bug 02
[x] Implemented
The screenshot shows a poll that was bookmarked, but does not appear in the "My FAVOURITES" tab.
See the screenshot in designDocs/dontTrack/bookmarkBug02.jpg
Notice the "dog markets poll 8" is bookmarked in the bropwser window on the left, but after 60 minutes it still does not appear in the "My FAVOURITES" tab on the right.

### CLARIFICATIONS
**Diagnosis.** The server side is right: the bookmark is stored and a Favourites refresh
returns the poll (checked with a two-window jsdom reproduction — a Refresh press in the second
window after the floor lists it). What the second window lacked was any *reason* to send a
request: Favourites has no periodic refresh (by design — personal tabs are manual so they do
not spend the refresh budget), and a request leaves only on a tab switch with a copy older
than the floor, or a Refresh press. A window left sitting on Favourites therefore never learns
of a bookmark made elsewhere, however long it waits. (A Refresh pressed inside the 5 s after
the bookmark was also refused by the shared session floor and, for an already-served tab, not
retried.)

**Options considered.**
- A. A periodic refresh of the visible personal tab (every `nextRefreshMs`). Complete, but one
  extra dynamic request per user sitting on the tab every 5 s, against the refresh budget
  the spec keeps for actions — not taken.
- B. Confirm the personal tab when the user *returns* to the window (focus / visibility) and
  its copy is older than the floor. One request per return, floor-bounded; covers other
  devices too. **Taken.**
- C. Tell the browser's other windows about a bookmark over a `BroadcastChannel`; each applies
  it locally at once and confirms with the server at the first allowed moment. No extra
  request for the message; exactly the screenshot's case. **Taken.**

### IMPLEMENTATION REPORT
- `src/public/tabs.js`: after a successful bookmark/un-bookmark the window posts
  `{type:"bookmark", pid, bookmarked, holdMs}` on the `crowdpoll-tabs` BroadcastChannel. A
  receiving window (same browser, signed in) applies it as its own action: the icon flips on
  every card it holds, the poll is placed in Favourites / My PRIVATE POLLS (or dropped, per
  FIX02) from any card copy it has, the personal tabs are held off for `holdMs` (the session
  floor the bookmark took), and marked *due* — so an active Favourites tab confirms with one
  request once the floor passes, and an inactive one on its next activation. If the receiving
  window holds no copy of the card, the confirmation alone brings it in. Browsers without the
  channel simply skip it.
- On `focus` and `visibilitychange`, a personal tab on screen whose copy is older than the
  floor is marked due (new `confirmIfStale()`), so a change made on another device shows on
  return without a Refresh press.
- `tests/helpers/browser.ts`: a `beforeScripts(window)` hook, used to install a stand-in
  BroadcastChannel linking two jsdom windows.
- Tests (`tests/client-home.test.ts`): two windows of one session — a bookmark in the first
  appears in the second's Favourites at once with no request inside the floor, and is
  confirmed by one request after it; and a window whose Favourites copy is stale confirms on
  focus (not inside the floor) and lists a poll bookmarked elsewhere. Full suite: 40 files,
  594 tests passing.
- Not covered, by design: a window that is neither touched nor told (a second *device* left on
  Favourites without being focused) still updates only on return or Refresh.

## FIX05 Bookmark Icon
[x] Implemented
As recently requested, your implemented the SVG bookmark icon.  
After using the webapp for a bit, it appears more as if a Bookmarked poll is "Liked" rather then just bookmarked.  
Quite possible that the heart icon is not the best choice for a bookmark icon.  
Please change the heart to a star, with the same size, outline and fill colors, and the same placement on the poll card.
Also, please make the Un-Bookmarked icon the same except with no fill in the star. Make the greyed color even a bit lighter than it is now.

### IMPLEMENTATION REPORT
- `src/public/pollCard.js`: the heart path in the card template's bookmark SVG is replaced by a
  five-point star (`.bookmark-star`, with its `.bookmark-halo` twin underneath) using the same
  transform, so it sits at the same size and place — lower right of the tag, knocking out the
  tag's edge where they overlap. Nothing else in the control changed: same button, same
  `aria-pressed` / `aria-label` / `title` logic.
- `src/public/site.css`: bookmarked — tag and hole in ink, star filled and stroked `#E0342C`
  red, as the heart was. Un-bookmarked — the same outline with no fill, in a lighter grey
  (`#9AA197`, previously `--muted` `#6B7268`); hover/focus now darken only to `--muted`.
- Both states rasterised and checked. Tests unchanged (they assert the button's state, not its
  shape); `tests/client-home.test.ts`, `tests/pages.test.ts` and `tests/poll-card-assets.test.ts`
  pass.

## FIX006 Bookmarked Polls on Trending Tab
[x] Implemented
A bookmarked poll doesn't show as bookmarked on the TRENDING tab, even if it is bookmarked in another tab or window.  
See the screenshot in designDocs/dontTrack/bookmarkBug03.jpg.  
The red circles point out the problem.  
Even after the TRENDING Tab browser window is refreshed with F5, the poll still doesn't show as bookmarked.  
However, if the webapp's own "Refresh" button is pressed, the poll does show as bookmarked.

### IMPLEMENTATION REPORT
**Cause.** TRENDING's cards carry no per-user state; on a page load the tab asks
`GET /api/me/polls?pids=…` once for the overlay (voted / bookmarked) of the polls it holds
(FR-019). That call is a *refresh*-kind request and takes the session's manual floor
(`ENV_MIN_MANUAL_REFRESH_INTERVAL`, 5 s, shared by every window of the session). When any
other refresh-kind request had gone out in the previous 5 s — the same call from the load
before an F5, a Favourites confirmation in the other window, a bookmark — the overlay call was
refused with `429 too-soon`, and `trending.js` simply gave up: the cards stayed unmarked until
the next Refresh press, whose own overlay call then succeeded. Reproduced in jsdom by
reloading within the floor. (The Search tab's overlay call had the same gap.)

**Fix.** `src/public/tabs.js` gained `createOverlayFetcher(state, gridOf)`, now used by both
`trending.js` and `searchTab.js` in place of their own copies: a refused overlay call
(`429`/`503`) is asked again once `retryAfterMs` (plus jitter on `503`) has passed, up to
five times; while the retry is pending the pids stay claimed so a second caller sends nothing
extra; a network failure releases them. Sign-in changes reset the fetcher. Nothing changed on
the server; the floor still applies to the call.

**Tests.** `tests/client-home.test.ts`: a signed-in reload inside the floor renders the
stored TRENDING copy with the bookmarked card unmarked, is refused the overlay once, asks
again after the wait and then shows it bookmarked. The FIX004 two-window case was
re-sequenced around that retry. Full suite: 40 files, 595 tests passing.

## FIX007 Refresh Icon
[x] Implemented
Please change the "Refresh" button, that appears on several pages and tabs, to a typical refresh icon that is two arrows rotating in a circle. 

### CLARIFICATIONS
None needed. There is one Refresh control in the app — the button in the home page's tab
bar, which serves whichever tab is on screen (TRENDING, My PRIVATE POLLS, Favourites, Search;
Live Results refreshes itself). The admin pages have no Refresh button. The "Cancel" / "Yes"
buttons of the Live Results idle prompt share its pill style but are text and stay as they
are.

### IMPLEMENTATION REPORT
- `src/public/index.html`: the `#refreshBtn` text became an inline SVG of two arrows chasing
  round a circle (stroke, round caps). The words moved to `aria-label="Refresh"` and
  `title="Refresh"`, so the control is still announced and shows a tooltip. Its id, class and
  behaviour (disabled while the tab's floor holds) are unchanged — `tabs.js` is untouched.
- `src/public/tabs.css`: a `.tab-refresh--icon` modifier makes it a 36 px round button with a
  20 px icon in the same moss colour and paper background as before; the disabled look
  (half opacity) still applies.
- Tests unchanged: `tests/pages.test.ts` checks the control ships, `tests/client-home.test.ts`
  presses it by id; both suites pass (31 tests).

## FIX008
[x] Implemented
The ENV_MIN_MANUAL_REFRESH_INTERVAL environment variable is currently set to 5 seconds.  
The purpose of this variable is to prevent a malicious user (or bot) from refreshing too often, which can cause performance issues.  
However, it shouldn't become a problem for normal users.  
While testing the webapp, it was confusing to me at first why clicking the Bookmark icon didn't work. The message to try again shortly wasn't obvious.  
Can you some suggestions of how prevent malicious clicking while still allow a normal user to click without having to wait 5 seconds?  
Perhaps the limiting interval wouldn't start until the user has clicked the button a certain number of times in a short period of time.  
Or, feel free to make other suggestions.  
I will then accept an option before you implement it.

### CLARIFICATIONS
Nothing has been implemented yet — the options below are for you to choose from.

**What happens today.** Every dynamic request has a *kind* (`refresh`, `search`, `live`,
`vote`) and the server keeps one key per kind per session: the first request sets it with the
floor as its lifetime, and any request of that kind arriving while it lives is refused with
`429 too-soon` (FR-023/024). The `refresh` kind covers *all* of: a tab click or Refresh press
on My PRIVATE POLLS / Favourites / Search, a Bookmark or Un-bookmark, adding or removing a poll
in Live Results, and the overlay call TRENDING makes on a page load. So a Bookmark click within
5 s of any of those — in any window of the same session — is refused, which is what you met.
The floor also stretches under load (× the controller's multiplier, up to 8).

**Option A — a burst allowance on each floor (recommended).** Each kind gets a small bucket of
tokens per session: a request spends one, and one comes back every floor interval (stretched
under load exactly as now). Proposed defaults: `ENV_MANUAL_REFRESH_BURST=5`,
`ENV_SEARCH_BURST=3`, Live Results and votes unchanged at 1 (FR-035 wants votes strictly one
per interval). A normal user can then bookmark, switch tabs and press Refresh a handful of
times back to back; a bot that keeps clicking is held to the same sustained rate as today (one
per 5 s) once the bucket is empty, and the site-wide bound stays with the budget controller
and instance shedding. Changes: `src/load/floors.ts` (an atomic token bucket — a short Lua
script on Valkey, plain code on the in-process cache), the same bucket mirrored in the
browser so the Refresh button and tabs stop disabling themselves after one request, two
config variables, one line in the config contract and FR-023's "floor" read as the sustained
floor.

**Option B — take one-off actions out of the tab floor.** Bookmark / Un-bookmark, Live Results
add / remove and the page-load overlay call become their own kind, `action`, with a short
floor (`ENV_MIN_ACTION_INTERVAL`, e.g. 500 ms) while still counting against the refresh
budget. Tab clicks and Refresh keep their 5 s floor. A Bookmark click then never collides with a
tab refresh or with another window (the collisions behind FIX001/004/006 disappear at the
source), and a bot clicking Bookmark is still limited to two a second on a write that is one
row. Does nothing for the Refresh button itself.

**Option C — hold a refused click instead of refusing it.** No server change. The browser
keeps a refused Bookmark click (the icon shows a pending state), sends it when the wait passes,
and the "try again" notice goes. The wait remains; the click just stops looking broken. Least
satisfying on its own, but it is the right browser behaviour under A or B too, for the rare
refusal that remains.

**Option D — floor only repeats.** Apply the floor only to a repeated identical request (same
endpoint and body) and let different requests through. Not recommended: trivially bypassed by
varying the request, and hard to explain in the contract.

**Recommendation: A + B (+ C's browser behaviour).** B removes the specific collision that made
Bookmark look broken; A lets a normal user act several times in a row everywhere else; C
covers whatever refusal is left. If you would rather take one step: A alone fixes the
experience you describe (five quick clicks before any wait) with the smallest conceptual
change. Tell me which, and any defaults you want changed, and I will implement and report here.

### IMPLEMENTATION REPORT
**Chosen: Option A** — a burst allowance (token bucket) on the per-user floors.

**Configuration.** Two new variables, documented in `CLAUDE.md`, `README.md`, the config
contract, `.do/app.yaml` and both dev templates: `ENV_MANUAL_REFRESH_BURST` (default `5`) and
`ENV_SEARCH_BURST` (default `3`). Live Results and votes are fixed at 1 (FR-035). A value of
`1` is exactly the old behaviour. `/api/config` now carries `bursts` beside `floors`
(`postman/openapi.json` updated); FR-023 gained a sentence saying the floors are sustained
rates with this allowance.

**Server.** `Cache.takeToken(key, capacity, intervalMs)` is a new atomic step of a token
bucket — plain code in `memoryCache.ts`, a Lua script in `valkeyCache.ts` so every instance
sees one bucket per user and kind. `src/load/floors.ts` calls it in place of `setNx`: a
request takes a token, a bucket with none left is refused with `429 too-soon` and the exact
wait until the next token, as before. Tokens come back one per floor interval, so once a
burst is spent the sustained rate is one per 5 s — the same bound on a bot as today.

**Browser** (`src/public/tabs.js`, with small changes in `trending.js` and `searchTab.js`).
The page mirrors the buckets per kind (from `/api/config`): a request spends a token when
sent, a served response sets the refill interval to the `nextRefreshMs` it returned (so the
controller's stretch still applies), and a `429`/`503` empties the mirror until the named
wait. Consequences: the Refresh button and tab clicks stay enabled until the allowance is
spent; a Bookmark click with a token is sent at once even right after a tab refresh, and a
click with none left is not sent — the notice now says "Please wait N s and try again"; a
first request for a tab inside the floor is held and sent when the allowance returns instead
of being sent to be refused; TRENDING's own Refresh gets the same allowance from a local
bucket; the Search tab's Refresh is refresh-kind (FR-025) and no longer shares Enter's
search floor in the browser. The FIX004 cross-window message no longer carries a hold-off —
the receiving window simply spends a token of its mirror.

**Tests.** Cache contract (both caches; the Valkey suite was run against a local Redis):
burst, refusal with wait, one token back per interval, capacity 1 = plain floor.
`config.test.ts`: defaults and validation. `load-floors.test.ts`: 3 manual then `429`,
2 searches then `429`, votes strictly one, one token back after one interval.
`client-home.test.ts`: a bookmark right after a tab refresh is sent and lands in Favourites,
the Refresh button stays enabled until the allowance is spent, and a click with no token is
not sent and shows the wait. The test harness sets both bursts to `1` by default so the
existing floor tests keep their meaning; three of them were reworded for the browser now
holding, rather than sending, a request it knows would be refused. Full suite: 40 files,
601 tests passing.

## FIX009
[x] Implemented
REPRO:
1. navigate to Poll Adminitration page (using admin account)
2. wait 10 seconds (no clicking or typing)
3. click "Back" icon in the top left corner of the page
EXPECTED: The page should navigate away from "Poll Administration" page
ACTUAL: the user is shown a JSON record as seen in the screenshot in designDocs/dontTrack/backButtonBug.jpg.

### CLARIFICATIONS
One judgement call, made rather than asked: the fix caps the unfiltered admin list at the
existing admin search cap (`ENV_MAX_POLLS_ADMIN_SEARCH_RESULTS`, 200) rather than adding a new
variable or paging. FR-055 keeps the list's refresh interval and edit-mode exemption unchanged
(they are), and US6 already says "today's admin list shows them all and will not scale" — the
search is the intended way to reach the rest. If you would rather the plain list page through
all polls, say so and it becomes a new FIX.

### IMPLEMENTATION REPORT
**Cause.** The JSON in the screenshot is `503 busy` from instance shedding: the page load of
`/` (kind `other`) was refused because the instance measured its event-loop lag above
`ENV_INSTANCE_MAX_EVENT_LOOP_LAG` (100 ms, p50 since the last request). The lag was real:
`GET /api/admin/polls` — the unfiltered list the admin page refreshes every
`ENV_POLL_ADMIN_PAGE_REFRESH_INTERVAL` (5 s) — selected **every poll row** in the store
(`listAdminRows` had no limit), ran `pollsEverVoted` with all their ids, serialised them and
sent them to the browser. With the seeded store that blocks the event loop for most of each
interval; ten idle seconds are two such refreshes, so the p50 lag at the moment of the Back
click was well past the threshold and the page load was shed, as the load bounds are designed
to do (the response body is the browser rendering the JSON because it navigated, not fetched).

**Fix.** `src/polls/store.ts` `listAdminRows(db, cap)` now returns the newest `cap + 1` rows
and reports `truncated`; `GET /api/admin/polls` (`src/routes/pollsApi.ts`) passes
`ENV_MAX_POLLS_ADMIN_SEARCH_RESULTS` and returns `{ polls, truncated }` like the admin search.
`src/public/adminList.js` shows "Only the newest N polls are shown. Use the search to find
others." when the list is cut off (the existing search notice slot). `postman/openapi.json`,
`CLAUDE.md`, `README.md` and the config contract describe the cap. Shedding itself is
unchanged — it did its job; the request that overloaded the instance is what was wrong.

**Tests.** `tests/polls-admin-crud.test.ts`: with the cap at 3 and five polls, the list returns
the three newest with `truncated: true`, and a single poll with `truncated: false`. Full suite:
40 files, 602 tests passing.

## FIX010
[x] Implemented
The "Create New Poll" button on the "Poll Administration" page appears to do nothing.
I was able to determine that a new poll was created, however the search is in effect so the new poll does not appear.  
In the future, presumably, the "Poll Administration" page will have other functions.
So, we need to design an interface that allows each feature to be used independently. 
In other words, the Search function should only be in effect when the Search button is clicked.
Can you make some recommendations for the UI/UX on this page?

### CLARIFICATIONS
Nothing has been implemented yet — recommendations first, as asked.

**What the page does today.** The header stacks `← Back`, `Create New Poll`, then the whole
three-row search form, then the list. A submitted search becomes the page's *active search*:
the list shows only matching polls and the 5 s refresh keeps that filter (US6 scenario 6,
FR-055). `Create New Poll` creates a poll in state INITIALIZED, reloads the list — still
filtered — scrolls to the new card and opens it for editing. With a search active the new poll
does not match, so nothing visible happens; the poll exists and shows once the search is
cleared. Any future tool that changes the list will hit the same wall unless the page has a
rule for which tool "owns" the list.

**Option A — make Create self-consistent (smallest change).** `Create New Poll` clears the
active search first (form reset, notice "Search cleared to show the new poll"), then reloads,
scrolls to the new card and opens it, as now. One rule, easy to explain, nothing else moves.
It answers this bug but not the wider "each feature independent" point.

**Option B — a toolbar of tools, one panel open at a time (recommended).** Rebuild the header
as a single compact row:

```
← Back      [ + Create New Poll ]      [ 🔍 Search ▾ ]                 Newest 200 polls
```

- The search form lives in a disclosure panel under the toolbar, closed by default; the list
  opens on the newest polls (FIX009's cap). `Search ▾` opens the panel; `Search` in it applies
  the filters and closes the panel; the toolbar then shows an *active-filter chip* in place of
  "Newest 200 polls", e.g. `State: OPEN · Created ≥ 2026-09-01 · 42 shown ✕`, whose ✕ clears
  the search. The filter stays across the periodic refresh exactly as now.
- `Create New Poll` always makes its result visible: it clears the active search (chip goes,
  short notice), reloads, scrolls to and opens the new card. (Alternative if you would rather
  keep the search: pin the new card at the top with a "New — not in the current search" label
  until the next refresh. I prefer clearing: one list, one truth.)
- Future tools (bulk state changes, export, settings…) are further toolbar buttons or panels;
  opening one closes another, and a tool that changes the list clears the search the same way.
  The card being edited keeps its exemption from refresh (FR-055) regardless of the tool.
- Cost: `admin.html` markup and `admin.css` for the toolbar/panel/chip, `adminList.js` for the
  panel state, the chip and the Create rule; the API is untouched.

**Option C — tabs on the admin page**, like the home page:  
`Newest Polls | Search | Awaiting Approval | Rejected`,  
each a view with its own state, 
The `Newest Polls` tab is the default, showing the newest 200 polls (FIX009's cap). At the top of the "Newest Polls" tab is a "Create New Poll" button. Clicking the "Create New Poll" button will create a new poll, place it at the top of the "Newest Polls" list and open it for editing.  
The "Search" tab has the search form and the list of matching polls. 
The other tabs are essentially a "Search" that has been pre-filled to show their respective lists. For now, those will be state = "Awaiting Approval" and state = "Rejected". 
Each tab has its own refresh and edit-lock rules. 

This solution scales furthest and matches a pattern the site already uses.
Granted, it is a large change (per-tab refresh and edit-lock rules) but worth it when the admin page grows several more functions.
It will also map well in the future when almost any user can create their own polls and manage them, and their admin page becomes a "My Polls" page with a search tab, a create tab, a settings tab, etc.

**Option D — search on its own page** (`/admin/search`), leaving the list page simple. Not
recommended: results need the same card actions, so the list would exist twice.

**Recommendation: B**, with Create clearing the active search. If you want the bug gone now and
the redesign later, A first (ten lines) and B as its own FIX. Tell me which and I will
implement and report here.

### IMPLEMENTATION REPORT
**Chosen: Option C** — the admin page is a set of views.

- `src/public/admin.html`: the header is now a toolbar (`← Back`, `Create New Poll`) above a
  tab bar with four views — **Newest**, **Awaiting Approval**, **Rejected**, **Search** —
  reusing the home page's tab styling (`tabs.css`). The search form belongs to the Search
  view and is hidden elsewhere; the notice line moved out of the form so every view can use
  it; the card list is the active view's.
- `src/public/adminList.js`: each view has its own request and messages — Newest is the
  capped list (FIX009); Awaiting Approval and Rejected are the admin search with the state
  fixed (`/api/admin/polls/search?state=…`, newest first, capped, cut-off notice); Search asks
  nothing until a search is submitted ("Fill in the form and press Search.") and keeps its
  filters while other views are used. Submitting the form selects the Search view; Clear
  empties it and keeps you there. The periodic refresh re-runs the active view's request, so a
  search still persists across refreshes (FR-055). The active view is remembered in
  `sessionStorage` (`admin:tab`) across reloads of the page.
- **Create New Poll** works from any view: it creates the poll, switches to Newest (where the
  new poll is first), scrolls to its card and opens it for editing — the bug in the report is
  gone because the new poll is always shown where it belongs, and the search in the Search
  view is left as it was.
- While a card is being edited, the other view tabs are disabled (tooltip "Finish editing the
  open poll first") for the same reason Create already was: the draft lives in that card's
  DOM, which a view change would replace.
- No server or API change; the state views use the existing admin search endpoint.
- `src/public/admin.css`: the toolbar row, tab-bar spacing and the hidden form.

**Tests** (`tests/client-home.test.ts`, jsdom): the existing admin search case now checks
that Clear empties the Search view with the prompt and that Newest shows everything; a new
case checks Newest / Awaiting Approval / Rejected list their polls, that a search in effect
narrows Search, and that Create New Poll from the Search view lands on Newest with the new
card present and opened for editing. Full suite: 40 files, 603 tests passing.

## FIX011
[x] Implemented
When a poll is marked as a favourite, the "Bookmark" icon does not appear on the "Live Results" tab.
It causes a problem because clicking the icon once on the "Live Results" just makes it bookmarked again, then clicking it again un-bookmarks it. 
See the screenshot in designDocs/dontTrack/liveResultsFavourite.jpg where the problem is circled in red.

### IMPLEMENTATION REPORT
**Cause.** The Live Results refresh (`/api/live/refresh`, `src/live/liveTab.ts`) is served
from the cache alone — projections and live counts — and carries no per-visitor state, by
design (the tab is the highest-rate reader). Every other listing gets the visitor's overlay
(voted, bookmarked) either inline (personal tabs) or by the `/api/me/polls` call (TRENDING,
Search); `liveResults.js` never asked for it. Its cards therefore rendered with no overlay, the
icon defaulted to "not bookmarked", and the first click sent `POST …/bookmark` (a no-op on an
existing bookmark), the second `DELETE`. The voted state was missing on those cards too.

**Fix** (browser only; the Live Results delta is unchanged).
- `src/public/liveResults.js` owns an overlay fetcher (the FIX006 one, shared with TRENDING and
  Search). After each delta is rendered, any poll without an overlay entry first takes the
  entry another tab already holds — the card that handed the poll over normally has it, so
  the icon is right at once with no request — and whatever is still missing is asked of
  `/api/me/polls` (FR-019: fetched "when the counts object brings ids without an overlay
  entry"; a refresh-kind request, with FIX006's retry and FIX008's allowance). Sign-in changes
  reset it.
- `src/public/tabs.js` exports `overlayOf(pid)`, the overlay any tab holds for a poll.
- Bookmark and un-bookmark from a Live Results card already updated every tab's copy; now the
  card shows the true state first, so one click does what the icon says.

**Tests** (`tests/client-home.test.ts`): a poll bookmarked before the page loads shows as
bookmarked in Live Results the moment it is added from TRENDING (no extra overlay call), one
click un-bookmarks it, and a private poll no tab holds gets its overlay from the server when
added. Full suite: 40 files, 604 tests passing.

## FIX012
[x] Implemented
When using the "Search polls" text box
REPRO:
1. enter "train" in the "Search polls" text box
2. hit Enter
EXPECTED Result
- all polls with "train" in any of the searched fields appears
- "train" stays in the "Search polls" text box
ACTUAL Result
- all polls with "train" in any of the searched fields appears
- "Search polls" text box is cleared

This is a problem because the user can't see what was entered for the search, and the user can't edit the search to narrow in on the polls desired.

Also, please add an "X" icon in "Search polls" text box, far right justified.

### IMPLEMENTATION REPORT
- The clearing was deliberate — US2 and its first acceptance scenario in `spec.md` said "the
  box is cleared". Both lines now say the box keeps the words, marked FIX012, so the spec and
  the page agree.
- `src/public/searchTab.js`: Enter submits the words and leaves them in the box. A clear
  control (X) is shown whenever the box has text and hidden when it is empty; pressing it
  clears the text only (the results stay until the next search) and returns focus to the box.
- `src/public/index.html`: the box is wrapped with the X button (an inline SVG, `aria-label`
  "Clear search text") at its right; `src/public/tabs.css` positions it inside the pill,
  pads the input so text never runs under it, and hides the browser's own search-cancel glyph
  so there is one X, not two.
- Test (`tests/client-home.test.ts`): after Enter the box still reads the query and the X is
  visible; pressing the X empties the box and hides itself. Page and home-page suites pass
  (36 tests).

## FIX013
[x] Implemented
Please remove the "Search polls" text box on the tab buttons row.
Move the functionality to the existing but disabled "Search CrowdPoll" text box in the header.
When search terms are entered and the user presses "Enter" or clicks the magnifying glass icon, the focus will be switched to the "Search" tab with the results.
If the user clicks the "Search" tab with no terms in the "Search CrowdPoll" text box, then a message will be displayed (similar to the current implementation) that says, "Enter your search terms in the 'Search CrowdPoll' field above."
Another small item, please make the tool-tip for the "X" read "Clear Search Terms"

### IMPLEMENTATION REPORT
- `src/public/index.html`: the "Search polls" box left the tab row (the row now holds the tabs
  and Refresh). Its styles left `tabs.css`.
- `src/public/app.js` (the shared header): the "Search CrowdPoll" box is live on every page —
  a form whose magnifier is the submit button, with the X (`title` and `aria-label`
  "Clear Search Terms") shown while there is text and the `/` hint made real (pressing `/`
  outside a field focuses the box). On the home page Enter or the magnifier hands the terms to
  the Search tab; on any other page (admin, profile…) it goes to `/?q=terms`, and the home
  page runs that search on arrival, fills the box and opens the Search tab instead of
  TRENDING (`tabs.js`). Because the header is rebuilt on every session change, the handlers
  are delegated and what was typed survives the rebuild.
- `src/public/searchTab.js`: `submit(terms)` is exposed; with terms it selects the Search tab
  and runs the search (keeping the terms in the box, FIX012); without, it selects the tab,
  which shows "Enter your search terms in the 'Search CrowdPoll' field above." Clicking the
  Search tab directly with nothing searched shows the same.
- `src/public/site.css`: the box is no longer inert; magnifier button, X and the hidden native
  cancel glyph styled to the header.
- Tests: `pages.test.ts` checks the tab row has no search box; `client-home.test.ts` searches
  through `#siteSearch`, checks the empty-tab message and the X's tooltip, and a new case
  arrives at `/?q=kettle` and lands on the Search tab with the results and the box filled.
  Full suite: 40 files, 605 tests passing.

## FIX014
[x] Implemented
When the "X" is clicked in the "Search CrowdPoll" box, the search terms are cleared but the search results are not changed.
The result should be to bring focus to the "Search" tab with the default message "Enter your search terms in the 'Search CrowdPoll' field above."

### IMPLEMENTATION REPORT
- `src/public/searchTab.js`: a `clear()` on the Search tab drops the last query, the results,
  their counts and overlay, renders the empty grid, selects the tab and shows "Enter your
  search terms in the 'Search CrowdPoll' field above." Refresh afterwards has no query to
  re-run, so it sends nothing.
- `src/public/app.js`: the header's X clears the terms and, on the home page, calls that
  `clear()`; focus stays in the box for the next terms. On other pages the X only clears the
  text, as before.
- Test (`tests/client-home.test.ts`): after a search, pressing the X from another tab empties
  the box, selects the Search tab with no cards and the prompt, and Refresh sends nothing.
  Home-page and page suites pass.

## FIX015
[x] Implemented
A small tweak to the tab bar.
Please right justify the "Refresh" icon

### IMPLEMENTATION REPORT
- `src/public/tabs.css`: one rule — the Refresh button in `.tab-bar-wrap` takes
  `margin-left:auto`, so the tabs stay on the left and the icon sits at the far right of the
  row (the row is a flex container; when it wraps on a narrow screen the icon ends the last
  line). No markup or script change; the page tests pass.

## FIX016
[x] Deferred 
On the "My PRIVATE POLLS" tab, one poll appears with the title "test new poll".
I voted on it and Bookmarked it.
Yet, it doesn't appear in the "Favourites" tab.
See the screenshot designDocs/dontTrack/privatepoll01.jpg 
Is this by design?

### CLARIFICATIONS
**Yes — by design.** The two personal tabs split polls by visibility, not by what the user
did with them (spec User Story 7 and FR-020):

- **My PRIVATE POLLS** lists the *private* polls the user created, was invited to, voted in
  **or bookmarked**.
- **Favourites** lists the *public* polls the user created, voted in or bookmarked.

"test new poll" is a private poll, so voting on it and bookmarking it keep it in My PRIVATE
POLLS (the bookmark is recorded and shows as the filled star there, and the poll stays
listed even if you later un-bookmark it, because you voted). It never appears in Favourites,
which is public polls only — the same rule FIX001/FIX002 followed when placing a freshly
bookmarked card ("Favourites for a public poll, My PRIVATE POLLS for a private one").

The reasoning in the spec: a private poll is one you reach by invitation or link, and its
tab is the place you find *all* of yours in one list; Favourites is the shortlist you keep out
of the public sea of polls. If you would rather Favourites mean "everything I bookmarked,
public or private", that is a one-line change to the Favourites lookup (drop the visibility
filter for the `bookmarked` relation) plus the placement rule in the browser and the spec
wording — say so and it becomes FIX017.

### IMPLEMENTATION REPORT
**Deferred.** No change made: the behaviour is the specified one (Favourites lists public
polls only). Whether Favourites should also list bookmarked private polls is left open; if it
is taken up later, the change is the one described under CLARIFICATIONS above.

## FIX017
[x] Implemented
On the "Poll Cards" appearing on the "Live Results" tab, the "Vote" button should still be right justified as it is on the other tabs.

### IMPLEMENTATION REPORT
- Cause: the card's front action row is `justify-content:space-between` with Live Results on
  the left and Vote on the right. On the Live Results tab the Live Results link is hidden
  (`display:none`), so Vote became the row's only item and sat at the left.
- `src/public/site.css`: one rule — `.card-front .actions .vote-btn{ margin-left:auto; }` —
  keeps Vote on the right edge whether or not the link is present. No markup or script
  change; card and page suites pass.

## FIX018
[x] Implemented
The webapp is currently in a state where one browser window shows one poll card on "Live Results", and another browser window shows no poll. 
Is this a result of refresh limiting, or is it a bug?
See screenshot designDocs/dontTrack/liveresults01.jpg.

### CLARIFICATIONS
**Not refresh limiting — a gap between two levels of state.** The Live Results registration
(which polls a user watches) is kept on the server per *session* (FR-029), so both windows
share it. But each browser window kept only its own copy of the list, and a window that had
not itself pressed Live Results never asked the server: opening its tab with nothing held
showed "Press Live Results on a poll to watch it here." at once. The same gap made the tab
come back empty after a page reload, even though the registration was still live. So: a bug,
fixed as below. (One thing that *is* the floor: two windows of one session both visibly on
Live Results share one live floor — 2 s per session — and take turns; a window in the
background pauses, as the spec requires, and does not compete.)

### IMPLEMENTATION REPORT
- `src/public/liveResults.js`: when the tab is opened (or the window becomes visible on it)
  with nothing held and the visitor signed in, it asks the server once with an empty version
  map (`restore()`). A registration answers with the session's polls: they are rendered, the
  overlay filled (FIX011) and the tab opens with its timer; no registration (`403`) leaves the
  prompt and changes nothing else. A refusal for the shared live floor is asked again after
  the named wait. The periodic schedule gained up to 150 ms of jitter so two visible windows
  alternate instead of one always arriving first.
- Server unchanged: `/api/live/refresh` already answered for the session.
- Test (`tests/client-home.test.ts`): a window opened before anything is registered asks once
  and keeps the prompt; after another window adds a poll it shows that poll on its next visit
  to the tab and refreshes it; a reload of the first window brings the poll back. The browser
  test helper now records each request's status. Full suite: 40 files, 606 tests passing.

## FIX019
[x] Implemented
I think we still have a related problem.
The screenshot at designDocs/dontTrack/liveresults02.jpg shows two browser windows, both on the "Live Results" tab.
One window shows 3 poll cards and the other shows 2 poll cards.
Also, the "refresh" iocon is disabled on both windows.
It has been in this state for several minutes now.

### IMPLEMENTATION REPORT
**Cause of the differing lists.** Two windows of one session share one Live Results floor
(2 s per session), so their refreshes take turns — but the turns were rigged. After a refusal
(`429`, the other window had just been served) the refused window scheduled its next attempt
a **whole interval** later (`schedule()` clamped every wait to the floor), while the served
window's timer fired exactly when the floor reopened. The served window therefore arrived first
every time; the other was refused every time, for as long as both stayed visible. Its list
stayed whatever it last held — two polls against the other's three — and the FIX018 jitter
could not help, because it was added on top of the clamp.

**Fix** (`src/public/liveResults.js`): after a refusal the next attempt is scheduled for the
moment the floor next allows (plus jitter), not a full interval later; after a served
response (`200` or `304`) the handed-back interval is used as before. Two visible windows now
alternate, each seeing the session's list within a couple of intervals. A background window
still pauses and does not compete.

**The disabled Refresh icon** was by design — Live Results refreshes itself and has no manual
refresh — but a permanently disabled control reads as something stuck. The control is now
hidden while Live Results is on screen (`tabs.js` marks the tab row with the active tab;
`tabs.css` hides it for `live`) and shown again on any other tab.

**Tests** (`tests/client-home.test.ts`): two visible windows on Live Results — one adds a
second poll, the other shows it within a few intervals, and both are served more than once;
the tab row carries `data-active="live"` there. Full suite: 40 files, 607 tests passing.

## FIX020
[x] Implemented
REPRO:
1. Open one browser window and enter search term "Public" then press Enter
2. see the search results include a poll titled "Test Public Poll"
2. open a second browser window and naviogate to the Favourites tab
3. notice that the poll titled "Test Public Poll" is not listed in the Favourites tab
4. in the search results in the firfst browser window, click the "Bookmark" icon on the poll titled "Test Public Poll"
5. notice that the poll titled "Test Public Poll" is now listed in the Favourites in the second window
6. in the first browser window, click the "Bookmark" icon on the poll titled "Test Public Poll" again to un-bookmark it
7. notice that the poll titled "Test Public Poll" is still listed in the Favourites in the second window, even though its bookmark icon is greyed out in both windows
8. clicking refresh in the Favourites tab still does not remove the poll titled "Test Public Poll" from the list, even though it is no longer bookmarked in either window
9. there a two other polls in the Favourites tab that aren't bookmarked, however that is correct because those have been voted on by the current user

See the screenshot designDocs/dontTrack/favourites01.jpg where the problem is circled in red.

### CLARIFICATIONS
**What keeps "Test Public Poll" in Favourites.** Favourites lists the public polls the user
**created**, voted in or bookmarked (FR-020). The steps show the bookmark being removed and the
server confirming the list afterwards — and the poll is still there, so a second relation
holds it. With no vote on it (0 participants), that relation is almost certainly **created by
you**: the admin account that made "Test Public Poll" is the account signed in. (The listing
was also confirmed here: a poll created through `POST /api/admin/polls` is in its creator's
Favourites at once.) The browser knows about votes and bookmarks but had no way to know about
creation — which is why FIX002 lets an un-bookmarked poll leave the tab and the server's
confirmation brings it back, exactly steps 7–8.

Why it did not show at step 3 cannot be settled from the screenshot: most likely the
Favourites copy in the second window predated the poll (a held copy is shown as is until the
next confirmation), or the poll was created before the relationship rows were written during
the 017 build-out. Either way, the rule is the specified one and the fix below makes the
reason visible, so the next such case explains itself.

### IMPLEMENTATION REPORT
- **Each card in My PRIVATE POLLS and Favourites now says why it is there**, in a quiet line
  under the totals: "Listed here: created by you · you voted · bookmarked" (or "you are
  invited"). The personal-tab lookup (`src/polls/userPolls.ts`) returns each poll's relations
  with its row; the tab response carries them in the card's overlay (`relations`, documented
  in `postman/openapi.json`); `deltaClient.js` derives the line, keeping it current with what
  the user does in the browser (a bookmark or a vote adds its word at once, an un-bookmark
  removes it); `pollCard.js` renders it and TRENDING / Search / Live Results cards never show
  it. Styled in `site.css`.
- **A removed vote now takes its relation with it** (`src/polls/store.ts`, `replaceVotes`): when
  an administrator bans a participant, or otherwise rewrites the votes, the participant's
  "voted" relation for that poll is deleted along with the vote row, so the poll leaves their
  personal tab instead of lingering with no visible reason.
- Tests: `tabs.test.ts` checks the relations in the overlay; `client-home.test.ts` checks the
  line on Favourites cards ("you voted", "bookmarked", then "you voted · bookmarked" after a
  bookmark) and its absence on TRENDING; `polls-admin-participants.test.ts` checks a ban drops
  the voted relation. Full suite: 40 files, 608 tests passing.

## FIX021
[x] Implemented
The fix to FIX020 is excellent. Just the information that was needed.  
Please remove the "List here: " prefix from the message.  
Also, please remove the "bookmarked" from the message since it is redundant with the "Bookmark" icon.

### IMPLEMENTATION REPORT
- `src/public/pollCard.js`: the line is now the bare words — "created by you", "you voted",
  "you are invited", joined with " · " — with no prefix, and a bookmark is not named (the
  star shows it). A poll listed only because it is bookmarked shows no line at all.
- The server still sends the full relations (unchanged API); only the rendering changed.
- Test updated in `tests/client-home.test.ts`; passes.

## FIX022
[x] Implemented
Now, a bit of redesign of the Poll Card.   
See the mockup in designDocs/dontTrack/pollcard02.jpg.  
The participant count line and the "created by"... line are now below the "Vote" button.  
Make the "created by"... messages in italics (not shown in the image).  
Change the "N participants voted" message to "N votes" (not shown in the image).
Also, make the minimum height of a poll card 500px. (it is now 420 px)

### IMPLEMENTATION REPORT
- `src/public/pollCard.js`: the card header is now title (with the star) and subtitle only.
  A `.card-foot` block under the action row holds the count line and, on the personal tabs,
  the "created by you · you voted" line — on the front face as in the mockup, and the same
  count line under the back face's action row so both faces stay the same height and the
  results and choices regions still line up (008 FR-004/FR-001). The count reads "N votes"
  ("1 vote"), with the "· M not yet voted" suffix unchanged for invitation-only polls.
- `src/public/site.css`: the reason line is italic; the foot has a small top margin.
- `src/public/pollCard.css`: the card's minimum height is 500px (was 420px); it still grows
  when content needs more.
- Tests: the count assertions now expect "1 vote"; the template test still finds the count on
  both faces. One timing-sensitive Live Results test was made to wait for its condition
  rather than a fixed delay. Full suite: 40 files, 608 tests passing.

## FIX023
[x] Implemented
Another couple of small tweaks to the Poll Card.  
Put the "you voted" on the same line as the "N votes" count, and right justified. The "N votes" count should still be left justified.  
The "you voted" message should be in italics. The "N votes" count should be in normal font.
If there is still a "created by you" message, and/or "you are invited" message, it should remain on its own line, right justified.

### IMPLEMENTATION REPORT
- `src/public/pollCard.js`: the card foot's first line is a flex row — the count ("N votes",
  normal weight) on the left and a new `.poll-voted` element ("you voted", italic) on the
  right, shown only when the user voted. "created by you" and/or "you are invited" stay in
  `.poll-listed-because` on their own line, right-aligned and italic; the line is hidden when
  neither applies.
- `src/public/site.css`: the row and alignment; both reason elements share the italic style.
- Tests updated in `tests/client-home.test.ts` (the "you voted" element beside the count, the
  other line hidden when there is no other reason, nothing on TRENDING). Card and home-page
  suites pass (91 tests).

## FIX024
[x] Implemented
Remove the "Bookmark" icon from the "My PRIVATE POLLS" Poll Cards.
Private polls aren't rendered on the "Favourites" tab even if they are bookmarked, so the icon is misleading.

### IMPLEMENTATION REPORT
- `src/public/pollCard.js`: a new card option `showBookmark`, alongside `showVote` and
  `showLive` — `false` hides the Bookmark button (the stylesheet's `[hidden]` rule already
  removes it from the title row) and makes a click on it a no-op.
- `src/public/tabs.js`: the My PRIVATE POLLS tab mounts its cards with `showBookmark: false`.
  Every other tab is unchanged — in particular a private poll watched in Live Results still
  shows the icon, since that is the one place a private poll can be bookmarked and doing so
  is what places it in My PRIVATE POLLS (the existing FIX04/FIX011 tests rely on it).
- Server, API and the private tab's listing rules (created / invited / voted / bookmarked)
  are untouched; an existing bookmark on a private poll is harmless.
- Test: `tests/client-home.test.ts` now asserts the private-tab card's button is hidden while
  the Live Results copy of the same poll keeps it. Home-page (28) and card-asset (63) suites pass.

## FIX025
[x] Implemented
We overlooked giving the user a way to remove a Poll from the Live Results tab.
Please add an "X" icon to a Poll Card when it is on the Live Results tab.  
Of course, clicking the 'X' will remove the Poll Card from the Live Results.
The appearance of the 'X' will look exactly like the 'X' icon that appears on the "Edit Profile" card (/profile route).
The icon will at the top right corner, as expected. This placement will push the "Bookmark" icon over to the left a bit. 
Note: on all the other tabs the "Bookmark" icon will not be moved.

### IMPLEMENTATION REPORT
- `src/public/pollCard.js`: a `.card-close-btn` button follows the Bookmark button in the
  title row — the same markup and `.icon-btn` style as the profile card's close control in
  `cardShell.js` (28px bordered round-cornered button, 14px stroked X), labelled "Remove from
  Live Results". Two new card options, `showClose` and `onClose`; the button is hidden unless
  `showClose` is true, so on every other tab nothing changes and the Bookmark icon keeps its
  corner.
- `src/public/site.css`: the X takes the corner nudge the Bookmark icon has, and its negative
  left margin cancels the Bookmark's, so the two sit the row's normal 8px gap apart.
- `src/public/liveResults.js`: the tab's grid passes `showClose: true` and `onClose:
  removePoll`. `removePoll` is a refresh-kind request like adding a poll (`DELETE
  /api/live/:pid`, already in the API and `openapi.json`); a click with no token left is
  told how long to wait and sends nothing. The server's answer — what the session still
  watches — replaces the tab's order. Removing the last poll leaves the tab open on its
  "Press Live Results on a poll to watch it here." line with the refresh timer stopped.
- Server unchanged.
- Test: `tests/client-home.test.ts` — the X is hidden on TRENDING and shown on Live Results;
  pressing it sends the DELETE, drops the card, updates the server's registry, keeps the tab
  active; removing the last poll shows the empty line and sends no further refreshes.
  Home-page, card-asset and live-results suites pass (97 tests).

## FIX026
[x] Implemented
The use of "Bookmark" and "Favourite" are used interchangeably in the UI.  
To avoid confusion, the term will now consistently be "Favorite". (U.S. spelling)  
"Bookmarked" becomes "Favorited".  
The tooltip that is currently "Bookmark" changes to "Add to Favorites".  
The tooltip that is currently "Un-Bookmark" changes to "Remove from Favorites".  
aria labels will similarly be renamed.
There is no need to change .ts, .js code or comments.
Only make changes to the UI that the user sees.
Please ask for clarification if it isn't clear if something in the repo should be changed for this fix.  

### IMPLEMENTATION REPORT
Four strings are all a user sees; each is renamed, nothing else touched:
- `src/public/index.html`: the tab label "Favourites" → "Favorites".
- `src/public/pollCard.js`: the icon's tooltip and aria-label — "Bookmark" → "Add to Favorites",
  "Un-bookmark" → "Remove from Favorites" (the template's initial value and the live one).
- `src/public/tabs.js`: the cap notice — "…maximum number of bookmarks…" → "…maximum number of
  Favorites…".
- Nothing on screen said "bookmarked" (FIX021 removed it from the reason line), so "Favorited"
  has no occurrence to replace.
- Left as-is by the instruction (code, not UI): identifiers and CSS classes (`bookmark-btn`,
  `data-tab="favourites"`), the `/api/polls/:pid/bookmark` route, the `bookmark-cap` error code,
  `openapi.json`, comments, and the `bookmarks` table.
- Tests: the six aria-label assertions in `tests/client-home.test.ts` updated; home-page and
  card-asset suites pass (92 tests).

## FIX027
[x] Implemented
When the user has reached the maximum number of Favorites, and clicks the "Add to Favorites" icon on a Poll Card,  
a modal dialog will appear with the message: "You have reached the maximum number of Favorites. The limit is ###. Please remove a poll on the Favorites tab before adding another."

### IMPLEMENTATION REPORT
- `src/routes/pollsApi.ts`: the `409 bookmark-cap` refusal now carries `limit`
  (`ENV_MAX_BOOKMARKS_PER_USER`), so the message names the figure the server enforced rather
  than one the browser assumed. `postman/openapi.json` documents the new property.
- `src/public/tabs.js`: a small `Tabs.modal(text)` — a fixed backdrop with a centred
  `role="dialog"` box and one OK button; OK, Escape and a click on the backdrop dismiss it, focus
  moves to the button and returns afterwards. The cap branch of the bookmark toggle opens it with
  the specified wording (the limit from the response) instead of the passing notice. The card
  stays unmarked, as before.
- `src/public/tabs.css`: `.modal-backdrop` / `.modal` styles, in the idle prompt's idiom
  (paper-raised box, `--line` border, 12px radius).
- Tests: `tests/bookmarks.test.ts` asserts `limit` on the 409; `tests/client-home.test.ts` has
  a browser test at a cap of 1 — the refused click opens the dialog with the exact message, the
  button stays unpressed, OK removes the dialog. Bookmark, OpenAPI-contract and home-page suites
  pass (49 tests); `tsc` clean.

## FIX028
[x] Implemented
When the user has reached the maximum number of "Live Results" polls, and clicks the "Live Results" link on a Poll Card,  
a modal dialog will appear with the message: "You have reached the maximum number of polls that can be viewed on the Live Results tab. The limit is ###. Please remove a poll on the Live Results tab before adding another."
A related fix, please add the tooltip "Add to Live Results" to the "Live Results" link on a Poll Card.

### IMPLEMENTATION REPORT
- Behaviour change, stated for the record: until now a full tab *evicted* its oldest poll on
  the next add (017 spec, US4). A refusal with this message cannot coexist with that, so the
  eviction is gone: `src/live/registry.ts` refuses when the list already holds
  `ENV_MAX_LIVE_RESULTS_PER_USER` other polls. Re-adding a poll already on the tab still moves
  it to the top. Removal (FIX025's X) is the way to make room.
- `src/routes/tabsApi.ts`: `POST /api/live/:pid` answers `409 { error: "live-cap", limit }`;
  `postman/openapi.json`, `contracts/api-endpoints.md`, `contracts/ui-contracts.md` and the
  `CLAUDE.md` env table say so.
- `src/public/liveResults.js`: on the 409 the tab opens FIX027's `Tabs.modal` with the specified
  wording, the limit taken from the response; the tab is left as it was.
- `src/public/pollCard.js`: the Live Results link carries `title="Add to Live Results"`.
- Tests: `tests/live-results.test.ts` — the LRU test now expects the 409 with `limit: 3`, the
  list unchanged, and a successful add after a removal. `tests/client-home.test.ts` — at a cap
  of 1, the second add opens the dialog with the exact message, the tab keeps its one poll, OK
  closes it; the tooltip is asserted. Live-results, OpenAPI-contract and home-page suites pass
  (52 tests); `tsc` clean.

## FIX029
[x] Implemented
Please center the message:  
"Enter your search terms in the 'Search CrowdPoll' field above."  
Keep the message in the same font size and color as it is now.  
Keep the box it appears in the same.

### IMPLEMENTATION REPORT
- `src/public/tabs.css`: one rule — `.tab-panel[data-panel="search"] .tab-empty{ text-align:center; }`.
  Font, colour, padding, background and radius of the box are untouched.
- The Search tab writes its other two lines ("No polls match your search." and "More results are
  not shown…") into the same element, so they are centred as well; the other tabs' "Nothing here
  yet." lines are unchanged. Say so if either should differ.
- No script or test change.

## FIX030
[ ] Implemented


# USAGE

Create a Level 2 section, i.e. "## FIX???" describing the code change required.
Then prompt the AI as follows:
```
Please implement the change described in Section ## FIX029 of:
specs/017-SEARCH-AND-SCALABILITY-DATABASE/fix.md.
If clarifications are required, enter the questions in the same Section "## FIX029",  
under "### CLARIFICATIONS".  
If there are various options, or you have a recommendation, please describe them in the same Section "### CLARIFICATIONS".  
[...]
After implementation of the small update is complete, enter a short implementation report in the same Section "## FIX029", under "### IMPLEMENTATION REPORT".
Finally, under the "## FIX029" section, to prepare for the next fix, create the next Level 2 section as follows:
## FIX030
[ ] Implemented


```

Note: after executing the prompt a few times, CC CLI will accept a prompt of simply "FIX???" to continue with the next fix, and will automatically create the next Level 2 section for you.

# Exclusions