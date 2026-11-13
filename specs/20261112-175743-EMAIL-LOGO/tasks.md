---

description: "Task list for the email logo with speech bubble"
---

# Tasks: Email Logo With Speech Bubble

**Input**: Design documents from `specs/20261112-175743-EMAIL-LOGO/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/email-logo.md, quickstart.md

**Tests**: The plan names them (research R4): a header `<img>` assertion, the six fixture sizes, and a check of the
committed PNG.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)

## Path Conventions

Single project at the repository root: `src/`, `tests/`, `devScripts/`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: A green baseline before any change.

- [X] T001 Run `npx tsc --noEmit` and `npm test` from the repository root and confirm both pass before changing anything (record any pre-existing failure instead of fixing it)

---

## Phase 2: Foundational (Blocking Prerequisites)

None: the three stories touch different files. US1's visible result needs the image US2 writes (see Dependencies).

---

## Phase 3: User Story 1 - A recipient sees the full brand logo in an email (Priority: P1) 🎯 MVP

**Goal**: Every email built by `layout()` shows the logo at 56 × 56 px, from the same `/email-logo.png` address.

**Independent Test**: `npx vitest run tests/email-layout.test.ts tests/mailer.test.ts` passes; the rendered invitation
(quickstart §3) shows the logo 56 px tall.

### Tests for User Story 1

- [X] T002 [P] [US1] In `tests/email-layout.test.ts`, add a test that `layout({ origin: "https://crowdpoll.vote", preheader: "p", heading: "H", paragraphs: ["B"] }).html` contains exactly `<img src="https://crowdpoll.vote/email-logo.png" width="56" height="56" alt="CrowdPoll" style="vertical-align:middle;border:0;">` (contract C1); it fails until T004
- [X] T003 [P] [US1] In `tests/fixtures/email-messages-before-heading-line-2.json`, replace each of the six `width=\"48\" height=\"48\"` with `width=\"56\" height=\"56\"` and change nothing else (verify with `git diff --word-diff`: six changes, all in the logo's `<img>`)

### Implementation for User Story 1

- [X] T004 [US1] In `layout()` in `src/email/templates.ts` (the `<img src="${escapeHtml(origin)}/email-logo.png" …>` line), change `width="48" height="48"` to `width="56" height="56"`; nothing else in the header changes (research R3)
- [X] T005 [US1] Run `npx vitest run tests/email-layout.test.ts tests/mailer.test.ts` and confirm all pass, including "leaves every existing message exactly as it was before the change"

**Checkpoint**: Every email asks for a 56 × 56 logo; it still shows the old figures-only image until US2 runs.

---

## Phase 4: User Story 2 - The developer regenerates the email logo with the existing brand-image command (Priority: P2)

**Goal**: `npx tsx devScripts/favicon-ico.ts` writes a 168 × 168, transparent `email-logo.png` from `og-logo.svg`, and
refuses a bad render (contract C2).

**Independent Test**: Run the script (quickstart §1): three `[favicon] wrote …` lines, the email logo's reading
`(168 px, <n> bytes)`; `npx vitest run tests/favicon-ico.test.ts` passes.

### Implementation for User Story 2

- [X] T006 [US2] In `devScripts/favicon-ico.ts`, give `renderPng` an `svgPath` parameter (`renderPng(browser, workDir, svgPath, size, scale = 1)`) used for the screenshot URL in place of `SVG_PATH`; pass `SVG_PATH` in the favicon `SIZES.map(…)` call (research R1)
- [X] T007 [US2] In `devScripts/favicon-ico.ts`, set `EMAIL_LOGO_SIZE = 56` and `EMAIL_LOGO_SCALE = 3`, and render the email logo with `renderPng(browser, workDir, OG_LOGO_PATH, EMAIL_LOGO_SIZE, EMAIL_LOGO_SCALE)` (research R1)
- [X] T008 [US2] In `devScripts/favicon-ico.ts`, add and export `topLeftAlpha(png: Buffer): number`: read `IHDR` (throw `FaviconError("The email logo is not an 8-bit RGBA PNG")` unless bit depth 8 and colour type 6), join the `IDAT` chunk data, `inflateSync` it (`node:zlib`) and return byte 4 of the first scanline; in `main`, before writing the email logo, throw `FaviconError("The email logo's background is not transparent")` unless it returns 0 (research R2, contract C2)
- [X] T009 [US2] Update the docblock at the top of `devScripts/favicon-ico.ts` so it says the email logo is rendered from `src/public/og-logo.svg` at 56 px and 3× (168 px), transparent, and that the script refuses a wrong size or an opaque background; add no other comments (Constitution VI, research R7)
- [X] T010 [US2] Run `npx tsx devScripts/favicon-ico.ts`; confirm the log lines of contract C2 and that `src/public/email-logo.png` is 168 × 168; if `git status` shows `src/public/favicon.ico` or `src/public/og-image.png` changed, restore them with `git checkout -- src/public/favicon.ico src/public/og-image.png` (SC-005)
- [X] T011 [US2] Create `tests/favicon-ico.test.ts`: read `src/public/email-logo.png`, expect width and height 168 (bytes 16 and 20 of the PNG, as `renderPng` reads them) and `topLeftAlpha` 0 (imported from `../devScripts/favicon-ico.js`); expect `topLeftAlpha` of `src/public/og-image.png` (an 8-bit RGB file) to throw "The email logo is not an 8-bit RGBA PNG"; run `npx vitest run tests/favicon-ico.test.ts`
- [X] T012 [US2] Review the logo (quickstart §3): `npx tsx devScripts/render-invitation-email.ts <scratch folder> --force`, open `invitation-email.html` in a light and a dark colour scheme at 300 % zoom; the figures sit in the white bubble with its black outline, sharp, on the green bar (FR-011); then compare it side by side with the site header's logo and `src/public/og-image.png`: the same mark in all three (SC-003)

