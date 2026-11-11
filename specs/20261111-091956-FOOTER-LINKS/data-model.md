# Data Model: Footer Links

The feature stores nothing on the server and adds no cookie or browser storage key (FR-016). Its state lives in the
browser's address and history entries.

## The home page's address (`tabs.js`)

| Parameter | Values | Written by | Read by |
|---|---|---|---|
| `tab` | one of `home`, `your-polls`, `shared-with-you`, `your-votes`, `trending`, `newest`, `watching`, `live`, `search` | `select(name)`, through `history.replaceState` (no new history entry) | `init`: the tab to show on load |
| `q` | search terms | nothing new (arrives from another page's search box, as today) | `init`: runs the search when no tab or `tab=search` is named; removed by `select` of any other tab |
| `open`, `notice` | as today | nothing | `takeLanding`, which strips them as today |
| `PID` and others | as today | nothing | kept untouched |

Mapping on load (`tabFromAddress`):

| Address `tab` | Signed in | Guest |
|---|---|---|
| a personal tab (`home`, `your-polls`, `shared-with-you`, `your-votes`, `watching`, `live`) | that tab | `trending` |
| `trending`, `newest`, `search` | that tab | that tab |
| absent or unknown | `home` (the default) | `trending` (the default) |

The shown tab is written back at once, so the address always names the tab on screen.

## History entry state

| Page | Key | Owner | Meaning |
|---|---|---|---|
| `/privacy`, `/terms` | `history.state.legalDepth` | `backArrow.js` (unchanged) | anchor steps taken on the page; the arrow goes back `legalDepth + 1` |
| `/` | `history.state` | unchanged | preserved by the `tab` write |

## `window.SiteBack` (`backArrow.js`)

| Member | Type | Value |
|---|---|---|
| `canReturn()` | `() => boolean` | decided once at script load: `history.length > 1` and `document.referrer`'s origin is `location.origin` |
| `leave(fallback?)` | `(string?) => boolean` | `history.back()` and `true` when `canReturn()`; else `location.assign(fallback)` and `true` when a fallback is given; else `false` |

Callers and their fallback:

| Caller | Fallback | When `canReturn()` is false |
|---|---|---|
| legal pages' arrow (`backArrow.js`) | none: the arrow is not drawn | no arrow |
| Delete Account dialog Cancel/Escape (`profileCard.js`) | none | closes in place, focus on the name field |
| admin arrow (`adminList.js`) | `/` | goes to the home page |

## Delete dialog decision (`profileCard.js`)

| Opened by | `returns` |
|---|---|
| page load with `#delete-account` and `SiteBack.canReturn()` | `true`: Cancel/Escape remove the dialog and `history.back()` |
| page load with `#delete-account`, cannot return | `false`: close in place |
| `hashchange` while on the Profile page (its own footer, a second open) | `false`: close in place |

## Page markup

| Page | Change |
|---|---|
| `privacy.html`, `terms.html` | `<body data-back-arrow>`: `backArrow.js` draws the arrow only here |
| `profile.html`, `admin.html` | load `/backArrow.js` (after `fixedChrome.js`) for the rule; no arrow drawn |
