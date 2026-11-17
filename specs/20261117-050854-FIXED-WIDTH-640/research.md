# Research: Fixed Width 640

Every product choice was settled in the requirements report (10 findings) and the spec. The points below are the
technical decisions, each checked against the code as it is on branch `481-640px`.

## R1. Two fixed widths in `viewportWidth.js`

**Decision**: the constant `FIXED_WIDTH = 480` becomes a function of the held width:

| `heldWidth()` | fixed width |
|---|---|
| `< 480` | 480 |
| `480` | none (device content) |
| `> 480` and `< 640` | 640 |
| `>= 640` | none (device content) |

`apply()` and `fixedContent()` take the width from it; everything else in the file (the held side by orientation, the
three listeners, writing the meta only when the content changes, the two `text-size-adjust` properties) stays.

**Rationale**: FR-001 to FR-005. Exactly 480 keeps the device content because that is today's behaviour (contract V2
of the fixed-viewport feature, row 480 × 900) and FR-003 says so; at that width the device's own layout already is the
480 px phone layout.

**Alternatives considered**: one constant 640 for every device under 640 (rejected by finding AM1: a 360 px phone
would be drawn at 56%); a setting (`ENV_*`) for the widths (rejected: FR-022, and the earlier feature's V5 "it reads no
setting").

## R2. The iOS focus-zoom guard follows the width in force

**Decision**: `maximum-scale` is `ceil(heldWidth / fixedWidth × 10000) / 10000`, with `fixedWidth` 480 or 640.

**Rationale**: FR-006. The guard works by leaving the zoom nowhere to go beyond the fitted scale, so it must be the
fitted scale of the width actually declared. Only iOS gets it, as today. iOS devices in the 481–639 band are small
iPhones held sideways (568 px); iPads are 744 px and wider.

**To verify on a device**: quickstart §4.

## R3. One boundary, 640 px inclusive, by re-labelling every query

**Decision**: every media query that today reads 480 or 639.98 is re-labelled so that a single boundary remains:

| Today | After | Where |
|---|---|---|
| `(max-width: 480px)` | `(max-width: 640px)` | `m3-tokens.css`, `phone-m3.css`, `phone-card-m3.css`, `phone-admin-m3.css` |
| `(max-width: 639.98px)` (with or without the space) | `(max-width: 640px)` | `admin.css`, `back-arrow-m3.css`, `back-to-top-m3.css`, `footer-m3.css`, `header-fixed-m3.css` (2), `header-single-column-m3.css`, `header-tab-bar-m3.css` (2), `legal-m3.css`, `pollCard-m3.css` (2), `single-column-m3.css` (2), `site.css`, `tabs.css` |
| `not all and (max-width: 639.98px)` | `not all and (max-width: 640px)` | `header-single-row-m3.css` |
| `(min-width: 640px)` | `(min-width: 640.02px)` | `legal-m3.css` |

**Rationale**: this is what makes FR-021 and FR-009 hold by construction rather than by inspection. Today a viewport of
480 px or less matches both families of blocks. After the re-labelling a viewport of 640 px or less matches exactly the
same blocks, in the same order, with the same declarations. So:

- a 480 px page computes exactly the styles it computes today (FR-021);
- a 640 px page computes the same styles as the 480 px page, differing only where a value depends on the width
  (percentages, `1fr`, `calc(100% - …)`), which is what "the same layout in a wider frame" means (FR-009, FR-011);
- a viewport of exactly 640 px is on the phone side everywhere (FR-008, FR-020).

`640.02px` mirrors the existing `639.98px` convention for the first width on the other side.

**Alternatives considered**: `(max-width: 640.98px)` / `(min-width: 641px)` (no gain; the existing convention is the
0.02 px step); range syntax `(width <= 640px)` (not used anywhere in the project).

## R4. Width caps and edges at 640 px

**Decision**: no new rule is needed for the content to fill the 640 px frame.

**Rationale** (FR-011), checked in the sheets:

- `phone-m3.css` already sets `.container{ padding-inline:16px }` and
  `.card-viewport, .card-viewport.card-shell-viewport, .poll-admin-card, .admin-search{ width:100%; max-width:none; margin-inline:0 }`,
  and `.legal-doc{ max-width:none }`; the admin result list is `width: min(840px, 100%)`. At 640 px these give 608 px.
- The buttons under the tab bar are placed by `phone-m3.css` at `left:16px` / `right:16px`, not by `--tab-edge`, so the
  older `--tab-edge: max(14px, calc((100% - 420px) / 2))`, which would be 110 px at 640, places nothing in the phone
  layout. No other sheet reads `--tab-edge` (only `single-column-m3.css` does).
- `.page{ min-width:480px }` stays: it is the floor for a desktop window under 480 px (spec assumption) and is below
  640, so it does nothing in the 640 px page.

**To verify by eye**: quickstart §2 lists the elements whose width must be 608 px, and any element still centred at
420 px is a defect to fix in the phone layer that owns it.

## R5. Scripts ask the same query

**Decision**: `PHONE_LAYOUT_QUERY` in `pollCard.js`, the literal in `isPhoneLayout()` of `adminCard.js`, and
`PHONE_QUERY` in `headerFit.js` become `(max-width: 640px)`.

**Rationale**: FR-016, FR-020. `headerFit.js` only uses its query to skip the header ladder on the phone side; with the
boundary moved it must move too, or a 640 px page would run the ladder against the phone header.
`tabBarScroll.js` keeps `(max-width: 900px)`: it is the tab bar's own breakpoint and is not a phone boundary.

## R6. What is removed, and what cannot be

The requirements (finding AM2, A) say the older 481–639 px rules become unreachable and are deleted, naming
`single-column-m3.css`, `header-single-column-m3.css`, the `639.98px` blocks, `--single-column`, `isSingleColumn()` and
`singleColumnBarLayout()`. Reading the sheets shows that is only partly true, and the plan follows the code:

**Removed (provably dead once the phone query is 640 px)**

- `:root{ --single-column:1 }` in `single-column-m3.css`, and in `pollCard.js` `isSingleColumn()`,
  `singleColumnBarLayout()`, `SINGLE_COLUMN_BAR_HEIGHT`, `SINGLE_COLUMN_GAP` and the comment above them;
  `defaultBarLayout` becomes `measuredBarLayout`. Proof: the marker is 1 only at 640 px and less, where
  `isPhoneLayout()` is true, and both callers (`pollCard.js` lines 1099 and 1103) take the phone layout before they
  reach `layoutFor`.
- Declarations in the former `639.98px` blocks that a phone layer overrides for the same elements and property
  (for example the `× 0.75` font sizes and 21 px / 24 px control sizes of the compact card, the 14 px gutters, the
  `--tab-edge` rule of R4). The rule for deciding is contract B4.

**Kept (the phone layout depends on them)**

- The two files themselves. `single-column-m3.css` also holds the search tab's field (unconditional) and the whole
  tab bar for 900 px and less, which the wide layout uses from 641 to 900 px. `header-single-column-m3.css` also holds
  unconditional rules.
- Declarations in the former `639.98px` blocks that no phone layer overrides, because the phone layout was built on
  top of them: hiding the header's navigation, user name and search box; showing the search button and the search
  tab's field; the one-column card grid; cards that grow instead of scrolling; the hidden arrow rows; the maximize
  hint; the container's top padding under the fixed header; the legal page's Back bar in the page flow.

**Rationale**: FR-019 asks that no viewport shows the older layout and that its rules are gone. After R3 no viewport
can show it, and what remains of those blocks is, by definition, the part of the phone layout that was never moved
into the phone layers. Deleting the files would break the phone layout at every width and the tab bar up to 900 px.

**Risk control**: the pruning is its own phase, after the layout is verified, and is behaviour-neutral by
construction (B4 removes only overridden declarations). Before and after it, the 480 px and 640 px pages must be
identical (quickstart §6). A declaration in doubt stays.

**This is a deviation from the wording of the requirements' Resolved Findings (AM2), not from the spec's outcome**;
it is repeated in the plan's summary so the developer sees it.

**Pruned declarations (T034, 2026-11-17)**. Listed only where a phone layer declares the same property on the
identical selector text (so conditions 2 and 3 of B4 hold without judgement), neither side is `!important`, and
every page that loads the older sheet loads the layer. The override is in `phone-m3.css` in every row. Every other
declaration in the re-labelled blocks stays, including ones a phone layer may override through a different selector.

| Sheet | Selector | Property (old value) | Phone-layer value |
|---|---|---|---|
| `site.css` | `.site-header` | `gap` (12px) | 16px |
| `site.css` | `.header-actions` | `gap` (8px) | 16px |
| `site.css` | `.brand-logo` | `height` (32px) | 36px |
| `site.css` | `.brand-wordmark` | `height` (32px) | 36px |
| `admin.css` | `.poll-admin-card`, `.admin-search` | `padding` (14px) | 20px (block removed) |
| `header-fixed-m3.css` | `#site-header`, `.tab-bar-wrap` | `padding-inline` (14px) | 16px (block removed) |
| `back-arrow-m3.css` | `.back-arrow-bar` | `padding-inline` (14px) | 16px (block removed) |
| `back-to-top-m3.css` | `.back-to-top-fab` | `left` (14px) | 16px (block removed) |
| `footer-m3.css` | `.site-footer` | `width` (calc(100% - 28px)) | calc(100% - 32px) (block removed) |
| `header-single-column-m3.css` | `.site-header` | `margin-bottom` (8px), `padding-top` (3px) | 0, 0 (rule removed) |
| `header-single-column-m3.css` | `.brand-logo`, `.brand-wordmark` | `height` (24px) | 36px (rule removed) |
| `header-single-column-m3.css` | `.avatar-menu-create-poll-reason` | `font-size` (label-medium token) | the same token |

`tabs.css`, `header-tab-bar-m3.css` and `single-column-m3.css` lost nothing: no declaration there met the rule.

## R7. Tests

**Decision**: tests are updated first, then the code (Constitution IV).

- `client-viewport-width.test.ts`: `FIXED` becomes two expectations; new rows for 481, 540, 600, 639 portrait, 568
  landscape (both reporting styles), 640 portrait; the rotation sequences 480-page → 640-page → 480-page and
  640-page → device → 640-page; `maximum-scale` for iOS at 568; no meta write when the decision is unchanged.
- Sheet tests that quote a query (`phone-sheets`, `single-column-sheets`, `single-row-header-sheet`,
  `header-fixed-sheet`, `back-arrow-sheet`, `back-to-top-sheet`, `client-footer`, `client-search-tab-field`,
  `admin-search-assets`, `legal-pages`, `tab-bar-assets`, `m3-assets`) and the helpers `phone-page.ts`,
  `single-column-page.ts`, plus `client-admin-wizard`, `client-phone-card`: the literal changes; assertions about
  declarations pruned in R6 are removed with them.
- One new guard in `phone-sheets.test.ts`: no file in `src/public` (`.css`, `.js`) contains `639.98px` or
  `max-width: 480px`, and the only `min-width` boundary beside it is `640.02px`. This is the available guard for the
  breakpoint being a repeated literal (CSS custom properties cannot be used in a media query).
- `single-column-page.ts` loses its separate 480 query: one flag means "phone layout".
- `m3-assets.test.ts` `LAYER_ORDER` does not change: no sheet is added, removed or reordered.

jsdom has no layout and does not evaluate media queries against a real viewport, so the appearance is checked by hand
(quickstart).

## R8. Width-dependent values inside the phone rules

**Decision**: audit, during implementation, every value in the rules that now apply at 640 px which depends on the
viewport width, and fix only real defects.

Found so far: `clamp(18px, 1.8vw, …)` for the line graph's title (18 px at both widths, no change);
`perspective-origin:50% 320px` (vertical, no change); `min(375px, 100%)`, `min-width:280px` menus (fit in both);
`.actions-menu{ max-width:400px }` (fits in both). None needs a change.

## R9. Nothing on the server

**Decision**: no route, schema, setting, cookie, storage key or `postman/openapi.json` change (FR-022). No new file in
`src/public`, so no page head and no `LAYER_ORDER` change.

## R10. Documents

**Decision**, after implementation (Constitution, Documentation Deliverables):

- `ARCHITECTURE.md`: the viewport rule section (two widths, the new diagram) and the phone layout section
  (`max-width: 640px`, "from 481 to 639 px the older rules apply" removed, `--single-column` removed).
- `README.md` line 144: a phone, small tablet or folding phone is laid out 480 or 640 px wide and scaled to fit.
- `CLAUDE.md` and `CLAUDE_COMPLETE.md`: the decisions "480px only", "nothing changes at 481 px and wider",
  "`--single-column` stays" and `isPhoneLayout()`'s query are replaced by this feature's.
- Earlier features' specs and contracts are history and are not edited; this feature's contracts supersede
  `FIXED-VIEWPORT-WIDTH/contracts/viewport.md` V2 and V5 and `PHONE-LAYOUT-REDESIGN/contracts/phone-layout.md` P1.
