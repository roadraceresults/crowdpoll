---

description: "Task list for the site favicon"
---

# Tasks: Site Favicon

**Input**: Design documents from `specs/20261016-172002-FAVICON/`

**Prerequisites**: plan.md, spec.md, research.md (R1–R7), data-model.md, contracts/ui-contracts.md (C1–C5), quickstart.md

**Tests**: Requested by FR-010. Three checks go in `tests/pages.test.ts`, one per user story (R6).

**Organization**: Tasks are grouped by user story, so each story can be built and checked on its own.

**Branch**: `dev`. A push to `dev` deploys, so ship US1 and US2 together: until US2 lands, the pages' `/favicon.ico` link has no file behind it.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on an unfinished task)
- **[Story]**: the user story the task belongs to (US1, US2, US3)

## Path Conventions

Single project: `src/`, `tests/` and `devScripts/` at the repository root.

---

## Phase 1: Setup

**Purpose**: Let git track the new dev script.

- [X] T001 In `.gitignore`, add the line `!devScripts/favicon-ico.ts` directly after `!devScripts/file-manifest.ts` (R5). Check with `git check-ignore -v devScripts/favicon-ico.ts`, which must print nothing once the file exists.

---

## Phase 2: Foundational

**Purpose**: The master drawing. Every story shows it, and US2 renders the ICO from it.

**⚠️ CRITICAL**: Finish this before any user story.

- [X] T002 Create `src/public/favicon.svg` (C1, data-model.md, R4). Copy the geometry from `.brand-logo` in `SITE_HEADER_MARKUP` in `src/public/app.js` (lines 192–212), leaving out both speech-bubble paths. Use no comments, no `role`, no `aria-*`, and no `width`/`height`. The file is exactly:
  ```xml
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="10 4.5 96 96">
    <title>CrowdPoll</title>
    <defs>
      <mask id="favicon-front">
        <rect width="120" height="120" fill="white"/>
        <g fill="black" stroke="black" stroke-width="7">
          <circle cx="42" cy="42" r="13"/>
          <path d="M16 90 C16 70 28 61 43 61 C58 61 70 70 70 90 Z"/>
        </g>
      </mask>
    </defs>
    <g mask="url(#favicon-front)" fill="#E04A4A">
      <circle cx="73" cy="30" r="15"/>
      <path d="M46 78 C46 58 58 49 73 49 C88 49 100 58 100 78 Z"/>
    </g>
    <circle cx="42" cy="42" r="13" fill="#3FB34F"/>
    <path d="M16 90 C16 70 28 61 43 61 C58 61 70 70 70 90 Z" fill="#3FB34F"/>
  </svg>
  ```
  `src/public/app.js` is not edited (FR-009).

**Checkpoint**: Opening `src/public/favicon.svg` in a browser shows the green figure in front of the red one, centred, with no bubble and a transparent background.

---

## Phase 3: User Story 1 — Recognize the site's tab (Priority: P1) 🎯 MVP

**Goal**: All seven pages show the two-figure mark in the browser tab (FR-003, FR-005, FR-007, SC-001).

**Independent Test**: Run `npx vitest run tests/pages.test.ts -t "The site favicon"`; the link test passes. Then open each page in a browser and check its tab (quickstart §3).

### Tests for User Story 1

- [X] T003 [US1] In `tests/pages.test.ts`, add a `describe("The site favicon (FR-010)", …)` block at the end of the file, using the file's existing `ctx`, `forgeSession`, `freshEmail`, `makePoll`/`polls` helpers. Its first test, "every page links both icons right after the viewport meta", requests each of the seven pages as served and checks that each response contains the C3 block exactly:
  ```
  <meta name="viewport" content="width=device-width, initial-scale=1">\n  <link rel="icon" href="/favicon.svg" type="image/svg+xml">\n  <link rel="icon" href="/favicon.ico" sizes="16x16 32x32 48x48">
  ```
  The tests have no asset manifest, so the `href`s are not rewritten. How to request each page, following the file's existing describes:
  - `/` as a guest (`index.html`);
  - `/login` as a guest (`login.html`);
  - `/create-account` as a guest (`create-account.html`; the test context signs in natively);
  - `/profile` with a `forgeSession` cookie (`profile.html`);
  - `/admin` with a creator's cookie from `forgeWithPermissions()` (default permissions), as in "Admin pages ignore the isAdmin hint" (`admin.html`);
  - `/admin/poll/results?PID=<pid>` for a poll inserted and owned by that creator, as in "A creator's results page (025)" (`admin-results.html`);
  - `/admin` as a guest, which serves the not-authorized card, as in "Unauthorized access to an admin page" (`not-authorized.html`; check `res.text` contains `/notAuthorizedCard.js`).

  The first six answer `200`; the not-authorized card answers `403`. Run the test once and confirm it fails before T004–T010.

