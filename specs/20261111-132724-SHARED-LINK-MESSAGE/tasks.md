# Tasks: Shared Link Message

**Input**: Design documents from `specs/20261111-132724-SHARED-LINK-MESSAGE/`

**Prerequisites**: plan.md, spec.md, research.md (R1–R10), data-model.md, contracts/api.md (A1–A3),
contracts/page.md (P1–P5), contracts/ui-contracts.md (C1–C3), quickstart.md

**Tests**: included, as research R8 and constitution principle IV (Goal-Driven Execution) require: each story's tests
are written first and must fail before its implementation makes them pass.

**Organization**: tasks are grouped by user story so each story can be implemented and tested on its own.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on an unfinished task)
- **[Story]**: the user story the task belongs to (US1, US2, US3)
- Every task names its file path

## Path Conventions

Single project: `src/` and `tests/` at the repository root (plan.md, Project Structure).

Sharing modes: "Anyone you send the link to" is the UI label of `poll_sharing_mode` `Anyone With The Link`; "Only
people you invite" of `Invitation Only`; "Everyone on CrowdPoll" is `poll_visibility` `Public Poll`. Stored values
stay verbatim in code and tests; the UI labels appear in the spec and the wizard.

---

## Phase 1: Setup

**Purpose**: confirm the starting point; no new project or dependency.

- [X] T001 Run `npx tsc --noEmit` and `npx vitest run tests/seo.test.ts tests/field-limits.test.ts tests/polls-pending-update.test.ts tests/client-admin-wizard.test.ts` to record a green baseline before any change (plan.md, SC-007)

---

## Phase 2: Foundational (blocks every story)

**Purpose**: the column every story reads: the Link Preview Message in the database and the `Poll` record
(research R1, data-model.md).

- [X] T002 Create `src/db/migrations/021-link-preview-message.ts` mirroring `020-invitation-message.ts`: `up` adds `link_preview_message text not null default ''` to `polls`, `down` drops it; register it after `020-invitation-message` in `src/db/migrations/index.ts`
- [X] T003 [P] In `src/db/schema.ts`, add `link_preview_message: Generated<string>` to the polls table (beside `invitation_message`, ~l.90) and `linkPreviewMessage?: string` to `PendingUpdateJson` (~l.135)
- [X] T004 [P] In `src/polls/notes.ts`, export `LINK_PREVIEW_MESSAGE_MAX = 100` beside `INVITATION_MESSAGE_MAX` (~l.4)
- [X] T005 In `src/polls/store.ts`, add `linkPreviewMessage: string` to `Poll` (~l.131) and `PendingUpdate` (~l.189), map it in `rowToPoll` (~l.216), `FIELD_TO_COLUMN` (~l.286), `NON_CONTENT_FIELDS` (~l.312) and `pollToRow` (~l.518), and write `pending.linkPreviewMessage` to `link_preview_message` in the approval apply (~l.815), each beside its `invitationMessage` twin
- [X] T006 In `src/polls/service.ts`, default the new poll's `linkPreviewMessage` to `""` (~l.103) and copy it in `duplicatePoll` (~l.1214); in `tests/helpers/poll-fixtures.ts` (~l.12) default `makePoll`'s `linkPreviewMessage` to `""`
- [X] T007 Create `tests/migration-link-preview-message.test.ts` mirroring `tests/migration-invitation-message.test.ts`: `up` adds `link_preview_message` with default `''`, a poll row inserted before the migration reads `''` after it, `down` drops the column; then run `npx tsc --noEmit` and `npx vitest run tests/migration-link-preview-message.test.ts tests/polls-admin-crud.test.ts`; all pass with the column present and unused (spec FR-002)

**Checkpoint**: the column exists on every row as `''`; nothing user-visible has changed.

---

## Phase 3: User Story 1 — A Link Preview Message for shared-link polls (Priority: P1) 🎯 MVP

**Goal**: the creator of an "Anyone you send the link to" poll enters a 100-character Link Preview Message in Step 1,
sees it in the Settings Summary, and the server stores, limits, screens, reviews and copies it exactly as the Custom
Email Message.

