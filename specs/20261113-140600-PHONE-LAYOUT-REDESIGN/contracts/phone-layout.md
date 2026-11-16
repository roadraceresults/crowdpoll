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
| Admin search form | one field per row |

## P5. Colors and language (FR-007)

Every new rule takes its colors from the existing `--md-sys-color-*` tokens; no new color, no `prefers-color-scheme`.
Both `data-theme` schemes render every page.

## P6. Unchanged (FR-040, SC-010)

`viewportWidth.js`; every rule's effect at 481 px and wider; the 640 px and wider card (556 px height, bar scrolling).
