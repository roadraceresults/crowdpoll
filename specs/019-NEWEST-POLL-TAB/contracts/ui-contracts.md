# UI Contracts: Newest Poll Tab

What the Newest tab shows and does, stated as behaviour the tests and the quickstart can
observe. This document **supersedes the Newest row and the "Newest" section of
`specs/018-TAB-BAR/contracts/ui-contracts.md`** (the do-nothing tab, disabled Refresh, no
message). Every other part of 018's contract — the bar, the icons, the rule, the order, the
labels — is unchanged and still governs; 018's file is not edited (its spec gains a one-line
note). Trending's behaviour in `specs/017-SEARCH-AND-SCALABILITY-DATABASE/contracts/ui-contracts.md`
is the reference wherever this document says "as Trending".

Client files: `newest.js` (new; the controller), `index.html` (one script tag), `tabs.js`
(one bucket entry, one deleted placeholder). `pollCard.js`, `deltaClient.js`, `trending.js` and
`tabs.css` are not written.

## The tab

| Label | `data-tab` / `data-panel` | Guests | Refresh control while open |
|---|---|---|---|
| Newest | `newest` | allowed | **available** — disabled only while the tab's allowance is spent (018 disabled it permanently) |

- Markup, icon, label, position and the panel `section.tab-panel[data-panel="newest"]` with its
  `.card-grid` and `.tab-empty` are exactly as 018 delivered them.
- Trending remains the tab selected on arrival, after a browser refresh, and when a guest is
  moved off a personal tab by a sign-out. Newest stays open through a sign-in or sign-out.

## The grid

- Cards are created by `Tabs.createGrid(panel .card-grid, { showVote: true, showLive: true, tab: "newest" })`
  — the same options as Trending: Vote, Live and Bookmark controls, the card's front and back,
  the live bars.
- Order is the counts object's order; content is the cards object's; counts are the counts
  object's — applied through `DeltaClient.apply(state, { counters, order, membershipVersion, cards? })`
  as Trending does.
- **Empty state**: when the counts object lists no polls, `.tab-empty` shows
  `No polls have been launched yet.` (via `Tabs.emptyState("newest", …)`) and the grid is empty;
  when it lists polls, `.tab-empty` is hidden with empty text.

## Requests and timing

Base: `config.trendingBaseUrl` (the CDN base, or `/api/trending`). Objects:
`<base>/newest-counts.json`, `<base>/newest.json`, fetched with `cache: "no-cache"` (ETag
revalidation).

| Interaction | What happens |
|---|---|
| **First activation, no copy** | fetch counts; if `membershipVersion` differs from the held one or no cards are held, fetch cards; apply; for a member, fetch the overlay |
| **First activation, copy younger than `newestRecomputeIntervalMs`** | apply the copy at once (render), `state.receivedAt = copy.receivedAt`; for a member, fetch the overlay; then fetch counts (and cards only on a membership change) |
| **First activation, copy older** | fetch as with no copy |
| **Page load throttled (`window.TooManyLoads`)** | apply the copy regardless of age; show "You are refreshing too quickly."; hold the tab off for 60 s; no fetch |
| **Re-activation (tab click)** | render the held state; fetch counts only if `Date.now() - state.receivedAt > Tabs.manualFloorMs()` |
| **Refresh control** | `refresh()`: proceeds only if the `newest` bucket has a token (`Tabs.canRequest("newest")`), spends one, fetches counts (+ cards on change), applies, fetches the overlay; with no token the control is disabled by `updateRefreshButton` (re-enabled when a token returns), nothing is sent and no notice is shown — as on Trending |
| **Return to the window** | nothing (no `confirmIfStale`) |
| **Sign-in / sign-out** | `reset()`: clear the overlay, reapply every held card, fetch the overlay again (a no-op for a guest) |
| **Counts fetch fails or is `503`** | nothing applied; the held state stays; no notice |
| **Cards fetch fails after a membership change** | nothing applied (the counts are not applied without their cards); the held state stays |

Bucket: `KIND_OF.newest = "newest"` — capacity `bursts.refresh`, one token back per
`floors.refresh` (stretched as responses dictate). Newest interactions never carry a token of the
`refresh` bucket except the overlay call, which is a `refresh`-kind request as for Trending.

## The browser copy

`sessionStorage["newest:copy"] = { counts, cards, receivedAt }`, saved after every apply;
storage errors are swallowed (the tab refetches next time). Cleared by nothing in this feature
(session storage ends with the tab).

## Cross-tab behaviour (inherited, no new code)

- A vote or bookmark made from any tab updates the Newest copy of the same card at once
  (`Tabs.applyVote`, `updateOverlayEverywhere` iterate every registered controller with a
  `state` and `grid`).
- A bookmark placed from a Newest card lands in Favorites from Newest's copy (`heldCopy`).
- `Tabs.overlayOf(pid)` may answer a card's overlay from another tab's state before the Newest
  overlay call returns, as for Trending.

## What the browser must never do on Newest

- Send a dynamic request for the listing itself (no `POST …/refresh`, no floor token, no budget).
- Fetch the cards object when the membership version is unchanged and cards are held.
- Render a stale copy on load when it is older than `newestRecomputeIntervalMs` (unless throttled).
- Log anything new to the console.
