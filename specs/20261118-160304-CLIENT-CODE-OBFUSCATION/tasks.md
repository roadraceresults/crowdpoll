---

description: "Task list for Client Code Obfuscation"
---

# Tasks: Client Code Obfuscation

**Input**: Design documents from `specs/20261118-160304-CLIENT-CODE-OBFUSCATION/`

**Prerequisites**: plan.md, spec.md, research.md (R1–R15), data-model.md, contracts/build.md (B1–B16), quickstart.md

**Tests**: included, written before the code they cover (Constitution IV; plan, Constitution Check).

**Organization**: by user story. All automated tests of the build are in one file, `tests/build-assets.test.ts`, so
tasks that add to it are not marked [P].

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on an unfinished task)
- **[Story]**: the user story of spec.md the task serves
- Tasks run in the order they appear in this file; T041, T042 and T043 were added after analysis and sit in their phases, out of numeric order

## Path Conventions

Single project: `devScripts/`, `tests/`, `src/` at the repository root. No file under `src/` is edited by this
feature.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: a working checkout with the build tools installed

- [X] T001 Run `npm ci`, then `npx tsc --noEmit` and `npm test` from the repository root and confirm both pass before changing anything (record any pre-existing failure in specs/20261118-160304-CLIENT-CODE-OBFUSCATION/quickstart.md instead of fixing it)
- [X] T002 Add to `devDependencies` in package.json, at exact versions with no range prefix, `esbuild` 0.28.2, `javascript-obfuscator` 5.10.1, `html-minifier-terser` 7.2.0 and `@jridgewell/remapping` 2.3.5 (research R1), run `npm install` so package-lock.json follows, and confirm none of the four appears under `dependencies`
- [X] T003 [P] In .gitignore add `!devScripts/assetTransform.ts` after the `!devScripts/build-assets.ts` line, and `dist-maps/` after the `dist/` line

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: the build as a function that tests can call, behaving exactly as today

**⚠️ CRITICAL**: no user story can start before this phase is done