**Independent Test**: `POST /api/admin/polls/:pid/save` with `linkPreviewMessage` stores it, refuses 101 characters,
screens it, parks a post-vote change in `pending_update`, copies it on Duplicate and returns it in the admin detail
only; in jsdom the field shows under "Anyone you send the link to" with counter `n / 100` and the summary line
appears.

### Tests for User Story 1

- [X] T008 [P] [US1] In `tests/field-limits.test.ts` (~l.60–100, beside the custom email message cases), add: `LINK_PREVIEW_MESSAGE_MAX` is 100; save and publish accept a 100-character `linkPreviewMessage` and refuse 101 with `400` `Link preview message must be at most 100 characters.`; a whitespace-only value is stored as `""`; a non-string is refused (contracts/api.md A1)
- [X] T009 [P] [US1] In `tests/polls-pending-update.test.ts` (~l.572–604, beside the invitation message case), add: on a published, voted "Anyone With The Link" poll, a changed `linkPreviewMessage` is parked in `pending_update.linkPreviewMessage`, the column is unchanged, and the approval sweep writes it to `link_preview_message` (spec US1 scenario 7)
- [X] T010 [P] [US1] In `tests/polls-screening.test.ts` (~l.41–44, 130), add: a flagged term in `linkPreviewMessage` is refused and the message names "link preview message"; the clause is absent when the field is empty (contracts/api.md A1)
- [X] T011 [P] [US1] In `tests/polls-admin-crud.test.ts` (~l.511–516), add: Duplicate copies `linkPreviewMessage`; `GET /api/admin/polls/:pid` returns `linkPreviewMessage` and `linkPreviewMessageHtml` (`**b**` → `<strong>b</strong>`); the admin list row carries `hasLinkPreviewMessage` true/false (contracts/api.md A2–A3)
- [X] T012 [P] [US1] In `tests/polls-discovery.test.ts` (~l.179–213), add a distinctive `linkPreviewMessage` to the leak test's poll and assert it appears in none of the card, tab, delta, `/api/me/polls/:pid` or `/poll/:pid` payloads (spec SC-002, A2)
- [X] T013 [P] [US1] In `tests/client-admin-wizard.test.ts` (~l.1966–2120, beside the custom email message tests), add: with "Anyone you send the link to" selected the field `#pollLinkPreviewMessage-<pid>` shows after the Copy Link block with label `Link Preview Message`, support `Optional. Shown under the poll's title when its link is shared in a messaging app.` and counter `0 / 100`; absent under the other two options; typing a message, switching to "Only people you invite" and back keeps it; `/save` sends `linkPreviewMessage` whatever the mode; the Settings Summary shows `A Link Preview Message has been entered` (class `wizard-summary-link-preview-message`, aria label `Link Preview Message: change in Step 1`) after the Who line only for a link poll with text, and tapping it opens Step 1 with the field focused; the list row's `hasLinkPreviewMessage` drives the line before the detail loads (contracts/ui-contracts.md C1–C2)
- [X] T014 [US1] Run `npx vitest run tests/field-limits.test.ts tests/polls-pending-update.test.ts tests/polls-screening.test.ts tests/polls-admin-crud.test.ts tests/polls-discovery.test.ts tests/client-admin-wizard.test.ts` and confirm T008–T013 fail

### Implementation for User Story 1

