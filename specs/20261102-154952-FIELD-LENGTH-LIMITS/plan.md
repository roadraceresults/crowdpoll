# Implementation Plan: Field Length Limits

**Branch**: `field-lengths` | **Date**: 2026-11-02 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/20261102-154952-FIELD-LENGTH-LIMITS/spec.md`

## Summary

Titles go to 60 characters and subtitles to 40; choice labels get one limit, `CHOICE_LABEL_MAX = 35`, and
`WIZARD_CHOICE_MAX` (40) is deleted (R1).
Labels already stored are never cut: `replaceChoices` and `mergeChoices` exempt a label whose trimmed text equals a
stored label (R2), and the wizard's `sanitizeChoicesText` takes the stored labels and leaves those lines whole, cutting
a stored line to 35 the moment its text changes (R3, clarification Q1).
`/api/config` sends `choiceLabelMax` in place of `wizardChoiceMax`, and the browser's fallbacks become 35 (R4).
The browser copies of the three limits are updated and a test keeps them equal to the server's (R5).
No migration, table, route, setting or dependency change; migration 007 stays as it is (R8).

## Technical Context

**Language/Version**: TypeScript on Node ≥ 22 (ESM) for the server; browser JavaScript (no bundler) for
`src/public/`.

**Primary Dependencies**: Express 5, Kysely; none new.

**Storage**: PostgreSQL; no schema change.

**Testing**: Vitest + supertest + embedded PostgreSQL; jsdom for client scripts through `tests/helpers/browser.ts`.

**Target Platform**: the DigitalOcean web service and current desktop and mobile browsers.

**Project Type**: web application (Express server + vanilla browser client).

**Performance Goals**: no new request; the exemption is one `Set` built per save over at most `ENV_MAX_CHOICES`
labels.

**Constraints**: no stored value is rewritten (FR-007); an ever-voted poll's choices keep their ids (`mergeChoices`
matches by trimmed text); no comment explaining what the code does (Constitution VI).

**Scale/Scope**: about 8 source files with small edits, `postman/openapi.json`, four docs, 8 test files updated and
one new.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Check | Result |
|---|---|---|
| I. Think Before Coding | 6 requirements findings and 1 clarification resolved; assumptions in the spec | Pass |
| II. Simplicity First | constants change; one helper `labelTooLong`; one option on `sanitizeChoicesText`; no setting (R1–R3) | Pass |
| III. Surgical Changes | only the limit checks, the config field and its readers; migration 007 untouched (R8) | Pass |
| IV. Goal-Driven Execution | every FR has a test (R9); the 360 px check is a quickstart step (R6) | Pass |
| V. Code Quality | single-purpose helper; error messages built from the constants; no new logging needed | Pass |
| VI. Self-Documenting Code | the comment at `adminCard.js:1408` ("keeps the server's 100 characters") is replaced by names (`storedLabels`) | Pass |
| Security / Privacy | input limits only tighten for new labels; no data, log or access change | Pass |
| Performance | O(choices) per save | Pass |
| Documentation Deliverables | README and ARCHITECTURE sentences updated with the numbers (R7) | Pass (task) |

Re-check after Phase 1: unchanged, all pass.

## Project Structure

### Documentation (this feature)

```text
specs/20261102-154952-FIELD-LENGTH-LIMITS/
├── plan.md              # This file
├── research.md          # R1–R9
├── data-model.md        # the changed rules; no schema change
├── quickstart.md        # validation guide
├── contracts/
│   ├── api.md           # A1 /api/config, A2 poll saves, A3 voter's added choice, A4 openapi.json
│   └── ui-contracts.md  # C1 title/subtitle, C2 new poll's box, C3 existing poll's box, C4 Add Choice, C5 views
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
src/
├── polls/service.ts            # TITLE_MAX 60, SUBTITLE_MAX 40, CHOICE_LABEL_MAX 35; WIZARD_CHOICE_MAX removed;
│                               # labelTooLong() used by replaceChoices / mergeChoices; validateAddedChoice → 35
├── routes/api.ts               # /api/config: choiceLabelMax
└── public/
    ├── adminCard.js            # copies 60/40/35; runtime.choiceLabelMax; sanitizeChoicesText storedLabels
    ├── tabs.js                 # choiceBounds.choiceLabelMax (fallback 35)
    ├── pollCard.js             # Add Choice maxLength from choiceLabelMax (fallback 35)
    └── addChoiceDialog.js      # default maxLength 35

postman/openapi.json            # A4
README.md, ARCHITECTURE.md, CLAUDE.md, CLAUDE_COMPLETE.md

tests/
├── field-limits.test.ts        # new: browser copies equal the server's
├── polls-admin-crud.test.ts, polls-service.test.ts, polls-pending-update.test.ts
├── add-choice.test.ts, client-add-choice.test.ts, client-admin-wizard.test.ts
└── populate-poll.test.ts
```

**Structure Decision**: the existing single repository layout; every change lands in a file that already holds the
limit or reads it.

## Complexity Tracking

No violations.
