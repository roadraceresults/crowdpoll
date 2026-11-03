# Data Model: Field Length Limits

**Feature**: `20261102-154952-FIELD-LENGTH-LIMITS` | **Date**: 2026-11-02

No table, column or migration changes. Only the validation rules on existing fields change.

## Poll (`polls`)

| Field | Rule before | Rule after | Checked by |
|---|---|---|---|
| `title` | at most 50 | at most **60** | `validateFieldLength(…, TITLE_MAX, "Title")` |
| `subtitle` | at most 30 | at most **40** | `validateFieldLength(…, SUBTITLE_MAX, "Subtitle")` |
| `choices[].label` | at most 100 on every save | at most **35**, unless the trimmed label equals a stored label of the poll | `replaceChoices`, `mergeChoices` via `labelTooLong` (research R2) |

Stored values written before this feature are never rewritten (FR-007).
A stored label of up to 100 characters keeps its text, id, position, colour, `addedBy` and votes for as long as a save
repeats its text unchanged (after trimming). A save that changes its text makes it a new label, held to 35.

## Choice added by a voter

| Field | Rule before | Rule after | Checked by |
|---|---|---|---|
| `label` | at most 40 (`WIZARD_CHOICE_MAX`) | at most **35** (`CHOICE_LABEL_MAX`) | `validateAddedChoice` |

## Site configuration (`GET /api/config`)

| Field | Before | After |
|---|---|---|
| `wizardChoiceMax` | 40 | removed |
| `choiceLabelMax` | — | 35 (`CHOICE_LABEL_MAX`) |

## Limits as constants

| Constant | Server (`src/polls/service.ts`) | Browser copy (`src/public/adminCard.js`) |
|---|---|---|
| `TITLE_MAX` | 60 | 60 |
| `SUBTITLE_MAX` | 40 | 40 |
| `CHOICE_LABEL_MAX` | 35 | 35 (also the fallback for `runtime.choiceLabelMax`) |
| `WIZARD_CHOICE_MAX` | removed | — |

`tests/field-limits.test.ts` keeps the two columns equal (research R5).
