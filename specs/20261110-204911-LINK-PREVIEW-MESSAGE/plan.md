# Implementation Plan: Link Preview Message

**Branch**: `20261110-204911-LINK-PREVIEW-MESSAGE` | **Date**: 2026-11-10 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/20261110-204911-LINK-PREVIEW-MESSAGE/spec.md`

## Summary

A private poll's shared link, `/?PID=<pid>`, sends a guest — and every messaging app's link-preview fetcher, which
carries no cookies, runs no script and follows redirects — to `/login?PID=<pid>`, a static page titled "Login". This
feature renders that page, when the PID names a published poll, with the poll's `<title>`, description and Open Graph
tags, exactly the way `/poll/<pid>` is rendered for public polls (R1, R2). The description is the subtitle, a blank
line, then the approved Custom Email Message as plain text, cut to 300 characters (R3); the canonical address is the
shared link (R4). Only published polls qualify, and only approved columns are read (R5). The response is `no-cache`
(R6). The wizard's support text says the message also appears in link previews (R7). No migration, setting, route,
cookie, storage key, stylesheet or dependency; nothing changes for a person who taps the link.

## Technical Context

**Language/Version**: TypeScript on Node.js ≥ 22 (ESM); browser: vanilla ES2020 in `src/public/`

**Primary Dependencies**: none new (Express 5, Kysely)

**Storage**: PostgreSQL, read-only: `polls.title`, `subtitle`, `invitation_message`, `poll_state`,
`poll_state_before_edit_update` (and the columns `projectPoll` needs); no schema change

**Testing**: Vitest + supertest + embedded-postgres (`tests/seo.test.ts`, `tests/pages.test.ts`,
`tests/shared-link.test.ts`); jsdom for the wizard support text (`tests/client-admin-wizard.test.ts`) (R8)

**Target Platform**: the `web` service on DigitalOcean App Platform; the preview fetchers of Google Messages
(`GoogleMessages`), WhatsApp (`WhatsApp/2`, `facebookexternalhit`, `Facebot`) and iMessage; evergreen browsers

**Project Type**: single project (web service with static front end)

**Performance Goals**: one poll query per `GET /login?PID=…` from a guest, the same cost as `GET /poll/:pid`; no change
to any cache, counter or voter-facing payload

**Constraints**: the message reaches the page as plain text only (`notesPlainText`), escaped; no user-agent detection
(FR-006); the shared link's redirects and the sign-in flow are untouched (SC-003); logs carry no link or token

**Scale/Scope**: new `src/seo/loginPage.ts`; changed `src/seo/pollPage.ts` (export the shared tag builder),
`src/routes/pages.ts` (`GET /login`), `src/public/adminCard.js` (support text), `tests/seo.test.ts`,
`tests/client-admin-wizard.test.ts`, `README.md`, `ARCHITECTURE.md`, `CLAUDE_COMPLETE.md`, `CLAUDE.md`

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Think Before Coding**: PASS. Eight requirements findings (RS1, AM1, UA1–UA5, NC1) and two clarifications are
  resolved; the privacy trade-off (NC1) is recorded in the spec's Assumptions, not left implicit.
- **II. Simplicity First**: PASS. No landing page, no user-agent list, no new route: the page the fetchers already
  reach gains head tags. One new module of about thirty lines; `pollPage.ts` exports what it already builds.
- **III. Surgical Changes**: PASS. `GET /login` gains one branch for a published PID; `pollPage.ts` changes only to
  export its tag builder; the support text is one string. `login.html` itself is untouched.
- **IV. Goal-Driven Execution**: PASS. Every FR maps to a test in R8 or a quickstart step; the fetcher behaviour is
  reproduced in tests with a cookie-less `supertest` request following the redirect.
- **V. Code Quality & Maintainability**: PASS. Rendering stays in `src/seo/`, access rules in `src/polls/`, the plain
  text conversion in `notes.ts`. The server logs one line per preview render, with the pid and no title or message.
- **VI. Self-Documenting Code**: PASS. Names: `renderLoginPage`, `previewHeadTags`, `linkPreviewDescription`,
  `LINK_PREVIEW_DESCRIPTION_MAX`.
- **Security, Privacy & Reliability**: PASS. Only three fields of a published poll are exposed, escaped, from approved
  columns; an unpublished or unknown PID yields today's page; `noindex` stays on the login page.
- **Documentation Deliverables**: README.md and ARCHITECTURE.md are updated in the task list's documentation phase.

**Post-Phase-1 re-check**: PASS. The design adds one renderer and one branch, and changes no data shape.

## Project Structure

### Documentation (this feature)

```text
specs/20261110-204911-LINK-PREVIEW-MESSAGE/
├── plan.md              # This file
├── research.md          # R1–R9
├── data-model.md        # the read set and the derived preview fields; no schema change
├── quickstart.md        # automated and manual checks
├── contracts/
│   ├── page.md          # P1–P3: the login page's head for a published PID, the plain page, caching
│   └── ui-contracts.md  # C1: the wizard support text
├── checklists/requirements.md
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
src/
├── seo/
│   ├── pollPage.ts      # exports previewHeadTags (R2); renderPollPage unchanged in behaviour
│   └── loginPage.ts     # NEW: linkPreviewDescription, renderLoginPage (R2, R3, R4)
├── routes/
│   └── pages.ts         # GET /login: published PID → renderLoginPage, else page("login.html") (R1, R5, R6, R9)
├── polls/
│   ├── access.ts        # isOpenOrClosed: the state rule of isIndexable, exported for the login page (R5)
│   ├── versions.ts      # projectPoll (used, unchanged)
│   └── notes.ts         # notesPlainText (used, unchanged)
└── public/
    └── adminCard.js     # Custom Email Message support text (R7)

tests/
├── seo.test.ts                  # the login page of a published poll (R8)
└── client-admin-wizard.test.ts  # the support text (R8)
```

**Structure Decision**: the existing single project. The new renderer sits beside `pollPage.ts` in `src/seo/`,
since it serves the same readers (preview fetchers and crawlers) and reuses its tag builder.

## Complexity Tracking

No constitution violations; nothing to justify.
