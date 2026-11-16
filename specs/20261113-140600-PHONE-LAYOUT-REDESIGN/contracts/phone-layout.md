# UI Contract: the phone layout

All sizes are layout pixels at the 480 px layout width. "Phone layout" means `@media (max-width: 480px)`.

## P1. Where it applies (FR-001, FR-002, FR-006)

| Layout width | Layout |
|---|---|
| ≤ 480 px | the phone layout; the page is at least 480 px wide |
| 481 to 639 px | today's phone layout, unchanged |
| ≥ 640 px | today's wider layouts, unchanged |

No rule remains for `max-width: 479.98px`, `359.98px` or `319.98px`.

## P2. Type (FR-004, FR-005)

In the phone layout the typescale tokens have these values, and no rendered text is under 15 px:

| Token | Size / line height |
|---|---|
| headline-small | 30 / 40 |
| title-large | 25 / 35 |
| title-medium | 20 / 30 |
| title-small | 18 / 25 |
| body-large | 20 / 30 |
| body-medium | 18 / 25 |
| body-small | 15 / 20 |
| label-large | 18 / 25 |
| label-medium | 15 / 20 |
| label-small | 15 / 18 |

No phone-layout rule multiplies a type token by less than 1.

## P3. Touch targets (FR-003)

Every control has a 64 × 64 px target. "48 + halo" is a 48 px visible shape with a transparent 8 px extension on each
side; "row" is a control at least 64 px tall across its container.

| Control | Form |
|---|---|
| Header: Search, Log In, avatar menu | 48 + halo |
| Home tab bar tabs | row (64 px) |
| Refresh, All tabs, maximized Back arrow | 48 + halo |
| Card: Watch, Maximize / Minimize | 48 + halo |
| Card: Live Results, Vote, Submit, Back, Add Choice | 48 + halo |
| Card: "more choices" row, "Show all" row, notes line | row |
| Card: a vote row | row |
| Maximized: extras tabs | row |
| Submit bar: Back, Submit | 48 + halo |
| Card-shell pages: text fields | row (64 px field) |
| Card-shell pages: primary button, provider buttons, links in the card | 48 + halo (provider buttons 56 px visible) |
| Admin: Back, Create New Poll, view tabs | 48 + halo |
| Admin card: icon buttons, menu button, menu items, Open / Close / Archive | 48 + halo; menu items row |
| Admin card: invitee rows, their menu, pager buttons | row; 48 + halo |
| Admin search: result rows (`.admin-result-row`, 64 px at every width from `admin-search-m3.css`; chevron 28 px, TWEAK11) | row |
| Wizard: step circles, Next, Paste choices, chips' remove, Cancel / Save / Publish | 48 + halo |
| Search form: fields, radios, checkboxes, Clear, Search | row; 48 + halo |
| Footer links (TWEAK02) | links inside a sentence: lines 32 px apart, each link with a 32 px hit area |
| Cookie notice button, Back-to-top (64 px visible) | 48 + halo; 64 |

Adjacent "48 + halo" controls are at least 16 px apart.

## P4. Frame (FR-008 to FR-012)

| Element | Value |
|---|---|
| Content column | 448 px (16 px gutters) |
| Card frame (poll card, admin card, admin search, card-shell card) | 448 px wide, padding 20 px, radius 20 px, one per row |
| Header | 64 px |
| Home tab bar | 64 px, and 64 px for the row under it (Refresh, All tabs, maximized Back) |
| Legal text | full column, body-large |
| Admin tab bar | full column, a 1 px `outline-variant` line under it, as under the Home tab bar (TWEAK16) |
| Admin card summary | title and subtitle in their own sizes; the sentences under the subtitle (notes included) in `body-small`, 15 px on 24 px lines, an underlined part padded 3 px above and below (TWEAK32, TWEAK33) |
| Admin card wizard, typed fields | every typed field (text fields and text areas, the notes preview and editor, the date and time inputs; TWEAK41, first the Choices text area alone) is 16 px on 24 px lines, under `body-large`; it relies on `viewportWidth.js` capping the scale on iOS (`maximum-scale` equal to the fitted scale), without which Safari zooms in on focus (TWEAK38) |
| Admin card wizard, summary | while the wizard is open its summary is the title and subtitle alone, as plain text, not links; the card at rest keeps the whole summary (TWEAK43) |
| Admin card wizard, footer | Cancel and Save changes (Cancel, Save and Publish on a new poll) are drawn twice: between the summary and the step circles (`.wizard-footer--top`) and under the step; wider screens keep the lower one only (TWEAK44) |
| Admin card wizard, density | an exception to P3, for fitting more on the screen: typed fields, radio rows, switch rows, date rows, color rows and the notes preview are 48 px tall, the step circles 40 px; 12 px between the parts of the card and of a step; buttons stay 48 px with their halo (TWEAK40) |
| Admin card wizard, Next | Steps 1 to 5 have Next twice: beside the step heading (`.wizard-panel-top`) and under the step; wider screens keep the lower one only (TWEAK39) |
| Admin card counts | the Banned Voter Count line is not shown (`.card-banned-count`, TWEAK34); Voter Count, and Vote Count on a multiple-choice poll, follow Launched in the dates panel, and the counts panel is drawn only for its invitation counts (TWEAK35, decided in `adminCard.js` by the same media query when the card is drawn); both stay as before at 481 px and wider |
| Admin search form | single fields one per row; each of the five operator and value pairs on one line, two equal columns (TWEAK20); each radio group one row of three, labels wrapping (TWEAK13); the two checkboxes side by side in two equal columns (TWEAK14); 9 px between the rows of the form, 16 px inside a row (TWEAK29, TWEAK30); 5 px under each radio group (TWEAK31); 2 px more above the State field and above each operator and value pair, whose labels float on the border, the label keeping its solid background (TWEAK42, which withdraws the half-transparent label of TWEAK31) |

## P5. Colors and language (FR-007)

Every new rule takes its colors from the existing `--md-sys-color-*` tokens; no new color, no `prefers-color-scheme`.
Both `data-theme` schemes render every page.

## P6. Unchanged (FR-040, SC-010)

`viewportWidth.js`; every rule's effect at 481 px and wider; the 640 px and wider card (556 px height, bar scrolling).
