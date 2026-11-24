# Research: Color Contrast

**Feature**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md) | **Date**: 2026-11-20

Every ratio below was computed with the WCAG 2.2 formula
([contrast ratio](https://www.w3.org/TR/WCAG22/#dfn-contrast-ratio)) from the values named, during planning.

## R1. Where the colours come from today

- **Decision**: treat `m3-tokens.css` as the single place the scheme colours are set, and make it set the legacy aliases
  (`--ink`, `--paper`, `--paper-raised`, `--line`, `--track`, `--choice-*`, `--muted`) for **both** schemes.
- **Finding**: every page loads `m3-tokens.css` **first**, then `tabs.css`, `pollCard.css`, `site.css` (pinned by
  `tests/m3-assets.test.ts`). Those three sheets each declare a legacy `:root` palette (`--paper #F1F3EE`,
  `--choice-selected #E4D3AE`, …), which, being later at equal specificity, win in Light. In Dark,
  `:root[data-theme="dark"]` in `m3-tokens.css` has higher specificity and maps the aliases to M3 roles. So Light is
  drawn by three duplicated legacy blocks and Dark by M3 roles — a token change reaches one scheme and not the other.
- **How**: add a Light alias block in `m3-tokens.css` under `:root:not([data-theme="dark"])` (specificity 0,2,0, above
  the legacy `:root` 0,1,0), the twin of the existing Dark alias block. The legacy blocks stay as they are (Surgical
  Changes); their aliased properties are shadowed in both schemes. Their non-alias properties (`--moss`, `--amber`,
  `--max-width`, `--shadow` in Light) keep working.
- **Alternatives**: edit the three legacy blocks (three copies to keep in step, and Light still bypasses the roles);
  delete them (removes `--moss`/`--max-width` that other rules read; beyond scope).

## R2. Card and page

- **Decision**:

  | Alias | Light | Dark |
  |---|---|---|
  | `--paper` (page) | `#E5EAE2` (was `#F1F3EE`) | `#0A0E0B` (was `#0F1511`) |
  | `--paper-raised` (card) | `#FFFFFF` (unchanged) | `#1C211D` = `surface-container` (was `#181D19`) |
  | `--line` (card border) | `#A3ABA2` (was `#D8DCD3`) | `#4A524B` (was `#414942`) |

- **Ratios**: card/page 1.22 (L), 1.19 (D); border/card 2.36 (L), 2.02 (D); border/page 1.93 (L), 2.41 (D) — all in
  FR-011's `[1.5, 3)` band.
- **Rationale**: Light darkens the page (card stays white, as every white-card M3 surface assumes); Dark both darkens the
  page and lifts the card one tone, because a single step in the dark range is too small to see.
- **Consequence**: the light `--muted` `#6B7268` falls to 4.06:1 on the new page; see R3.
- **Alternatives**: a 3:1 `outline` card border (rejected in the requirements, UA4 B); shadows in Dark (invisible on
  near-black).

## R3. Muted text

- **Decision**: Light `--muted` → `var(--md-sys-color-on-surface-variant)` (`#414942`), as Dark already does.
- **Ratios**: 7.21:1 on the new page, 9.31:1 on white.
- **Alternative**: keep `#6B7268` and lighten the page less (the page step would drop to ~1.1, the original complaint).

## R4. Vote rows

- **Decision**:

  | Alias | Light | Dark | Use |
  |---|---|---|---|
  | `--choice-unselected` | `#EAEFE8` = `surface-container` | `#313631` = `surface-container-highest` | row fill |
  | `--choice-edge` (new) | `#717971` = `outline` | `#8A938B` = `outline` | 1 px row edge |
  | `--choice-selected` | `#643F00` | `#FFB956` = `tertiary` | selected fill and its 2 px edge |
  | `--on-choice-selected` (new) | `#FFFFFF` | `#462B00` = `on-tertiary` | label, radio ring, dot and check on a selected row |

- **Ratios**: edge/card 4.49 (L), 5.16 (D); selected fill/unselected fill 7.99 (L), 7.24 (D) — FR-005's 3:1 is met by
  the **fill** alone; label/unselected fill 13.5 (L), 9.6 (D); label/selected fill 9.32 (L), 7.68 (D).
- **Why `#643F00` in Light**: a light amber (`#FFDDB5`) is only 1.11:1 from the near-white unselected row, so
  "3:1 from an unselected row" forces a dark amber in Light; `#643F00` is today's `on-tertiary-container`, so no new hue
  enters the scheme.
- **Radio and check on a selected row**: today they are drawn in `primary` (green): on `#643F00` that is 1.45:1 and on
  `#FFB956` 1.0:1. They switch to `--on-choice-selected` on a selected row. They are controls, not icons, so FR-013
  does not hold them green. On an unselected row the ring stays `on-surface-variant` (≥ 7:1).
- **Alternatives**: rows by fill only (requirements UA1 B: needs a mid-grey fill under which the label drops below 7:1).

## R5. Result-bar fills: one lift rule

- **Decision**: `pollCard.js` draws every fill (palette, Yes/No, creator-stored) through the line graph's existing
  `lineColorOn(fill, cardSurface)` — darker on a light card, lighter on a dark card, until 3:1 — with
  `cardSurface` = `#FFFFFF` (Light) and `#1C211D` (Dark). `RESULTS_DARK_SURFACE` becomes `#1C211D`.
- **Why one rule satisfies FR-008**: `lineGraph.js` already passes the computed card background to the same function;
  once the card is `#1C211D` both give the same shade for the same colour.
- **Result (planning prototype)**: every palette, Yes/No, `#FFFFFF` and `#FFFF00` fill reaches ≥ 3.02:1 in both
  schemes. Changed shades: Light — orange-red `#FF6601`→`#FA6300`, white→`#949494`, yellow→`#999900`; Dark —
  darkred→`#D60021`, blue→`#5353FE`, darkslateblue→`#216AC9`, black→`#6B6B6B`, purple→`#BD00BD`, Yes→`#00802A`.
- **Stored values unchanged** (FR-010): the lift happens only where colours are drawn.

## R6. Palette entries that collide after the lift

- **Decision**: replace three of the fourteen base palette entries:
  coral `#FC8E45` → darkgoldenrod `#B8860B`; darkslategray `#404040` → saddlebrown `#8B4513`; gray `#7D7D7D` →
  olivedrab `#6B8E23`.
- **Finding**: with R5, coral lifts to `#F66404` in Light, 2.3 ΔE (CIE76) from orange-red; in Dark black and
  darkslategray both lift to `#6B6B6B` (ΔE 0) and black sits 7.2 ΔE from gray. Two choices of one poll could then look
  identical. After the replacement, no pair is closer than today's intended families (purple/darkorchid 18.1,
  teal/lightseagreen 14.0, darkslateblue/dodgerblue 18.2); the test's threshold is ΔE 13, one below today's closest
  pair, so rounding cannot flip it.
- **Spec impact**: accepted into the spec as FR-022 and an edge case (analyze-findings F2 A).
- **Alternatives**: accept the collisions; a separate dark palette (rejected in the requirements, UA2 B).

## R7. Text on a bar's fill

- **Decision**: the label and percentage drawn over a fill (`inkOnFill`) are black or white, whichever contrasts more
  with the **drawn** fill; a `TEXT_ON_FILL_OVERRIDES` entry is used only when it reaches 4.5:1. The minimum for text on
  a fill is **4.5:1**; text on a track keeps 7:1.
- **Finding**: the spec (FR-001, clarification 2) asks 7:1 for result-bar labels on "what they sit on". Today 7:1 is
  pinned only on tracks; on fills the hand-picked inks are as low as 2.3:1 (white on coral) and 2.9:1 (white on
  orange-red). 7:1 on a fill that must also be 3:1 from a white card is impossible for any mid-tone: it would force
  every fill near black. Black or white always gives at least 4.58:1 on any colour, so 4.5:1 can be guaranteed.
- **Spec impact**: accepted into the spec: FR-001, SC-007 and US2 scenario 4 read "7:1 on tracks and vote rows,
  4.5:1 on a bar's fill" (analyze-findings F1 A).
- **Visible change**: orange, coral-replacement, dodgerblue, lightseagreen, gray, red, and pink fills take black text.

## R8. Tracks

- **Decision**: per fill, the track is the **drawn** fill mixed with the card at the largest tint ≤ today's (0.9 Light,
  0.8 Dark), in steps of 0.05, that reaches 1.5:1 against the card; the ink on the track is today's `darkShadeOf` /
  `lightShadeFor` (≥ 7:1).
