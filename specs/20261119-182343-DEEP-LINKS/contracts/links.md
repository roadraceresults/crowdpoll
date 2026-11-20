# Contract: Links and Addresses

The rules the server routes and `tabs.js` / `searchTab.js` keep. Each has a test.

| # | Rule | Spec |
|---|---|---|
| L1 | While a poll is maximized at `/`, the address is the tab's address plus `PID=<pid>`; other parameters (`tab`, `q`) are kept. | FR-001 |
| L2 | Every close removes `PID` and nothing else. A tab change removes `PID` and, unless the new tab is `search`, `q`. | FR-002 |
| L3 | A maximize from a card pushes exactly one history entry, whose address holds `PID`; a landing pushes none. The browser's Back from a card's maximize returns to the address without `PID`; from a landing it leaves the page. | FR-003 |
| L4 | `GET /?PID=<pid>[&tab=<t>][&q=<terms>]` with a session redirects to `/?open=<pid>&tab=<chosen>[&q=<terms>]` when the caller may see the poll, `<chosen>` being `chooseTab` (data-model); otherwise as today (`/?notice=unavailable`, or `/?tab=shared-with-you&notice=unpublished`). `q` is passed on only when `<chosen>` is `search`. | FR-004, FR-007–FR-011, FR-018 |
| L5 | `tab` values are checked against `LANDING_TABS`; any other value, and a missing `PID`, are ignored. `LANDING_TABS` equals `TAB_NAMES`. | FR-006 |
| L6 | Opening a link writes nothing beyond today's `linked` view of an "Anyone with the link" poll; in particular no `bookmarked` row. | FR-013 |
| L7 | `GET /?PID=<pid>&tab=<t>` without a session redirects to `/poll/<pid>` (public, open or closed) or `/login?PID=<pid>&tab=<t>`. `/poll/<pid>` keeps its own address; a guest's poll there is maximized over Trending. | FR-005, FR-014, FR-016 |
| L8 | Every login path that carries `PID` carries a valid `tab` beside it, ending at `/?PID=<pid>&tab=<t>&signedIn=1`, which L4 then decides. | FR-015 |
| L9 | Running a search writes `/?tab=search&q=<terms>` by `replaceState`; Clear removes `q`. | FR-017 |
| L10 | Closing a poll a link opened, whether or not the tab's list holds it, leaves its card first in the grid, with focus on its Maximize button, until the tab's next server answer (a refresh or a search); other redraws (Watch, Remove, returning to the tab) keep it. | FR-012 |
| L11 | Links given out before this feature (`/?PID=<pid>`, invitation and login links) behave as a request with no tab. | FR-026 |
| L12 | The server logs `[link] Poll link opened: <chosen tab or notice> (asked <tab or none>)`, nothing else about the visitor. | — |
