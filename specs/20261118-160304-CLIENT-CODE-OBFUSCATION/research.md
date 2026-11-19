# Research: Client Code Obfuscation

Every decision below was checked against the code in `src/public/`, `devScripts/` and `tests/`. R2, R4, R5, R6 and
R11 were also measured on the real client files with the chosen packages, installed in a scratch folder outside the
repository; the numbers are from that run (2026-11-18).

## R1. The tools

**Decision**: four development dependencies, at exact versions:

| Package | Version | Use |
|---|---|---|
| `esbuild` | 0.28.2 | shortens scripts (comments, spacing, internal names) and style sheets |
| `javascript-obfuscator` | 5.10.1 | moves each script's text strings into an encoded table |
| `html-minifier-terser` | 7.2.0 | removes comments and spacing from pages |
| `@jridgewell/remapping` | 2.3.5 | joins the two stages' source maps, only when maps are asked for (R11) |

**Rationale**: `esbuild` does scripts and sheets with one package and no configuration files, and has no dependencies
of its own. `javascript-obfuscator` is the tool the requirements chose (BSD-2-Clause). `html-minifier-terser` is the
maintained HTML minifier. The repository pins exact versions for its build-critical packages, and FR-026 asks for it.

**Alternatives considered**: Terser (scripts only, slower, no gain here); Lightning CSS or cssnano (a second package
for what `esbuild` already does); the obfuscator alone, without `esbuild` (its compact mode shortens less, and FR-020
needs a "shorten only" level that the obfuscator cannot give).

**Note**: `esbuild` is already installed indirectly, because `tsx` (a run-time dependency) uses it. Naming it as a
development dependency fixes the version the build uses; the copy `tsx` brings stays after `npm prune --omit=dev`, as
today, and the running site does not call it.

## R2. The obfuscator's settings, and a correction to the requirements

**Finding**: the setting the requirements describe as "light" (an encoded string table with the tool's usual
wrappers, rotation and shuffling) makes the built site *larger* than the source once compressed, so it would fail
FR-016 and SC-003 on its first build.

Compressed (gzip, level 9) totals of all 36 scripts, 35 sheets and 12 pages:

| Variant | Total bytes | Against the source |
|---|---|---|
| Source | 278,434 | — |
| Shortened only (`esbuild`) | 193,462 | 30.5% smaller |
| Encoded table, with wrapper, rotation, shuffling, index shift | 283,641 | **1.9% larger: fails** |
| Encoded table, no wrapper, with rotation and shuffling | 267,630 | 3.9% smaller |
| **Encoded table, no wrapper, no rotation, shuffling or index shift** | **255,416** | **8.3% smaller** |
| Plain (not encoded) table, with wrapper and rotation | 244,210 | 12.3% smaller |
| RC4-encoded table | 522,129 | 87% larger |

The cost is per file: each script carries its own decoder, and the site has many small scripts.

**Decision**: the variant in bold. In `javascript-obfuscator`'s terms:

- on: `compact`, `stringArray` with `stringArrayThreshold: 1` and `stringArrayEncoding: ["base64"]`, `simplify`,
  `identifierNamesGenerator: "mangled"`, `target: "browser-no-eval"`, `seed: 1`;
- off or zero: `stringArrayWrappersCount: 0`, `stringArrayRotate`, `stringArrayShuffle`, `stringArrayIndexShift`,
  `stringArrayCallsTransform`, `splitStrings`, `controlFlowFlattening`, `deadCodeInjection`, `selfDefending`,
  `debugProtection`, `disableConsoleOutput`, `domainLock`, `numbersToExpressions`, `transformObjectKeys`,
  `unicodeEscapeSequence`, `renameGlobals`, `renameProperties`.

Every option is written out, so an upgrade of the package cannot change a default silently.

**Rationale**: it satisfies FR-002 as written (strings out of place, in an encoded table) and FR-003, and leaves 8.3%
of room under a limit that now stops the build. Rotation and shuffling add about 12,000 compressed bytes and do not
slow a reader with a public tool, which undoes them with the table.

**Alternatives considered**: the plain table is smaller still, but the strings are then readable in the table, which
is not what FR-002 says. Keeping the fuller setting and exempting the largest scripts under FR-020 would start the
feature with exceptions.

**Correction during implementation (2026-11-18)**: the measurements above gave every script's decoder the same two
global names. In the browser the scripts share one global scope, so a later script's decoder replaced an earlier
one's and the earlier script read the wrong strings. Each script's decoder is now named after its script
(`identifiersPrefix`, from `decoderPrefix`: `_pollCard_a`, `_pollCard_b`), which costs 4,680 compressed bytes: the
built total is 260,096, 6.6% smaller than the source, not 8.3%. A prefix from a short hash of the name was 1,600
bytes cheaper but could collide between two unrelated files; the name cannot, short of `a-b.js` beside `a_b.js`,
which the build refuses.

