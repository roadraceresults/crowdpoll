# Tasks: Link Preview Message

**Input**: Design documents from `specs/20261110-204911-LINK-PREVIEW-MESSAGE/`

**Prerequisites**: plan.md, spec.md, research.md (R1–R9), data-model.md, contracts/page.md (P1–P3),
contracts/ui-contracts.md (C1–C3), quickstart.md

**Tests**: included, as research R8 and constitution principle IV (Goal-Driven Execution) require: each story's tests
are written first and must fail before its implementation makes them pass.

**Organization**: tasks are grouped by user story so each story can be implemented and tested on its own.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on an unfinished task)
- **[Story]**: the user story the task belongs to (US1, US2, US3)
- Every task names its file path

## Path Conventions

Single project: `src/` and `tests/` at the repository root (plan.md, Project Structure).

---

## Phase 1: Setup

**Purpose**: confirm the starting point; no new project, dependency, migration or setting.

- [X] T001 Run `npx tsc --noEmit` and `npx vitest run tests/seo.test.ts tests/pages.test.ts tests/shared-link.test.ts` to record a green baseline before any change (plan.md, SC-003)

---

## Phase 2: Foundational (blocks every story)

**Purpose**: the shared tag builder every story's page uses (research R2).

- [X] T002 In `src/seo/pollPage.ts`, extract the `<title>`, `<meta name="description">`, `og:type`, `og:site_name`, `og:title`, `og:description`, `og:url` and `twitter:card` lines of `headTags` into an exported `previewHeadTags({ title, description, url }: { title: string; description: string; url: string }): string[]` (each value passed through `escapeHtml`; `title` is the full `<title>` text), and make `headTags` call it, adding the canonical link and JSON-LD as today so `/poll/:pid` output is byte-for-byte unchanged (contracts/page.md P3)
- [X] T003 Run `npx vitest run tests/seo.test.ts` to confirm the poll page tests still pass after T002

**Checkpoint**: `previewHeadTags` exists; nothing user-visible has changed.

---

## Phase 3: User Story 1 — The preview names the poll (Priority: P1) 🎯 MVP

**Goal**: `GET /login?PID=<pid>` for a published poll carries the poll's title and subtitle in the head, with the
shared link as canonical address; the shared link's redirects and the login page's body are unchanged.

**Independent Test**: a cookie-less `supertest` request to `/?PID=<private open poll>` followed through its redirect
yields `<title><title> · CrowdPoll</title>`, `og:title`, `og:description` = subtitle, `og:url` = `${ORIGIN}/?PID=…`;
`tests/shared-link.test.ts` and `tests/pages.test.ts` pass unchanged.

### Tests for User Story 1

- [X] T004 [US1] In `tests/seo.test.ts`, add `describe("the login page of a published poll")` with a helper that creates a private "Anyone With The Link" OPEN poll with a subtitle (reuse the file's existing poll helpers), and tests: (a) a guest `GET /login?PID=<pid>` is `200`, `Cache-Control: no-cache`, a weak `ETag` (Express's, as on `/poll/:pid`), contains `<title><title> · CrowdPoll</title>`, `<meta property="og:title" content="<title>">`, `og:description` = the subtitle, `<meta name="description">` = the subtitle, `<meta property="og:url" content="${ORIGIN}/?PID=<pid>">`, still contains `<meta name="robots" content="noindex">` and `/loginCard.js`, and contains no `<link rel="canonical"` and no `og:image`, and contains none of the poll's choice labels, notes text or vote counts (give the helper's poll a distinctive choice label and notes text to assert against; spec SC-005); (b) a guest `GET /?PID=<pid>` without cookies is `302` to `/login?PID=<pid>` as before; (c) a logged-in `GET /login?PID=<pid>` is `302` to `/?PID=<pid>`; (d) without a subtitle the description is `Vote and see live results: <title>` (spec US1 scenarios 1–4, contracts/page.md P1, P3)
- [X] T005 [US1] In the same describe, add the public-poll case: a public OPEN poll's `GET /login?PID=<pid>` carries the same tags, while a guest `GET /?PID=<pid>` still goes to `/poll/<pid>` (spec US3 scenario 4, clarification Q2)
- [X] T006 [US1] Run `npx vitest run tests/seo.test.ts` and confirm T004–T005 fail on the unrendered page

### Implementation for User Story 1