### Implementation for User Story 1

Each of these inserts the same two lines (C3) directly after line 5, `  <meta name="viewport" content="width=device-width, initial-scale=1">`, with two-space indentation and nothing else changed (the title stays):
```html
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="icon" href="/favicon.ico" sizes="16x16 32x32 48x48">
```

- [X] T004 [P] [US1] Insert the two icon links in `src/public/index.html`.
- [X] T005 [P] [US1] Insert the two icon links in `src/public/login.html`.
- [X] T006 [P] [US1] Insert the two icon links in `src/public/create-account.html`.
- [X] T007 [P] [US1] Insert the two icon links in `src/public/profile.html`.
- [X] T008 [P] [US1] Insert the two icon links in `src/public/admin.html`.
- [X] T009 [P] [US1] Insert the two icon links in `src/public/admin-results.html`.
- [X] T010 [P] [US1] Insert the two icon links in `src/public/not-authorized.html`.
- [X] T011 [US1] Run `npx vitest run tests/pages.test.ts tests/m3-assets.test.ts`. The T003 test passes, and `m3-assets.test.ts` is unaffected, since its allowlist only collects stylesheet links (R3).

**Checkpoint**: Every page's tab shows the mark in a browser with SVG icon support.

---

## Phase 4: User Story 2 — The mark stays sharp at every size (Priority: P2)

**Goal**: The traditional icon file holds 16, 32 and 48 px images rendered from the SVG, made by one documented, hand-run step (FR-002, FR-006, FR-008, SC-003, SC-005).

**Independent Test**: Run `npx tsx devScripts/favicon-ico.ts`, then `npx vitest run tests/pages.test.ts -t "The site favicon"`; the ICO test passes. Then check the mark by eye at 200% zoom and in the bookmarks list (quickstart §3).

### Tests for User Story 2

- [X] T012 [US2] In the T003 `describe` in `tests/pages.test.ts`, add "favicon.ico holds 16, 32 and 48 px PNG images" (C2, R6.3). It reads `src/public/favicon.ico` from disk (`node:fs` `readFileSync`, path resolved from the test file as the other file-reading tests do) and checks:
  - bytes 0–5 read as little-endian `uint16`: reserved `0`, type `1`, count `3`;
  - the three 16-byte directory entries starting at byte 6: width bytes `16`, `32`, `48` in that order (height equal to width);
  - each entry's data offset (`uint32` at entry byte 12) points at the PNG signature `89 50 4E 47 0D 0A 1A 0A`.

  It fails until T014 has run.

### Implementation for User Story 2

