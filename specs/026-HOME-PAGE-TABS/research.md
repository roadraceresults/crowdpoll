# Research: Home Page Tabs

Each decision: what, why, what else was weighed. Code facts were read from the tree on 2026-10-05.

## R1 — The shared-link flow already exists, client-side; a "view" is the existing `linked` relation

**Finding**: A15.1 of the requirements says `GET /` redirects `/?PID=…` to `/`. It does not (`src/routes/pages.ts`
serves `index.html` for `/`). The flow lives in the browser: `tabs.js` `takeSharedPid()` strips `PID`, keeps it
in `localStorage` for a guest, `openSharedPoll()` calls `POST /api/me/polls/:pid/link`
(`tabsApi.ts`), which upserts a `linked` relation for a Private non-Invitation-Only poll, and selects My
Private Polls. `UserPollRelation` already includes `"linked"` (`schema.ts:152`), and `pollCard.js:1015` words it
"shared with you".

**Decision**: the stored form of a *view* is the existing `linked` relation. No `viewed` value is added.
Existing `linked` rows are real views and carry over to Shared With You with no conversion. The requirements'
A15.5 is read as "one more relation value" → "the existing one"; spec Assumptions are corrected.

**Why**: simplicity, and continuity — a new name would orphan every row users already have.
**Rejected**: add `viewed` and migrate `linked` → `viewed` (a data migration for a rename); keep both (two
values meaning one thing).

## R2 — The link decision moves to the server; the client hand-off is deleted

**Decision**: the decision is a pure `decideSharedLink(db, caller, pid)` returning `{ landing, recordView }`; `resolveSharedLink` calls it and writes the view when `recordView` is true, and `GET /api/me/polls/:pid` (R9) calls only `decideSharedLink`, so a read never records a view. `GET /` with a `PID` is handled by `resolveSharedLink` (`src/polls/sharedLink.ts`) before the page
is served. Outcomes redirect to `/` with one of a fixed set of landing parameters; the view is written in the
same request. `POST /api/me/polls/:pid/link`, `takeSharedPid`, `openSharedPoll` and the `localStorage` key are
removed.

Landing parameters (only these, all server-built; the client treats any other value as absent):

| Outcome | Redirect |
|---|---|
| Guest, valid UUID | `/login?PID=<uuid>` (before any lookup) |
| Invalid / absent id | serve `/` as today |
| Non-creator, published private (Anyone With The Link, or Invitation Only and invited) | `/?open=<uuid>&tab=shared-with-you` (view written for Anyone With The Link) |
| Non-creator, unpublished private reachable | `/?tab=shared-with-you&notice=unpublished` (view written for Anyone With The Link) |
| Creator | `/?open=<uuid>&tab=your-polls` |
| Public, published | `/?open=<uuid>&tab=trending` |
| Anything else (unknown, Archived non-creator, public unpublished non-creator, Invitation Only not invited, banned, caller lacks `View Polls`) | `/?notice=unavailable` |

**Why**: FR-015 requires the server to record the view while serving the link and forbids a separate browser
call; FR-017/FR-020 require identical outcomes that leak nothing, which is easiest to guarantee in one function.
The `open` parameter has no server effect, so refreshing it never writes a view.
**Rejected**: serve `index.html` with the outcome injected (the static-asset pipeline fingerprints and caches
pages); keep the client call and add server checks (two code paths, view not tied to serving).

## R3 — Carrying the poll id through sign-in

**Decision**: `parsePid` (UUID check, nothing else accepted) is the one helper. The id rides in:
`/login?PID=` → `POST /api/auth/request-login-link { pid }` / `POST /api/auth/create-account { pid }` →
`issueLoginLink(req, email, stay, pid)` → magic-link `metadata.pid` → `sendMagicLink` appends `&PID=` to the verify URL →
`GET /api/auth/verify?...&PID=` → redirect `/?PID=<uuid>` (then R2 runs) or
`/login?error=invalid-link&PID=<uuid>`. The unknown-address invitation links `…/create-account?PID=<uuid>`;
`/create-account` and `/login` redirect a signed-in visitor with a valid PID to `/?PID=<uuid>`. OAuth sets the
provider callback to `/?PID=<uuid>`.

