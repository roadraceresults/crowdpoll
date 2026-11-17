# Research: Phone Layout Redesign

Sources are the codebase (paths given). Points that can only be settled on a device or while implementing are marked
**to verify**, with the quickstart step or task that settles them.

## R1. Where the phone layout lives

**Decision**: three new Material 3 layer sheets, appended to `LAYER_ORDER` after `who-voted-m3.css` so they come last
on every page that links them, each one `@media (max-width: 480px){ … }` block:

| Sheet | Pages | Holds |
|---|---|---|
| `phone-m3.css` | all 12 | the page frame (header, column, gutters, footer, cookie notice, Back-to-top), the shared card frame, card-shell pages, legal pages, the 480 px minimum width |
| `phone-card-m3.css` | `index.html` | the compact poll card, the maximized view, the extras rows, the Submit bar |
| `phone-admin-m3.css` | `admin.html` | the admin toolbar, tabs, search form, admin card and wizard |

The type-token override (R2) goes in `m3-tokens.css`, inside the same query.

**Rationale**: FR-001 keeps today's phone layout for 481 to 639 px, so the existing `max-width: 639.98px` rules must
stay; they also match at 480 px, so the new layout has to win over them. Loading last, with selectors at least as
specific, does that without editing the old blocks, whose query strings several tests pin (for example
`@media (max-width: 639.98px) and (hover: none)` in `m3-assets.test.ts:297`). `m3-assets.test.ts` allows each page only
its listed sheets, in `LAYER_ORDER`; three sheets keep the home card and admin rules off pages that do not need them.
The sheets follow the layer rules the neighbouring phone sheets are tested for: no token section, no dark twin, no
literal font size, no comment.

**Alternatives considered**: narrowing every old phone block to `(min-width: 480.02px) and (max-width: 639.98px)`
(about 20 blocks in 12 sheets and their pinned tests change, for a range the feature is meant to leave alone); one
sheet for everything (every page would load the card and admin rules).

## R2. The type scale and the 15 px floor

**Decision**: in `m3-tokens.css`, under `@media (max-width: 480px)`, `:root` redefines each typescale size and line
height at 1.25 times its value, rounded to a whole pixel, with `label-small` raised to the floor:

| Role | Base size / line | Phone size / line |
|---|---|---|
| headline-small | 24 / 32 | 30 / 40 |
| title-large | 20 / 28 | 25 / 35 |
| title-medium | 16 / 24 | 20 / 30 |
| title-small | 14 / 20 | 18 / 25 |
| body-large | 16 / 24 | 20 / 30 |
| body-medium | 14 / 20 | 18 / 25 |
| body-small | 12 / 16 | 15 / 20 |
| label-large | 14 / 20 | 18 / 25 |
| label-medium | 12 / 16 | 15 / 20 |
| label-small | 11 / 12 | 15 / 18 |

**Rationale**: every Material 3 layer takes its sizes from these tokens, so one block resizes the site (FR-004). The
spec says "labels 14 to 18 px" and also "no text smaller than 15 px"; 11 × 1.25 is 13.75, so `label-small` cannot be
both. The floor is the requirement that protects readability, so `label-small` is 15 px and the labels run 15 to
18 px. The base tokens and their pinned strings (`title-large-size:20px`, `m3-assets.test.ts:259-262`) do not change.

Three things the tokens do not reach, each handled in the phone sheets:

- rules that multiply a token by 0.75 (`single-column-m3.css:42-54`, `:67-72`, `header-single-column-m3.css:27-30`)
  are overridden with the plain token (FR-005);
- literal sizes in older sheets (`site.css`, `pollCard.css`, `card-shell-m3.css:41` 17 px, `admin-card-m3.css:258`,
  `:287`) are overridden with a token;
- the bar label and percentage, whose size `pollCard.js` writes inline (7 to 13 px, `pollCard.js:163-168`), take the
  phone size from the phone sheet: the script marks each phone row `is-phone` and writes no size (R6).

## R3. Touch targets

