# Research: Deep Links

Every decision below was checked against the code on branch `deep-links` (2026-11-19).

## R1. The address of a maximized poll

- **Decision**: while a poll is maximized the address is the tab's address plus `PID=<pid>`: `/?tab=<tab>&PID=<pid>`, with any
  other parameter already there (`q`) kept. One helper in `tabs.js`, `addressWithPoll(pid)` / `addressWithoutPoll()`,
  builds both from `location`, and every writer uses it:
  - **Maximize from a card** (`setMaximizedStep`): `pushState({maximizedPid}, "", addressWithPoll(pid))`, or `replaceState` when
    a step is already held. The browser's Back pops to the entry before it, which has no `PID`: nothing to strip.
  - **A landing or a retained poll** (no step, FR-003): `replaceState(history.state, "", addressWithPoll(pid))` after `maximize`.
  - **Closing with no step** (`restore` after a landing): `replaceState(..., addressWithoutPoll())`.
  - **Dropping a step** (`dropMaximizedStep` → `onHistoryStep`): `addressAfterDrop` is read from `location.href`, which now holds
    `PID`; it is stored without it, so a tab change made in the same turn is still carried over and the poll is not.
  - **A tab change** (`showTabInAddress`) deletes `PID` with `q`, so a tab change while maximized never leaves a stale poll.
- **Rationale**: the pushed entry carrying its own address keeps the existing history rules (phone-layout R10) intact: one step per
  card maximize, none per landing; only the URL argument changes.
- **Alternatives**: `/poll/<pid>` for signed-in viewing (rejected by FR-005: it is the crawler page and has its own server route);
  a hash (`#poll=`) (rejected: the server never sees it, so a reload or a shared copy could not choose the tab).

## R2. The tab is chosen on the server when the address is opened

