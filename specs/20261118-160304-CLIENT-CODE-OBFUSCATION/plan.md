# Implementation Plan: Client Code Obfuscation

**Branch**: `obfuscate` | **Date**: 2026-11-18 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/20261118-160304-CLIENT-CODE-OBFUSCATION/spec.md`

## Summary

`npm run build` gains one step: the site's own scripts, style sheets and pages are transformed before they are
fingerprinted, so a release serves code that is hard to read while `src/public/` stays as written. Development and
`npm test` do not change.

- Scripts are shortened with `esbuild`, then their strings are moved into a base64-encoded table by
  `javascript-obfuscator`; sheets are shortened with `esbuild`; pages with `html-minifier-terser` (R1).
- No top-level, global or property name changes, because the scripts share one global scope (R3); the language level
  is pinned at ES2020, which is what the source uses (R4); no code is created from text (R5).
- The build transforms the copy in `dist/public`, then fingerprints those bytes, so both copies of every file are the
  transformed one (R8). It checks its own output and stops, removing `dist/public`, when a file is unchanged, the
  compressed total grew, a script does not compile or a page reference is missing (R8).
- `ENV_OBFUSCATE_ASSETS` (`on`, `off`, on when unset) is read by the build only (R9). The build is repeatable (R10).
- `npm run build -- --source-maps` writes private maps to the git-ignored `dist-maps/` without changing a built byte
  (R11).
- `npm run test:built` runs the client suites against `dist/public` (R12).

**Two things the developer should know.**

1. *The setting the requirements call "light" fails the size limit* (R2). Measured on the real files, the encoded
   table with the tool's usual wrapper, rotation and shuffling makes the compressed total 1.9% **larger** than the
   source, and the size limit now stops the build. The plan uses the encoded table without wrapper, rotation,
   shuffling or index shift: 8.3% smaller than the source as planned, 6.6% as built (each script's decoder needed
   names of its own; research R2, correction), strings still unreadable in place and in the table. This stays
   within FR-002 and FR-003; it is a lighter setting than the requirements' wording suggests.
2. *The margin is real but not large.* Shortening alone would be 30.5% smaller; the string table costs most of that,
   because each of the 36 scripts carries its own decoder. `app.js` is the one large script that grows. If the total
   approaches the limit, `LIGHTER_SCRIPTS` (FR-020) is the remedy, starting with `app.js`.

## Technical Context

**Language/Version**: TypeScript ^5.8 on Node ≥ 22 (ESM) for the build script and tests, run with `tsx`; the client
files are plain ES2020 scripts, CSS and HTML and are not edited.

**Primary Dependencies**: four new `devDependencies` at exact versions: `esbuild` 0.28.2, `javascript-obfuscator`
5.10.1, `html-minifier-terser` 7.2.0, `@jridgewell/remapping` 2.3.5 (R1). No run-time dependency is added.

**Storage**: N/A. Nothing is stored on the server or in the browser; no migration.

**Testing**: Vitest. A new `tests/build-assets.test.ts` builds a small fixture folder and the real `src/public/` into
temporary folders and checks the contract (B1–B14, B16). The 44 jsdom suites that load pages through
`tests/helpers/browser.ts` run against `dist/public` with `npm run test:built` (R12). Function in six browsers and
the speed comparison are by hand (quickstart 4 and 5).

**Target Platform**: the build runs on Node ≥ 22 (developer machines and DigitalOcean App Platform); the output runs
in current Chrome, Edge, Firefox and Safari, desktop and phone.

**Project Type**: web service (Express) serving static pages; this feature touches its build script only.

**Performance Goals**: compressed total of scripts, sheets and pages no larger than the source's (measured: 6.6%
smaller); first usable card and line-graph drawing no more than 10% slower than a readable build; the build itself
about two seconds longer.

**Constraints**: names shared between scripts, pages and API responses unchanged (FR-007); the page routes'
rewriting of references, markers and `</head>` keeps working (FR-008); no third-party request and no code from text
(FR-025); the running app never reads the switch (FR-029); a failed build releases nothing (FR-017); `src/` is not
edited (B16); no explanatory comments in new code (Constitution VI).

**Scale/Scope**: 36 scripts, 35 sheets, 12 pages transformed per build; one new module of about 200 lines; the
entry script grows by about 20 lines; one new test file; one new Vitest config; one line in the test helper; two
`package.json` scripts lines; two `.gitignore` lines; documents.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|---|---|---|
| I. Think Before Coding | Pass | The size limit was measured before choosing settings (R2); the assumption that the "light" setting fits was wrong and is stated. |
| II. Simplicity First | Pass | One module and the existing entry point; no plugin system, no per-file configuration beyond one set of names (`LIGHTER_SCRIPTS`), which FR-020 requires. |
| III. Surgical Changes | Pass | `src/` is untouched; the test helper changes in one line; `package.json`'s `build` line is unchanged. |
| IV. Goal-Driven Execution | Pass | Every contract item B1–B16 is a test or a named manual step; tests are written first. |
| V. Code Quality & Maintainability | Pass | Pure functions per file kind, one orchestrating function, errors that name the file; build logging is three lines. |
| VI. Self-Documenting Code | Pass | Names carry the meaning; no explanatory comments are added; the existing header comment of `build-assets.ts` is brought up to date. |
| Security, Privacy & Reliability | Pass | No new run-time code; tools pinned and build-only; no code from text; maps never published; a one-time review of the client files (R13). |
| Performance & Operational Efficiency | Pass | Smaller downloads; nothing runs in the background. |
| Documentation Deliverables | Pass | `README.md` and `ARCHITECTURE.md` are updated after the implementation (R15). |

**Post-design re-check**: unchanged; the design added no project, layer or abstraction beyond the one module.

## Project Structure

### Documentation (this feature)

```text
specs/20261118-160304-CLIENT-CODE-OBFUSCATION/
├── plan.md
├── research.md          # R1–R15
├── data-model.md        # build inputs, mode, file kinds, checks
├── quickstart.md        # automated checks, the manual checklist, the speed comparison
├── contracts/
│   └── build.md         # B1–B16
├── checklists/
│   └── requirements.md
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
devScripts/
├── build-assets.ts          # entry point: reads the switch and the flag, calls the module, reports, exits
└── assetTransform.ts        # NEW: transform per file kind, checks, totals, source maps, LIGHTER_SCRIPTS

tests/
├── build-assets.test.ts     # NEW: contract B1–B14, B16
├── fixtures/build-assets/   # NEW: a script, a sheet, a page and an image with known content
└── helpers/browser.ts       # publicDir from TEST_PUBLIC_DIR, default src/public

vitest.built.config.ts       # NEW: tests/client-*.test.ts with TEST_PUBLIC_DIR=dist/public
package.json                 # devDependencies; "test:built" script
.gitignore                   # !devScripts/assetTransform.ts, dist-maps/

.claude/rules/environment.md # the switch, as a build-time setting
ARCHITECTURE.md, CLAUDE_COMPLETE.md, CLAUDE.md, README.md   # after the implementation
```

**Structure Decision**: the existing single project. The build logic sits beside the script that already builds the
assets; no file under `src/` changes.

## Complexity Tracking

No violations.