- [X] T015 [US1] In `src/polls/service.ts`, validate `body.linkPreviewMessage` beside `invitationMessage` (~l.509–511): `normalizeNotes(validateFieldLength(…, LINK_PREVIEW_MESSAGE_MAX, "Link preview message"))`, and add `linkPreviewMessage: LINK_PREVIEW_MESSAGE_MAX` to `LIMITS` (~l.902) (research R1)
- [X] T016 [P] [US1] In `src/polls/screening.ts` (~l.14–48), add `linkPreviewMessage` to `ScreeningInput`, include its plain text in the screened text, and append `, link preview message` to the rejection sentence's field list when it is non-empty, after the custom email message clause
- [X] T017 [P] [US1] In `src/polls/sweeps.ts` (~l.221, ~l.286), pass `linkPreviewMessage: notesPlainText(pending.linkPreviewMessage ?? claimed.linkPreviewMessage)` to both `screenWithTimeout` calls
- [X] T018 [US1] In `src/routes/pollsApi.ts`: add `linkPreviewMessage` to `UPDATE_FIELDS` (~l.643) and to the pending-update routing (~l.715–731) so a changed value on a voted published poll goes to `pending.linkPreviewMessage`; in `buildAdminPollDetail` (~l.328–338) return `linkPreviewMessage` and `linkPreviewMessageHtml: renderNotesHtml(poll.linkPreviewMessage)` and the pending copy; in the admin list row (~l.904) add `hasLinkPreviewMessage: p.link_preview_message !== ""`; pass `linkPreviewMessage: ""` where the choice screening call builds its input (research R1, contracts/api.md A1–A3)
- [X] T019 [P] [US1] In `postman/openapi.json`, document `linkPreviewMessage` beside each `invitationMessage` entry: the detail (~l.240/245), `pendingUpdate` (~l.265), the list row's `hasLinkPreviewMessage` (~l.360), the save body (~l.3731) and the publish body (~l.3992), with the 100-character rule and the admin-only note
- [X] T020 [US1] In `src/public/adminCard.js`, wire the field as the Custom Email Message's twin: `storedNotes` (~l.538–546) reads `linkPreviewMessage`/`linkPreviewMessageHtml`; `wizardBase` (~l.625–633), `wizardDirty` (~l.654–657), `canChange`'s always-editable text list (~l.515), `reviewNeeded` (~l.2230), `wizardFields` (~l.2262), `keepWizardProgress` (~l.2293) and `readOnlyAnswers` (~l.2519, `hasLinkPreviewMessage`) each gain the field; `buildStep1` (~l.1137–1143) renders, when `wizard.who === "link"`, after `buildCopyLink()`, `m3RichTextField({ key: "linkPreviewMessage", htmlKey: "linkPreviewMessageHtml", idPrefix: "pollLinkPreviewMessage-", label: "Link Preview Message", support: "Optional. Shown under the poll's title when its link is shared in a messaging app.", max: 100, editLabel: "Edit link preview message" })` (research R7, C1)
- [X] T021 [US1] In `src/public/adminCard.js`, add `linkPreviewMessagePart` beside `invitationMessagePart` (~l.897–906) with text `A Link Preview Message has been entered`, aria label `Link Preview Message: change in Step 1`, focusing `#pollLinkPreviewMessage-<pid>`; render the line (class `wizard-summary-link-preview-message`) after the Who line (~l.946–956) when `who === "link"` and `s.hasLinkPreviewMessage ?? hasVisibleText(s.linkPreviewMessageHtml)`; add `link-preview-message` to the line-order regex (~l.1059) (C2)
- [X] T022 [US1] Run `npx tsc --noEmit` and the T014 list plus `tests/polls-screening.test.ts`; all pass (SC-003)

**Checkpoint**: the creator can enter, save and see the Link Preview Message; it does not yet reach the preview.

---

## Phase 4: User Story 2 — The card's description is right for every poll (Priority: P1)

**Goal**: the login page's description uses the message of the poll's current sharing mode, on one line, with the
configurable default sentence when the poll has neither subtitle nor message; the public poll page is unchanged.

**Independent Test**: a guest `GET /login?PID=` on an "Anyone With The Link" poll shows `subtitle - message` from
`link_preview_message`, never `invitation_message`; line breaks are spaces; without both it shows the configured
sentence; `GET /poll/:pid` still describes with `Vote and see live results: <title>`; a blank or 301-character
setting stops the app.

### Tests for User Story 2