**Why**: the magic link is commonly opened in a different browser, so browser storage cannot work, and
`session_token` is the only permitted cookie. Redirect targets are built from a validated id, never from request
data, so no open redirect. `callbackURL: "/"` in `issueLoginLink` and `magicLinkVerify` stays; the PID redirect is
applied by our own verify handler after the session cookie is set.
**Rejected**: `localStorage`/`sessionStorage` (cross-browser failure — the defect being fixed), a signed
state cookie (second cookie).

## R4 — Tab model and queries

**Decision**: each tab is one `personalTabQuery` call; `visibility` becomes optional.

| Tab | Relations | Visibility | Extra |
|---|---|---|---|
| Your Polls | `created` | none | no state filter |
| Shared With You | `invited`, `linked` | Private Poll | exclude `created_by_id = user`; sharing rule below |
| Your Votes | `voted` | none | published states + Archived; reachable-private rule |
| Watching | `bookmarked` | none | rows failing `mayWatch` dropped |

Shared With You sharing rule (A15.4): Invitation Only → only if the user is currently in `poll_invitations`
(covers old stale `invited` rows without a migration); Anyone With The Link → `linked` or `invited`. One
`WHERE` on joined columns, no per-row query. Ordering stays `max(updated_at) desc`, cap
`ENV_MAX_POLLS_SEARCH_RESULTS`.

**Why**: A14, one function, the existing `user_polls_email_updated` index. `privateTab` and `favouritesTab`
are removed (their only callers are the two routes being replaced).

## R5 — Unpublished polls and the placeholder

**Decision**: `personalListing` splits rows into publishable and not. For Shared With You a not-published,
non-owned row becomes a **redacted projection** `{ pid, notPublished: true, createdByName, activityAt }` with no
counts, overlay choices, `mayWatch` or content; it is never put through `projectPoll`/`refreshProjection`/
`readOrRebuildCounts`. Your Polls sends the full projection to the creator plus `rejectionReason` (read from the existing
`polls.poll_rejection_reason` column) only in that listing. Vote requests on unlaunched polls are already refused.

**Why**: SC-003 (zero content leaked) is only guaranteed if the redaction is the server's. Delta/versioning
(`computeDelta`) must tolerate an entry with no `contentVersion`: the placeholder carries
`contentVersion: 0` and `notPublished` so publishing flips it to a full card on the next refresh.

## R6 — `mayWatch`

**Decision**: `src/polls/access.ts` exports `mayWatch(db, caller, pid)` for the bookmark route and
`mayWatchMany(db, caller, rows)` for listings and the overlay (one `poll_bans` and one `poll_invitations` query
plus one `user_polls` query per listing, joined in memory). Rule order is the architecture's flow: `View Polls`
permission → published state → not banned → Public, or Private reachable (Invitation Only: invited or creator;
Anyone With The Link: creator or `linked`/`voted`/`invited`). The bookmark `POST` answers `404 Not found` on
`false`; `DELETE` is unchecked. The overlay entry gains `mayWatch`; the Watch control is hidden when it is `false`.

**Why**: one rule for the route, the Watching query and the future email (A20.1). Batched to avoid N+1.
**Rejected**: inline checks in each caller (drift), a per-card request (load).

## R7 — Watching keeps the row; access loss hides the poll

**Decision**: the `bookmarks` row and `bookmarked` relation are untouched when access is lost; the Watching
query filters with `mayWatchMany`. Expiry (`removeExpiredBookmarks`) is unchanged and never touches `linked` or
`invited` (a test pins it). The cap counts private watches already (it counts `bookmarks` rows).