- [X] T013 [US2] Create `devScripts/favicon-ico.ts` (C5, R5), about 60 lines, using only `node:child_process`, `node:fs`, `node:os` and `node:path`. Start it with a short usage header comment only, like `devScripts/publish-assets.ts` (Constitution VI). It:
  1. Takes the browser from `process.env.FAVICON_BROWSER`, else `C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe`. If that path does not exist, it prints `[favicon] Browser not found: <path>. Set FAVICON_BROWSER to a Chromium-based browser.` to stderr and exits with code 1.
  2. Makes a temporary directory with `mkdtempSync(join(tmpdir(), "favicon-"))`, and removes it in a `finally` with `rmSync(..., { recursive: true, force: true })`, so it goes on every exit path.
  3. For each size `s` of `[16, 32, 48]`, runs `execFileSync(browser, [...], { stdio: "ignore", timeout: 30000 })` with an argument array and no shell: `--headless`, `--disable-gpu`, `--hide-scrollbars`, `--force-device-scale-factor=1`, `--default-background-color=00000000`, `--user-data-dir=<tmp>/profile`, `--window-size=<s>,<s>`, `--screenshot=<tmp>/<s>.png`, and the `file:///` URL of `src/public/favicon.svg` (absolute, forward slashes, from `pathToFileURL` in `node:url` or built by hand). If the call throws (the browser exits non-zero or passes the 30 s timeout), it prints `[favicon] Browser failed rendering <s> px: <message>` to stderr and exits with code 1.
  4. If `<tmp>/<s>.png` does not exist, prints `[favicon] No screenshot for <s> px` and exits with code 1. Otherwise reads each PNG and checks the IHDR width (`readUInt32BE(16)`) and height (`readUInt32BE(20)`) equal `s`. Otherwise it prints `[favicon] Rendered <w>x<h> for size <s>` and exits with code 1.
  5. Builds the ICO in one `Buffer`:
     - a 6-byte header: `0`, `1`, `3` as `uint16` little-endian;
     - three 16-byte entries: width `s`, height `s`, `0` colours, `0` reserved, planes `1` (`uint16`), `32` bpp (`uint16`), PNG byte length (`uint32`), offset (`uint32`; the first is `6 + 3 * 16`);
     - then the three PNGs in order.
  6. Writes it to `src/public/favicon.ico` and logs `[favicon] wrote src/public/favicon.ico (16, 32, 48 px, <bytes> bytes)`.

  `main()` runs only when the file is the entry point, as in `devScripts/file-manifest.ts`. Do not add it to `package.json` scripts or `npm run build` (FR-008).
- [X] T014 [US2] Run `npx tsx devScripts/favicon-ico.ts` from the project root to produce `src/public/favicon.ico`, about 2 KB. Confirm the log line, and open the file in an image viewer to see the three sizes (quickstart §1).
- [X] T015 [US2] Run `npx vitest run tests/pages.test.ts -t "The site favicon"`: the T012 test passes.

**Checkpoint**: Browsers without SVG icon support show a size-matched image; the ICO can be regenerated in one command.

---

## Phase 5: User Story 3 — Responses that are not pages show it too (Priority: P3)

**Goal**: `GET /favicon.ico` at the site root answers 200 with an icon, with no new route (FR-004, SC-002).

**Independent Test**: Run `npx vitest run tests/pages.test.ts -t "The site favicon"`; the root test passes. Also `curl.exe -sI http://localhost:8080/favicon.ico` (quickstart §4).

### Tests for User Story 3

- [X] T016 [US3] In the T003 `describe` in `tests/pages.test.ts`, add "GET /favicon.ico answers with the icon" (C4, R6.2). As a guest, `request(ctx.app).get("/favicon.ico")` answers `200`; its `content-type` matches `/^image\/(x-icon|vnd\.microsoft\.icon)/` (`express.static` answers `image/vnd.microsoft.icon`, R2); and its body is identical to the bytes of `src/public/favicon.ico`. Use `.buffer(true)` with a binary `.parse(...)` so supertest collects the body as a `Buffer`.

### Implementation for User Story 3

- [X] T017 [US3] No code change: `app.use(express.static(publicDir, { index: false }))` in `src/server.ts` already serves the T014 file (R2). Run `npx vitest run tests/pages.test.ts -t "The site favicon"` and confirm the T016 test passes. If it does not, find the router that intercepts `/favicon.ico` before `express.static` and report it rather than adding a route.

**Checkpoint**: All three FR-010 checks pass.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T018 Run the full suite once with `npm test` (SC-006; one vitest run at a time, since it uses port 54800). Every existing test still passes.
- [X] T019 Run `npm run build` and check the built output (quickstart §5, R1):
  - `dist/public/asset-manifest.json` lists `/favicon.svg` and `/favicon.ico`;
  - `dist/public/favicon.ico` exists for the root address;
  - `dist/public/assets/<hash>/` holds both files.
