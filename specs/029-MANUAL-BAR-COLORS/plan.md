# Implementation Plan: Manual Bar Colors

**Branch**: `dev` (no dedicated branch) | **Date**: 2026-10-08 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/029-MANUAL-BAR-COLORS/spec.md`

**Note**: This plan is filled in by the `/speckit-plan` command. Research is in [research.md](research.md) (R1 to R11), the data model in [data-model.md](data-model.md), the HTTP and UI contracts in [contracts/api.md](contracts/api.md) and [contracts/ui-contracts.md](contracts/ui-contracts.md), and the validation guide in [quickstart.md](quickstart.md). The architecture artifact is `architecture/029-manual-bar-colors/architecture.md` (8 diagrams, 9 findings, all resolved).

## Summary

A poll's creator or an administrator picks a colour for each choice from an 18-colour palette on a new step, **Colors**, of the poll edit card; the result bars use it, and a choice left on Automatic is coloured exactly as before. The colour is one optional property on each element of `polls.choices` (no migration). The palette is one server list, validated on write and sent to the browser in `/api/config`. Colours travel with the labels in the existing `save` and `publish` requests; a poll that has votes saves a colours-only change through one new route that restores the poll's state and does not re-screen it. The card draws any valid hex by deriving its track and text colours on demand, and a manually coloured choice still advances the automatic palette index so no Automatic bar changes colour. One new server module, one new route, one new wizard step, one change to the bar colour rule; no new dependency.

## Technical Context

**Language/Version**: TypeScript 5.9 on Node >= 22 for the server (`src/`); plain browser JavaScript and CSS for the client (`src/public/`), as the repository does today.

**Primary Dependencies**: none new. Express, Kysely and the existing `AdminError`, `updatePoll`, `requireOwnPoll` helpers on the server; no library in the browser.

**Storage**: PostgreSQL, unchanged: an optional `color` inside each element of the `polls.choices` jsonb array. No migration, no backfill.

**Testing**: Vitest 3.2 (`tests/**/*.test.ts`) on the embedded PostgreSQL with the in-process cache; the browser code under jsdom, as the existing `client-*` suites do. Two new files and additions to five existing ones (R10).

**Target Platform**: the existing web service (DigitalOcean App Platform) and modern browsers, in light and dark mode, from a 320 px window up.

**Project Type**: web service with a static browser client in one repository.

**Performance Goals**: SC-008: a colour change shows on an open card within one content refresh; no new request on the voter's path; the card derives and caches each colour once.

**Constraints**: no change to the vote path, search, screening or the automatic palette; every visible string uses American spelling; swatches and buttons are at least 48 dp; the stylesheet holds no palette colour and uses the Material 3 tokens, not literal font sizes, as the other M3 sheets do (`tests/m3-assets.test.ts` pins which sheets each page loads); comments only point to external documentation (Constitution VI).

**Scale/Scope**: up to `ENV_MAX_CHOICES` (default 50) choices per poll, one shared popover per step; 18 palette colours; about 1 server module, 1 route, 6 files edited on the server and client, 2 stylesheets, 1 API description, 2 new test files.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design: unchanged, all pass.*

| Principle | Status | How the plan meets it |
|---|---|---|
| I. Think Before Coding | Pass | Research, an architecture review with 9 resolved findings and a clarify pass came first; assumptions are in the spec and R1 to R11 |
| II. Simplicity First | Pass | Colours are one optional property, no column, no migration; the picker reuses the card's tokens and ripple; one new module and one new route; no preview, no free colour picker (spec Exclusions) |
| III. Surgical Changes | Pass | Server edits are confined to the choice types, `replaceChoices`, `duplicatePoll`, the two routes and the config; client edits to the bar colour rule and the wizard's step list; nothing about votes, search or screening moves |
| IV. Goal-Driven Execution | Pass | Every success criterion maps to a test or a quickstart scenario: SC-003 and SC-004 to bar-colour tests, SC-005 to the colours-route tests, SC-007 to a 17th-colour test |
| V. Code Quality & Maintainability | Pass | Single-purpose helpers (`normalizeColor`, `checkedColor`, `applyChoiceColors`); refusals are one `AdminError` message each; a refused save shows the server's message and keeps the wizard open; nothing sensitive is logged |
| VI. Self-Documenting Code | Pass | Names carry the rules; no comment describes behaviour or cites a requirement; the tests document the rules |
| Security, privacy, reliability | Pass | Colours are validated against the palette or the poll's own stored colours; the new route checks ownership, the session guid and the poll's state before writing, in one conditional update; a stored value is re-validated as a hex before it reaches a style |
| Performance and efficiency | Pass | No work added to the vote path; derived colours are cached by hex |
| Documentation deliverables | Pass | `/speckit-tasks` must end with the documentation phase: `README.md` and `ARCHITECTURE.md` (the bar-colour section and the admin card's steps) |

## Project Structure

### Documentation (this feature)

```text
specs/029-MANUAL-BAR-COLORS/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   ├── api.md           # /api/config, save, publish, and the new colours route
│   └── ui-contracts.md  # the Colors step, the popover, the bars, the card's requests
├── checklists/
│   └── requirements.md  # spec quality checklist (/speckit-specify output)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
src/
├── polls/
│   ├── barPalette.ts      # NEW: BAR_PALETTE, isPaletteColor, normalizeColor
│   ├── store.ts           # Choice gains color?
│   ├── versions.ts        # projection choice gains color?
│   └── service.ts         # replaceChoices(colors), applyChoiceColors, checkedColor, duplicatePoll
├── db/
│   └── schema.ts          # PollChoiceJson gains color?
├── routes/
│   ├── api.ts             # /api/config: barPalette
│   └── pollsApi.ts        # UPDATE_FIELDS += colors; publish and save take colors; NEW POST /colors
└── public/
    ├── pollCard.js        # rebuildData, assignResultColors, barColorsOf (derive on demand)
    ├── adminCard.js       # six steps, buildColorsStep, wizard colour map, request rule
    ├── admin.css          # six-column circle row and joining line
    └── admin-card-m3.css  # the colour row, button, dot, popover and swatches
