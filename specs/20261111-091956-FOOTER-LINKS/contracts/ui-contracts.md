# UI Contracts: Footer Links

No HTTP route, request or response changes; `postman/openapi.json` is untouched.

## C1. Legal pages below 640 px (`legal-m3.css`)

```text
┌──────────────────────────────┐
│ [logo]            [Login]    │  fixed header, as today
├──────────────────────────────┤
│ (←)                          │  .back-arrow-bar, static, in the page flow; scrolls away
│ Privacy Policy               │  h1, full width between the site's 14 px side gutters
│ Last Updated 2026-…          │
│ ┌──────────────────────────┐ │
│ │ In short …               │ │  .legal-summary, full width
│ └──────────────────────────┘ │
│ 1. Who we are …              │
```

- `@media (max-width: 639.98px)`: `.back-arrow-bar{ position:static; max-width:none; margin:0 0 12px; padding-inline:0; }`
  and no `padding-inline-start` on `.legal-doc`.
- `@media (min-width: 640px)`: today's rule, verbatim:
  `.legal-doc{ box-sizing:border-box; padding-inline-start:max(0px, calc(56px - (100% - 72ch) / 2)); }`; the bar stays
  fixed under the header (`back-arrow-m3.css`).
- `scroll-margin-top` on `h2` and `section[id]` unchanged on every width.
- No new stylesheet; `m3-assets.test.ts`'s `LAYER_ORDER` is unchanged.

## C2. The home page's address (`tabs.js`)

| Moment | Address |
|---|---|
| logged-in visitor opens `/` | `/?tab=home` as soon as Home is shown |
| guest opens `/` | `/?tab=trending` |
| visitor selects Your Votes | `/?tab=your-votes`, `history.length` unchanged |
| `/?q=senate` | the search runs; `/?q=senate&tab=search` |
| then selects Trending | `/?tab=trending` (the terms are gone) |
| `/?open=<pid>&tab=shared-with-you` (logged in) | the tab, the card maximized; `/?tab=shared-with-you` |
| `/?tab=your-votes` as a guest | Trending shown; `/?tab=trending`; no navigation to `/login` |
| `/?tab=nonsense` | the default tab; its name written |
| `/?PID=<pid>&signedIn=1` | `app.js` strips `signedIn` as today; `/?PID=<pid>&tab=home` |

`select(name)` is the one writer; it preserves `history.state`, the hash and every other parameter.

## C3. Delete Account dialog (`profileCard.js`)

Unchanged markup: `div.delete-dialog-scrim > div.delete-dialog[role=dialog][aria-modal=true]` with the title, four
lines, the DELETE field, the status line, `button.delete-dialog-cancel` "Cancel" and `button.profile-delete-btn`
"Delete Account".

| Opened by | Cancel / Escape |
|---|---|
| `/profile#delete-account` loaded from a CrowdPoll page in the same tab (`SiteBack.canReturn()`) | dialog removed, then `history.back()`: the previous page, with its tab if it was the home page |
| `/profile#delete-account` loaded otherwise (new tab, typed, another site, no earlier entry) | dialog removed, focus on the name field, Profile page stays |
| the Profile page's own footer link (`hashchange`), including after an in-place Cancel | dialog removed, focus on the name field |

A click on the scrim does nothing. The Delete Account button and its request are unchanged.

## C4. The shared rule (`backArrow.js`)

```js
window.SiteBack = { canReturn(), leave(fallback) };
```

- `canReturn()` is fixed at load: `history.length > 1 && new URL(document.referrer).origin === location.origin`
  (`false` for an empty or malformed referrer).
- `leave(fallback)`: `history.back()` when `canReturn()`; otherwise `location.assign(fallback)` when given; returns
  whether it left.
- The legal arrow (`button#backArrow.back-arrow` in `div.back-arrow-bar` after `#site-header`, `history.go(-(legalDepth + 1))`,
  `legalDepth` in `history.state`) is drawn only when `document.body.hasAttribute("data-back-arrow")` and
  `canReturn()`; everything else about it is today's contract (`client-back-arrow.test.ts`).
- The script writes nothing to the browser console.

## C5. Admin arrow (`admin.html`, `adminList.js`)

- Markup unchanged: `<a href="/" class="admin-back-link back-arrow" aria-label="Back to the home page">`.
- A plain left click: the discard dialog when a wizard has unsaved edits (as today); once allowed,
  `SiteBack.leave("/")`: back to the page before (the home page's tab included) or `/`.
- Modified clicks, middle clicks and `target` links are left to the browser, as today.

## C6. Unchanged

The footer (`renderSiteFooter`: links, order, look, Delete Account hidden for guests), the legal texts, the Cookie Use
table, the maximized card's Back arrow (`#maximizedBack`, closes the card), the admin page's own tab memory.
