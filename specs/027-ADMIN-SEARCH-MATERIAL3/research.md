# Research: Admin Search, Material 3

Code facts were read from the tree on 2026-10-05.

## R1 — The panel and the cards share one geometry rule

**Finding**: the card's container is `.poll-admin-card { background; border:1px solid var(--line);
border-radius:20px; box-shadow:var(--shadow); padding:16px 18px; width:100%; max-width:420px; margin:0 auto }`
with 18 px corners under 480 px and 14 px padding under 640 px (`admin.css`). The form is `margin:0 0 18px;
padding:14px 16px; border-radius:12px`, with no shadow and no width cap.

**Decision**: make the card's container rules apply to `.poll-admin-card, .admin-search` (a selector list in
`admin.css`, including both media queries), so the two cannot drift (FR-001). The form keeps `margin:0 auto
18px` (the cards' own bottom spacing is the list's `gap:18px`). The status line keeps FIX04's 420 px centred
column.

**Why**: one rule is the literal reading of "the exact same sizing". **Rejected**: copying the values into the
new sheet (two places to change); a shared custom property set (more indirection than a selector list).

## R2 — Outlined fields, not the cards' underlined fields

**Finding**: the card wizard's inputs (`.m3-field-input`, `admin-card-m3.css`) are underlined with the label
above, borrowed from `card-shell-m3.css`. FR-005 asks for outlined fields, 56 px tall.

**Decision**: follow the spec. Each field is `div.m3-outlined` holding the control and its `<label>`: a 1 px
`--md-sys-color-outline` border, 4 px corners (`--md-sys-shape-corner-extra-small`), 56 px height, the label
inside the border and *floating* over it when the field is focused or holds a value. Floating uses
`:focus`, `:not(:placeholder-shown)` (text, number: `placeholder=" "`) and always for `select` and `input[type=date]`,
whose native chrome already shows a value. Focus draws a 2 px primary border and primary label; the label sits
on the panel's own background (`var(--paper-raised)`, the cards' surface from R1) so the border appears cut.

**Why**: matches FR-005 and Material 3's outlined text field. **Recorded difference**: the wizard inside the
cards stays underlined; this is the first outlined control in the admin area.
**Rejected**: underlined fields (contradicts the spec), a label above the box (not a Material 3 field).

## R3 — Markup and preserved identifiers

**Decision**: `form#adminSearchForm.admin-search[hidden]` keeps its place and `hidden` toggling
(`paintTabs`). Inside: a vertical stack in FR-004 order of `div.m3-outlined` fields and the three radio groups (R4); each operator+value group is
`div.admin-field-pair` (operator select first, value second, equal columns (FIX06: they were 40 / 60 %, widened so "Banned users count" fits) at ≥ 320 px, stacked below). Every control
keeps its `name`; the free text keeps `.admin-search-text`; the buttons keep `.admin-search-btn` /
`.admin-search-clear` and `#adminSearchClear`; labels use `for`/`id` pairs (new ids `search-q`, `search-state`,
…). The old `.admin-search-row` wrappers go.

**Why**: `readSearchForm()` reads `FormData` by `name`, so it is unchanged; the existing tests address
`#adminSearchForm`, `[name="state"]` and `#adminSearchClear`.

## R4 — Radio groups instead of the three selects (FIX01)

**Decision**: visibility, choice mode and vote mutability are `div.admin-radio-group[role=radiogroup][aria-label]`
holding three `label.admin-radio` rows, each wrapping an `input[type=radio]` and a `span` with the option text,
sharing the original control's `name` (`visibility`, `choiceMode`, `voteMutability`). The first option is "Any" with
`value=""` and `checked`; the others carry the values the select options had (`Public Poll`/`Private Poll`,
`Single-Choice Poll`/`Multiple-Choice Poll`, `Dynamic-Vote Poll` "Vote can change" / `Final-Vote Poll` "First vote
is final"). `FormData` therefore carries exactly what the selects sent, and `readSearchForm()` is untouched.
Each group is a three-column grid (a single column under 360 px), each option at least 48 px tall; the ring is a
20 px `appearance:none` input in on-surface-variant that turns primary with a primary dot, written from the same
tokens as the card wizard's `.m3-radio` (whose rules are scoped to `.poll-admin-card`, so the panel carries its
own). Reduced motion removes the dot's transition.