**`app.js`**: it is the one large script that grows (47,336 → 55,788 compressed), because it holds the logo's path
data. It is within the total, so it gets no exception now; it is the first candidate if the total ever approaches
the limit.

## R3. Names that must not change

**Decision**: no top-level, global or property name is renamed. `esbuild` is used through `transform` (no bundling,
no output format), which leaves top-level names alone; the obfuscator keeps `renameGlobals` and `renameProperties`
off.

**Rationale**: the scripts are classic scripts sharing one global scope. 24 names are published on `window`
(`window.PollCard`, `window.Tabs`, …), and `pollCard.js` alone declares 88 functions and constants at its top level,
outside any wrapper, which other scripts and the tests call by name (`essentialChoices`, `fittingChoices`). Property
names are shared with the pages, the API's responses and the DOM. Checked: after both stages, `PollCard`,
`essentialChoices` and `fittingChoices` are still present in `pollCard.js`.

**Alternatives considered**: none; FR-007 requires it.

## R4. The language level

**Decision**: `esbuild` runs with `target: "es2020"`.

**Rationale**: FR-022 forbids both raising and lowering the level. The scripts use optional chaining (9 files) and
nullish coalescing (3 files), which are ES2020, and nothing newer in syntax. Without a target, `esbuild` assumes the
newest level and may shorten code into forms the source does not use. Checked: for all 36 scripts the output with
`es2020` is byte-for-byte the output with `esnext`, so the target neither lowers anything today nor allows anything
newer later. A script that one day uses newer syntax would be lowered by this target; the build test compares the
two outputs and fails, so the target is raised deliberately (contract B10).

## R5. No code created from text

**Decision**: `target: "browser-no-eval"`, with `selfDefending` and `debugProtection` off, and a test that no built
script contains `eval(`, `new Function` or `Function(` unless its source does.

**Rationale**: FR-025. Checked: none of the 36 built scripts contains any of them.

## R6. Pages

**Decision**: `html-minifier-terser` with `collapseWhitespace`, `conservativeCollapse`, `removeComments` and
`keepClosingSlash`; `removeAttributeQuotes`, `removeOptionalTags`, `minifyCSS` and `minifyJS` off.

**Rationale**: `src/routes/assets.ts` rewrites `href="/name.ext"` and `src="/name.ext"` with a pattern that needs
the double quotes, inserts the canonical link before `</head>`, and replaces `{{PRIVACY_UPDATED}}` and
`{{TERMS_UPDATED}}` (FR-008). `conservativeCollapse` keeps one space where the source has any, so text that sits
beside inline elements keeps its spacing. Checked on all 12 pages: both markers, `</head>` and the full list of
rewritable references are unchanged. No page has an inline script.

## R7. Style sheets

**Decision**: `esbuild` `transform` with `loader: "css"`, `minify`, no target.

**Rationale**: comments and spacing go; selectors, class names and ids stay (FR-005). The sheets' breakpoints carry
the layout (`max-width: 640px`, `640.02px`, `not all and (max-width: 640px)`), so the build test compares each
sheet's set of media conditions before and after, with spacing normalized.

## R8. Where the code lives and what the build does

**Decision**: a new module `devScripts/assetTransform.ts` holds the logic as functions; `devScripts/build-assets.ts`
stays the entry point `npm run build` calls. The build:

1. reads the switch (R9) and the `--source-maps` flag (R11);
2. copies `src/public` to `dist/public`, as today;
3. with the switch on, replaces each top-level `.js`, `.css` and `.html` file in `dist/public` with its transformed
   form, in sorted name order;
4. fingerprints each top-level asset from the bytes now in `dist/public`, so the plain and the fingerprinted copy are
   the same bytes and the hash is of the transformed content (FR-009, FR-010);
5. checks the result (FR-012, FR-016, FR-019): no file in scope equals its source unless empty; the compressed total
   is not larger; every built script compiles (`node:vm` `Script`, which parses without running); every
   `href`/`src` reference of every page that names a top-level asset is in the manifest;
6. writes the manifest and prints the mode and both totals.

A failure in step 3 or 5 removes `dist/public`, prints the cause and exits with a non-zero code, so
`npm run publish-assets` in the platform's build command never runs and nothing is released (FR-017).
The three transform packages are loaded with `import()` after step 1 and only when the switch is on, so a readable
build needs none of them; a missing one stops the build before step 2 with a message naming the package (FR-017).