**Decision**: a control keeps a 48 px visible shape and gets its 64 × 64 px target from a transparent `::after`
(`position:absolute; inset:-8px`) on the control; rows that are themselves the control (a vote row, a menu item, an
extras header, the "more choices" row, an invitee row) are simply `min-height:64px`. Adjacent 48 px controls sit at
least 16 px apart, so their targets meet and do not overlap (FR-003).

**Rationale**: it is the technique the Material 3 guidance describes for 40 dp controls in 48 dp targets, and it needs
no extra markup. The static sheet test checks that each listed control has one of the two forms (contract P3); whether
a tap lands is checked on devices (quickstart §3).

**As built**: the halo needs `overflow:visible` on the control, which is what used to clip the press ripple to the
control's shape. In the phone layout the ripple is therefore not drawn on those controls (the state layer still shows
the press); vote rows, whose ripple has its own clipped host, keep it. The wizard's step circles tile their row edge to
edge, so the 68 px step button is the target instead of a halo; links inside a sentence get a taller hit area but
stay in the line.

**Alternatives considered**: 64 px visible controls (rows of icons would not fit beside a title; the card grows).

## R4. How the script knows it is in the phone layout

**Decision**: `pollCard.js` exposes `PollCard.isPhoneLayout()`, which is
`window.matchMedia("(max-width: 480px)").matches`; `tabs.js` uses the same function. The existing
`--single-column` marker and `isSingleColumn()` stay for 481 to 639 px.

**Rationale**: the client tests already stub `matchMedia` by query (`tests/helpers/single-column-page.ts:6-8`,
`:87-96`), so a query is testable where a computed custom property is not (jsdom loads no sheets). The query string is
the same one the sheets use, pinned by one test in both places.

## R5. The essential choices

**Decision**: one pure function in `pollCard.js`, `essentialChoices(sorted, ownIds, limits)`, returns
`{ shown, hiddenCount, hiddenShare }`; `limits` is `{ lead: 4, allUpTo: 5 }` for the compact card and
`{ lead: 10, allUpTo: 12, abovePct: 2, allAbovePct: 0 }` for the maximized view. It is used only when `isPhoneLayout()`.

- `shown` is every choice when there are `allUpTo` or fewer; otherwise the first `lead` of the share-sorted list,
  followed by the viewer's own choices not among them, in share order (FR-013, FR-014, FR-027).
- Changed by TWEAK03: when the limits carry `abovePct`, only the leaders whose `pct` is above it count as leaders,
  unless none is, in which case all `lead` do; the own choices are added as before.
- Changed by TWEAK05, on trial: `abovePct` is 2, and `allAbovePct: 0` applies the same filter to a list of `allUpTo`
  or fewer (choices at 0% are left out unless all are), which then also ends with the "Show all" row.
- `hiddenCount` is the rest; `hiddenShare` is the sum of their shares and is displayed only when the poll is
  single-choice (FR-015).
- The sort is today's (`pollCard.js:1035-1045`, stable, so ties and a poll with no votes keep the poll's own order).

The results list renders `shown`, then one `li` holding a `button.more-row` ("8 more choices · 18%") on the compact
card, or `button.show-all-row` ("Show all 37 choices" / "Show fewer") in the maximized view (FR-028). The voting list
always renders every choice (FR-023).

**Changed by TWEAK07**: the compact row reads "More choices · 18%" (no count). The card's `showAll` flag is replaced
by `choiceView`: `essential` (the rule above; row "Show all 37 choices · 30%"), `voted` (set by
`setMaximized(true, { choices: 'voted' })` when the view is opened from the "More choices" row: every choice at 1% or
more plus the viewer's own; row "Remaining choices · 0%") and `all` (every choice; row "Show few choices", which
returns to `essential`). `tabs.js` passes `how.choices` from `onMaximize` to `setMaximized`.

**Rationale**: a pure function is the one piece of this feature a unit test can fix exactly (contract C1). Own choices
come from the card's existing `myChoiceIds`.

## R6. Bar and row sizes in the phone layout

