# UI Contract: one phone boundary at 640 px

This contract replaces P1's query of `specs/20261113-140600-PHONE-LAYOUT-REDESIGN/contracts/phone-layout.md`; the rest
of that contract (P2–P6) and `poll-card.md` (C1–C5, H1–H6) are unchanged and now hold for every viewport of 640 px or
less.

## B1. The queries (FR-008, FR-020)

In `src/public/*.css`:

- the phone side is written `(max-width: 640px)` (in `tabs.css`, `header-tab-bar-m3.css` and `site.css`, which write
  no space after the colon, `(max-width:640px)`);
- the wide side is written `not all and (max-width: 640px)` (`header-single-row-m3.css`) or `(min-width: 640.02px)`
  (`legal-m3.css`);
- no sheet contains `639.98px`, `max-width: 480px` or `min-width: 640px`.

The other breakpoints (`767.98px`, `900px` and the container queries) are unchanged.

## B2. The phone layers (FR-009, FR-010)

- `phone-m3.css`, `phone-card-m3.css` and `phone-admin-m3.css` are each one `@media (max-width: 640px)` block, loaded
  last, in the same order on the same pages (`LAYER_ORDER` unchanged).
- The phone type scale in `m3-tokens.css` is under `@media (max-width: 640px)` with the same values (× 1.25,
  `label-small` 15 px).
- No declaration inside these four blocks changes value for this feature, except a defect found by B5. Such a fix
  uses a width-relative value that computes to the same result at 480 px. Only when none exists, a phone layer may
  end with one further block, `@media (min-width: 480.02px) and (max-width: 640px)`, holding the fix; it is the one
  exception to "one block each", and is recorded in quickstart.md.
- `.page{ min-width:480px }` is unchanged.

## B3. The scripts (FR-016)

- `pollCard.js`: `PHONE_LAYOUT_QUERY` is `'(max-width: 640px)'`; `PollCard.isPhoneLayout()` is unchanged otherwise.
- `adminCard.js`: `isPhoneLayout()` asks `"(max-width: 640px)"`.
- `headerFit.js`: `PHONE_QUERY` is `"(max-width: 640px)"`.
- `pollCard.js` has no `isSingleColumn`, `singleColumnBarLayout`, `SINGLE_COLUMN_BAR_HEIGHT` or `SINGLE_COLUMN_GAP`;
  the card's default bar layout is `measuredBarLayout`.
- No sheet sets `--single-column` and no script reads it.

## B4. Pruning the older phone rules (FR-019)

A declaration inside a block that read `639.98px` before this feature is deleted only when all of these hold:

1. a phone layer (`phone-m3.css`, `phone-card-m3.css`, `phone-admin-m3.css`) or the phone block of `m3-tokens.css`
   declares the same property;
2. on a selector that matches every element the older selector matches in the pages that load both sheets;
3. with specificity equal or higher (the phone layers load later, so equal wins), and neither side is `!important`;
4. for a custom property, no rule reads it any more.

A rule left with no declaration is deleted; a media block left with no rule is deleted. Everything else in those
blocks stays, re-labelled per B1. The two sheets `single-column-m3.css` and `header-single-column-m3.css` stay.

The pruning changes no computed style at any width: the 480 px page, the 640 px page and the wide layout are identical
before and after it.

## B5. The 640 px page (FR-011, FR-012, FR-013, FR-015)

In a viewport exactly 640 px wide, on every page:

| Element | Width / position |
|---|---|
| `.container` content box | 608 px (16 px gutters) |
| a compact poll card (`.card-viewport`), a maximized card | 608 px |
| the header and the tab bar | full width, 16 px inline padding, fixed while the page scrolls |
| the buttons under the tab bar (refresh, menu, maximized Back) | 16 px from the frame's edge |
| `.legal-doc` | 608 px |
| the admin result list, `.admin-search`, `.poll-admin-card` (the wizard included) | 608 px |
| sign-in and account cards (`.card-shell-viewport`) | 608 px |
| `.site-footer` | 608 px |
| the document | no horizontal scroll |

In a desktop window from 481 to 639 px the same elements are the window's width minus 32 px, with no horizontal
scroll. At 641 px the wide layout shows as before the feature.

## B6. Unchanged (FR-021, FR-022)

- In a viewport of 480 px or less, and in a viewport wider than 640 px, every computed style is what it was before
  the feature.
- No HTML page, route, `postman/openapi.json`, setting, cookie or storage key changes.