**Rationale**: functions in a module can be tested without running a script as a child process; the entry point and
`package.json`'s `build` line do not change, so the transformation needs no step of its own (FR-013).
`vendor/`, `oauth/` and `fonts/` are copied by step 2 and never touched (FR-006).

**Alternatives considered**: transforming inside the server at start-up (it would put the tools in the running app,
against FR-026); a second fingerprint pass (unneeded once step 4 reads the transformed bytes).

## R9. The switch

**Decision**: `build-assets.ts` reads `process.env.ENV_OBFUSCATE_ASSETS`: unset or `on` → transform; `off` → today's
byte-for-byte copy; anything else → the message
`ENV_OBFUSCATE_ASSETS must be "on" or "off" (got "<value>")` and exit code 1. The value is not trimmed or
case-folded. It is not added to `loadConfig`.

**Rationale**: FR-027 to FR-030. `loadConfig` refuses only renamed settings (`RENAMED_VARS`), not unknown ones, so
the variable being present in the running app's environment is harmless. App Platform gives the `env` block of
`infra/app.tf` to the build as well as the run (the build already reads `ENV_SPACES_BUCKET` in `publish-assets`), so
a revert is one line there and `npm run deploy`. With the switch off, the checks of step 5 that compare with the
source are skipped; the compile and reference checks still run.

## R10. The same bytes every time

**Decision**: a fixed `seed`, files handled in sorted order, gzip at a fixed level for the totals, and no time,
random value or absolute path in any output.

**Rationale**: FR-015 and SC-007. Checked: obfuscating each script twice gives identical output. The build test
builds twice and compares every file.

## R11. Source maps

**Decision**: `npm run build -- --source-maps` also writes `dist-maps/<name>.js.map`, one per script; `dist-maps/`
joins `.gitignore`. `esbuild` returns a map from the shortened code to the source, the obfuscator
(`sourceMap: true`, `sourceMapMode: "separate"`) a map from the built code to the shortened code, and
`@jridgewell/remapping` joins them. Without the flag no map is computed or written, and any `dist-maps/` left from an
earlier build is removed.

**Rationale**: FR-032. The obfuscator has no option to take an input map, hence the join. Checked: with its source
map on, the obfuscator's code is byte-for-byte the code without it, and carries no `sourceMappingURL` comment, so a
build with maps equals the released build and reveals nothing. To use a map, a developer opens the live script in
the browser's developer tools and attaches the local file ("Add source map").

**Alternatives considered**: publishing maps behind a secret address (it defeats the feature); a lookup command of
our own (the developer tools already do it).

## R12. Running the client tests on the built files

**Decision**: `tests/helpers/browser.ts` takes its folder from `TEST_PUBLIC_DIR` (default `src/public`); a new
`vitest.built.config.ts` includes `tests/client-*.test.ts` with `TEST_PUBLIC_DIR=dist/public`; a new script
`npm run test:built` builds and then runs it. `npm test` is unchanged.

**Rationale**: FR-018 and the first clarification. 44 suites load pages and scripts through this helper, by file
name, and the built site keeps every name. A config file sets the variable without a cross-platform helper package.
The app under test still serves its API from the source tree, which is what these suites exercise.

**Risk**: a client test that reads a script's internal names or source text would fail on the built files. Public
and top-level names survive (R3). Such a test is changed to use what the script publishes; tests that read source
text on purpose (`m3-assets.test.ts`, `phone-sheets.test.ts`) are not `client-*` suites and stay source-only.

## R13. The one-time review (FR-023)

**Decision**: a task, done once: search every file under `src/public/` for keys, tokens, private addresses, email
addresses and internal notes, read the hits, and record the outcome in the quickstart. Anything found is removed
from the source.

## R14. Speed (SC-004)

**Decision**: measured by hand with the quickstart, on a transformed and a readable build of the same commit, before
the first release. The table decoder runs once per string on first use and keeps the result, so the expected cost is
at load, not during use; this is an expectation, not a measurement.

## R15. Documents and housekeeping

**Decision**: after the implementation, `ARCHITECTURE.md` and `CLAUDE_COMPLETE.md` describe the method, the
settings, the switch, the limits, the (empty) list of exceptions and how to trace an error; `README.md`'s build
lines mention the switch, since its readers deploy the site; `.claude/rules/environment.md` lists the switch as a
build-time setting; `CLAUDE.md` gets a short entry. `.gitignore` gains `!devScripts/assetTransform.ts` and
`dist-maps/`.

**Note**: this checkout has no `node_modules`; `npm ci` comes before anything else.