- [X] T007 [US1] Create `src/seo/loginPage.ts` exporting `LINK_PREVIEW_DESCRIPTION_MAX = 300`, `linkPreviewDescription(poll: Pick<PollProjection, "title" | "subtitle">, message: string): string` (subtitle and `notesPlainText(message)`, each trimmed, non-empty parts joined by `" - "`, fallback `Vote and see live results: ${title}`, cut to `slice(0, 299).trimEnd() + "…"` above 300) and `renderLoginPage(loginHtml: string, poll: Pick<PollProjection, "pid" | "title" | "subtitle">, message: string, origin: string): string` that replaces `<title>Login</title>` (regex `/<title>[^<]*<\/title>/`, one match) with `previewHeadTags({ title: \`${poll.title} · CrowdPoll\`, description, url: \`${origin}/?PID=${poll.pid}\` })` joined as `headTags` joins them (research R2–R4, data-model.md)
- [X] T008 [US1] In `src/routes/pages.ts` `GET /login`: after the session redirect, when `parsePid(req.query.PID)` yields a pid, select the poll row (`selectAll`, as `seo.ts` does); if found and `isPublished(row)` (import from `../polls/store.js`), log `[login] Poll preview rendered: <pid>`, set `Cache-Control: no-cache` and `res.type("html").send(renderLoginPage(assets.pageHtml("login.html"), projectPoll(row), row.invitation_message, config.publicOrigin))`; otherwise fall through to `page("login.html")` exactly as today (research R1, R5, R6, R9; contracts/page.md P1–P2)
- [X] T009 [US1] Run `npx tsc --noEmit` and `npx vitest run tests/seo.test.ts tests/pages.test.ts tests/shared-link.test.ts tests/shared-link-unpublished.test.ts tests/client-login-pid.test.ts tests/m3-assets.test.ts`; all pass (SC-003)

**Checkpoint**: a private poll's link previews with its title and subtitle; US1 is deliverable on its own.

---

## Phase 4: User Story 2 — The preview carries the Custom Email Message (Priority: P1)

**Goal**: the description adds the approved Custom Email Message as plain text after the subtitle, cut at 300
characters, markup-safe; the wizard's support text says so.

**Independent Test**: on an Invitation Only poll with subtitle and a formatted message, the login page's
`og:description` is the subtitle, a dash, then the message's words without marks; a pending message change is
not shown; the wizard support text ends "…shown in the link preview when the poll's link is shared."

### Tests for User Story 2

- [X] T010 [P] [US2] In `tests/seo.test.ts`'s new describe, add tests on a private Invitation Only OPEN poll (set `invitation_message` directly on the row, as the invitation tests do): (a) subtitle `S` and message `Line **one**\nLine two` → `og:description` and `<meta name="description">` equal `escapeHtml("S - " + notesPlainText("Line **one**\nLine two"))` (`notesPlainText` imported from `src/polls/notes.ts`, so the test pins the composition rule, not an assumption about the notes markup); (b) no subtitle → the message text alone; (c) subtitle plus message totalling 350 characters → a 300-character value ending in `…`; (d) message `<b>x</b> & "q"` → the attribute holds `&lt;b&gt;x&lt;/b&gt; &amp; &quot;q&quot;` and the body has no raw `<b>x</b>`; (e) a poll with a vote whose `pending_update` holds a new `invitationMessage` → the column's (approved) message, not the pending one (spec US2 scenarios 1–5, research R3, R5)
- [X] T011 [P] [US2] In `tests/client-admin-wizard.test.ts` (~2019), change the expected support text to `Optional. Added to the invitation email we send to the people you invite, and shown in the link preview when the poll's link is shared.` (contracts/ui-contracts.md C1)
- [X] T012 [US2] Run `npx vitest run tests/seo.test.ts tests/client-admin-wizard.test.ts` and confirm T010–T011 fail

### Implementation for User Story 2

- [X] T013 [US2] Verify `linkPreviewDescription` in `src/seo/loginPage.ts` (T007) satisfies T010 — the message part via `notesPlainText` from `../polls/notes.js`, the join, the fallback and the 300 cut; adjust only if a case fails (research R3)
- [X] T014 [P] [US2] In `src/public/adminCard.js` (~1141), change the Custom Email Message field's `support` string to the C1 text (research R7)
- [X] T015 [US2] Run `npx vitest run tests/seo.test.ts tests/client-admin-wizard.test.ts tests/login-wording.test.ts`; all pass

**Checkpoint**: the creator's message appears in the preview; the creator is told so where they write it.

---

## Phase 5: User Story 3 — Only published polls are previewed (Priority: P2)

**Goal**: drafts, polls awaiting approval, rejected or archived polls, unknown and malformed PIDs, and no PID get
today's plain login page; an EDITING poll shows its published title; the rendered page is `no-cache`.