**Decision**: a third bar layout beside the two existing ones: `phoneBarLayout()` returns
`{ scrolling:false, barHeight:44, gap:8 }` for results and 64 px rows with no gap for voting; label and percentage at
the `label-large` token size (18 px).

**As built**: the script gives each row the class `is-phone` and writes no font size on it; `phone-card-m3.css` sets
the size from the token, so the sheet stays the one place sizes come from. A label too long for its bar is cut where
it would reach the percentage. A compact card whose Vote opens the maximized view builds no ballot on its back until
it is turned, so the hidden back never makes the card taller. The maximized view uses
the same sizes in the phone layout instead of `maximizedBarLayout` (50 to 25 px).

**Rationale**: FR-003 needs 64 px voting rows; 44 px results bars keep a five-bar card near 480 px tall. The arrow
rows are already hidden below 640 px, so FR-018 needs no new rule.

## R7. Vote on the compact card

**Decision**: in the Vote click handler (`pollCard.js:1437-1454`), after the existing sign-in, editing and blocked
checks: when `isPhoneLayout()` and the compact card has `hiddenCount > 0`, call the new option
`opts.onMaximize(pid, { face: "vote" })` instead of flipping; `tabs.js` `maximize(pid, options)` flips the card after
moving it. Otherwise flip in place as today (FR-021, FR-022, FR-025).

## R8. The maximized view in the phone layout

**Decision**:

- **Extras**: the template `#maximizedCardGrid` (`index.html:155-163`) gives each of `.maximized-notes`,
  `.maximized-voters` and `.maximized-graph` a header `button.extras-header` (`aria-expanded`, `aria-controls`) before
  its content. In the phone layout the content is hidden until its header is opened; above 480 px the headers are
  hidden and the content shows as today. `tabs.js` fetches the voters report and mounts the graph on first open when
  `isPhoneLayout()`, and at once otherwise (FR-029, FR-030). A section the poll lacks stays `hidden`, header included.
  **Changed by TWEAK01**: the three headers are replaced by one tab bar, `div.extras-tabs` holding three
  `button.extras-tab` (Read More, Polling History, Who Voted), first in `.maximized-space-right` and hidden above
  480 px. `syncExtras` selects the tab asked for while the poll has it, else the leftmost the poll has, marks the
  others `aria-disabled="true"` when the poll lacks them and writes the choice to `data-shown` on the column; the phone
  sheet hides the two sections not named there. The voters report and the graph are fetched when their tab is first
  shown. The bar is styled from the tokens the Home tab bar uses; its icons are 30 px, half as large again as the Home tabs' 20 px (TWEAK06).
- **Notes line**: the card's notes line calls `onMaximize(pid, { open: "notes" })`.
- **Height follows the face** (FR-031): in the phone layout's maximized card the face turned away is taken out of the
  grid's sizing (`position:absolute` over the visible face), so the cell is as tall as the visible face; the swap
  happens with the existing `.is-flipped` class. How this reads through the 0.7 s rotation was **to verify** while
  implementing.
  **Result (T024)**: the rotation is kept. Checked in headless Chromium at the phone query with the 50-choice ballot,
  mid-turn and at rest: both faces turn about the card's vertical axis, the cell takes the new face's height at once
  and no face is clipped. `perspective-origin` is held near the top of the card so a long ballot does not skew.
- **Headings**: the Who voted panel's own heading and the graph's title and subtitle repeat the row's label and the
  card's title, so the phone sheet hides them from view (they stay for assistive technology).
- **Leaving**: unchanged controls; history in R10.

## R9. The Submit bar