- [X] T023 [P] [US2] In `tests/seo.test.ts`'s login-page describe (~l.280+), add: (a) an "Anyone With The Link" OPEN poll with subtitle `S` and `link_preview_message` `Line **one**\nLine two` → `og:description` = `escapeHtml("S - Line one Line two")`; (b) the same poll with an `invitation_message` set too → the invitation text is absent; (c) an Invitation Only poll with both columns → the invitation message, the link message absent; (d) a message `a  b\r\n\n  c` → `S - a b c`; (e) neither subtitle nor message → `You have been invited to vote in this poll.`; (f) a public OPEN poll with a `link_preview_message` → subtitle only, or the default; (g) a voted poll whose `pending_update.linkPreviewMessage` differs → the column's text; keep the 300-cut and escaping cases, and change the existing fallback expectation from `Vote and see live results: …` to the default sentence (contracts/page.md P1; spec US2 scenarios 1–4)
- [X] T024 [P] [US2] In `tests/seo.test.ts`, add tests that call `renderLoginPage(loginHtml, poll, "", ORIGIN, fallback)` directly (no second app or database): with `fallback` `Have your say.` a poll without subtitle or message describes with `Have your say.`; with `fallback` `<b>x</b> & "q"` the description attributes hold `&lt;b&gt;x&lt;/b&gt; &amp; &quot;q&quot;` and the body has no raw `<b>x</b>`; the end-to-end default stays in T023 (e); and keep the `/poll/:pid` head test (~l.139–168) asserting `Vote and see live results: <title>` for a public poll without subtitle (spec US2 scenarios 4–5, Edge Cases, FR-009)
- [X] T025 [P] [US2] In `tests/config.test.ts` (~l.725–735, `defaultsUsed`), add: `ENV_DEFAULT_LINK_PREVIEW_MESSAGE` defaults to `You have been invited to vote in this poll.` and is listed in `defaultsUsed`; a set value is trimmed and exposed as `config.defaultLinkPreviewMessage`; `""`, `"   "` and a 301-character value throw `ConfigError` whose message names `ENV_DEFAULT_LINK_PREVIEW_MESSAGE` (spec US2 scenario 6)
- [X] T026 [US2] Run `npx vitest run tests/seo.test.ts tests/config.test.ts` and confirm T023–T025 fail

### Implementation for User Story 2

- [X] T027 [P] [US2] In `src/config.ts`, with the other text settings (~l.104 and the `AppConfig` field ~l.479): `const defaultLinkPreviewMessage = read.text("ENV_DEFAULT_LINK_PREVIEW_MESSAGE", "You have been invited to vote in this poll.").trim();` then throw `ConfigError("Invalid ENV_DEFAULT_LINK_PREVIEW_MESSAGE: it must not be blank.")` when empty and `…: it must be at most 300 characters.` when longer than 300; add `defaultLinkPreviewMessage: string` to `AppConfig` and the returned object (research R4)
- [X] T028 [P] [US2] In `src/seo/loginPage.ts`: add `oneLine(text) = text.replace(/\s+/g, " ").trim()` and apply it to the subtitle and to `notesPlainText(message)` in `linkPreviewDescription(poll, message, fallback)`, replacing the literal fallback with the `fallback` parameter; add `renderLoginPage(loginHtml, poll, message, origin, fallback)`; export `previewMessageOf(row: Pick<PollRow, "poll_visibility" | "poll_sharing_mode" | "invitation_message" | "link_preview_message">)` returning `""` for `Public Poll`, `invitation_message` for `Invitation Only`, else `link_preview_message` (research R2, R3, data-model.md)
- [X] T029 [US2] In `src/routes/pages.ts` `GET /login` (~l.99–117), call `renderLoginPage(assets.pageHtml("login.html"), projectPoll(row), previewMessageOf(row), config.publicOrigin, config.defaultLinkPreviewMessage)`; confirm `describe()` in `src/seo/pollPage.ts` is untouched (FR-009)
- [X] T030 [P] [US2] Add the `ENV_DEFAULT_LINK_PREVIEW_MESSAGE` row to `.claude/rules/environment.md` (beside `ENV_EMAIL_FROM`, ~l.43), the README settings table (~l.598) and `CLAUDE_COMPLETE.md`'s settings table (~l.1159): default `You have been invited to vote in this poll.`, trimmed, blank or over 300 characters refused at start-up, used only on the login page's link preview (research R4)
- [X] T031 [US2] Run `npx tsc --noEmit` and `npx vitest run tests/seo.test.ts tests/config.test.ts tests/pages.test.ts tests/shared-link.test.ts`; all pass

**Checkpoint**: every poll's card describes with the right message, on one line, or the site's sentence.