- **Decision**: `GET /?PID=<pid>[&tab=<tab>][&q=<terms>]` passes the requested tab to `decideSharedLink(deps, caller, pid, request)`
  (`request = { tab, hasTerms }`, both optional). The visibility decision is unchanged; only the landing tab of a shown poll is
  chosen by a new pure function `chooseTab(facts, request)` over the facts below, read in one query beside the existing ones:
  - `created` (`created_by_id === caller.id`), `private` (`poll_visibility === "Private Poll"`), `published` (`isPublished`),
    `voted` and `watching` (the caller's `voted` / `bookmarked` rows in `user_polls`, one select on `(email, poll_id)`).
  - Kept when (FR-010): `your-polls` ← created; `shared-with-you` ← private && !created (the decision has already shown it to the caller; Shared With You
    never lists the caller's own polls);
    `your-votes` ← voted; `watching` ← watching; `home | trending | newest` ← !private && published; `search` ← hasTerms;
    `live` never.
  - Fallback (FR-011): created → `your-polls`; private → `shared-with-you`; voted → `your-votes`; watching → `watching`;
    otherwise `home`.
  - The unpublished private poll keeps today's landing (`{tab: "shared-with-you", notice: "unpublished"}`), and a refused poll
    `{notice: "unavailable"}`: neither has a poll to show.
- `landingUrl` carries `q` through when the chosen tab is `search`, so the browser re-runs it.
- `LandingTab` becomes the full tab name type; `TAB_NAMES` gets a server twin `LANDING_TABS` in `sharedLink.ts`, and
  `parseTab(value)` returns one of them or `null`. A test reads both lists and asserts they agree (the `emailKeyOf` pattern).
- `/api/me/polls/:pid` calls `decideSharedLink` without a request and is unchanged.
- **Rationale**: the server already reads the poll and the caller's invitations for the same request; deciding there means the
  address, the tab behind the poll and Minimize agree from the first paint (requirements AM2), and the browser keeps no rules.
- **Alternatives**: deciding on Minimize in the browser (rejected in the requirements, AM2); testing real list membership for
  Home/Trending/Newest (rejected, AM1: costly, and stale seconds later).

## R3. The browser after a landing

- **Decision**: `init()` keeps its order (`takeLanding`, `tabFromAddress`, then the tab or the search). After `showLandingPoll`
  maximizes the poll it writes `addressWithPoll(pid)` (R1). For `tab=search`, `searchFromAddress(q)` runs first and the poll is
  maximized over the Search grid (mounted as retained when the results do not hold it).
- A guest's `/poll/<pid>` page (`applyPollPage`) keeps its own address (FR-005): `addressWithPoll` is not written there.
- **Rationale**: the only browser change is writing the address; the server already sends `/?open=&tab=`.

## R4. The retained card stays on the tab after closing (FR-012)

- **Decision**: today `restore()` unmounts a retained card (a poll the tab's list does not hold) and a test
  (`client-landing.test.ts` "closing removes it without adding it to the list") pins that. FR-012 needs the opposite: on a close
  that stays on the tab, the retained card is put first in the grid, `retainedDetail`/`pinnedPid` are cleared, and the grid
  records it as `keptPid`. `render()` skips unmounting `keptPid` (and keeps it first), so a render that is not a server answer
  — `placeFirst` after Watch, `remove`, `activate` on returning to the tab — leaves it in place. Each controller calls
  `grid.releaseKept()` just before it renders a server answer (its refresh request, the Search tab's search), which clears
  `keptPid`; that render then unmounts the card unless the server now lists it. A close that leaves the tab (`options.left`)
  still unmounts it at once. Focus returns to the kept card's Maximize button, as for any card (`leftTheTab` comes from
  `options.left` only).
  TWEAK01 extends this to a linked poll the list holds: `maximize` notes a landing's poll (no `fromCard`, no `viaHistory`)
  as `linkedPid`, `restore` puts it first as `keptPid` too, `keptCard()` no longer requires the list to lack it, and
  `render` leaves it out of the list's ordering; a card maximized from the grid still returns to its place.
- **Rationale**: FR-012 says "until the tab's next refresh"; a render triggered by an unrelated Watch or Remove must not take
  the card away. One grid field and one call per controller's server answer.
- **Alternatives**: keep it out of the grid (rejected: FR-012, and requirements IN1 relies on it for Home).

## R5. Guests

- **Decision**: `GET /` without a session keeps today's routes and adds the requested tab (validated by `parseTab`) to the login
  address: `/login?PID=<pid>&tab=<tab>`. `/poll/<pid>` ignores the tab (Trending, as today). A guest's maximized poll on `/`
  writes the address like anyone's; on reload the server sends them to `/poll/<pid>` or the login page, as today. Closing as a
  guest shows Trending: the only grid a guest lands on (FR-016), unchanged.

## R6. The tab rides through login with the poll id (FR-015)

- **Decision**: wherever the login flow already carries `PID`, it carries `tab` beside it, only when `parseTab` accepts it:
  - browser: `CardShell.sharedTab()` (beside `sharedPid()`); `loginCard.js` adds it to the provider `callbackURL` and to the
    magic-link request body; `confirmSigninCard.js` `loginHref`.
  - server: `src/auth/auth.ts` (the emailed verify link), `src/routes/api.ts` (`/api/auth/verify` redirect, the not-launched and
    invalid-link login addresses, the create-account link and its final redirect), `src/routes/pages.ts` (`/login` and
    `/create-account` when already signed in).
  - Invitation links (`/invite`, `/api/invitations/*`) carry no tab: their links are written by the server without one.
- One helper per side builds the query part (`sharedLinkQuery(pid, tab)` in `sharedLink.ts`; `CardShell.sharedLinkQuery()`), so
  each touch point changes one expression.
- **Rationale**: a requirement (FR-015), at the cost of about ten one-expression changes; a cookie or browser storage was not
  used (no new storage, and a Cookie Use row would be needed).

## R7. Search terms in the address (FR-017–FR-019)

- **Decision**: `Tabs.showSearchTerms(terms)` writes `tab=search&q=<terms>` with `replaceState` (no step); `searchTab.js` calls it
  in `submit` after the tab is selected and with the empty string in `clear`, which removes `q`. Reading `q` on load is unchanged.
  The terms stay when a result is maximized (R1 keeps other parameters) and when it closes.
- The server keeps `search` only when `q` is non-empty after trimming (R2); the search itself runs in the browser with the
  visitor's own session, as today, so it lists only polls they may see.

## R8. The Share button

- **Decision**: one new client file, `src/public/sharePoll.js` (`window.SharePoll`): `link(pid)` (origin + `/?PID=`), `copy(pid)`
  (clipboard, then the snackbar "Link copied" / "Could not copy the link"), `share(pid, title)` (`navigator.share({url, title})`
  where `navigator.share` exists, else `copy`). `share` calls `navigator.share` first thing in the tap (iOS refuses it later,
  as it does the clipboard; see `adminCard.js`). An `AbortError` (the visitor cancelled) shows nothing; any other refusal
  falls back to `copy`. The snackbar is the existing `.m3-snackbar` element, created on first use as `adminCard.js` does.
- `adminCard.js` `pollLink()` and `copyPollLink()` call `SharePoll.link` / `SharePoll.copy`, so both buttons give the same link
  (FR-022) from one place; `admin.html` loads `sharePoll.js` before `adminCard.js`, `index.html` before `pollCard.js`.
- `pollCard.js`: a `.share-btn` in the `.question-row` of both faces, before the Watch and Maximize buttons, named
  `Share poll: <title>`, with an inline share icon (three joined circles, as `image.png`) drawn like the maximize icon (stroke,
  `currentColor`). It is hidden unless the card's state is published: `WAITING TO OPEN`, `OPEN` or `CLOSED` (`PUBLIC_STATES`).
  Voters of a poll being edited see its state from before the edit (`projectPoll`), so they keep Share; the creator's own card
  shows `EDITING` and hides it until the edit ends, since the card does not carry the state before the edit.
- Styles: `pollCard-m3.css` adds `.share-btn` to the existing header-button rules (32 px wide layout); `phone-card-m3.css` adds it
  to the 48 px rules with its halo, and the title's reserved space grows by one button (`.has-share`). M3 tokens only.
- New top-level client file: the build transforms it like any other (CLIENT-CODE-OBFUSCATION); its decoder prefix
  `_sharePoll_` collides with no other file's.
- **Alternatives**: copy only (rejected, requirements NC1); a share menu of named apps (rejected: third-party requests and a list to
  maintain; the system sheet already lists the visitor's apps).

## R9. Logging

- **Decision**: the existing server line `[link] Poll link opened: <tab or notice>` becomes
  `[link] Poll link opened: <tab> (asked <requested tab or none>)`. No email, id or terms are logged. The browser logs nothing new.

## R10. Tests

- Server (vitest + embedded PostgreSQL): `chooseTab` as a table over the six visitor kinds × every tab, public and private
  (SC-002, SC-003); `GET /?PID=&tab=` redirects; the guest login address carries the tab; `parseTab` / `LANDING_TABS` agree with
  `TAB_NAMES`; opening a link writes no `bookmarked` row (SC-006).
- Client (jsdom): the address on maximize, close, Back, tab change and landing (`client-maximized-history.test.ts`,
  `client-landing.test.ts`, whose "closing removes it" case changes with R4); search terms in the address; the Share button's
  presence by state, `navigator.share` vs clipboard, cancel and refusal.
- `postman/openapi.json`: the magic-link request body gains an optional `tab` beside `pid`, and `/api/auth/verify` an optional
  `tab` query parameter; no other API route changes (`GET /` and `/login` are pages).