**Why**: the revised design (FIX01) shows the three filters as one row of radios each, which frees about 130 px
of vertical space over three outlined selects. **Rejected**: widening the card wizard's `.m3-radio` selectors
(couples the panel to the cards' sheet).

## R5 — Every field is shown; the disclosure is gone

The revised design shows every field at once, so the More filters region, its toggle, its `sessionStorage` key,
the forced-open rule and the two motion tokens added for it were removed. **Clear** is `form.reset()` as before:
the browser puts each radio group back on its default "Any". The panel is taller than the collapsed one the
earlier design aimed for; the radio groups are what bring the height down.

## R8 — Buttons, state layers and ripple

**Decision**: **Search** is a filled button (primary fill, on-primary label, label-large type, 48 px minimum,
`--md-sys-shape-corner-full`); **Clear** is a text button (primary label, no fill, 48 px minimum). Hover, focus and pressed state layers use the existing `--md-sys-state-*-opacity` tokens through a
`::before`, as `header-tab-bar-m3.css` does; ripple through `window.M3Ripple?.add(...)` from `adminList.js`,
which `admin.html` already loads `m3-ripple.js` before. The 48 px minimum covers FR-006 and SC-003.

## R9 — The status line

**Decision**: `p#adminSearchNotice` gains `role="status"` (an implicit polite live region) in the markup; the
text style moves to the M3 layer: body-small type, `--md-sys-color-on-surface-variant`, `text-align:center`, never
boxed. The 026 FIX04's `width:min(420px,100%); margin:0 auto 14px` stays in `admin.css` with the shared geometry.
`showSearchNotice()` already sets `textContent` and `hidden`; a live region announces a text change when the
element is visible, so the existing show/hide logic is enough.

**FIX02**: the Search view's pre-search prompt ("Fill in the form and press Search.") was removed because the form is
not user facing; before a search `showSearchNotice("")` leaves the line empty and hidden. The other messages are
unchanged.

## R10 — The m3-assets allowlist and the tests

`m3-assets.test.ts` lists each page's sheets and layers, in canonical order, and fails on any other change:
`admin-search-m3.css` is added to `LAYER_ORDER` after `admin-card-m3.css` and to `admin.html`'s layers.
`admin-search-m3.css` must not declare any literal `font-size` (type comes from tokens) and has no dark `@media`
twins. New and changed tests:

- `tests/client-admin-search.test.ts` (jsdom): every control has a visible `<label>`; the field order; preserved
  names, ids and classes; the panel is hidden outside Search; the three radio groups (names, values, Any chosen,
  an accessible name, no select left); every field shown with no disclosure; the search query and its results
  unchanged, radio choices included; a group left on Any sends nothing and Clear puts every group back on Any.
- `tests/admin-search-assets.test.ts` (static): the card and the panel share one geometry rule (both selectors in
  one rule, including both media queries); field height 56 px and 48 px buttons; label and value type from
  tokens; the radio groups' grid, 48 px options, 20 px ring and reduced-motion rule; no literal font size; no dark
  `@media`.
- `tests/m3-assets.test.ts`: allowlist updated.
- `tests/client-tabs-026.test.ts`: the FIX04 `.admin-search-notice` rule assertion keeps passing; the FIX03
  tab-bar one is unchanged.

## R12 — The creator on the read-only card (FIX04)

**Finding**: the admin list row (`adminListRow()` in `pollsApi.ts`) carried no creator, and the read-only card's dates
panel showed only Created and Launched. `git log -S"Created By"` finds no earlier version of the field in the card, so
it is added rather than restored. The name is `polls.created_by_name` (kept in step with a profile rename in
`api.ts`); the email is not stored on the poll, only reachable through `polls.created_by_id` and the `user` table.

**Decision**: `adminListRow()` gains `createdByName` and `createdByEmail`; the email comes from one extra query per page,
`creatorEmails(db, rows)` in `store.ts` (`select id, email from "user" where id in (distinct created_by_id)`), the same
shape as `pollsEverVoted`, so the list and search query builders and their index use are untouched. The card shows
`readOnlyField("Created By", …)` between the state buttons and Created, with the value `<username> (<email>)`, the email
alone when there is no username, and no field when neither exists. No schema change.

**Rejected**: a join in `listAdminRows` and `adminSearchQuery` (changes two builders the explain guard covers);
storing the email on `polls` (a migration and a second copy that goes stale).

## R13 — Stray markup (FIX03)

When the form was rebuilt for FIX01, two leftover closing-tag fragments, `div>` and `v>`, remained between the last count
group and the actions and showed as text. They were removed, and a jsdom case asserts the form holds no text outside a
label, an option, a radio's text or a button.

## R14 — Collapsing the search panel (FIX05)

**Finding**: the form's `hidden` attribute is already `paintTabs()`'s way of showing the panel only in the Search view,
so collapsing needs a separate switch; the form, its view tabs and the results are all driven by `adminList.js` (not
`adminCard.js`, which draws the poll cards). A submit runs `selectTab("search")`, which loads and draws the results,
and the list re-runs the active search on a timer, so collapsing must happen only on a user's submit.

**Decision**: `button#adminSearchToggle` ("Collapse Search" / "Expand Search", a chevron, `aria-expanded`,
`aria-controls="adminSearchForm"`) sits in `div.admin-search-toggle-row` directly above the form, outside it, so it stays
visible when the panel is collapsed. The row is shown only in the Search view and removed for a poll creator who is not an
administrator. Collapsed is a `data-collapsed` attribute on the form, hidden with `display:none` (out of the tab order,
values kept). `paintSearchPanel()` applies view, collapsed state, `aria-expanded` and the label together. The submit
handler awaits `selectTab("search")` and collapses only when a result card is on screen; no matches or an error leave it
open. **Clear** sets it expanded, and so does a click on the Search view tab: the tab bar's click handler calls
`setSearchCollapsed(false)` before `selectTab("search")` (FIX07), so the expansion is a user action only and a search's own
`selectTab("search")`, which runs before it collapses the panel, is not affected. State is a module variable, not stored.
No animation.

**Rejected**: a `<details>` element (the form must stay a form, and the view switch owns `hidden`); collapsing in
`loadList()` (the timer refresh would re-collapse a panel the user had just opened); remembering the state in
`sessionStorage` (not asked for, and the earlier disclosure's storage was removed).
