# Implementation Plan: Material 3 Merge

**Branch**: `024-MATERIAL3-MERGE` | **Date**: 2026-10-01 (Steps 1–5); 2026-10-03 (Step 6 and its follow-ups) | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/024-MATERIAL3-MERGE/spec.md`

## Summary

024 brings the Material 3 prototypes in `prototypes/POLL-CARD-MATERIAL3/` into `src/public` as
**layers**:
- one shared `m3-tokens.css` loaded first on every page;
- the production sheets, unchanged apart from three named fixes;
- one M3 layer per area, loaded last.

Behaviour changes are the prototypes' marked edits, ported into the production scripts that own
each surface:
- a shared ripple (`m3-ripple.js`, `window.M3Ripple.add`);
- M3 tooltips that adopt every `title`;
- the notice's Close control;
- the avatar as a button;
- guest tabs with `aria-disabled`;
- the named, focus-trapped `Tabs.modal`;
- the non-modal idle prompt;
- the Not Saved page dialog (`confirmDiscard(): Promise<boolean>`);
- bar colours as four custom properties with a computed dark set;
- the `is-multi` checkbox;
- the profile snackbar.

Step 6 merges the admin cards (`ADMIN-CARDS/`): the five-step wizard for a new poll, the same
wizard in place of the edit face for every existing poll, the Settings Summary, the redesigned
read-only face and the state-worded when-line, on a new `admin-card-m3.css`. It brings 024's only
server changes, five of them:
- `POST /api/admin/polls/:pid/save`;
- `keywords` as a stored, validated poll setting;
- `createDefaultPoll` defaulting to `Dynamic-Vote Poll` (visibility stays Public);
- `pollStateBeforeEditUpdate` and `keywords` on the admin list row;
- `/publish`'s starter-choices hold limited to unpublished polls (FR-049, research R28).

Two client follow-ups found while building Step 6 belong to it too: a new poll's progress
survives a switch of admin views (FR-040, R27), and `admin.css` loses the rules only the removed
editing face used (FR-050, R29).

Six steps are committed on the feature branch: foundation; header and dialogs; poll card;
card-shell pages; dark mode (Steps 1–5, one commit, `c0da4ad`); the admin cards. `dev` receives
the whole feature once, through one pull request after Step 6. Steps 1–5 are client-only.

## Technical Context

**Language/Version**: JavaScript (browser classic scripts) and CSS for `src/public`; TypeScript 5.8 for tests; Node 22

**Primary Dependencies**: none new. The Roboto web font is added to the existing Google Fonts request.

**Storage**: PostgreSQL through Kysely, unchanged schema. Step 6 makes the existing `polls.keywords` column a domain field (`data-model.md` §6); no migration.

**Testing**: Vitest + supertest + jsdom (`tests/helpers/browser.ts`) on an embedded PostgreSQL, plus the manual browser checklist (`quickstart.md`)

**Target Platform**: current evergreen browsers, light and dark schemes, 320px to desktop. The server (Express, Node 22) changes in Step 6 only.

**Project Type**: web application (Express server + static client under `src/public/`)

**Performance Goals**: one extra font family in the existing font request; one delegated listener for ripples and one for tooltips per page; the dark bar set computed once per page load (52 entries)

**Constraints**:
- Light-mode production colours unchanged (SC-001).
- Dark ink ≥ 7:1 (SC-002).
- No dark before Step 5.
- No configuration or database change. Server and `postman/openapi.json` changes are Step 6's
  five only (`contracts/admin-api.md`).
- `admin.html` stays light (no dark styles reach the admin cards in production).
- Constitution VI: no requirement references in comments (research R15).

**Scale/Scope**:
- Seven pages.
- Nine new sheets, two new scripts, and edits to `app.js`, `tabs.js`, `liveResults.js`,
  `pollCard.js`, `profileCard.js`, `adminCard.js` and `adminList.js`.
- Fixes to `tabs.css` and `site.css`.
- Step 6: one new sheet (`admin-card-m3.css`); `adminCard.js` replaced by the prototype's;
  `admin.css` and `adminList.js` edited; three type roles added to `m3-tokens.css`;
  `src/polls/store.ts`, `src/polls/service.ts`, `src/routes/pollsApi.ts` and
  `postman/openapi.json` changed.
- Commits on `024-MATERIAL3-MERGE` and one pull request into `dev`.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Check | Result |
|---|---|---|
| I. Think Before Coding | <ul><li>All findings of both architecture passes resolved before the spec.</li><li>Seven spec clarifications (reduced motion; SC-003 scope; keywords saveable; new polls stay Public; progress across views; the starter-choices hold; the unused styles).</li><li>Every remaining choice is recorded in research R1–R29, including the gaps found while planning (R21's draft Save, R22's unread keywords) and while building (R27–R29).</li></ul> | Pass |
| II. Simplicity First | <ul><li>Layers ported, not re-designed.</li><li>Five ripple copies become one listener.</li><li>No new script for the header behaviour (R6).</li><li>No theme picker.</li><li>No new runtime dependency.</li><li>`/save` reuses `/publish`'s validators with two draft allowances (R21); keywords reuse the existing column and search plumbing (R22); no new column for "new poll" (R19).</li></ul> | Pass |
| III. Surgical Changes | <ul><li>Production sheets are untouched except for the three named fixes (R14) and Step 6's `admin.css` layout block.</li><li>Script edits are limited to the prototypes' marked edits and the ripple registrations; `adminList.js` gets two (R20).</li><li>Server edits are the five of `contracts/admin-api.md`, each with tests.</li><li>R29 removes only what the removed editing face left unused.</li><li>The other `window.confirm` calls in `adminList.js` stay.</li></ul> | Pass |
| IV. Goal-Driven Execution | <ul><li>Each step has its own tests (R17, R26) and the browser checklist.</li><li>SC-001 to SC-013 are measurable.</li></ul> | Pass |
| V. Code Quality | <ul><li>Single-purpose functions (`validateKeywords`, the `/save` handler).</li><li>`window.M3Ripple?.add` fails safely when the script is absent.</li><li>No client logging added; `/save` logs one operator line.</li></ul> | Pass |
| VI. Self-Documenting Code | <ul><li>Ported code drops the `M3:` markers and the REQUIREMENT references.</li><li>Comments only point to external Material 3 documentation (R15).</li></ul> | Pass |
| Documentation Deliverables | <ul><li>`README.md` (the look, dark mode, bar colours, the admin wizard) and `ARCHITECTURE.md` (the layer model, tokens, ripple, tooltip, the scheme, the admin card's faces) are updated after implementation, without references to `specs/` or `designDocs/`.</li><li>`postman/openapi.json` describes the Step 6 server changes.</li></ul> | Pass |

Post-design re-check (after Phase 1): unchanged, all pass. No Complexity Tracking entries.

## Project Structure

### Documentation (this feature)

```text
specs/024-MATERIAL3-MERGE/
├── spec.md
├── plan.md              # this file
├── research.md          # R1–R17
├── data-model.md        # schemes, token sets, bar colour set, page × file matrix
├── quickstart.md        # automated runs + manual checks per step + the release checklist
├── contracts/
│   ├── ui-contracts.md  # C1–C15; amends 021's bar-colour wording
│   └── admin-api.md     # A1–A5: Step 6's server changes
├── checklists/
│   └── requirements.md
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
src/public/
├── m3-tokens.css           # NEW (1)   roles, type, shape, state, elevation, easing, ripple rules
├── m3-ripple.js            # NEW (1)   window.M3Ripple.add, one pointerdown listener
├── tooltip-m3.css          # NEW (2)
├── tooltip-m3.js           # NEW (2)   adopts title → data-tooltip
├── header-tab-bar-m3.css   # NEW (2)   header, tabs, search, avatar button, menu, snackbars
├── tabs-modal-m3.css       # NEW (2)
├── live-idle-prompt-m3.css # NEW (2)
├── empty-tab-line-m3.css   # NEW (2)
├── discard-dialog-m3.css   # NEW (2)
├── pollCard-m3.css         # NEW (3)   card faces, maximized view (§8), dark bar mapping
├── card-shell-m3.css       # NEW (4)
├── profile-editor-m3.css   # NEW (4)
├── app.js                  # (2) avatar button, header ripple registration, cookie-banner offset
├── tabs.js                 # (2) notice() Close + role=status, aria-disabled guests, modal() name + Tab trap, ripple
├── liveResults.js          # (2) IDLE_PROMPT, showIdlePrompt(): not modal, named, focus; ripple
├── adminCard.js            # (2) confirmDiscard(): Promise<boolean> page dialog; Cancel awaits; ripple
├── adminList.js            # (2) guardNavigation() awaits confirmDiscard()
├── pollCard.js             # (3) BAR_COLORS_DARK + four custom properties; is-multi; ripple
├── profileCard.js          # (4) "User name saved" snackbar
├── admin-card-m3.css       # NEW (6)   the admin cards: read-only face, summary, circles, steps, footer
├── adminCard.js            # (6) replaced by ADMIN-CARDS/adminCard.js (wizard, summary, read-only face); openWizard(); isWizardPoll by worded state
├── adminList.js            # (6) Create New Poll → openWizard(); focusPen → focusSummary
├── admin.css               # (6) ADMIN-CARDS/admin.css: production's sheet plus the cards' layout
├── m3-tokens.css           # (6) + Title Medium, Label Medium, Label Small
├── admin.html              # (6) links admin-card-m3.css last
├── tabs.css                # (2) comment fix (640px), .tab-notice/.tab-empty split, FIX029 removal, hover :not([aria-disabled])
├── site.css                # (3) 021 hover rule scoped with :not(.card-shell-viewport)
└── *.html (7 pages)        # (1) m3-tokens.css + m3-ripple.js + Roboto; (2–4) layer links; (5) admin data-theme="light"

