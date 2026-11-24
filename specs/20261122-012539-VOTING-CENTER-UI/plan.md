# Implementation Plan: Voting Center

**Branch**: `voting` | **Date**: 2026-11-23 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/20261122-012539-VOTING-CENTER-UI/spec.md`; requirements report
`requirements/20261122-012539-voting-center-ui/requirements-report.md` (23 findings, all resolved).

## Summary

The poll card's voting side becomes the **Voting Center**. The change covers:

- **Buttons**: new labels ("Cast Your Vote", "Cast this vote" / "Cast these votes") and new places (primary button on the
  left, flip-back on the right, the phone vote bar likewise).
- **Adding a choice**: the Add Choice dialog is replaced by an **add-your-own row**, the last bar on both faces of
  every card, which adds a choice on Enter. A "Choice added" snackbar confirms it, and live updates never disturb a row
  in use.
- **Long ballots**: on the desktop, a maximized ballot of 10 or more choices repeats its action row under the title.
  Multiple-choice ballots show "You may select more than one choice."
- **Follow**: the maximized Voting Center gets a Follow button, and Watch is renamed Follow in every place users see.
- **Who Voted**: the date column is headed "Vote Cast Date".

It is a client-only change in `src/public/` and `README.md`. Every server route, payload, table and address is unchanged
([research.md](research.md) R1). The row is one persistent element per face, which the renderers keep in place, so
typed text, caret and focus survive every redraw (R2, R18).

## Technical Context

**Language/Version**: Browser JavaScript (ES2020, plain scripts, no bundler) and CSS. The server is TypeScript on
Node ≥ 22 (ESM) but is not changed.

**Primary Dependencies**: None new. The page's own `pollCard.js`, `tabs.js`, `whoVoted.js`, `sharePoll.js`
(`SharePoll.snackbar`) and the Material 3 `*-m3.css` layers.

**Storage**: N/A. Nothing new is stored, server-side or in the browser (R20).

**Testing**: Vitest with jsdom client suites (`tests/client-*.test.ts` via `tests/helpers/browser.ts`); the asset suites
(`m3-assets`, `phone-sheets`, `poll-card-assets`); `npm run test:built` for the obfuscated build.

**Target Platform**: Evergreen desktop and mobile browsers, including Chromium before 105 (no `:has()` for logic that
must work there, as `syncTitleIcons` already notes).

**Project Type**: Web application, with an Express server and vanilla client in one repository.

**Performance Goals**: No extra request per render. The row adds one element per face and no listener per refresh. A
live refresh keeps its in-place path.

**Constraints**:
- M3 layers hold tokens only, so a missing token is added to `m3-tokens.css` (R9).
- No top-level, global or property name the build relies on is renamed.
- `tabs.js` tab changes use `replaceState`.
- The deep-link tab name `watching` is kept.
- The card faces keep equal height.

**Scale/Scope**:
- 6 user stories, 25 functional requirements.
- About 10 client files touched, plus `README.md` and `CLAUDE.md`.
- 1 file deleted (`addChoiceDialog.js`) and 1 renamed (`add-choice-m3.css` → `add-own-m3.css`).
- About 12 test suites updated or rewritten.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | How the plan meets it |
|---|---|---|
| I. Think Before Coding | ✅ | 23 requirement findings and 2 clarifications resolved; R1–R20 record each choice with alternatives |
| II. Simplicity First | ✅ | One row builder used by both faces; the server's checks are reused, not copied; the top row is a synced copy, not a second state machine; no new file except the renamed sheet |
| III. Surgical Changes | ✅ | Only lines that trace to an FR change; orphans of the removed dialog are removed (`latestDetail`, `addChoiceBtn`, `submitLabel`); existing comments are brought into line with Principle VI only in the regions being changed, and left alone elsewhere (Governance scope clause) |
| IV. Goal-Driven Execution | ✅ | [contracts/ui.md](contracts/ui.md) V1–V22 map every FR to a check; [quickstart.md](quickstart.md) lists the suites and manual scenarios |
| V. Code Quality (NON-NEGOTIABLE) | ✅ | Small single-purpose functions (`createAddOwnRow`, `showsAddOwnRow`, `syncTopRow`, `fitLabel`); a failed addition is shown, never thrown; the client logs nothing new |
| VI. Self-Documenting Code (NON-NEGOTIABLE) | ✅ | New code uses names, not comments; no FR or task ids in code; constants named for their job (e.g. the sizer labels) |
| Security, Privacy & Reliability | ✅ | Labels are set with `textContent`/`placeholder`, never `innerHTML`; the server still validates every addition; no voter name or new data reaches the browser |
| Performance | ✅ | No new request or timer; the in-place results path is kept |
| Documentation Deliverables | ✅ | `README.md` is updated after implementation (tasks' final phase); `ARCHITECTURE.md` gets only what changes (the Add Choice path) |

**Post-design re-check**: ✅. Phase 1 added no dependency, storage or route. The one constraint risk (a literal colour
in an M3 layer, Breaking Change 6 in the report) is avoided because IN4 removed the red and R9 adds the missing token.

## Project Structure

### Documentation (this feature)

```text
specs/20261122-012539-VOTING-CENTER-UI/
├── plan.md              # This file
├── research.md          # Phase 0: R1–R20
├── data-model.md        # Phase 1: the row's client state, visibility and layout rules
├── quickstart.md        # Phase 1: suites to run, 16 manual scenarios
├── contracts/
│   └── ui.md            # Phase 1: V1–V22
├── checklists/
│   └── requirements.md  # from /speckit-specify
└── tasks.md             # Phase 2 (/speckit-tasks)
```

### Source Code (repository root)

```text
src/public/
├── pollCard.js          # template (button order, top row, help lines, back-face Follow, support lines);
│                        # labels, fitLabel, createAddOwnRow / showsAddOwnRow, renderers keep the row,
│                        # fitting / ballotOpensMaximized count it, syncTopRow, bookmarkBtns, Follow wording;
│                        # Add Choice button, handler and latestDetail removed
├── tabs.js              # Follow wording (empty texts, cap modal); grid render restores a moved row's focus
├── whoVoted.js          # "Vote Cast Date"
├── index.html           # tab label "Following"; #voteBar order; addChoiceDialog.js removed; add-own-m3.css link
├── addChoiceDialog.js   # DELETED
├── add-choice-m3.css    # RENAMED → add-own-m3.css (row styles only)
├── m3-tokens.css        # + --md-sys-color-surface-container-lowest (light, dark)
├── site.css             # margin-left:auto moves from .vote-btn to .live-link; .btn-vote-label{width:0;
│                        # min-width:100%} so only the sizers set the width; .top-submit-btn joins the grid rules
├── pollCard.css         # action-row comments follow the new order
├── pollCard-m3.css      # top row, divider, help line, back-face Follow visibility, label fitting
└── phone-card-m3.css    # .add-choice-btn rules removed; row and vote bar on the phone