- [X] T004 [P] Create the fixture folder tests/fixtures/build-assets/ holding: `sample.js` (at least 6,000 bytes, of which at least 4,000 are comments written as varied prose, not repeated lines, so that its compressed size after transformation, string-table decoder included, is at least 10% smaller than before and the build's size check passes on the fixture as it does on the site; it holds a block comment, a line comment, a top-level `function sharedHelper()`, an assignment `window.Sample = { greet }`, an inner function with a local variable named `localCounter`, the string literals `"A readable message for the visitor"` and `"another-known-string"`, and one use each of `?.` and `??`); `sample.css` (a comment, a rule for `.sample-card` and `#sample-id`, one `@media (max-width: 640px)` and one `@media not all and (max-width: 640px)` block); `sample.html` (a comment, `<link rel="stylesheet" href="/sample.css">`, `<script src="/sample.js" defer></script>`, `<img src="/pixel.png">`, the markers `{{PRIVACY_UPDATED}}` and `{{TERMS_UPDATED}}`, a `</head>`, and a paragraph with an inline `<a>` between words); `empty.js` (zero bytes); `pixel.png` (any small PNG); and `vendor/lib.min.js` (one line with a comment)
- [X] T005 Create devScripts/assetTransform.ts exporting `buildAssets(options: { sourceDir: string; targetDir: string; mapsDir: string; env: NodeJS.ProcessEnv; sourceMaps: boolean; log: (line: string) => void }): Promise<void>` that does what devScripts/build-assets.ts does today (remove the target, copy the source, fingerprint every top-level file whose extension is in `ASSET_EXTENSIONS` from the bytes in the target folder, write `asset-manifest.json`, log the fingerprinted-assets line), handling top-level names in sorted order (research R8, R10); reduce devScripts/build-assets.ts to an entry point that calls it with `src/public`, `dist/public`, `dist-maps`, `process.env`, `process.argv.includes("--source-maps")` and `console.log`, and on a rejected promise prints the error's message with `console.error` and sets `process.exitCode = 1`; bring the file's header comment up to date
- [X] T006 Create tests/build-assets.test.ts with a helper `build(options?: { env?: Record<string, string>; sourceMaps?: boolean; sourceDir?: string })` that calls `buildAssets` into a fresh folder under `os.tmpdir()` (removed in `afterEach`), collects the log lines and returns `{ targetDir, mapsDir, lines }`; add one case, "writes the same bytes to the plain and the fingerprinted address" (contract B7), over the fixture folder with `ENV_OBFUSCATE_ASSETS: "off"` in `env`, checking for every manifest entry that both files exist, are equal, and that the hash is the first 16 hex digits of their SHA-256; run `npx vitest run tests/build-assets.test.ts` and `npm run build` and confirm both succeed

**Checkpoint**: the build is callable from a test and its output is unchanged

---

## Phase 3: User Story 1 - A person inspecting the site cannot simply read its code (Priority: P1) 🎯 MVP

**Goal**: a default build serves transformed scripts, sheets and pages at both addresses, and nothing else changes

**Independent Test**: build, open `dist/public/pollCard.js`, `pollCard.css` and `index.html`: no comment, no
readable message text in the script, and no file of these kinds equals its source

### Tests for User Story 1 (write first, see them fail)

- [X] T007 [US1] In tests/build-assets.test.ts add `describe("a transformed build")` over the fixture folder with no `ENV_OBFUSCATE_ASSETS`: the log holds `[build] client files: transformed` (B1); built `sample.js` contains neither comment's text, contains the top-level declaration's name `sharedHelper`, and, when run with `vm.runInNewContext` in a context whose `window` is an empty object, leaves `window.Sample.greet` a function (the published name is checked by running, not by text, since the tool may move it into the table; FR-007); it does not contain `localCounter`, `A readable message for the visitor` or `another-known-string`, contains none of `eval(`, `new Function`, `Function(`, and compiles with `new vm.Script` (B4); built `sample.css` contains no comment text, contains `.sample-card`, `#sample-id`, and both media conditions once spacing is removed (B5); built `sample.html` contains no comment text, both markers, `</head>`, and the same ordered list of matches of `/(href|src)="(\/[\w.-]+\.(?:js|css|svg|png|jpg|ico|woff2))"/g` as its source, and its `textContent` (parsed with `cheerio`, runs of white space folded to one space) equals its source's (B5)
- [X] T008 [US1] In tests/build-assets.test.ts add to the same `describe`: `pixel.png` and `vendor/lib.min.js` equal their sources (B6); the B7 case of T006 also holds without `ENV_OBFUSCATE_ASSETS`; no file named `*.map` and no text `sourceMappingURL` exists under the target folder, and `sample.js`, `sample.css` and `sample.html` each differ from their source while `empty.js` is present and empty (B8)
- [X] T009 [US1] In tests/build-assets.test.ts add a module-level `siteBuild()` that builds `src/public` with no switch the first time it is called and returns the same promise afterwards, so the whole file builds the site's own files once, and a `describe("the site's own files")` that uses it and checks: every top-level `.js`, `.css` and `.html` file differs from its source; every built script compiles; `pollCard.js` still contains its top-level names `essentialChoices` and `fittingChoices` (the names scripts publish on `window` are verified by `npm run test:built`, T027); every file under `vendor/`, `oauth/` and `fonts/` equals its source; for each sheet the sorted set of `@media` conditions, spacing removed, equals its source's (research R7); for each page both legal markers (where the source has them), `</head>` and the ordered reference list equal the source's (B5, B6, B8)

### Implementation for User Story 1

- [X] T010 [US1] In devScripts/assetTransform.ts add an exported `loadBuildTools()` that loads `esbuild`, `javascript-obfuscator` and `html-minifier-terser` with `import()` and returns them (the module imports none of them at its top level), and `transformScript(tools, name: string, source: string): Promise<string>`, where `tools` is what `loadBuildTools()` returned: `esbuild.transform` with `loader: "js"`, `minify: true`, `target: "es2020"`, `legalComments: "none"`, `charset: "utf8"`, then `JavaScriptObfuscator.obfuscate` with every option of research R2 written out (`compact`, `stringArray`, `stringArrayThreshold: 1`, `stringArrayEncoding: ["base64"]`, `simplify`, `identifierNamesGenerator: "mangled"`, `target: "browser-no-eval"`, `seed: 1` on; `stringArrayWrappersCount: 0`; `stringArrayRotate`, `stringArrayShuffle`, `stringArrayIndexShift`, `stringArrayCallsTransform`, `splitStrings`, `controlFlowFlattening`, `deadCodeInjection`, `selfDefending`, `debugProtection`, `disableConsoleOutput`, `numbersToExpressions`, `transformObjectKeys`, `unicodeEscapeSequence`, `renameGlobals`, `renameProperties` off; `domainLock: []`); an empty source returns an empty string; a failure of either tool is rethrown as an `Error` whose message starts with the file name
- [X] T011 [US1] In devScripts/assetTransform.ts add `transformSheet(tools, name, source)` (`esbuild.transform`, `loader: "css"`, `minify: true`, `legalComments: "none"`, `charset: "utf8"`, no target; research R7) and `transformPage(tools, name, source)` (`html-minifier-terser` `minify` with `collapseWhitespace`, `conservativeCollapse`, `removeComments`, `keepClosingSlash` on and `removeAttributeQuotes`, `removeOptionalTags`, `minifyCSS`, `minifyJS` off; research R6), each rethrowing a failure with the file name first
- [X] T012 [US1] In devScripts/assetTransform.ts give `buildAssets`'s options an optional `loadTools` (default `loadBuildTools`), call it once before the target folder is touched and pass what it returns to the three transform functions; make `buildAssets`, after the copy and before fingerprinting, replace every top-level `.js`, `.css` and `.html` file of the target folder with its transformed form, in sorted order, and log `[build] client files: transformed`; subfolders are not visited (FR-001, FR-006, FR-009, FR-010); on any thrown error remove the target folder before rethrowing (FR-017)
- [X] T013 [US1] In devScripts/assetTransform.ts export `checkTransformed(name: string, source: Buffer, built: Buffer): void`, which throws `<name> was not transformed` when the two are equal and not empty, and call it for every file in scope after the transformation, removing the target folder when it throws (FR-012, contract B9); in tests/build-assets.test.ts test the function directly, since no input makes the tools return their input unchanged: equal non-empty buffers throw the message, equal empty buffers do not, different buffers do not
- [X] T043 [US1] In tests/build-assets.test.ts add to `describe("the site's own files")` a case for FR-008: `createAssetServing(targetDir, { spaces: undefined })` from src/routes/assets.ts, given the folder `siteBuild()` produced, returns for `privacy.html` and `terms.html` a `pageHtml` with no `{{` left, and for `index.html` a `pageHtml` in which every `href` and `src` that named a top-level asset now starts with `/assets/` and names a file that exists under the target folder
- [X] T014 [US1] Run `npx vitest run tests/build-assets.test.ts` until T007–T009, T013 and T043 pass, then `npm run build`, and open dist/public/pollCard.js, dist/public/pollCard.css and dist/public/index.html to confirm the Independent Test by eye

**Checkpoint**: a default build is transformed at both addresses; this is the MVP

---

## Phase 4: User Story 2 - Visitors notice no difference (Priority: P1)

**Goal**: the build refuses to release output that is larger, does not compile or has a dangling reference, and the
built site is checked by hand in six browsers and for speed

**Independent Test**: the build prints a compressed size line whose second number is smaller; the quickstart's
checklist passes on a built site with an empty console

### Tests for User Story 2 (write first, see them fail)

- [X] T015 [US2] In tests/build-assets.test.ts add `describe("the build's checks")`: a successful fixture build logs a line matching `/^\[build\] compressed size: \d+ → \d+ bytes \(-?\d+(\.\d)?%\)$/` (B11); the build of `src/public` (`siteBuild()`) logs a second number no larger than the first (SC-003); calling the exported `checkCompiles(name, code)` directly, `("x.js", "function (")` throws a message starting `x.js does not compile` and `("x.js", "var a = 1;")` does not (B9); a temporary copy of the fixture whose `sample.html` also refers to `/missing.js` rejects with a message naming `sample.html` and `/missing.js` and leaves no target folder (B9); a temporary copy whose `sample.js` is `function (` rejects with a message starting `sample.js` and leaves no target folder (the transformation's own failure, B9); and, calling the exported `checkCompressedSize(before, after)` directly, `(100, 101)` throws a message holding both numbers while `(100, 100)` does not (B9)
- [X] T016 [US2] In tests/build-assets.test.ts add a case for contract B10: for every top-level script of `src/public`, `esbuild.transform` with `minify: true, target: "es2020"` and with `target: "esnext"` give the same code; the failure message names the script and says the pinned level must be raised
- [X] T017 [US2] In tests/build-assets.test.ts add a case for contract B14: calling the exported `transformScript` with the tools `loadBuildTools()` returns and `{ lighter: true }` on the fixture's `sample.js` gives code that compiles, holds no comment text, does not contain `localCounter`, and does contain `A readable message for the visitor`

### Implementation for User Story 2

- [X] T018 [US2] In devScripts/assetTransform.ts add `gzipSize(bytes)` (`zlib.gzipSync`, `level: 9`), total it over the files in scope before and after, export `checkCompressedSize(before, after)` (throws `compressed size grew: <before> → <after> bytes` when `after > before`), call it in a transformed build, and log `[build] compressed size: <before> → <after> bytes (<percent>%)` with one decimal (FR-016, contract B9, B11)
- [X] T019 [US2] In devScripts/assetTransform.ts add, for every build whatever the switch, the compile check (an exported `checkCompiles(name, code)` that passes each built top-level script through `new vm.Script(code, { filename: name })` and throws `<name> does not compile: <message>`) and the reference check (each `href`/`src` of each built page matching the page routes' pattern in src/routes/assets.ts must be a manifest key, rejecting with `<page> refers to <reference>, which is not a built asset`), both removing the target folder on failure (FR-019, contract B9)
- [X] T020 [US2] In devScripts/assetTransform.ts export `LIGHTER_SCRIPTS: ReadonlySet<string>` (empty) and give `transformScript` an options argument `{ lighter?: boolean }` that skips the obfuscator; `buildAssets` passes `lighter: LIGHTER_SCRIPTS.has(name)` (FR-020, data-model.md "Exception")
- [X] T021 [US2] Run `npx vitest run tests/build-assets.test.ts` until T015–T017 pass, then `npm run build` and record the printed compressed sizes in specs/20261118-160304-CLIENT-CODE-OBFUSCATION/quickstart.md under section 2

### Manual verification for User Story 2

- [X] T044 [US2] Add a `-Built` switch to devScripts.example/launch-dev.ps1 and the local devScripts/launch-dev.ps1 that runs `npm run build` and `npm start` in place of `npm run dev`, and name it in quickstart.md section 4 (TWEAK02)
- [X] T045 [US4] Add `$env:ENV_OBFUSCATE_ASSETS = "on"` under "Frequently changed" in devScripts.example/launch-dev.ps1 and the local devScripts/launch-dev.ps1, and say in quickstart.md section 5 how to get the readable build (TWEAK03)
- [X] T022 [US2] Run section 4 of specs/20261118-160304-CLIENT-CODE-OBFUSCATION/quickstart.md (the eleven-step function checklist, console open) on a transformed build in Chrome, Edge, Firefox and Safari on a desktop, Safari on an iPhone and Chrome on an Android phone, and record the result per browser in that file (FR-021, SC-002); a browser that is not available is recorded as not run, not as passed
- [X] T023 [US2] Run section 5 of specs/20261118-160304-CLIENT-CODE-OBFUSCATION/quickstart.md (first usable card and line-graph drawing, transformed against readable, phone and desktop, judged in use; TWEAK06) and record the result in that file; if either is noticeably slower, add the heaviest script to `LIGHTER_SCRIPTS` in devScripts/assetTransform.ts, rebuild, measure again, and list the exception for T037 (SC-004, FR-020)

**Checkpoint**: a build that could harm visitors does not finish; the built site is verified by hand

---

## Phase 5: User Story 3 - Developers keep working on readable code (Priority: P2)

**Goal**: development and `npm test` are untouched, the build is repeatable, and the client suites can be run on the
built files with one command

**Independent Test**: `npm test` passes with no `dist/`; `npm run test:built` passes; two builds are identical

### Tests for User Story 3 (write first, see them fail)

- [X] T024 [US3] In tests/build-assets.test.ts add a case for contract B12 (two fixture builds, and `siteBuild()` beside one further build of `src/public`, give the same relative file list and the same bytes for every file, manifest included) and a case for contract B16 (no file under `src/` contains `ENV_OBFUSCATE_ASSETS`; in package.json the four build packages are under `devDependencies`, absent from `dependencies`, and their versions match `/^\d+\.\d+\.\d+$/`)

### Implementation for User Story 3

- [X] T025 [US3] In tests/helpers/browser.ts change the one line that sets `publicDir` to `path.resolve(process.env.TEST_PUBLIC_DIR ?? "src/public")` (research R12); change nothing else in the file
- [X] T026 [P] [US3] Create vitest.built.config.ts at the repository root: the settings of vitest.config.ts with `include: ["tests/client-*.test.ts"]` and `env: { TEST_PUBLIC_DIR: "dist/public" }`; add `"test:built": "npm run build && vitest run --config vitest.built.config.ts"` to the `scripts` of package.json after `"test"`
- [X] T027 [US3] Run `npm test` (must pass with `dist/` deleted) and `npm run test:built`; for each client suite that fails only on the built files, find whether it reads a script's internal name or source text and change that test to use what the script publishes on `window` or at its top level, without changing what it verifies; if the failure is a real difference in behaviour, fix the transformation's settings in devScripts/assetTransform.ts instead and note it in specs/20261118-160304-CLIENT-CODE-OBFUSCATION/research.md under R12 (FR-018, SC-005)
- [X] T028 [US3] Run `npm run dev`, open http://localhost:8080/pollCard.js and confirm it is the source with its comments (contract B15, by hand); run `npm run build` twice and confirm with `git status` that nothing tracked changed

**Checkpoint**: everyday development is as before

---

## Phase 6: User Story 4 - Release the readable files again when something goes wrong (Priority: P2)

**Goal**: one setting turns the transformation off, and a wrong value stops the build

**Independent Test**: `ENV_OBFUSCATE_ASSETS=off` gives files equal to the source; `yes` fails with the message

### Tests for User Story 4 (write first, see them fail)

- [X] T029 [US4] In tests/build-assets.test.ts add `describe("the switch")` over the fixture folder: with `ENV_OBFUSCATE_ASSETS` `"on"` the result equals the default build file for file (B1); with `"off"` every file outside `assets/` and the manifest equals its source and the log holds `[build] client files: readable (ENV_OBFUSCATE_ASSETS=off)` and no `compressed size` line (B2); each of `"On"`, `"OFF"`, `"1"`, `"true"`, `""` and `" off"` rejects with exactly `ENV_OBFUSCATE_ASSETS must be "on" or "off" (got "<value>")` and creates no target folder (B3); with `"off"`, the fixture copy referring to `/missing.js` still rejects (research R9)

### Implementation for User Story 4

- [X] T030 [US4] In devScripts/assetTransform.ts add `readObfuscateSwitch(env): boolean` (undefined or `"on"` → true, `"off"` → false, anything else throws the message of contract B3, with no trimming or case folding) and call it first in `buildAssets`, before the target folder is touched; with the switch off skip the transformation, the "not identical" check and the size check, log the readable line, and keep the compile and reference checks (FR-027, FR-028, research R9)
- [X] T041 [US4] In tests/build-assets.test.ts add to `describe("the switch")`: with a `loadTools` option that rejects as a missing package would (an error whose `code` is `ERR_MODULE_NOT_FOUND` and whose message is `Cannot find package 'javascript-obfuscator' imported from <path>`, the form Node gives), a build with the switch on rejects with exactly `ENV_OBFUSCATE_ASSETS is on but javascript-obfuscator is not installed; run npm ci --include=dev` and creates no target folder, and a build with `ENV_OBFUSCATE_ASSETS: "off"` and a `loadTools` that throws when called succeeds (FR-017, spec Edge Cases)
- [X] T042 [US4] In devScripts/assetTransform.ts make `buildAssets` call `loadTools` (T012) only when the switch is on, after `readObfuscateSwitch` and before the target folder is touched, and turn a module-not-found failure into the message of T041 with the package's name, read from Node's message (`Cannot find package '<name>'`)
- [X] T031 [P] [US4] In .claude/rules/environment.md add a row for `ENV_OBFUSCATE_ASSETS` (default unset; `on` or unset: `npm run build` transforms the site's own scripts, sheets and pages; `off`: it copies them as written; any other value stops the build; read by `devScripts/build-assets.ts` only, never by the app, so it is not in `loadConfig`; left unset in `infra/app.tf`, set to `off` there to release readable files) (FR-030, FR-034); do not edit infra/app.tf
- [X] T032 [US4] Run `npx vitest run tests/build-assets.test.ts` until T029 and T041 pass, then the three PowerShell builds of section 2 of specs/20261118-160304-CLIENT-CODE-OBFUSCATION/quickstart.md and confirm each expected output

**Checkpoint**: the revert path works on a developer's machine exactly as it will in a release

---

## Phase 7: User Story 5 - Trace a production error back to the source (Priority: P3)

**Goal**: private source maps on request, with the built bytes unchanged

**Independent Test**: `npm run build -- --source-maps` writes `dist-maps/pollCard.js.map`, nothing under
`dist/public` changes, and a position resolves to the right source line

### Tests for User Story 5 (write first, see them fail)

- [X] T033 [US5] In tests/build-assets.test.ts add `describe("source maps")` over the fixture folder for contract B13: with `sourceMaps: true` the maps folder holds exactly `sample.js.map` (none for `empty.js`, the sheet or the page), every file under the target folder equals the same build without maps, no `*.map` exists under the target folder, and tracing the position of `sharedHelper` in built `sample.js` through the map with Node's own `SourceMap` (`new SourceMap(JSON.parse(map)).findEntry(line, column)` from `node:module`; no further package) gives `sample.js` and the line of its declaration in the fixture; with `sourceMaps: false` after a build that wrote maps, the maps folder does not exist; with the switch off and `sourceMaps: true`, no maps folder is written

### Implementation for User Story 5

- [X] T034 [US5] In devScripts/assetTransform.ts make `transformScript` return `{ code, map }` when asked (`esbuild` `sourcemap: "external"`, `sourcefile: name`, `sourcesContent: true`, so a map holds its script's source text and needs no other file (TWEAK05); the obfuscator's `sourceMap: true`, `sourceMapMode: "separate"`, `inputFileName: name`; the two joined with `remapping` from `@jridgewell/remapping`, which is loaded with `import()` only when source maps are asked for), and make `buildAssets` remove the maps folder at the start of every build and, when `sourceMaps` is true and the switch is on, write `<mapsDir>/<name>.map` for each transformed, non-empty script (a script in `LIGHTER_SCRIPTS` gets the `esbuild` map alone); the code written under the target folder must not depend on the flag (FR-032, research R11)
- [X] T035 [US5] Run `npx vitest run tests/build-assets.test.ts` until T033 passes, then `npm run build -- --source-maps` and confirm section 3 of specs/20261118-160304-CLIENT-CODE-OBFUSCATION/quickstart.md, including that `git status` shows nothing new

**Checkpoint**: all five stories work

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: the security review, the documents, and the final checks

- [X] T036 Review every file under src/public/ once for keys, tokens, private or internal addresses, email addresses and internal notes that should not be public (search for `key`, `secret`, `token`, `password`, `api[_-]?key`, `@`, `http://`, `https://`, `localhost`, `TODO`, `FIXME`, `HACK`, and read each hit); remove anything found from the source file, not from the build; record what was searched, found and removed in section 7 of specs/20261118-160304-CLIENT-CODE-OBFUSCATION/quickstart.md (FR-023, SC-010); confirm by reading that no check moved from the server to the browser in this feature (FR-024)
- [X] T037 [P] In ARCHITECTURE.md add the transformation to the description of the build and release path, with a Mermaid diagram of the build (source → switch → transform → checks → plain and fingerprinted copies → manifest): the tools and their settings, `ENV_OBFUSCATE_ASSETS`, the four checks that stop a build, that the method deters and does not prevent reading and that public tools undo the string table, the list of `LIGHTER_SCRIPTS` with each reason (or that it is empty), and how to trace a production error (rebuild the released commit with `--source-maps`, attach the map in the developer tools) (FR-033)
- [X] T038 [P] In CLAUDE_COMPLETE.md add the feature's section with the same content as T037 in that file's form, the contract items B1–B16 by reference, and the measured compressed sizes; in README.md, at the build and deploy lines (near `npm run build` and the description of the platform's build command), say that the build transforms the site's own scripts, sheets and pages, name `ENV_OBFUSCATE_ASSETS=off` as the way to release readable files, and name `npm run test:built`, without referring to any specification or architecture document (FR-033, Constitution "README.md")
- [X] T039 In CLAUDE.md, in the entry for this plan between the SPECKIT markers, correct anything the implementation changed (an exception in `LIGHTER_SCRIPTS`, a raised language level), and add to "Cross-feature invariants" one line: a new top-level client file is transformed by the build, a client script must not depend on its own internal names or source text at run time, and a new build package is an exact-version `devDependency`
- [X] T040 Run `npx tsc --noEmit`, `npm test`, `npx vitest run tests/build-assets.test.ts` and `npm run test:built`; all pass; then go through sections 1–3 of specs/20261118-160304-CLIENT-CODE-OBFUSCATION/quickstart.md once more from a clean `dist/`; add to section 1 of that quickstart how long `npx vitest run tests/build-assets.test.ts` took, and when it is over the 20 seconds of SC-009 either shorten the suite or correct the figure in specs/20261118-160304-CLIENT-CODE-OBFUSCATION/spec.md (SC-009)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: none
- **Foundational (Phase 2)**: after Setup; blocks every story
- **US1 (Phase 3)**: after Foundational; T043 follows T013 and precedes T014
- **US2 (Phase 4)**: after US1 (its checks act on transformed output)
- **US3 (Phase 5)**: after US1; T027 is most useful after US2's checks exist, but does not need them
- **US4 (Phase 6)**: after US1; independent of US2 and US3; T041 and T042 follow T030 and precede T031 and T032
- **US5 (Phase 7)**: after US1 and US4 (it uses the switch) and T020 (lighter scripts)
- **Polish (Phase 8)**: after every story that is to be released; T022 and T023 must be done before a first release

### Within Each Story

- Tests first, and seen failing, then the implementation, then the run that makes them pass
- Tasks on devScripts/assetTransform.ts are sequential; tasks on tests/build-assets.test.ts are sequential

### Parallel Opportunities

- T003 beside T002; T004 beside T005
- T026 beside T025; T031 beside T030
- T037 and T038 beside each other and beside T036
- After US1: US3 and US4 can be taken by different people, coordinating only on the two shared files

## Parallel Example: after User Story 1

```text
Developer A: T015 → T021 (US2: checks)            devScripts/assetTransform.ts, tests/build-assets.test.ts
Developer B: T025, T026, T031 (US3, US4: files of their own)
Then, in order on the shared files: T024, T027–T030, T041, T042, T032
```

## Implementation Strategy

### MVP First (User Story 1)

1. Phase 1 and Phase 2
2. Phase 3; stop and confirm by eye (T014)
3. Do not release yet: US2's checks and manual verification are the condition for a first release

### Incremental Delivery

1. US1 → transformed build exists
2. US2 → safe to release (checks, six browsers, speed)
3. US4 → the revert path, wanted before the first release
4. US3 → repeatability and `npm run test:built`
5. US5 → source maps
6. Polish → review, documents, final run

### First release

US1, US2, US4 and T036 are the minimum for a first release; US3 and US5 can follow.
