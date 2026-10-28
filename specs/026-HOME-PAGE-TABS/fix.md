# Overview: `specs/026-HOME-PAGE-TABS`

## Document History

| Record | Value |
|---|---|
| Feature directory | `specs/026-HOME-PAGE-TABS` |
| Fix file created | 2026-10-05 17:05 |
| Last updated | 2026-10-05 17:52 |

Legend: `[ ]` open · `[X]` resolved · `[-]` resolved manually (or accepted as-is) by the developer.
Tick `No Tests` to postpone this fix's automated tests; leave it empty to have them written and run as usual.

"What's next" always returns the first `[ ]` item below.

The developer is expected to create the individual fix requirements in this file, and then run the `/speckit-fix` command to have the AI implement them, one at a time.  
Each fix requirement initially carries an empty checkbox; tick it when the item is resolved or consciously accepted.  


# Fixes

## FIX01 Home Page Tabs Material 3
[X] Resolved
[X] No Tests

Question: Is there a more Material 3-compliant way to implement the home page tabs?

### RESOLUTION
Option B was chosen. The tab bar is now a tab list and Material 3 scrollable tabs.
- `src/public/index.html`: `#tabBar` is a `role="tablist"` `div` (it was a `nav`); every tab has `role="tab"`, `id`, `aria-controls`, `aria-selected` and a roving `tabindex`; every panel is a `role="tabpanel"` labelled by its tab.
- `src/public/tabs.js`: `setActiveButton` keeps `aria-selected` and `tabindex` in step, scrolls the selected tab into view and refreshes the overflow fades; arrow keys, Home and End move focus (manual activation, so moving never starts a request or sends a guest to sign-in).
- `src/public/header-tab-bar-m3.css`: icon over label, 64px tall, 90px minimum width, 24px icons, and an edge fade where tabs are cut off.
- Tests: `tests/client-tabs-026.test.ts` gained four cases (roles and panel ties, selection on click, keyboard focus without activation, the stacked size); `tests/tab-bar-assets.test.ts` now matches a tab button that carries more attributes. Tests postponed by the developer (No Tests); written, not run. `tsc` and `npm run build` pass.
- Artifacts: `spec.md` FR-034, `contracts/ui-contracts.md` C1, `tasks.md` T057.
- Not verified by a run, and not looked at in a browser: the 64px stacked tabs make eight tabs wide, so on a phone only the first few show before scrolling.
2026-10-05 17:12

## FIX02 Home Page Watching Icon

[X] Resolved
[X] No Tests

The Watching icon appears greyed out when it is enabled.

See screenshot below:
![Watching Icon Screenshot](dontTrack/watching-tab-icon.png)

### RESOLUTION
The cause was in the symbols, not the tab: `#watching-eye` hard-coded the grey `#9AA197`, and the M3 rule that recolours the other tab icons (`.tab-icon [stroke="#9AA197" i]`) cannot reach into a `<use>` shadow tree, so the eye stayed grey whatever the tab's state.
- `src/public/index.html`: both eye symbols now draw in `currentColor` (the catchlight mask is unchanged). The tab icon follows the tab's colour; the card button keeps its grey and ink from its own `color` in `site.css`.
- Tests: `tests/tab-bar-assets.test.ts` now expects `currentColor` in both symbols and no hard-coded hex. Tests postponed by the developer (No Tests); written, not run. `tsc` passes.
- Artifacts: `contracts/ui-contracts.md` C3 notes it. No requirement changed.
- Not verified in a browser; the screenshot named in the fix was not in the repository.
2026-10-05 17:20

## FIX03 Admin Page Menu Centered

[X] Resolved
[X] No Tests

Please center the admin page menu as shown in the screenshot below:
![Admin Page Menu Centered Screenshot](dontTrack/admin-page-menu-centered.jpg)

### RESOLUTION
- `src/public/admin.css`: `.admin-tab-bar` is now `width:min(420px,100%); margin:0 auto 16px; justify-content:center`, so the view tabs sit centred in the same 420px column as the cards and the Create New Poll button.
- `src/public/header-tab-bar-m3.css`: the stacked, 64px, 90px-minimum tab rules and the overflow fades written for FIX01 were scoped to `.tab-bar`, which also caught the admin tabs. They are now scoped to `#tabBar` (the home page's bar), so the admin tabs keep their text-only 48px tabs.
- Tests: `tests/client-tabs-026.test.ts` asserts the scoping and the centring rule. Tests postponed by the developer (No Tests); written, not run. `npm run build` passes.
- Artifacts: `contracts/ui-contracts.md` C1 now says the M3 scrollable layout is the home bar's only.
- Not verified in a browser; judged from the screenshot and the stylesheet.
2026-10-05 17:43


## FIX04 Help Text Not Centered

[X] Resolved
[X] No Tests

A followup to FIX03, ensuring that the help text is also centered properly.

Please center the admin page menu as shown in the screenshot below:
![Admin Page Menu Centered Screenshot](dontTrack/admin-page-menu-centered.jpg)

### RESOLUTION
- `src/public/admin.css`: `.admin-search-notice` is now `width:min(420px,100%); margin:0 auto 14px; text-align:center`, so the help line under the admin view tabs sits in the same centred 420px column as the tabs and the cards, with longer messages wrapping centred. This line also carries the empty-view text, the Search tab's prompt and search errors, so they are centred too.
- Not changed: the search form on the Search tab still spans the page width.
- Tests: one case added to `tests/client-tabs-026.test.ts` asserting the rule. Tests postponed by the developer (No Tests); written, not run.
- Artifacts: none needed. Not verified in a browser.
2026-10-05 17:52
