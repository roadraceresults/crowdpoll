# Implementation Plan: Email Logo With Speech Bubble

**Branch**: `email-logo` | **Date**: 2026-11-12 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/20261112-175743-EMAIL-LOGO/spec.md`

## Summary

Give every email's header the full brand logo, the two figures inside the speech bubble, at 56 × 56 px:

- `devScripts/favicon-ico.ts` renders `src/public/email-logo.png` from the existing link-preview master
  `src/public/og-logo.svg` (not `favicon.svg`), in a 56 px window at 3×, so 168 × 168 px; it refuses a render that is
  not 168 × 168, not 8-bit RGBA, or not transparent in its top-left pixel (R1, R2).
- `layout()` in `src/email/templates.ts` writes the `<img>` at `width="56" height="56"`; the address stays
  `/email-logo.png` (R3, R5).
- The stored expected emails change only in those six sizes; new tests pin the header `<img>` and the committed
  PNG's size and transparency (R4).
- `provider-setup.md`, `ARCHITECTURE.md`, `CLAUDE_COMPLETE.md` and the script's docblock describe the new logo (R6, R7).

The favicon, `og-logo.svg` and `og-image.png` are unchanged.

## Technical Context

**Language/Version**: TypeScript ^5.8 on Node ≥ 22 (ESM), the script run by `tsx`.

**Primary Dependencies**: none new; `node:zlib` (`inflateSync`) for the transparency check; a local Chromium-based
browser (Edge, or `FAVICON_BROWSER`) for rendering, as today.

**Storage**: N/A — one committed static image, `src/public/email-logo.png`.

**Testing**: Vitest (`tests/email-layout.test.ts` and its fixture); the rendering is checked by the script and by eye
(quickstart §3), as for the favicon.

**Target Platform**: email clients (Gmail, Outlook, Apple Mail) loading a remote PNG; the developer's Windows machine
for the script.

**Project Type**: web service (Express) with a hand-run developer script.

**Performance Goals**: N/A — the PNG stays a few KB.

**Constraints**: no new dependency in the script (it writes the ICO by hand); no comments beyond external references
(Constitution VI); the email HTML changes only in the logo's two attributes.

**Scale/Scope**: 1 script, 1 template line, 1 fixture (6 substitutions), 2 tests, 1 regenerated PNG, 4 documents.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | How |
|---|---|---|
| I. Think before coding | Pass | Every choice settled in the requirements report (7 findings) and the spec; open technical points in research R1–R7. |
| II. Simplicity first | Pass | `renderPng` gains one parameter rather than a second renderer; a ~15-line alpha read with `node:zlib` instead of an image library. |
| III. Surgical changes | Pass | Only the email logo's source, size and check change; the fixture changes only in the six sizes. |
| IV. Goal-driven execution | Pass | Each change has a check: contract C1 (test), C2 (script refusals), quickstart §1–§4. |
| V. Quality and maintainability | Pass | Refusals log a `[favicon]` message and exit 1 before writing; no uncontrolled crash. |
| VI. Self-documenting code | Pass | No new comments; the existing docblock is updated only where it names the email logo. |
| Documentation deliverables | Pass | `ARCHITECTURE.md` updated after implementation; `README.md` names no logo (R7). |

Post-design re-check: unchanged, all pass. No Complexity Tracking entry.

## Project Structure

### Documentation (this feature)

```text
specs/20261112-175743-EMAIL-LOGO/
├── plan.md              # This file
├── research.md          # R1–R7
├── data-model.md        # the three images and their checks
├── quickstart.md        # regenerate, test, review, deploy
├── contracts/
│   └── email-logo.md    # C1 the header <img>, C2 the script's outputs and refusals
├── checklists/
│   └── requirements.md
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
devScripts/favicon-ico.ts                  # renderPng(svgPath), 56 px × 3 from og-logo.svg, topLeftAlpha check
src/email/templates.ts                     # <img width="56" height="56">
src/public/email-logo.png                  # regenerated, 168 × 168
tests/email-layout.test.ts                 # new: header <img> is 56 × 56 with alt CrowdPoll
tests/favicon-ico.test.ts                  # new: committed email-logo.png is 168 × 168, transparent top-left
tests/fixtures/email-messages-before-heading-line-2.json   # 48 → 56, six times
specs/20261022-131728-SOCIAL-OAUTH-PROVIDERS/provider-setup.md   # the icon's description
ARCHITECTURE.md, CLAUDE_COMPLETE.md        # the email logo's source and size
```

**Structure Decision**: the existing single project; no new file outside this feature's spec folder.

## Complexity Tracking

None.