**Decision**: one `div#voteBar.vote-bar` in `index.html`, outside the cards, `hidden` by default, holding a Back
button, a count ("2 selected") and a Submit button. It is what the spec and the contracts call the Submit bar. `tabs.js` shows it while a view is maximized, its card is flipped
and `isPhoneLayout()`; its buttons click the card's own `.back-btn` and `.submit-vote-btn`, and it copies the Submit
button's label and disabled state (so "Remove vote" and "Submit votes" follow, `pollCard.js:1104`). The card's own
Back and Submit are hidden while the bar shows; Add Choice, which the bar does not carry, stays in the card. It is fixed at `bottom: var(--cookie-banner-offset, 0px)`, the offset the
Back-to-top button already uses (`back-to-top-m3.css:4`), and the Back-to-top button is hidden while it shows
(FR-024). The page gets bottom padding equal to the bar's height so the last row is not covered.

**Rationale**: delegating to the card's buttons keeps every vote rule in `pollCard.js`. The card tells the page about
flips and selection changes through two new options, `onFace(pid, face)` and `onSelection(pid, count)`.

## R10. Back closes the maximized view

**Decision** (all widths, FR-032 to FR-034):

- `maximize(pid)` from a card does `history.pushState({ ...history.state, maximizedPid: pid }, "")`: a new step, the
  same address.
- A `popstate` whose state has no `maximizedPid` while a view is open closes it with the existing `restore()`.
- The on-screen Back arrow, Minimize, Escape and the active tab call `history.back()` when the current state has
  `maximizedPid`, and let that `popstate` do the closing, so no step is left behind.
- A view closed any other way than by the browser's Back (a tab change, a search, a login change, a poll leaving
  the list, a second view replacing it from a link) is closed at once and its step is then taken back: a flag is set
  and `history.back()` is called on the next turn of the event loop; the `popstate` handler clears the flag and writes
  the address the page had before the step back onto the step it lands on, so a tab or search written in the same
  turn is not lost. A view maximized from a card while another view holds a step reuses that step.
- A poll opened from a link (`showLandingPoll`, `applyPollPage`) pushes nothing; its Back arrow calls `restore()`
  directly, as today.
- On load, or on a `popstate` to a state that has `maximizedPid` (Forward, or a reload of that step): if that card is
  in the current tab the view reopens without pushing; if not, the flag is cleared with `replaceState`.

**Rationale**: the address still never changes, so shared links and `tabs.js`'s `replaceState` calls (`:1087`,
`:1169`) are unaffected; they already pass `history.state` through, which keeps the flag. `backArrow.js` keeps its own
`legalDepth` key on the legal pages only. The project rule that tab changes use `replaceState`, never `pushState`,
still holds: the pushed step is the view, not a tab.

**As built**: the step is cleared on load when no view is open (a reload, or a return from another page), rather
than reopened: the tab's cards are not loaded yet at that moment.

**To verify** (task in US3): `SiteBack.canReturn` reads `history.length` (`backArrow.js:11`), which the extra step
raises; confirm the profile and admin pages still return to the right place after a maximized view was opened and
closed.

**Result (T026)**: confirmed in headless Chromium. After a view was opened and closed, `/profile` reports
`canReturn` true and its close control returns to the home page, the same as with no view opened. With a view left
open, going to `/privacy` and pressing Back returns to the list with the step cleared and no view open.

## R11. The page frame and the 480 px minimum

**Decision**: in `phone-m3.css`: `.page{ min-width:480px }` (FR-002); `.container` padding-inline 16 px; the header
64 px tall with 48 px controls; `#tabBar` tabs 64 px (56 px was planned; the tab's own `::before` is its state
layer, so the tab itself is the 64 px target), and the row under it, with Refresh, All tabs and the maximized Back,
64 px; `.card-viewport`, `.poll-admin-card`, `.admin-search` and the
card-shell face `max-width:none; width:100%` in the 448 px column, padding 20 px, radius 20 px (FR-008, FR-009);
`.legal-doc` full column in `body-large` (FR-010); the Back-to-top button 64 px.

## R12. Rules removed with the old sub-480 thresholds

**Decision** (FR-006): delete these blocks; nothing replaces them, since the phone sheets cover their range.

| Threshold | Blocks |
|---|---|
| 479.98 px | `pollCard.css:602-604`, `admin.css:194-199` |
| 359.98 px | `admin.css:403-410`, `admin-card-m3.css:286-289`, `:490-492`, `:913-915`, `admin-search-m3.css:149-151`, `:212-214` |
| 319.98 px | `admin-search-m3.css:82-84` |