**Checkpoint**: The committed image is the full brand mark at 168 × 168; with US1, emails show it at 56 × 56.

---

## Phase 5: User Story 3 - The OAuth set-up instructions describe the logo they upload (Priority: P3)

**Goal**: `provider-setup.md` describes the email logo as it now is (requirements NC1, A).

**Independent Test**: Read the file: every mention of `email-logo.png` matches the new image.

### Implementation for User Story 3

- [X] T013 [P] [US3] In `specs/20261022-131728-SOCIAL-OAUTH-PROVIDERS/provider-setup.md`, change line 7's description of `src/public/email-logo.png` from "96 × 96, transparent" to the two figures in the speech bubble, 168 × 168, transparent, and add one sentence that logos already uploaded to Google and Microsoft stay as they are until re-uploaded (FR-009, research R6); leave the Google and Microsoft steps' file names as they are

**Checkpoint**: All three stories are done.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T014 [P] Update `ARCHITECTURE.md`: in the email-messages paragraph (the one naming the hosted `/email-logo.png`) and in "## Site icon" (the sentence "It also writes `email-logo.png`, the 96 px logo …"), say the email logo is rendered from `og-logo.svg`, shown at 56 px and rendered at 3× (168 px), checked for size and a transparent background, and seen by recipients once `npm run deploy` serves it (FR-010, Documentation Deliverables)
- [X] T015 [P] Update `CLAUDE_COMPLETE.md`: the line "a hosted `email-logo.png` (written by `devScripts/favicon-ico.ts`)" also names its source `og-logo.svg` and 56 px at 3×, and add this feature's decisions block (as for earlier features) from `CLAUDE.md`'s current-plan block
- [X] T018 [P] Check `README.md` after implementation: update it if it describes the email logo; if it does not (expected, research R7), change nothing and note "README.md: no change needed" in this task (Constitution, Documentation Deliverables). README.md: no change needed (it describes the favicon only, not the email logo)
- [X] T016 Run `npx tsc --noEmit` and `npm test`; confirm all pass
- [X] T017 Run quickstart §1–§3 end to end; §4 (real mail) waits for `npm run deploy`, which the developer starts

---

## Dependencies & Execution Order

### Phase Dependencies

- Setup (T001) first.
- US1 (T002–T005), US2 (T006–T012) and US3 (T013) may start after T001, in any order.
- Polish (T014–T018) after all stories.

### User Story Dependencies

- **US1**: none for its tests; the logo a recipient sees is US2's image, so SC-001 is met only when both are done.
- **US2**: none; T011 needs T010's image; T012 is best after US1 (the review then shows 56 px).
- **US3**: none.

### Within Each User Story

- US1: T002 and T003 before T004; T005 last.
- US2: T006 → T007 → T008 → T009 (same file, in order) → T010 → T011 → T012.

### Parallel Opportunities

- T002, T003 (US1) and T013 (US3) touch different files.
- T014, T015 and T018 touch different files.
- US1 and US2 can be built by two people at once; they meet at T012.

---

## Parallel Example: User Story 1

```text
Task: "T002 [US1] header <img> test in tests/email-layout.test.ts"
Task: "T003 [US1] six size substitutions in tests/fixtures/email-messages-before-heading-line-2.json"
```

---

## Implementation Strategy

### MVP First (User Story 1 + the image)

1. T001.
2. US1 (T002–T005): the emails ask for 56 × 56.
3. US2 (T006–T012): the image becomes the full brand mark; without it, US1 enlarges the old image, so ship them together.
4. **Stop and validate**: quickstart §1–§3.

### Incremental Delivery

1. US1 + US2 → deploy → real mail shows the new logo (quickstart §4).
2. US3 → documentation only, no deploy needed.
3. Polish → `ARCHITECTURE.md`, `CLAUDE_COMPLETE.md`.