src/polls/store.ts          # (6) Poll.keywords; rowToPoll, newRow, FIELD_TO_COLUMN
src/polls/service.ts        # (6) createDefaultPoll (Dynamic-Vote, keywords ""); validateKeywords; validatePollFields; duplicatePoll copies keywords
src/routes/pollsApi.ts      # (6) POST /api/admin/polls/:pid/save; adminListRow + pollStateBeforeEditUpdate, keywords
postman/openapi.json        # (6) the save route, keywords, the two row fields

tests/
├── m3-assets.test.ts        # NEW (1→5) links, order, Roboto, no dark @media until 5, page × file matrix, admin data-theme
├── client-m3-header.test.ts # NEW (2) notice Close/status, avatar keyboard, guest tabs, Tabs.modal, idle prompt, tooltip
├── client-admin-discard.test.ts # NEW (2) the Not Saved dialog and its two callers
├── tab-bar-assets.test.ts   # (2) icon fills in CSS, the new sheets
├── client-home.test.ts      # (2) aria-disabled guests, the idle-prompt text
├── client-bar-colours.test.ts # (3) four properties, light pinned, dark ≥ 7:1, is-multi
├── client-maximized.test.ts # (3) inline-colour reads updated
├── client-profile-snackbar.test.ts # NEW (4) the snackbar
├── polls-admin-wizard.test.ts     # NEW (6) /save, keywords, defaults, list row fields
├── client-admin-wizard.test.ts    # NEW (6) the wizard, the summary links, the read-only face, the when-line
├── client-admin-discard.test.ts   # (6) rewritten for the wizard's Cancel
├── client-home.test.ts            # (6) the admin date fields and FIX010 view test rewritten
├── poll-card-assets.test.ts       # (6) edit-face sections retired
├── polls-editing-eligibility.test.ts # (6) edit-face client sections retired
└── polls-service.test.ts, polls-admin-crud.test.ts # (6) the Dynamic-Vote default