Also removed: the comment `admin.css:390-394` and the floor `admin.css:399` (`min-width:292px`), which the 480 px
minimum supersedes. Tests that pin any of these are updated in the same task (found by running the asset suites).

## R13. Removing Poll Results and the exports

**Decision** (FR-035 to FR-038):

- **Delete**: `src/public/admin-results.html`, `src/public/adminResults.js`; the route and `requireOwnResults` in
  `src/routes/pages.ts:64-70`, `:245-258` (and the `pollExists` import if unused); the three routes in
  `src/routes/pollsApi.ts:1096-1162` and the imports at `:68-69` and `hidesChoicesFrom` at `:18`; `exportPollData` and
  `exportPollMarkdown` in `src/polls/service.ts:911-941`; `hidesChoicesFrom` in `src/polls/access.ts:138-144`;
  `"/admin/poll/results"` in `src/legal/termsGate.ts:7`; in `src/public/adminCard.js` the menu item (`:2492-2493`), the
  icon (`:2543-2544`) and the helpers `menuLink` (`:375-381`) and `iconLink` (`:356-364`) left without a caller; the
  `icon-results` symbol in `admin.html:48-52`; the `.admin-field*`, `.admin-choice-list` and `.admin-participant-list`
  rules in `admin.css:31-50`.
- **Keep**: `computeResults` (tests and `lineGraph.ts` rely on it), `withinDisplayLimit`, `requireOwnPoll`, the Who
  voted route, `devScripts/extract/*`.
- **OpenAPI**: the three paths (`postman/openapi.json:3183`, `:3242`, `:3301`), the schemas `PollResults` and
  `Participant` (`:594-656`), and the mentions at `:243`, `:252`, `:440`.
- **Tests**: delete or edit those listed in contract X3.
- **Documents**: `README.md:8`, `:206`, `:258`, `:767`; `ARCHITECTURE.md:307`, `:512`, `:797`, `:1168`, `:1218`,
  `:1497`; `CLAUDE_COMPLETE.md:221`, `:1017`.

`styles.css` then serves `admin.html` alone; it is left as it is (not this feature's to remove).

## R14. Tests

**Decision**:

- `tests/essential-choices.test.ts`: contract C1's table against `essentialChoices`.
- `tests/client-phone-card.test.ts` (jsdom, `matchMedia` stubbed for `(max-width: 480px)`, a card mounted by hand):
  compact card rows and "more choices" row, own choice shown, tap targets that maximize, Vote flip against Vote
  maximize, notes line; maximized: ten bars, Show all / Show fewer.
- `tests/client-phone-view.test.ts` (the home page against the app, helper `tests/helpers/phone-page.ts`): Vote on a
  long poll, the Submit bar shown, mirrored and hidden, extras closed and fetched on open.
- `tests/client-maximized-history.test.ts`: contract H1 to H6.
- `tests/phone-sheets.test.ts`: the three sheets hold one `@media (max-width: 480px)` block, no literal font size, no
  comment, no token section; the token override values of R2; the controls of contract P3; the removed blocks of R12
  are gone.
- Updated: `m3-assets.test.ts` (`LAYER_ORDER`, `PAGES`, the results page), `viewport-width-pages.test.ts` (12),
  `client-maximized.test.ts` (history), and the tests of contract X3.
- Unchanged and still required to pass: every test of the 640 px and wider card (bar scrolling, 556 px height) and of
  `single-column-m3.css`, since those ranges do not change.

The layout's look and touch are judged by the quickstart, on devices and BrowserStack (FR-039).

## R15. Order of work

**Decision**: remove Poll Results first (one page fewer to restyle, and its tests stop pinning sheets); then the
foundation (tokens, `phone-m3.css` frame, `isPhoneLayout`); then the compact card, voting, the maximized view and
history; then the other pages; then validation and documents.