- **Result (prototype)**: Light tints 0.55–0.80, Dark 0.45–0.80; every track 1.50–1.90:1, every track ink 7.02–10.59:1.
- **Alternative**: one fixed tint per scheme (any single value either misses 1.5:1 for pale fills or darkens dark fills'
  tracks until their ink cannot reach 7:1).

## R9. Other options on every page

- **Finding** (audit of the M3 layers): tabs (inactive `on-surface-variant` text, active `primary` text + 3 px
  `primary` indicator), Settings radios and card-shell checkboxes (2 px `on-surface-variant` ring, `primary` when
  checked), the admin search field (`outline` border) and admin radios already meet FR-002/FR-003 in both schemes, and
  keep meeting them on the new page and card colours (e.g. `on-surface-variant` on the light page 7.21:1).
- **Decision**: no rule change for them; they join the guideline's pair table so the test keeps them there. The tab bar's
  1 px divider (`outline-variant`) is decorative and not listed.
- **Admin list rows** (`.admin-result-row`, `admin-search-m3.css`): a row has no edge by design; rows are told apart by
  alternating tones (`surface-container` on even rows), an open row by the panel it expands (a non-colour cue) and its
  `secondary-container` tone; FR-002 is carried by the 2 px `primary` focus outline. Listed pairs: row text
  (`on-surface-variant`) on `--paper-raised` and on `surface-container` ≥ 4.5; open-row text (`on-secondary-container`)
  on `secondary-container` ≥ 4.5; focus outline (`primary`) on `--paper-raised` and on `surface-container` ≥ 3.

