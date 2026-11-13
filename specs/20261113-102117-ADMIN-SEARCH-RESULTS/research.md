# Research: Admin Search Results List

Sources: the spec, the requirements report (`requirements/20261113-102117-admin-search-results/requirements-report.md`,
RS1, AM1, UA1–UA7) and the code as it stands (`src/public/adminList.js`, `adminCard.js`, `admin.html`, `admin.css`,
`admin-search-m3.css`, `tests/client-admin-search.test.ts`, `tests/admin-search-assets.test.ts`).

## R1. Where the rows live

- **Decision**: the rows are list code in `src/public/adminList.js`. In the Search view `loadList` fills `#pollList`
  with one **result** element per poll instead of one card; the other views are untouched. A `resultRows` map
  (pid → result) and one `openPid` variable hold the view's state. `adminCard.js` is not changed.
- **Rationale**: the list, its refresh, the edit latch and the views are already there (FR-031: the other views keep
  cards); the card factory stays a black box (FR-008).
- **Alternatives considered**: a new `adminResults`-style script (a second file for ~150 lines that need `loadList`'s
  internals); a "compact" mode inside `adminCard.js` (3,200 lines, and every closed row would still own a controller).

## R2. The list's width

- **Finding**: the admin page is one centred column: `.poll-admin-card, .admin-search` are `max-width: 420px`
  (`admin.css`), and the tab bar and the notice are `min(420px, 100%)`. Six facts do not fit on one line in 420 px, so
  one-line rows and SC-001 (15 results visible) cannot hold inside that column. The requirements report did not notice
  the 420 px cap; the conflict was found while planning.
- **Decision**: in the Search view the results list is wider than the column: `width: min(840px, 100%)`, centred. A
  row is one line when the viewport is at least 720 px wide and two lines below that. The open card keeps its own
  420 px, centred under its row.
- **Rationale**: it keeps the accepted decision (UA1) and SC-001: a one-line row is 48 px with a 2 px gap (as
  implemented), so 15 rows are about 750 px.
- **Alternatives considered**: keep the 420 px column with two-line rows everywhere (72 px each: about 11 rows on a
  1080 p screen); widen the card as well (changes the card, out of scope).
- **Status**: settled. The spec's FR-003 and the requirements' Decisions (UA1) record it.
- **Changed after implementation (tweaks.md, TWEAK01)**: rows are two lines at every width, in one card-like frame
  with zebra striping; a row is about 68 px, so SC-001 asks for 10 visible results, not 15.

## R3. The row's markup

- **Decision**: per poll, in `#pollList`:

  ```html
  <div class="admin-result" data-pid="…">
    <button class="admin-result-row" type="button" aria-expanded="false" aria-controls="admin-result-panel-…">
      <span class="admin-result-title">…</span>
      <span class="admin-result-state">OPEN</span>
      <span class="admin-result-visibility">Public</span>
      <span class="admin-result-creator">…</span>
      <span class="admin-result-created">…</span>
      <span class="admin-result-voters">1,204 voters</span>
      <svg class="admin-result-chevron" aria-hidden="true">…</svg>
    </button>
    <div class="admin-result-panel" id="admin-result-panel-…" hidden></div>
  </div>
  ```

  The open result carries `admin-result--open`; its panel holds the card's element.
- **Rationale**: the W3C APG disclosure pattern (a native `<button>` with `aria-expanded` and `aria-controls`) gives
  Tab, Enter, Space and the announced state for free (FR-027); the panel keeps the card next in the tab order
  (FR-028).
- **Alternatives considered**: `<details>/<summary>` (cannot be held closed or open without fighting the element;
  `disabled` does not exist on it); `role="listbox"` (selection semantics, arrow keys, not a disclosure).

## R4. What the cells show