**Independent Test**: for each state in data-model.md's table, `GET /login?PID=…` yields either the poll's tags or
`<title>Login</title>` exactly as the table says; the plain page keeps its `ETag`/`304`.

### Tests for User Story 3

- [X] T016 [US3] In `tests/seo.test.ts`'s new describe, add: (a) for a draft, a poll awaiting approval, a rejected and an archived private poll, a random UUID, a malformed `PID=abc`, and no PID: `<title>Login</title>`, an `ETag` header, and `304` on a matching `If-None-Match` (the plain page is unchanged); (b) an OPEN poll put into EDITING (`poll_state = "EDITING"`, `poll_state_before_edit_update = "OPEN"`) with its row title changed: the page carries the title `projectPoll` publishes; (c) a CLOSED private poll: the poll's tags; (d) `GET /login?PID=<pid>&error=invalid-link` carries the same tags as without `error` (spec US3 scenarios 1–3, edge cases; data-model.md States; contracts/page.md P2)
- [X] T017 [US3] Run `npx vitest run tests/seo.test.ts` and confirm which of T016's cases fail (the fall-through of T008 should already satisfy most; any failure is fixed in T018)

### Implementation for User Story 3

- [X] T018 [US3] In `src/routes/pages.ts` and `src/seo/loginPage.ts`, fix whatever T017 found: the `isPublished` gate, the EDITING title through `projectPoll`, and the plain path's untouched `sendPage` (ETag/304) (research R5, R6)
- [X] T019 [US3] Run `npx vitest run tests/seo.test.ts tests/pages.test.ts`; all pass

**Checkpoint**: the rule of data-model.md's States table holds for every state.

---

## Phase 6: Polish & Documentation

**Purpose**: the whole suite, a manual pass, and the documentation the constitution requires.

- [X] T020 Run `npx tsc --noEmit` and `npm test`; every suite passes
- [ ] T021 Follow `specs/20261110-204911-LINK-PREVIEW-MESSAGE/quickstart.md` steps 1–8 and 10 on the development server; record any deviation as a bug before continuing
- [X] T022 [P] In `README.md`, extend the "Search engines" paragraph (~548) with a "Link previews" sentence: a poll's shared link previews in messaging apps with its title, subtitle and, for Only people you invite polls, the custom email message; anyone holding the link can read those three fields; a card already cached by an app is not refreshed
- [X] T023 [P] In `ARCHITECTURE.md`, add to the "Search engines" section (~1428) a "Link previews" bullet: `GET /login?PID=` for a published poll is rendered by `renderLoginPage` (`src/seo/loginPage.ts`) with `previewHeadTags` from `pollPage.ts`, description rule and 300 cap, `og:url` = the shared link, `no-cache`, approved `invitation_message` only, and why no landing page or user-agent detection is used (fetchers follow the 302, send no cookies, run no script, ignore robots.txt)
- [X] T024 [P] In `CLAUDE_COMPLETE.md`, append the previous feature's CLAUDE.md block (custom email message, migration `020-invitation-message`, R1–R9, TWEAK02–03) to the "Before it came" chain, and add this feature's decisions above it (R1–R6, Q1–Q2), so `CLAUDE.md` can stay short
- [X] T025 Review `CLAUDE.md`'s SPECKIT block against the implementation: confirm the names (`previewHeadTags`, `renderLoginPage`, `linkPreviewDescription`, `LINK_PREVIEW_DESCRIPTION_MAX`) and the file paths match what was built; correct any that differ

---

## Dependencies & Execution Order

- **Phase 1 → Phase 2 → Phase 3 (US1)**: T002's `previewHeadTags` is used by T007; T007–T008 are the whole mechanism.
- **Phase 4 (US2)** depends on US1 (T007's `linkPreviewDescription` is where the message is added); T011/T014 (the
  support text) depend on nothing and may be done at any time.
- **Phase 5 (US3)** depends on US1 (it tests T008's gate and fall-through); it is independent of US2.
- **Phase 6** depends on all stories.

## Parallel Opportunities

- Phase 4: T010 ∥ T011 (two test files); T014 ∥ T013.
- Phase 5 may run in parallel with Phase 4 once Phase 3 is done (different test cases, same files — merge carefully).
- Phase 6: T022 ∥ T023 ∥ T024 (three documents).

## Implementation Strategy

- **MVP**: Phases 1–3 (T001–T009). A private poll's link previews with its title and subtitle; no message yet.
- **Increment 2**: Phase 4 — the message and the support text.
- **Increment 3**: Phase 5 — the state table is pinned by tests (most cases already pass from T008).
- **Finish**: Phase 6 — full suite, manual pass, README/ARCHITECTURE/CLAUDE_COMPLETE.
