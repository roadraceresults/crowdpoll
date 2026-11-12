# Research: Poll Data Extractors

Source examined: htmlparser `latest`, commit `90b7fb328d5aeb297ca12c75fb1afc418c885e9a` (2026-11-12, "refactor:
rename extract.js to extract-cnn.js and extract-yes-no.js to extract-polymarket-yes-no.js").

## R1. What is moved

- **Decision**: the five entries and the modules they import, found by following the imports from the entries.
  That is 27 files (5 entries and 22 modules), about 1,600 lines. The external imports are `node:fs/promises`,
  `node:path`, `cheerio` and `yaml`.
- **Rationale**: FR-006 and requirements UA1. No entry imports any of the title extractor's files, so they stay in
  htmlparser: `addTitles`, `cli`, `extractTitles`, `fetchPage`, `index`, `loadConfig`, `normalizeHeadings`,
  `parseArguments`, `pollsFile`, `readExistingResult` and `urlFileName`.
- **Alternatives**: copying all of `src/` (rejected: it brings unused code, against UA1).

## R2. Where the code lives and how it runs

- **Decision**: the code goes in `devScripts/extract/` and is run by `tsx` through five npm scripts named after the
  commands. Each script is `tsx devScripts/extract/<name>.ts`:
  - `extract-all`
  - `extract-cnn`
  - `extract-politico`
  - `extract-polymarket`
  - `extract-polymarket-yes-no`
- **`.gitignore`**: follows the populate pattern, as the cross-feature rule "a new dev script needs a
  `!devScripts/<file>` line" requires:
  - `!devScripts/extract/`
  - `devScripts/extract/*`
  - one `!devScripts/extract/<file>` line per file.
- **Rationale**: AM1 A and FR-005 (no build step). It has the same form as `populate-poll`.
- **Alternatives**:
  - `src/tools/` (rejected: it would ship with the application and be type-checked as production code).
  - a compiled `dist/` (rejected: FR-005).

## R3. Usage lines and command names

- **Decision**: the four usage constants and the `command` names change to the npm form. For example:
  - `Usage: npm run extract-cnn <config.yaml>`
  - `extract-cnn` in "… is not supported by extract-cnn; …"

  The other four commands change the same way. Every other message stays the same. Spec FR-004 is amended to allow
  this one difference.
- **Places to change**:
  - `extractCli.ts` (`USAGE`, and the name given to `checkOwnType`)
  - `politicoCli.ts`
  - `polymarketCli.ts`
  - `extractAllCli.ts` lines 181 and 186 (`usage`, `command`)
- **Rationale**: `node dist/extract-cnn.js` does not exist in this project, so a usage line naming it would mislead.
- **Alternatives**:
  - keeping the htmlparser text (rejected: wrong instructions).
  - `tsx devScripts/extract/…` (rejected: longer than the command the README teaches).

## R4. Toolchain gap (TS 7 / Node 26 → TS 5.8 / Node 22)

- **Decision**: no source change is expected beyond style.
  - The newest feature used is `Array.prototype.at` (`polymarketYesNo.ts`), part of ES2023, which `tsconfig.json`
    targets.
  - `cheerio` 1.2.0 needs Node ≥ 20.18.1.
  - The moved tests are type-checked only by Vitest's transform. So during implementation, a temporary
    `npx tsc --noEmit` is run once over `devScripts/extract` and `tests/extract`, with the project's options.
  - Any `noUncheckedIndexedAccess` error is fixed with the smallest change that keeps the behaviour.
  - The tests were written for Vitest ^5 and run here on Vitest ^3.2: an API missing from 3.2 is replaced by its 3.2
    equivalent, keeping every assertion (T008).
- **Rationale**: UA2, and TD2 in the requirements report (`devScripts` is outside the `include` of `tsconfig.json`).
- **Alternatives**: adding `devScripts/extract` to `tsconfig.json` (rejected: it changes what the project
  type-checks, which nobody asked for).

## R5. Dependencies

- **Decision**: `cheerio` `1.2.0` and `yaml` `2.9.1` as devDependencies, at exactly the versions htmlparser's lock
  file resolves (`npm install -D -E`).
- **Rationale**: FR-009, SC-004 and UA2 (pinned). Exact pins keep the parsed output identical to htmlparser's.
- **Found during implementation**: `npm ci --omit=dev` installs `yaml` too (187 packages instead of 186). Production
  already installs `vitest` and `vite`, because `better-auth` names `vitest` as an optional peer, and npm keeps `yaml`
  as `vite`'s optional peer once it is in the lock file. Nothing in the application imports it; accepted, and SC-004
  reworded to say so (2026-11-12).
- **Alternatives**:
  - caret ranges (rejected: an update of the HTML parser could silently change the output);
  - another YAML parser outside every production peer list (rejected: it would reverse UA2 and could parse
    differently from htmlparser).

## R6. Tests and fixtures

- **Decision**: these move to `tests/extract/`, keeping their relative layout:
  - 16 unit tests, one for each module that has one.
  - 5 integration tests: `extract`, `extractAll`, `extractPolitico`, `extractPolymarket` and `extractYesNo`.
  - `politicoFixture.ts`.
  - `integration/helpers.ts`, keeping `createWorkDir`, `copyFixture`, `removeWorkDir` and `captureConsole`. Its page
    server (`startPageServer`) is left out: only the title extractor's tests use it.
- **Fixtures** (about 24 KB): `line-graphs.html`, `polymarket.har`, `polymarket-chart.html`,
  `polymarket-yes-no.html` and `polymarket-yes-no-navigated.html`. The tests write every other file they name
  themselves.
- **Test changes**: the tests import from `../../../devScripts/extract/…`, and the usage assertions follow R3.
- **Rationale**: FR-007, UA3 A and SC-005.
  - The integration tests call the entries' run functions in process, so they need no build and no child process.
  - They need no database, although the suite's global PostgreSQL setup still runs once.
- **Alternatives**: copying all the fixtures (rejected: the two reference pages are 5 MB and belong to the title
  extractor's `reference.test.ts`, which stays out).

## R7. Style conversion

- **Decision**: single quotes become double quotes, and the formatting follows this project's. Names, module
  boundaries and logic do not change. The `.js` import specifiers stay (NodeNext, as in `src/`).
- **Rationale**: UA4 and FR-008.

## R8. Proving identical output

- **Decision**: for each configuration file in `polldata/`, run htmlparser's command and this project's command,
  writing to two different output names. Then compare the two files byte for byte (quickstart step 3).
  - The moved tests prove the behaviour inside the repository.
  - The comparison proves SC-001, once, by hand.
- **Rationale**: FR-003 and SC-001. `polldata/` is git-ignored, so the comparison cannot be a committed test.

## R9. Source record

- **Decision**: the commit message names `roadraceresults/htmlparser@90b7fb3`, with the full hash in the body.
- **Rationale**: FR-010 and NC1. htmlparser stays active (NC2 B), so later fixes there are copied by hand.