## R8 — Invite-list shrink deletes the dropped `invited` relation

**Decision**: in `updatePoll` (`store.ts:582`), when `$set.invitedVoterList` is present, delete `user_polls`
rows with relation `invited` for this poll whose email is not in the new list, in the same transaction, before the
upsert. Seeding in `insertPoll` is unchanged. The Shared With You query's invite-list check (R4) covers rows
already stale.

## R9 — Retained card for a linked poll outside the tab's list

**Decision**: `createGrid` gains `mountRetained(pid, detail)`: mounts the card, sets `retainedDetail`, then
`maximize(pid)`. Closing already unmounts a card with `retainedDetail` (`restore`). The detail comes from a new
`GET /api/me/polls/:pid` (signed in; same predicate as the link route; `404` otherwise) returning the card
projection, counts and overlay. The landing handler first tries `grid.cardOf(pid)`; only if absent does it fetch.
Trending and Newest already pass `retainMaximized: true`. The personal grids do not (a poll un-watched or uninvited must close at once, as Favorites did): `mountRetained` pins its own card, so a render that does not list it leaves it mounted until it is closed.

**Why**: 021's retained-card mechanism already keeps a dropped poll shown, with votes and watch working
through `patchRetained`; this reuses it. **Verified** in `tabs.js` (`createGrid`, `restore`, `patchRetained`).

## R10 — Naming and wording

**Decision**: tab ids `your-polls`, `shared-with-you`, `your-votes`, `watching` (panel `data-panel`, `KIND_OF`,
`PERSONAL_TABS`, controller names, refresh routes `/api/tabs/<id>/refresh`). The `favourites` and `private`
ids/routes are retired together; `bookmark` stays in the bookmark routes, tables and the `onBookmark`
callback names (A12). "Listed because" words: `created`→ not shown in Your Polls; `invited` "You were invited";
`linked` "You opened the link"; `voted` "You voted"; `bookmarked` "You are watching". Empty states and
the tooltip "Stop watching this poll" per the spec. The Watch control keeps the `.bookmark-btn` class and
`aria-pressed` (A7) so existing styles and tests still target it; its markup swaps the tag/star for the eye
symbols; labels `Watch`/`Watching`.

## R11 — Icons and the eye symbols

**Decision**: the two SVGs in `dontTrack/` are inlined once as `<symbol>`s in `index.html` (the active one's
mask id is defined once, per A7); the card button and the tab use `<use>`. Shared With You (people silhouette)
and Your Votes (check mark) get circle-style placeholders matching the existing tab icons; Your Polls keeps the
person icon from My Private Polls.

## R12 — Tests

Updated: `tabs.test.ts`, `polls-discovery.test.ts`, `bookmarks.test.ts`, `pages.test.ts`, `auth.test.ts`,
`client-home.test.ts`, `client-maximized.test.ts`, `client-m3-header.test.ts`, `client-m3-tooltip.test.ts`,
`tab-bar-assets.test.ts`, `openapi-contract.test.ts`, `polls-vote.test.ts`, `cache-disconnected.test.ts`
(each cited "private"/"favourites"/"Add to Favorites"). New: `shared-link.test.ts` (R2 outcomes, guest identical
responses, view upsert and one-minute skip), `signin-pid.test.ts` (R3 round trip, invalid ids, unknown address,
expired link, OAuth callback), `access-may-watch.test.ts` (R6/R7), `tabs-your-polls.test.ts`,
`tabs-shared-with-you.test.ts` (R4/R5/R8, placeholder redaction, uninvite/re-invite, expiry untouched),
`tabs-your-votes.test.ts`, `client-tabs-026.test.ts` (jsdom: order, guest prompt, empty states, Watch states,
placeholder, landing handler, retained card), `client-login-pid.test.ts`, `shared-link-unpublished.test.ts` (placeholder redaction and the unpublished landing), `ui-voice.test.ts` (no first-person label in shipped pages and scripts).
