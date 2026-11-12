# Research: Extract All Poll Data

Sources examined: `devScripts/populate/populate-all-polls.ts` (the batch runner this feature mirrors),
`devScripts/extract/extractAllCli.ts` (`runExtractAll`), `devScripts/extract/graphConfig.ts`, the test helpers in
`tests/extract/integration/helpers.ts`, and the requirements report
`requirements/20261112-152622-extract-all-polldata/requirements-report.md` (AM1–AM3, UA1–UA5, NC1).

## R1. How each configuration is extracted

- **Decision**: in the same process, by calling `runExtractAll([<absolute configuration path>])` once per
  configuration, one after another. Status 0 is success; any other status is a failure.
- **Rationale**: requirements AM3 A; FR-004 asks for exactly the single command's output, messages and status, which is
  what calling the same function gives. An absolute path is passed because `runExtractAll` resolves its argument from
  the working directory (`path.resolve(args[0])`), not from `INIT_CWD` (Technical Debt item 1 of the report).
- **Alternatives**: a child process per configuration, as `populate-all-polls` does (rejected: a `tsx` start-up per
  file, and parsing of another command's output, for no isolation the extraction needs).

## R2. The failure message for the summary

- **Decision**: while `runExtractAll` runs, `console.error` is wrapped: every line still goes to the console unchanged,
  and the last line starting `Error: ` is kept. The failure message is that line without its `Error: ` prefix, or
  `exited with status <n>` when there is none (the usage line, which cannot happen with one argument). The wrapper is
  restored in a `finally`.
- **A thrown or rejected call**: `runExtract` is wrapped in `try`/`catch`; an exception is a failure like a non-zero
  status, with the error's message (`messageOf`) as its message, recorded nowhere, and the run goes on (FR-009,
  analysis U2).
- **Rationale**: FR-009 and FR-010 need `<file>: <message>`; `runExtractAll` returns only a status and prints each
  error as one `Error: …` line (`extractAllCli.ts`). Wrapping keeps FR-013 (no change to the existing command).
- **Alternatives**: changing `runExtractAll` to return its message (rejected: FR-013); naming only the file in the
  summary (rejected: the summary must keep every error visible, UA3).

## R3. The fingerprint

- **Decision**: one SHA-256 over, in order, the bytes of the configuration file, its `input_html` file and its
  `input_history` file when it names one, each part preceded by its role and byte length (`config:<n>\0`,
  `html:<n>\0`, `history:<n>\0`) so that moving bytes from one file to another changes the hash. Paths in the
  configuration are resolved from the configuration's folder, as `extract-all` does.
- **Reading the configuration for it**: the YAML is parsed with `yaml`'s `parse`; a list of single-key mappings or a
  single mapping is accepted (the two forms `parseSettings` accepts), and only `input_html`, `input_history` and
  `output_json` are read. When the configuration cannot be parsed or a named input cannot be read, there is **no
  fingerprint**: the configuration is never skipped and is extracted, where `extract-all` reports the real error.
- **Rationale**: requirements AM2 A and FR-005/FR-006. Not reusing `parseSettings` keeps the fingerprint independent of
  key validation, which stays `extract-all`'s job (one error source).
- **Alternatives**: file modification times (rejected in AM2 B); the configuration's hash alone (misses a page saved
  again, AM2).

## R4. The history file

- **Decision**: `devScripts/extract/extract-all-polldata-history.json`, already git-ignored by `devScripts/extract/*`,
  holding `{ "entries": [ … ] }` (data-model.md). It is read once at start; it is written to `<file>.tmp` then renamed,
  after each configuration that succeeds. A missing file is an empty history; a file that is not JSON or has no
  `entries` list stops the run with `[extract-all-polldata] Error: cannot read <path>: <reason>` before any
  extraction.
- **Rationale**: requirements UA1, FR-007, FR-008; the same functions and messages as `populate-all-polls`
  (`readHistory`, `writeHistory`).
- **Alternatives**: importing `readHistory`/`writeHistory` from `devScripts/populate/populate-all-polls.ts` (rejected:
  it ties `devScripts/extract/` to `devScripts/populate/` and their entry types differ; about 30 lines are repeated,
  recorded as Technical Debt item 2 of the report).

## R5. Arguments, folder and messages

- **Decision**: as `populate-all-polls` (requirements UA2, FR-001–FR-003, FR-010–FR-012):
  - more than one argument → `[extract-all-polldata] Error: Usage: npm run extract-all-polldata [<directory>]`, status 1;
  - no argument → `<project root>/polldata`; a given folder → `path.resolve(INIT_CWD ?? cwd, arg)`;
  - the history's `directory` is the listed folder's `fs.realpathSync.native(dir)`, so a drive letter in either case,
    `..` or a symlink give one entry per real folder (analysis U1);
  - an unreadable folder → `[extract-all-polldata] Error: cannot read the directory <dir>: <reason>`, status 1;
  - configurations: directory entries that are files whose name matches `/\.ya?ml$/i`, sorted with
    `localeCompare(…, "en")`;
  - none → `[extract-all-polldata] No .yaml or .yml files in <dir>`, status 0;
  - per file: `[extract-all-polldata] <file>: extracting`, or `[extract-all-polldata] Skipped <file> (extracted <time>)`;
  - end: `[extract-all-polldata] Done: <n> extracted, <n> skipped, <n> failed`, then on failures
    `[extract-all-polldata] Failed files:` and one `[extract-all-polldata]   <file>: <message>` line each, status 1.
- **Order of checks**: arguments, folder listing, history, as `populate-all-polls` does (folder before history).
- **No `Target:` line**: there is no database (FR-014).

## R6. Code shape and tests

- **Decision**: one module `devScripts/extract/extract-all-polldata.ts` exporting
  `extractAllPolldata(options: RunOptions): Promise<number>` and its helpers (`listConfigFiles`, `fingerprintOf`,
  `readHistory`, `writeHistory`), with dependencies injected (`argv`, `env`, `historyPath`, `projectRoot`,
  `runExtract`, `log`, `logError`), and `main()` behind the `import.meta.url === pathToFileURL(process.argv[1])` guard
  that `populate-all-polls.ts` uses, so tests can import it without running it.
- **Tests**: `tests/extract/integration/extractAllPolldata.test.ts`, in a temporary folder (`createWorkDir`,
  `copyFixture`), with the real `runExtractAll` on the CNN fixture `line-graphs.html` (no `.har` needed) and the
  console captured (`captureConsole`). Cases: first run extracts all and writes byte-identical output to a direct
  `runExtractAll`; a second run skips all; a changed page is extracted again; a bad configuration fails without
  stopping the others, keeps an earlier entry and gives status 1; `.yml`/upper-case files taken and subfolders ignored;
  a removed entry is extracted again; two arguments, a missing folder, an empty folder, an unreadable history; the
  default folder and `INIT_CWD` resolution (with an injected `projectRoot`/`env`).
- **Rationale**: FR-016, SC-005 (the CNN fixture extracts in milliseconds), and the existing test style.

## R7. Tracking and documentation

- **Decision**: `package.json` script `"extract-all-polldata": "tsx devScripts/extract/extract-all-polldata.ts"`;
  `.gitignore` gains `!devScripts/extract/extract-all-polldata.ts` after the 27 existing lines; README's extraction
  section gets the command, the two-command workflow and the two ways to extract again (FR-015); ARCHITECTURE's
  "Poll data extractors" section gets the batch runner and its history file.
- **Rationale**: the cross-feature rule "a new dev script needs a `!devScripts/<file>` line", and the constitution's
  Documentation Deliverables.

No NEEDS CLARIFICATION remains.
