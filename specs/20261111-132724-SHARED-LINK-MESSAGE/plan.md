# Implementation Plan: Shared Link Message

**Branch**: `20261111-132724-SHARED-LINK-MESSAGE` | **Date**: 2026-11-11 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/20261111-132724-SHARED-LINK-MESSAGE/spec.md`

## Summary

An "Anyone you send the link to" poll gets its own 100-character **Link Preview Message**, stored in a new
`polls.link_preview_message` column that mirrors `invitation_message` in every rule (limit, normalization, screening,
pending update, Duplicate, admin-only payloads) (R1). The login page's preview description picks the message of the
poll's current sharing mode (R2), is flattened to one line (R3), and falls back to the new setting
`ENV_DEFAULT_LINK_PREVIEW_MESSAGE` (R4). `robots.txt` gains a group that lets Meta's preview crawlers read `/login`
(R5). Every preview page carries a committed 1200 × 630 `og-image.png`, rendered from `favicon.svg` by the existing
headless-browser script (R6). The wizard's Step 1 gains the editor and the Settings Summary its line (R7). One
migration, one setting, one image; no new route, cookie or storage key; no production dependency.

## Technical Context

**Language/Version**: TypeScript on Node.js ≥ 22 (ESM); browser: vanilla ES2020 in `src/public/`

**Primary Dependencies**: none new. The image is rendered by `devScripts/favicon-ico.ts`'s headless Chromium (Edge)
invocation, which the repository already uses for `favicon.ico` and `email-logo.png` (R6)

**Storage**: PostgreSQL via Kysely; migration `021-link-preview-message` adds `polls.link_preview_message text not null
default ''`; `pending_update` JSON gains an optional `linkPreviewMessage`

**Testing**: Vitest + supertest + embedded-postgres (`tests/seo.test.ts`, `tests/field-limits.test.ts`,
`tests/polls-pending-update.test.ts`, `tests/polls-screening.test.ts`, `tests/polls-admin-crud.test.ts`,
`tests/polls-discovery.test.ts`, `tests/config.test.ts`, `tests/pages.test.ts`); jsdom for the wizard
(`tests/client-admin-wizard.test.ts`) (R8)

**Target Platform**: the `web` service on DigitalOcean App Platform; the preview fetchers of Google Messages, WhatsApp
(`WhatsApp/2.x`), Meta's server-side crawler (`facebookexternalhit`, `meta-externalfetcher`), Slack and iMessage

**Project Type**: single project (web service with static front end)

**Performance Goals**: unchanged: one poll query per guest `GET /login?PID=…`; one static file for the image, served
by `express.static` with the other `src/public` files

**Constraints**: the message reaches the page as one line of plain text, escaped; the public poll page's description
rule is unchanged (FR-009); the new column never reaches card, tab, delta or SEO payloads; the image stays under 300 KB

**Scale/Scope**: new `src/db/migrations/021-link-preview-message.ts`; changed `src/db/schema.ts`, `src/db/migrations/index.ts`,
`src/polls/store.ts`, `src/polls/notes.ts`, `src/polls/service.ts`, `src/polls/screening.ts`, `src/polls/sweeps.ts`,
`src/routes/pollsApi.ts`, `src/routes/pages.ts`, `src/routes/seo.ts`, `src/seo/loginPage.ts`, `src/seo/pollPage.ts`,
`src/config.ts`, `src/public/adminCard.js`, `devScripts/favicon-ico.ts`; new `src/public/og-image.png`; docs and
`postman/openapi.json`; eight test files

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Think Before Coding**: PASS. Twelve requirements findings and two clarifications are resolved. The one
  tradeoff the plan surfaced (a rasterizer package versus the existing headless-browser script for the image, R6)
  was settled by analysis finding I1: the spec now names the existing script and no new dependency.
- **II. Simplicity First**: PASS. Every rule of the new field copies an existing one; the description change is one
  `replace`; the setting is one `read.text` with two checks; the robots change is one more group; the image is a
  static file and four tags.
- **III. Surgical Changes**: PASS. Each touched line traces to a spec requirement; `adminCard.js`'s five field lists
  are extended, not restructured (the restructuring is recorded as technical debt, not done).
- **IV. Goal-Driven Execution**: PASS. Every FR maps to a test in R8 or a quickstart step; the Meta crawler and
  WhatsApp behaviours are verified manually after deployment (quickstart), since no test can stand in for them.
- **V. Code Quality & Maintainability**: PASS. The mode rule and the one-line rule live in `src/seo/loginPage.ts`,
  the access and limits in `src/polls/`, the setting in `src/config.ts`; the server logs the setting's default with
  the others at start-up and keeps the one preview-render line.
- **VI. Self-Documenting Code**: PASS. Names: `linkPreviewMessage`, `LINK_PREVIEW_MESSAGE_MAX`, `previewMessageOf`,
  `defaultLinkPreviewMessage`, `OG_IMAGE`.
- **Security, Privacy & Reliability**: PASS. The new text is length-checked, normalized, screened and escaped like
  the Custom Email Message; it is exposed to creators and administrators only; the robots change opens one page
  that is already readable by anyone with the link.
- **Documentation Deliverables**: README.md and ARCHITECTURE.md are updated in the task list's documentation phase.

**Post-Phase-1 re-check**: PASS. The design adds one column, one setting, one static file and one tag group; no
abstraction beyond what exists.

## Project Structure

### Documentation (this feature)

```text
specs/20261111-132724-SHARED-LINK-MESSAGE/
├── plan.md              # This file
├── research.md          # R1–R10
├── data-model.md        # the new column, the derived preview fields, the setting
├── quickstart.md        # automated and manual checks
├── contracts/
│   ├── api.md           # A1–A3: the admin API's new field
│   ├── page.md          # P1–P4: the login page head, the poll page head, robots.txt, the image
│   └── ui-contracts.md  # C1–C3: the editor, the summary line, the card
├── checklists/requirements.md
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
src/
├── config.ts                                # ENV_DEFAULT_LINK_PREVIEW_MESSAGE → defaultLinkPreviewMessage (R4)
├── db/
│   ├── schema.ts                            # link_preview_message; PendingUpdateJson.linkPreviewMessage (R1)
│   └── migrations/
│       ├── 021-link-preview-message.ts      # NEW (R1)
│       └── index.ts                         # registers 021
├── polls/
│   ├── notes.ts                             # LINK_PREVIEW_MESSAGE_MAX = 100 (R1)
│   ├── store.ts                             # Poll.linkPreviewMessage, PendingUpdate, column map, NON_CONTENT_FIELDS, approval (R1)
│   ├── service.ts                           # default "", validate + normalize, LIMITS, duplicatePoll (R1)
│   ├── screening.ts                         # ScreeningInput.linkPreviewMessage, the message's clause (R1)
│   └── sweeps.ts                            # both screening calls pass the field (R1)
├── routes/
│   ├── pollsApi.ts                          # detail: linkPreviewMessage(+Html); list: hasLinkPreviewMessage; pending routing (R1)
│   ├── pages.ts                             # GET /login: previewMessageOf(row), config.defaultLinkPreviewMessage (R2, R4)
│   └── seo.ts                               # ROBOTS: the Meta preview crawlers' group (R5)
├── seo/
│   ├── loginPage.ts                         # previewMessageOf, one-line description, fallback parameter (R2, R3)
│   └── pollPage.ts                          # previewHeadTags emits og:image + width/height/type (R6)
└── public/
    ├── adminCard.js                         # the editor, the field lists, the summary line (R7)
    └── og-image.png                         # NEW, committed, 1200 × 630 (R6)

devScripts/
└── favicon-ico.ts                           # also renders og-image.png (R6)

tests/
├── seo.test.ts                              # robots group; login-page description rules; og:image on both pages (R8)
├── pages.test.ts                            # og-image.png on disk: dimensions and size (R8)
├── config.test.ts                           # the setting's default and refusals (R8)
├── field-limits.test.ts                     # the 100-character limit (R8)
├── polls-pending-update.test.ts             # a change waits for review (R8)
├── polls-screening.test.ts                  # screened and named (R8)
├── polls-admin-crud.test.ts                 # Duplicate copies it; detail carries it (R8)
├── polls-discovery.test.ts                  # never in voter payloads (R8)
└── client-admin-wizard.test.ts              # the editor, retention across modes, the summary line (R8)
```

**Structure Decision**: the existing single project. Every change sits beside the Custom Email Message's code in the
same module, since the new field is its twin for the other sharing mode.

## Complexity Tracking

No constitution violations; nothing to justify.