postman/
└── openapi.json           # colors on save and publish, color on a choice, the colours route
tests/
├── bar-palette.test.ts            # NEW
├── polls-colors.test.ts           # NEW
├── client-bar-colours.test.ts     # additions
├── client-admin-wizard.test.ts    # six steps and the Colors step
├── polls-admin-wizard.test.ts     # colours with labels, UPDATE mode
├── openapi-contract.test.ts       # passes once the new path is described
└── refresh-deltas.test.ts         # a colour change reaches a card that holds the older version
CLAUDE.md                          # plan pointer between the SPECKIT markers
```

**Structure Decision**: extend the existing modules rather than add layers: the palette is the one new module because the server and browser must share its content through the config response and no existing file is its natural home; everything else is a change inside the file that already owns the behaviour (`service.ts` for choice writes, `pollsApi.ts` for routes, `pollCard.js` for bar colours, `adminCard.js` for the wizard). The new route sits beside the edit-session routes whose guard it copies.

### Design in brief

| Item | Where | Purpose | Spec |
|---|---|---|---|
| `BAR_PALETTE`, `isPaletteColor`, `normalizeColor` | `src/polls/barPalette.ts` | the one list, its membership test and the hex normaliser | FR-007 |
| `checkedColor(value, stored)` | `service.ts` | `null`, a palette colour or a stored colour; otherwise `AdminError(400)` | FR-009 |
| `replaceChoices(poll, labels, config, colors?)` | `service.ts` | pairs colours with labels before empties are dropped; writes `color` | FR-009 |
| `applyChoiceColors(poll, colors)` | `service.ts` | sets `color` on existing choices by position; same ids, labels, positions | FR-010 |
| `duplicatePoll` | `service.ts` | copies each choice's `color` | FR-012 |
| `UPDATE_FIELDS` | `pollsApi.ts` | gains `colors` | FR-011 |
| `POST /colors` | `pollsApi.ts` | colours-only save; guard and conditional write as the session release | FR-010 |
| `barPalette` | `/api/config` | the palette for the picker | FR-007 |
| `rebuildData`, `assignResultColors`, `barColorsOf` | `pollCard.js` | carry, choose and derive the bar colour | FR-013 to FR-016 |
| `WIZARD_STEPS` and every step literal | `adminCard.js`, `admin.css` | six circles; How and When become 5 and 6 | FR-001 |
| `buildColorsStep`, `wizard.colors` | `adminCard.js` | the step, rows, popover, colour map keyed by label | FR-002 to FR-006 |
| `wizardFields`, `saveChanges` | `adminCard.js` | colours in the fields; labels bring colours; colours-only goes to the route | FR-009, FR-020 |

## Complexity Tracking

No constitution violations; nothing to justify.
