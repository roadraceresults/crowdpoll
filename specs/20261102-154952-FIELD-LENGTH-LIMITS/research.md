# Research: Field Length Limits

**Feature**: `20261102-154952-FIELD-LENGTH-LIMITS` | **Spec**: [spec.md](spec.md) | **Date**: 2026-11-02

The Technical Context has no open unknowns: the requirements report (IN1, AM1, UA1–UA4) and clarification Q1 fixed
every decision. Each item below records where a decision lands in the code and why.

## R1. The server's constants

- **Decision**: in `src/polls/service.ts`, `TITLE_MAX = 60`, `SUBTITLE_MAX = 40`, `CHOICE_LABEL_MAX = 35`;
  `WIZARD_CHOICE_MAX` is deleted, and `validateAddedChoice` (line 975) checks against `CHOICE_LABEL_MAX`.
- **Rationale**: FR-001–FR-004. Every server check already reads these constants: `validateFieldLength` builds its
  message from `max` ("Title must be at most 60 characters."), `validateAddedChoice` builds "A choice can be at most
  35 characters.", and `devScripts/populate/populate-poll.ts` imports all three (UA4), so the populate script follows
  with no edit.
- **Alternatives considered**: keeping `WIZARD_CHOICE_MAX` as an alias of `CHOICE_LABEL_MAX` — rejected, the
  requirement is one limit with one name.

## R2. Stored labels exempt from the length check on the server

- **Decision**: `replaceChoices` and `mergeChoices` refuse a label only when it is longer than `CHOICE_LABEL_MAX`
  **and** its trimmed text is not a label of the poll passed in. A small pure helper,
  `labelTooLong(label, storedLabels)`, holds the rule; both functions build `storedLabels` from
  `poll.choices.map((c) => c.label.trim())`, the same key `mergeChoices` already uses to keep a choice by text
  (`byLabel`) and `replaceChoices` uses for `addedBy` (`storedByLabel`).
- **Rationale**: FR-005, FR-007 (IN1). The poll passed in is the stored poll at both call sites in
  `src/routes/pollsApi.ts` (line 670 `current`, line 822): `validatePollFields` only re-sets `$set.choices` to the
  stored choices without `addedBy` (service.ts:623), which keeps every label. Choices a voter added since the editor
  opened are appended by `withChoicesAddedSince` with their stored text, so they are exempt too.
  An exact trimmed match is the identity `mergeChoices` uses; a looser match (case, spacing) would let an edited
  label through uncut while `mergeChoices` treats it as new.
- **Alternatives considered**: exempting by choice id — rejected, saves carry labels, not ids; a migration cutting
  stored labels — rejected in IN1 (B).

## R3. Stored labels exempt in the wizard's Choices box

- **Decision**: `sanitizeChoicesText` (`src/public/adminCard.js:233`) gains an option `storedLabels` (a `Set` of
  trimmed labels, empty by default). A line whose trimmed text is in the set is not cut; every other line is cut to
  `maxLabel`. `wireChoicesBox` passes it through. Step 3 passes the opened poll's labels
  (`session.poll.choices`) when the poll is existing, and an empty set for a new poll; `maxLabel` is
  `runtime.choiceLabelMax` in both cases.
- **Rationale**: FR-006 and clarification Q1 (B): a stored line is shown whole; the moment its text differs from the
  stored label it is no longer in the set, and the input handler cuts it to 35 at once, with today's message
  "Choices are capped at 35 characters." Typing only spaces at either end keeps the trimmed text, so the line stays
  stored, matching the server (R2).
- **Alternatives considered**: a cap per line equal to the stored length — rejected by Q1; an inline error with
  Save disabled — rejected by Q1.

## R4. `/api/config`: `choiceLabelMax` replaces `wizardChoiceMax`

- **Decision**: `src/routes/api.ts:165` sends `choiceLabelMax: CHOICE_LABEL_MAX`. Readers:
  `adminCard.js` (`runtime.choiceLabelMax`, defaulting to its `CHOICE_LABEL_MAX` copy, set in `setRuntimeConfig`),
  `tabs.js:195` (`choiceBounds.choiceLabelMax`, fallback 35), `pollCard.js:1501`
  (`maxLength: bounds.choiceLabelMax || 35`) and `addChoiceDialog.js:18` (`options.maxLength || 35`).
