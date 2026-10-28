Start a new spec for these requirements called `019-NEWEST-POLL-TAB`.

# Overview
This requirements document specifies the high-level requirements for the contents of the "Newest" poll tab.

# Design

# Functional Requirements

## poll Table launched_at column

To support the Newest tab, the `poll` table has a new column `launched_at` of type `timestamp with time zone`.
- It is set to the current timestamp whenever a poll enters the OPEN state — including when a closed poll is re-opened by an administrator, which makes it newly launched again — except when it returns to OPEN from EDITING (with a prior state of OPEN): that is the end of an edit, not a launch, and `launched_at` is left unchanged.  
- It is set to NULL whenever a poll enters the CLOSED state.  
- No other state transition touches `launched_at`: a poll opened for editing keeps its value (and stays eligible for the tab), and a poll that an edit sends to WAITING TO OPEN keeps its stale value until it opens again, when it is re-stamped.  
- A poll inserted directly in the OPEN state (test fixtures, the populate seed) gets `launched_at = start_at ?? created_at` at insert, mirroring `closed_at = end_at ?? created_at` for a poll inserted CLOSED — so a fixture's launch order follows the timestamps it declares.
- The migration also creates a partial index `polls_home_launched` on `polls (launched_at desc, vote_count desc, id desc) where home_listable and launched_at is not null`, so the recompute reads only the first ENV_MAX_NEWEST_POLLS entries in ranking order however many polls exist; the query is added to the explain-guard test that asserts no sequential scan of `polls`.
- The migration that adds the column does not backfill it: polls that are already OPEN when 019 deploys keep `launched_at` NULL and enter the Newest tab only when they next enter the OPEN state. The tab is therefore empty (showing its empty-state message) after deploy until polls launch, and the populate seed's OPEN rows do not appear in it unless the seed sets `launched_at` itself.

## New Environment Variables

The new ENV_ variables listed below need to added to config.js, and to the launch.json.example and devScripts.example/launch-dev.ps1 templates, with the default values shown.
They are also surfaced everywhere 017's variables are: `.do/app.yaml` (production lists every ENV_ explicitly), the operator's environment-variable table in `CLAUDE.md`, `tests/config.test.ts` (defaults and validation), and `postman/openapi.json` — which gains the `newestRecomputeIntervalMs` field of the `/api/config` response, the two instance routes and the two object schemas. `/api/config` publishes `newestRecomputeIntervalMs` to the browser beside `trendingRecomputeIntervalMs`.
Validation: ENV_MAX_NEWEST_POLLS must be at least 1 and at most ENV_MAX_POLLS_SEARCH_RESULTS, so that the signed-in overlay for the whole tab fits in one `/api/me/polls` request; ENV_NEWEST_POLLS_RECOMPUTE_INTERVAL must be at least 1000 ms.

### ENV_MAX_NEWEST_POLLS
ENV_MAX_NEWEST_POLLS default 50

###ENV_NEWEST_POLLS_RECOMPUTE_INTERVAL
ENV_NEWEST_POLLS_RECOMPUTE_INTERVAL  default 60000

## Newest tab contents

The Newest tab shows a grid of polls, like the Trending tab, but with different contents.  
When the list is empty, the panel shows "No polls have been launched yet." in the same empty-state element (`.tab-empty`) and through the same mechanism Trending uses for "No polls are trending yet."; this replaces 018's rule that the Newest panel shows no message of any kind.  
A signed-in visitor's overlay for the listed polls (voted, with which choices; bookmarked) is obtained by the same single `GET /api/me/polls?pids=…` call Trending makes (017 FR-019), after each applied counts object and on sign-in or sign-out; that call is a normal refresh-kind dynamic request (floor and budget apply), and ENV_MAX_NEWEST_POLLS ≤ ENV_MAX_POLLS_SEARCH_RESULTS guarantees one request covers the whole tab. Guests make no such call. Votes and bookmarks made from any tab update the Newest copy of the same card locally, as they do for every other tab.  

Which polls are eligible (FR-015)  
- Public polls only (home_listable = true — public, and in a listable state).  
- In state OPEN, or EDITING with a prior state of OPEN — a "Newest" poll doesn't drop out of the tab because an administrator opened it for editing; it keeps showing its last published content until the edit is published.  
- Private, waiting-to-open, closed and archived polls never appear.  
  
How they're ranked  
1. Most recent launched_at.  
2. Ties by total votes (vote_count).  
3. Remaining ties by `id`, descending — so the order is deterministic and identical on every instance, and the recompute is a walk of the `polls_home_launched` index with no in-memory sort.  
  
How many, how often  
- Top 50, configurable via ENV_MAX_NEWEST_POLLS.  
- Recomputed every ENV_NEWEST_POLLS_RECOMPUTE_INTERVAL by one instance under an advisory lock; identical for every visitor. Success criterion (the counterpart of 017 SC-007): a launched poll is in the published Newest objects within one recompute interval (one minute by default) of entering OPEN, and is shown by the next Newest interaction that fetches a fresh counts object — a tab click or Refresh after the floor, or a page load whose session-storage copy has expired; the CDN copy and the session copy each add at most one interval before a given visitor sees it.
  
How it's published and served 
- Two objects on the CDN, named `newest-counts.json` and `newest.json` and stored beside the Trending objects at the same base, each cached for the recompute interval: a small counts object (ids in order, each poll's counts and counts version, and a membership version = hash of the set of ids) republished every recompute; and a full cards object republished only when the set of ids changes, never on a reorder alone.  
- The browser fetches the counts on each NEWEST interaction, and the cards only when the membership version differs; it keeps a copy in session storage and renders from it on a page load if it is younger than ENV_NEWEST_POLLS_RECOMPUTE_INTERVAL (one minute by default), which `/api/config` publishes to the browser as `newestRecomputeIntervalMs` beside `trendingRecomputeIntervalMs`, before validating it against the CDN.  
- NEWEST interactions are not dynamic requests — no server-side floor and no budget token; the CDN's cache lifetime is the server-side bound. The browser enforces the manual floor with its burst allowance (ENV_MIN_MANUAL_REFRESH_INTERVAL, ENV_MANUAL_REFRESH_BURST) from a bucket of Newest's own, exactly as it does for TRENDING (017 FR-017/FR-018). The interactions are: a click on the Newest tab renders the held copy at once and refetches the counts only if that copy is older than the manual floor; the Refresh control is available while Newest is open: it refetches when the tab's allowance holds a token, and is disabled — never a notice — while the allowance is spent, re-enabling when a token returns; a page load renders the session-storage copy first (previous bullet) and then validates it. Returning to the window adds no request of the tab's own. This supersedes 018's rule that Newest sends nothing and that Refresh is disabled on it.  
- Without a CDN (development), the same objects are served from the shared cache at `GET /api/trending/newest-counts.json` and `GET /api/trending/newest.json` (with `/api/trending/newest-counts` and `/api/trending/newest-cards` aliases, matching Trending's `/counts` and `/cards`) with ETag validation. `/api/trending/` is deliberately the one base for every published listing object: the browser reaches both listings through the `trendingBaseUrl` that `/api/config` already publishes (the CDN root, or `/api/trending`), and no second base URL is added.  
- The recompute also runs once when the sweeps start, so the objects exist before the first visitor. Until they do, the instance routes answer `503 newest-not-ready` with a `retryAfterMs`, which the browser treats as no counts received (it keeps whatever it holds and tries again on the next interaction) — exactly as Trending's `503 trending-not-ready` is treated today. With a CDN, the previously published objects keep serving until the first new PUT.  
  
  
# Assumptions



# Exclusions