## R10. The guideline is the test's data

- **Decision**: `COLOR-CONTRAST.md` holds two Markdown tables — **Frozen colours** (role, Light, Dark) and **Required
  pairs** (foreground role, background role, minimum, schemes) — and `tests/color-contrast.test.ts` parses them, resolves
  each role from `m3-tokens.css` per scheme, and checks them; a bar section checks R5–R8 through `window.PollCard` in
  jsdom, as `client-bar-colours.test.ts` does.
- **Rationale**: one list; the document cannot drift from the test, and a developer adding a pair adds one table row.
- **Alternative**: the pairs written in the test and copied into the document (two lists to keep in step).

## R11. Resolving a role's value without a browser

- **Decision**: the test reads `m3-tokens.css` as text, takes the custom properties of `:root{…}` (Light roles),
  `:root:not([data-theme="dark"]){…}` (Light aliases) and `:root[data-theme="dark"]{…}` (Dark), and resolves
  `var(--x)` one level at a time; every value it needs is a `#RRGGBB` literal or a `var()` to one. jsdom's
  `getComputedStyle` does not resolve custom properties reliably across sheets, so it is not used.

## R12. Tests that pin today's colours

- **Decision** (FR-021): update, not remove — `client-bar-colours.test.ts` (tints become per-fill, dark surface, ink on
  fill rule, palette names), `client-line-colors.test.ts` (palette entries, dark surface), `poll-card-assets.test.ts`
  (palette block), and any client test that asserts `--choice-*` or the old surface values.