- [X] T020 Do the quickstart §3 check by eye with `npm run dev` (via `devScripts/launch-dev.ps1`):
  - the seven pages' tabs show the mark;
  - both figures are distinguishable on a light and on a dark tab strip (SC-004);
  - the mark is sharp at 200% zoom and in the bookmarks list;
  - a plain-text `Not found` address shows the icon in its tab (US3, scenario 2).
- [X] T021 Confirm the scope (R7, FR-009):
  - `git diff --stat` touches only `.gitignore`, the seven pages, `tests/pages.test.ts` and these specs;
  - `git status` shows the new `src/public/favicon.svg`, `src/public/favicon.ico` and `devScripts/favicon-ico.ts`;
  - `src/public/app.js`, `src/server.ts`, `src/routes/` and `devScripts/build-assets.ts` are unchanged, and nothing adds an Apple touch icon or a manifest.

---

## Phase 7: Documentation

**Purpose**: The constitution's two Documentation Deliverables, written after implementation.

- [X] T022 [P] Update `README.md` at the project root in place, keeping the content that is still accurate. In its developer-commands section (beside `npm run dev` and the other scripts), add `npx tsx devScripts/favicon-ico.ts`: it regenerates `src/public/favicon.ico` from `src/public/favicon.svg`, needs Microsoft Edge (or `FAVICON_BROWSER` set to another Chromium-based browser), and is rerun whenever `favicon.svg` changes. Do not reference specs or design documents.
- [X] T023 [P] Update `ARCHITECTURE.md` at the project root in place. Describe the two static icon files in `src/public/`, served by the existing asset pipeline (fingerprinted by `build-assets.ts`, rewritten by `assets.ts`, published by `publish-assets.ts`) and, for the bare `/favicon.ico`, by `express.static`. Add `devScripts/favicon-ico.ts` beside the `devScripts/file-manifest.ts` section as a hand-run developer script that is not part of the build.

---

## Dependencies & Execution Order

### Phase dependencies

- **Setup (T001)**: none; only needed before the script is committed.
- **Foundational (T002)**: blocks every story.
- **US1 (T003–T011)**: after T002.
- **US2 (T012–T015)**: after T002. Independent of US1 in code; ship it with US1 (see **Branch** above).
- **US3 (T016–T017)**: after T014, since the root address serves the generated ICO.
- **Polish (T018–T021)**: after all stories.
- **Documentation (T022–T023)**: after Polish; the two tasks touch different files and can run in parallel.

### Within each story

- The test task comes first and fails, then the implementation, then the run that makes it pass.
- T012, T016 and T003 all edit the same `describe` in `tests/pages.test.ts`, so they are never run in parallel with each other.
- T014 needs T013 and T002; T015 needs T012 and T014.

### Story completion order

```text
T001 ─┐
T002 ─┼─▶ US1 (T003 → T004–T010 → T011)
      └─▶ US2 (T012, T013 → T014 → T015) ─▶ US3 (T016 → T017) ─▶ Polish (T018–T021) ─▶ Docs (T022–T023)
```

---

## Parallel Example: User Story 1

```text
# After T003, the seven page edits touch different files:
T004 src/public/index.html
T005 src/public/login.html
T006 src/public/create-account.html
T007 src/public/profile.html
T008 src/public/admin.html
T009 src/public/admin-results.html
T010 src/public/not-authorized.html
```

## Parallel Example: User Story 2

```text
# T013 (devScripts/favicon-ico.ts) can be written while US1's page edits are done,
# and T012 written in tests/pages.test.ts once T003 is in place.
```

---

## Implementation Strategy

### MVP first (User Story 1)

1. T001, T002.
2. T003–T011: every page's tab shows the mark in current browsers.
3. Stop and check by eye, but don't push yet: the ICO link still has no file behind it.

### Incremental delivery

1. Add US2 (T012–T015): the ICO exists and the fallback link resolves. US1 and US2 together are the first shippable increment.
2. Add US3 (T016–T017): the root-address check, a test only.
3. Polish (T018–T021) and Documentation (T022–T023), then commit when the developer asks.

### Notes

- Edit files with the Edit tool or node, never python3.
- `src/public/favicon.ico` is regenerated only by `devScripts/favicon-ico.ts`, never hand-edited; when `favicon.svg` changes, rerun T014 and commit both files together.