---

## Phase 5: User Story 3 — Meta's apps show the card, and the card carries a brand image (Priority: P2)

**Goal**: `robots.txt` lets Meta's preview crawlers read `/login`; every preview page carries a 1200 × 630 brand
image with its width, height and type.

**Independent Test**: `GET /robots.txt` is the two-group text of contracts/page.md P4; `GET /login?PID=` and
`GET /poll/:pid` both carry `og:image` `${ORIGIN}/og-image.png` with `og:image:width` 1200, `og:image:height` 630,
`og:image:type` `image/png`; `src/public/og-image.png` is a 1200 × 630 PNG under 300 KB and `GET /og-image.png` is
`200 image/png`.

### Tests for User Story 3

- [X] T032 [P] [US3] In `tests/seo.test.ts`, replace the robots expectation (~l.37–59) with the two groups of contracts/page.md P4 (the `*` group unchanged; then `User-agent: facebookexternalhit`, `User-agent: meta-externalfetcher`, `Allow: /`, `Allow: /login`, the disallows without `/login`, `Sitemap: ${ORIGIN}/sitemap.xml`) and assert a blank line separates the groups (spec US3 scenario 1)
- [X] T033 [P] [US3] In `tests/seo.test.ts`, extend `expectPollTags()` and the `/poll/:pid` head test (~l.139–168) to assert the four `og:image*` tags in order after `og:url` and before `twitter:card`, and drop the `expect(html).not.toContain("og:image")` assertion (~l.338) (spec US3 scenarios 2–3, P1, P3)
- [X] T034 [P] [US3] In `tests/pages.test.ts` (beside the favicon tests, ~l.239+), add: `src/public/og-image.png` exists, its IHDR chunk reads width 1200 and height 630, its size is under 300 000 bytes, and `GET /og-image.png` is `200` with `Content-Type` `image/png` (spec US3 scenario 4, P5)
- [X] T035 [US3] Run `npx vitest run tests/seo.test.ts tests/pages.test.ts` and confirm T032–T034 fail

### Implementation for User Story 3

- [X] T036 [P] [US3] In `src/routes/seo.ts`, build `ROBOTS` (~l.24–40) from one list of disallowed paths into the two groups of contracts/page.md P4, keeping the `Sitemap` line last and the `/robots.txt` route (~l.115) unchanged (research R5)
- [X] T037 [P] [US3] In `src/seo/pollPage.ts`, export `OG_IMAGE = { path: "/og-image.png", width: 1200, height: 630, type: "image/png" }`, add `origin` to `previewHeadTags`'s argument and emit `og:image` `${origin}${OG_IMAGE.path}`, `og:image:width`, `og:image:height`, `og:image:type` after `og:url`; pass `origin` from `headTags` (`/poll/:pid`) and from `renderLoginPage` in `src/seo/loginPage.ts` (research R6)
- [X] T038 [P] [US3] In `devScripts/favicon-ico.ts`, add a third output: write a temporary HTML page (white background, `og-logo.svg` — TWEAK02; first `favicon.svg` — centred at 480 px tall in a 1200 × 630 viewport) into the script's work directory, screenshot it with the existing headless browser invocation at `--window-size=1200,630`, verify the PNG header reads 1200 × 630, and write `src/public/og-image.png`; update the script's header comment to list the third output; no `.gitignore` change (the script is allowlisted and `src/public/` is tracked) (research R6)
- [X] T039 [US3] Run `npx tsx devScripts/favicon-ico.ts`, check `src/public/og-image.png` is 1200 × 630 and under 300 KB, open it to confirm the figures are centred and sharp, and `git add` it (quickstart "the image")
- [X] T040 [US3] Run `npx tsc --noEmit` and `npx vitest run tests/seo.test.ts tests/pages.test.ts tests/m3-assets.test.ts`; all pass

**Checkpoint**: Meta's crawler may read the card; every card has the brand image.

---

## Phase 6: Polish & Documentation

**Purpose**: the whole suite, a manual pass, and the documentation the constitution requires.

