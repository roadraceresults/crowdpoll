# UI Contracts: Refresh Mechanisms

## C1. The Refresh button's wait (`tabs.js`, `index.html`, `tabs.css`, `header-tab-bar-m3.css`)

- `#refreshBtn` is never `disabled`; while a refresh is not allowed it has `aria-disabled="true"`, and a click does nothing.
- It looks exactly as the `disabled` button did: every `:disabled` rule for `.tab-refresh` / `.tab-refresh--icon` (including the `::before` state layer) also matches `[aria-disabled="true"]`.
- While not allowed: `title` = `Refresh available in N s`, N = `Math.ceil(wait / 1000)`, updated every second; `tooltip-m3.js` turns it into the tooltip and refreshes a shown tooltip.
- When allowed: `aria-disabled` removed, `title` = `Refresh`.
- The wait is the larger of the tab's bucket wait (`nextAllowedIn`) and, when the active tab's controller has one, `refreshAvailableIn()` (C3).
- The button stays focusable in both states; its `aria-label` stays `Refresh`.

## C2. Live Results timing (`liveResults.js`)

- After a `304`: the next request waits `max(serverNextMs, backoffMs)`, where `backoffMs` doubles from `2 × serverNextMs` and stops at 10000.
- After a `200`, a vote in the tab, adding or removing a poll, and the page becoming visible (`visibilitychange` only, not window `focus`): back to `serverNextMs` (the last `nextRefreshMs`, else the live floor).
- `429` and `503` keep today's wait and reset the back-off, so the next `304` doubles from `serverNextMs` again; the idle prompt is unchanged.

## C3. Trending and Newest Refresh (`trending.js`, `newest.js`)

- Each controller exposes `refreshAvailableIn()` = `max(0, maxAgeMs − (now − state.receivedAt))`, with `maxAgeMs` from `/api/config` (`trendingMaxAgeMs`, `newestMaxAgeMs`; 10000 when absent).
- A tab click onto the tab within the recompute interval still shows the stored copy without a fetch.
