# Implementation Plan: Snackbar Hourglass

**Branch**: `snackbar-hourglass` | **Date**: 2026-11-09 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/20261108-193031-SNACKBAR-HOURGLASS/spec.md`

## Summary

The "Logged in as" notice shown after a login (by a provider, or by an emailed link since TWEAK01) gets an hourglass at its right end. Its sand drains smoothly over the notice's lifetime, now 7 seconds.

`app.js` builds the hourglass as a small inline SVG in the notice. `snackbar-m3.css` draws it in the notice's own M3 colours and animates it with transforms, timed by the same constant that ends the notice (passed as a CSS custom property). Under reduced motion it stands still and full. There is no image file, request, setting, route or dependency.

## Technical Context

**Language/Version**: vanilla JS and CSS in `src/public/`; TypeScript (Node ≥ 22, ESM) for tests only

**Primary Dependencies**: none new; inline SVG, CSS keyframes, M3 tokens from `m3-tokens.css`

**Storage**: N/A

**Testing**: Vitest + jsdom (`tests/client-sign-in-notice.test.ts`), the sheet assertions in `tests/m3-assets.test.ts`; the visual drain is checked in a browser by `quickstart.md`

**Target Platform**: current evergreen browsers (inline SVG, `transform-box: fill-box`, CSS custom properties)

**Project Type**: web service with static pages (no framework, no bundler)

**Performance Goals**: no added request; the animation uses only transform and opacity (compositor), about 0.5 KB added to `app.js` and `snackbar-m3.css`

**Constraints**: M3 layers hold only M3 tokens; no third-party request; the notice stays 48 px for one line; the animation and the timer share one constant

**Scale/Scope**: one notice per login; two source files and two test files changed, plus documentation

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Check | Result |
|---|---|---|
| I. Think Before Coding | The open choices (delivery, drawing, clock, layout) are settled with alternatives in research R1–R6 | Pass |
| II. Simplicity First | Four SVG elements and one modifier class; no file, setting or helper; the one duration constant drives both clocks | Pass |
| III. Surgical Changes | Only `showSignInNotice` and the snackbar sheet change; the other snackbars and the snackbar duplication noted as debt are left alone | Pass |
| IV. Goal-Driven Execution | Each FR maps to a test assertion (C2–C4) or a quickstart row | Pass |
| V. Code Quality | A single-purpose builder for the SVG; the address still goes in with `textContent`; no logging needed | Pass |
| VI. Self-Documenting Code | Descriptive class names (`hourglass-top`, `m3-snackbar--timed`); no comments citing the spec | Pass |
| Security & privacy | No new data; the address is never parsed as markup; nothing logged | Pass |
| Documentation Deliverables | `README.md` and `ARCHITECTURE.md` are updated in the post-implementation phase | Pass |

Re-check after Phase 1: unchanged, all pass. No Complexity Tracking entries.

## Project Structure

### Documentation (this feature)

```text
specs/20261108-193031-SNACKBAR-HOURGLASS/
├── plan.md              # This file
├── research.md          # R1–R10
├── data-model.md        # the constant, the markup, the states
├── quickstart.md        # automated and browser checks
├── contracts/
│   └── ui-contracts.md  # C1–C5
├── checklists/
│   └── requirements.md
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
src/public/
├── app.js               # SIGN_IN_NOTICE_MS 7000; showSignInNotice builds the text span and the hourglass SVG
└── snackbar-m3.css      # .m3-snackbar--timed: padding, text, hourglass, colours, keyframes, reduced motion

tests/
├── client-sign-in-notice.test.ts   # NOTICE_MS 7000; hourglass markup, timer property, unchanged text
└── m3-assets.test.ts               # sheet rules for the timed snackbar

README.md, ARCHITECTURE.md          # post-implementation documentation
```

**Structure Decision**: the existing single project. The change stays inside the sign-in notice's script function and its stylesheet, which every page that can show the notice already loads.

## Complexity Tracking

No violations.