- [X] T041 Run `npx tsc --noEmit` and `npm test`; every suite passes (SC-007)
- [ ] T042 Follow `specs/20261111-132724-SHARED-LINK-MESSAGE/quickstart.md` steps 1–10 and 12 on the development server; record any deviation as a bug before continuing (step 11 is T047, after deployment)
- [X] T043 [P] In `README.md`, extend the "Link previews" paragraph: the Link Preview Message of an "Anyone you send the link to" poll (100 characters, Step 1), the Custom Email Message for "Only people you invite" polls, the one-line description, the default sentence and `ENV_DEFAULT_LINK_PREVIEW_MESSAGE`, the brand image, and that Facebook Messenger and Instagram show the card once Meta's crawler re-reads the site (up to a day); keep the row of T030
- [X] T044 [P] In `ARCHITECTURE.md`, extend the "Link previews" bullet: `previewMessageOf`'s mode rule, the one-line description, the fallback from `config.defaultLinkPreviewMessage`, the robots.txt group for `facebookexternalhit`/`meta-externalfetcher` (why `/login` is open to them and not to search engines), `og:image` from `OG_IMAGE` on both pages, and how `og-image.png` is produced (`devScripts/favicon-ico.ts`, committed, served by `express.static`)
- [X] T045 [P] In `CLAUDE_COMPLETE.md`, add this feature's block (migration 021, R1–R7, Q1–Q2, the surfaced image tradeoff) above the previous feature's, and move the previous feature's `CLAUDE.md` block (login-page preview, R1–R6) into the "Before it came" chain, so `CLAUDE.md` can stay short
- [X] T046 Review `CLAUDE.md`'s SPECKIT block against the implementation: confirm the names (`LINK_PREVIEW_MESSAGE_MAX`, `previewMessageOf`, `defaultLinkPreviewMessage`, `OG_IMAGE`, `wizard-summary-link-preview-message`) and the file paths match what was built; correct any that differ
- [ ] T047 After the first deployment, do `specs/20261111-132724-SHARED-LINK-MESSAGE/quickstart.md` step 11 (Google Messages, WhatsApp, Facebook Messenger, Instagram, Slack and Meta's Sharing Debugger, a day after the deploy for Meta's apps) and note the Sharing Debugger result and any app that shows no card or image in `specs/20261111-132724-SHARED-LINK-MESSAGE/tweaks.md` or the pull request (SC-005, SC-006)

---

## Dependencies & Execution Order

- **Phase 1 → Phase 2 → Phase 3 (US1)**: T002–T006 give every later task the column and the `Poll` field; T015–T021
  are the field's rules and UI.
- **Phase 4 (US2)** depends on Phase 2 (the column `previewMessageOf` reads) but not on Phase 3: its tests set
  `link_preview_message` directly on the row. T027 (config) and T028 (renderer) are independent; T029 joins them.
- **Phase 5 (US3)** depends on nothing but Phase 1: T036 (robots) and T037–T039 (image) touch files no other story
  changes, except `tests/seo.test.ts` and `src/seo/loginPage.ts`, which US2 also edits (merge carefully).
- **Phase 6** depends on all stories.

## Parallel Opportunities

- Phase 2: T003 ∥ T004 (two files); T005–T006 after them.
- Phase 3: T008–T013 (six test files); T016 ∥ T017 ∥ T019 beside T015/T018; T020–T021 (one file) after T018.
- Phase 4: T023–T025 (two files, T023/T024 in one); T027 ∥ T028 ∥ T030.
- Phase 5: T032–T034; T036 ∥ T037 ∥ T038.
- Phase 6: T043 ∥ T044 ∥ T045 (three documents).

## Implementation Strategy

- **MVP**: Phases 1–3 (T001–T022). The creator can enter and manage the Link Preview Message; it is stored, limited,
  screened, reviewed and copied. The preview does not yet read it.
- **Increment 2**: Phase 4 — the card shows the right message, on one line, with the configurable default.
- **Increment 3**: Phase 5 — Meta's crawler is let in and the brand image is on every card.
- **Finish**: Phase 6 — full suite, manual pass, README/ARCHITECTURE/CLAUDE_COMPLETE; after deployment, T047
  (quickstart step 11: real apps, Sharing Debugger).