- **Rationale**: FR-008 (AM1). The four literal `40` fallbacks become 35.
- **Alternatives considered**: keeping the old name (AM1 B) — rejected.

## R5. Browser copies equal to the server's

- **Decision**: `adminCard.js` keeps its copies, now `CHOICE_LABEL_MAX = 35` (line 10), `TITLE_MAX = 60` and
  `SUBTITLE_MAX = 40` (lines 519–520). A new test, `tests/field-limits.test.ts`, reads `src/public/adminCard.js` as
  text, extracts each `const <NAME> = <n>;`, and expects each to equal the value imported from
  `src/polls/service.ts`.
- **Rationale**: FR-009 (UA1 A). Reading the source is enough: the copies are literal constants, and the test fails
  on the next change that forgets one.
- **Alternatives considered**: sending titles and subtitles through `/api/config` (UA1 B) — rejected as wider
  than the feature.

## R6. Longer titles and subtitles on every view

- **Decision**: no stylesheet change is planned. No rule in `src/public/*.css` truncates a title or subtitle
  (`nowrap`, `ellipsis`, `line-clamp` are absent for them), so text wraps as it does today. The 360 px check of the
  poll card, maximized card, admin card, search results and line-graph subtitle is a manual step in
  [quickstart.md](quickstart.md); only an overflow found there is fixed.
- **Rationale**: FR-011 (UA2). jsdom does not lay out, so overflow cannot be asserted automatically; the wizard's
  `maxLength` (60, 40) is asserted instead.

## R7. Documents

- **Decision**:
  - `postman/openapi.json`: title `maxLength` 60 and subtitle 40 in every schema that has them; choice-label
    `maxLength` 35 with a description saying a label equal to a stored label is exempt; the `/api/config` property
    `wizardChoiceMax` replaced by `choiceLabelMax` (35); the Add Choice request's `maxLength` 35 and its
    `CHOICE_TOO_LONG` text "at most 35 characters".
  - `README.md:47` "up to 40" → "up to 35".
  - `ARCHITECTURE.md:281` "40 characters" → "35 characters".
  - `CLAUDE.md`: the USER-ADD-CHOICES decision line naming `WIZARD_CHOICE_MAX` (40) is reworded to
    `CHOICE_LABEL_MAX` (35) when this plan becomes the current one.
- **Rationale**: FR-010, FR-012 (UA3); the invariant "`postman/openapi.json` follows the routes".

## R8. What stays

- **Decision**: `src/db/migrations/007-title-lengths.ts` and `tests/migration-title-lengths.test.ts` are unchanged;
  no migration is added.
- **Rationale**: FR-007, FR-012. An applied migration is history; raising the limits keeps every stored title and
  subtitle valid, and stored labels are exempt (R2, R3).

## R9. Tests to change

- **Decision**: the tests pinning old numbers move to the new ones, and new cases cover the exemption:
  - `tests/polls-admin-crud.test.ts:317–333` (51/50/30/31 → 61/60/40/41) and `:373` (101 → 36);
  - `tests/polls-service.test.ts:168` and `tests/polls-pending-update.test.ts:56` (101 → 36, message "at most 35"),
    plus a stored label of 72 characters accepted by `replaceChoices` and `mergeChoices` and keeping its id;
  - `tests/add-choice.test.ts:238–240` (40/41 → 35/36);
  - `tests/client-add-choice.test.ts:280–285` (40 → 35);
  - `tests/client-admin-wizard.test.ts:365–372` (40 → 35), `:1172–1173` (30/50 → 40/60), `:1723` renamed to
    `choiceLabelMax`, plus an existing poll whose 72-character choice is shown whole and is cut to 35 on its first
    edit;
  - `tests/populate-poll.test.ts:370–375` (51/31/101 → 61/41/36);
  - new `tests/field-limits.test.ts` (R5).
- **Rationale**: Constitution IV; each FR has an assertion.