README.md, ARCHITECTURE.md                                 # after implementation
specs/021-MAXIMIZED-POLL-CARD/contracts/ui-contracts.md    # bar colours annotated (C9)
CLAUDE.md                                                  # this feature's decisions
```

**Structure Decision**: the existing single web application. Steps 1–5 live in the static client
(`src/public`) and its tests; Step 6 adds the five server changes in `src/polls` and
`src/routes`. The build (`devScripts/build-assets.ts` already fingerprints every top-level
`.css`/`.js`) and deployment are unchanged.

## Step plan

| Step | Commit on `024-MATERIAL3-MERGE` | Visible change | Gate |
|---|---|---|---|
| 1 | <ul><li>`m3-tokens.css`, `m3-ripple.js` and Roboto on seven pages;</li><li>`m3-assets.test.ts`.</li></ul> | None (Q1) | Full suite green; served HTML otherwise identical |
| 2 | <ul><li>Header, tabs, snackbars, tooltips, `Tabs.modal`, the idle prompt, the empty-tab line, the Not Saved dialog;</li><li>the avatar, guest-tab and 640px fixes.</li></ul> | Header, tab bar, dialogs (light) | R17 Step 2 tests; Q2–Q6 |
| 3 | <ul><li>`pollCard-m3.css` and the two `pollCard.js` edits, together;</li><li>the `site.css` scope fix.</li></ul> | Cards and the maximized view (light) | Bar tests; Q7 |
| 4 | <ul><li>`card-shell-m3.css`, `profile-editor-m3.css` and the profile snackbar.</li></ul> | Profile, Login, Create Account, Not Authorized | Snackbar tests; Q8 |
| 5 | <ul><li>The `@media` dark twins everywhere;</li><li>`data-theme="light"` on the admin pages;</li><li>the browser checklist;</li><li>the documents.</li></ul> | Dark follows the device | Checklist (Steps 1–5 entries) |
| 6 | <ul><li>`admin-card-m3.css`, the prototype's `adminCard.js` and `admin.css`, the `adminList.js` edits, the three type roles;</li><li>the four server changes and `postman/openapi.json`;</li><li>R26's tests;</li><li>README / ARCHITECTURE for the admin cards.</li></ul> | The admin cards | R26 green; Q9–Q17 |
| 6, follow-ups | <ul><li>R27: progress kept across admin views (`adminCard.js` `hasSavedProgress`, `adminList.js` keeps such controllers);</li><li>R28: `/publish`'s hold for unpublished polls only (the fifth server change);</li><li>R29: the rules nothing on the admin pages uses removed from `admin.css`, with the two tests that pin them.</li></ul> | None, except a published starter-choice poll now goes to review | R27–R29 tests green; Q18–Q20; checklist's admin-cards entry; then the one pull request into `dev` |

Steps 1–5 were built together and committed as one commit (`c0da4ad`); Step 6 is its own commit.
There are no per-step pull requests: the only pull request is `024-MATERIAL3-MERGE` into `dev`,
after Step 6, with the developers' go-ahead (REQUIREMENT "Merge to CrowdPoll Webapp"). Merge `dev`
into the branch if it moves; never rebase the shared branch.

## Design notes

- **Port recipe** (R2): copy the prototype layer, then:
  - delete its token sections;
  - delete its `@media (prefers-color-scheme: dark)` blocks (Steps 2–4);
  - swap literal font sizes for `--md-sys-typescale-*`;
  - reduce its comments to section headings and external links.

  Diff the result against the prototype to confirm that only those four kinds of change were made.
- **Link order per page**: `m3-tokens.css`, then the production sheets as today, then that page's
  layers in the order of `data-model.md` §4. Scripts: `m3-ripple.js`, then `tooltip-m3.js` (Step 2
  on), then today's scripts.
- **`pollCard.js`** keeps `BAR_COLORS` and every 022 function. The dark set is built once at load.
  `applyBarColors` is the only colour writer that changes.
- **`adminCard.js` / `adminList.js`**: the Cancel handler and the back-link handler become `async`.
  `guardNavigation` calls `event.preventDefault()` before awaiting, and then
  `releaseSession().then(navigate)` runs as today.
- **Step 6 order** (each keeps the suite green): server first (R22 keywords through the store and
  service; R23 default; R24 row fields; R21 `/save`; `postman/openapi.json`; the server tests),
  then the client (the type roles; `admin-card-m3.css`; `admin.css`; `adminCard.js` with R19 and
  `openWizard()`; `adminList.js`; the client tests; retire and rewrite per R26).
- **Follow-up order**: R28 (server, one condition and two tests), then R27 (one controller
  method, one `loadList()` condition, one client test), then R29 (CSS removal last, so the
  before/after comparison runs on the final card markup).
- **`/save`'s draft allowances** are applied in the route before calling the shared validators,
  so `validatePollFields` and `replaceChoices` keep one behaviour for `/publish`.
- **Unchanged**: routes other than `/save`, configuration, the schema, the bar palette and 022's
  start rule, the Yes/No colours, `styles.css`, the admin toolbar, search, back link and results
  page, and the other `window.confirm` calls.

## Complexity Tracking

None.