- **Decision**:
  - title: `poll.title`, or "(untitled)" when blank; CSS ellipsis; the button's `title` attribute is the full title
    (the page's `tooltip-m3.js` adopts `title` attributes);
  - state: `poll.pollState` verbatim;
  - visibility: "Public" for `Public Poll`, "Private" for `Private Poll`;
  - creator: `createdByName`, else `createdByEmail`, else empty (the card shows `name (email)`; the row shows the name
    part, which is what the search's "Created by user name" field matches);
  - created: `new Date(createdAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })`;
  - voters: `voteCount` with `toLocaleString()`, then " voters" (" voter" for 1).
- **Rationale**: every value is already in the search response (FR-033); formats follow the card's own use of the
  browser locale.
- **Alternatives considered**: the full `name (email)` in the row (too long for one line; the card shows it one click
  away).
- **Changed after implementation (tweaks.md, TWEAK01)**: the row also shows the subtitle; visibility is "Public",
  "Private (invitation)" or "Private (shared link)"; the state is the text "Poll state: <state>"; creator and date
  are one cell, "Created by: <creator> on <date>"; a long title wraps instead of being cut.

## R5. Opening, closing and when a card exists

- **Decision**: a click on a row toggles it. Opening sets `openPid`, creates the controller with
  `window.AdminCard.create(poll, deps)` (or reuses one kept for saved wizard progress), and appends its element to the
  panel. Closing, or opening another row, removes the element and forgets the controller unless
  `controller.hasSavedProgress()`. A closed row has no controller.
- **Rationale**: one card at a time (FR-010); a card requests its invitees whenever it is drawn, so only the open
  poll does (FR-034); 200 results cost 200 small rows, not 200 cards (SC-003).
- **Alternatives considered**: keep every opened card alive and hidden (each refresh would redraw them and re-request
  their invitees).

## R6. "A search the administrator ran"

- **Decision**: `selectTab` (the Search submit, Clear, and a click on a view tab all go through it) calls
  `loadList({ fresh: true })`. A fresh load in the Search view first closes the open card, then, if exactly one poll
  came back, opens it. The periodic refresh and the card's own reloads (`deps.refresh`, Duplicate, Delete, state
  buttons) call `loadList` without `fresh`: they keep `openPid` and never open anything.
- **Rationale**: FR-012, FR-014, FR-023 and the clarification (returning to Search is a fresh search) with one flag and
  nothing remembered.
- **Alternatives considered**: comparing the result set with the previous one to guess whether the search changed.

## R7. Holding the list during an edit

- **Decision**: `refreshCreateButton` (already called on every edit start and end) also sets `disabled` and
  `title = "Finish editing the open poll first"` on every `.admin-result-row`, on the Search submit button and on
  Clear, while `editingPid !== null`; the submit handler returns early as well, so Enter in a field cannot run a
  search. Rows drawn by a refresh during an edit are created held.
- **Rationale**: the same mechanism and the same sentence as the held tabs (FR-015 to FR-018); a disabled button
  cannot be toggled, which keeps the editing row open.
- **Alternatives considered**: letting the row close through the discard dialog (a second way to abandon a draft; the
  requirements chose holding).

## R8. The refresh

- **Decision**: a non-fresh load reuses each result element, rewrites a cell only when its text changed, calls
  `controller.update(poll)` on the open card as today, and orders the elements with the existing `syncChildren`
  (which leaves elements already in place alone and restores focus). A pid that is gone loses its element; if it was
  `openPid` and is not being edited, `openPid` becomes `null`. The result of the poll being edited is never removed:
  when the search no longer returns it, its element stays where it is until the edit ends.
- **Rationale**: FR-019 to FR-022 and SC-005; nothing is detached, so focus and scroll do not move.
- **To verify in implementation**: whether today's card list keeps an editing card that the search stops returning;
  the new rule is written and tested for the Search view either way.

## R9. The count line

- **Decision**: `VIEWS.search` gains `count: (n) => (n === 1 ? "1 poll matches." : n + " polls match.")`; the notice is
  the cut-off message when truncated, the empty message for none, else the view's `count` when it has one. The other
  views have none and stay silent.
- **Rationale**: FR-024, FR-025; `#adminSearchNotice` is already `role="status"`.

## R10. Scrolling on open

- **Decision**: after a click opens a row, if the row is not fully inside the visible area (under the fixed header or
  off the bottom), `row.scrollIntoView({ block: "start" })`, with `scroll-margin-top` on `.admin-result-row` equal to
  the fixed header's height (`var(--fixed-chrome-height, 0px)`) plus 8 px; otherwise no scroll. A single result that
  opens by itself does not scroll.
- **Rationale**: FR-013: closing a card above can move the clicked row out of view; this brings it back and nothing
  more.

## R11. Styles

- **Decision**: all row styles go in `src/public/admin-search-m3.css` under a new numbered section, with M3 tokens for
  color, type, shape and state layers:
  - `.admin-result`: `width: min(840px, 100%)`, centred;
  - `.admin-card-list:has(> .admin-result)`: a 2 px gap between rows instead of the cards' 18 px;
  - `.admin-result-row`: a grid, `min-height: 48px` (56 px was planned; 48 px keeps 15 rows on a 1080 p screen), corner `--md-sys-shape-corner-small`, a `::before` state layer
    (hover, focus, pressed opacities as the Search toggle uses), a `:focus-visible` outline in
    `--md-sys-color-primary`, `:disabled` at the M3 disabled opacity;
  - `.admin-result--open .admin-result-row`: `--md-sys-color-secondary-container` background;
  - `.admin-result-state`: an M3 assist-chip look (outline, `corner-small`, label-large type);
  - `.admin-result-chevron`: 24 px, rotated 180° when `aria-expanded="true"`, no transition under
    `prefers-reduced-motion`;
  - under 720 px: the row wraps (`flex-wrap`), the title on the first line, the other cells on the second.
  The ripple is added with `window.M3Ripple?.add("#pollList .admin-result-row")`.
- **Changed after implementation (tweaks.md, TWEAK01)**: the list is one frame (`admin.css`, the cards' fill, border,
  corners and shadow), rows are flex with two lines and `min-height: 64px`, every second result is striped with
  `--md-sys-color-surface-container`, the open result's background covers its row and panel, and the state chip and
  the 720 px rule are gone.
- **Rationale**: UA6: no new stylesheet, `LAYER_ORDER` and the page's sheet list unchanged (`m3-assets.test.ts`); the
  tokens already switch with the color scheme (FR-030).

## R12. Tests

- **Decision**:
  - `tests/client-admin-search.test.ts`: the cases that count cards after a multi-result search follow the rows; a new
    `describe` covers rows and cells, open/close/one-at-a-time, the single result, the held list, the refresh rules,
    the count line, returning to the view, and the ARIA attributes;
  - `tests/admin-search-assets.test.ts`: the row's CSS (48 px floor, focus ring, chip, selected and disabled looks,
    the 720 px rule, tokens only);
  - any other client suite that reaches a card through the Search view is updated to open its row first;
  - no server test, no `openapi` change.
- **Rationale**: Principle IV; jsdom cannot measure layout, so one-line fit and scrolling are checked in the
  quickstart.

## R13. Documentation

- **Decision**: README's "For administrators" section and ARCHITECTURE's admin page description gain the results
  list, in the final phase.