tests/
├── client-add-choice.test.ts   # rewritten for the row
├── client-maximized.test.ts    # top row, help line, back-face Follow
├── client-remove-vote.test.ts, client-home.test.ts, client-home-tab.test.ts,
├── client-phone-view.test.ts, client-tabs-026.test.ts, client-who-voted.test.ts,
├── m3-assets.test.ts, phone-sheets.test.ts, poll-card-assets.test.ts   # wording, order, assets

README.md                # Voting Center, Cast, add-your-own row, Follow
CLAUDE.md                # SPECKIT plan pointer; "Watch is Follow in the UI only"
```

**Structure Decision**: This is the existing single repository (Express server in `src/`, plain client in
`src/public/`, suites in `tests/`). The feature lives in the client layer and its tests. No directory is added.

## Decisions that are easy to get wrong

- **The row is never re-created during a render**: the renderers clear every child except `li.add-own-item` (R2), and
  the grid re-focuses a row it moved (R18).
- **The row counts as a bar** in `layoutFor`, `fitting()` and `ballotOpensMaximized()` (R4).
- **Top-row buttons do not reuse `.submit-vote-btn` / `.back-btn`**: `tabs.js` and the suites find those with
  `querySelector` (R13).
- **The sizers keep today's labels**, so the width does not change; the new labels shrink to fit (R11). This works only
  because `site.css` takes the visible label out of the width (`.btn-vote-label{width:0; min-width:100%}`): without it
  the label widens the button and `fitLabel` never sees an overflow.
- **Only text users see says Follow**: `watching`, `bookmark`, `mayWatch` and the eye symbols keep their names (R16).
- **`mayAddChoice()` is unchanged**; the row adds only the maximum-choices, editing and placeholder conditions (R3).

## Complexity Tracking

No constitution violations to justify.
