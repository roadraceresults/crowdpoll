# Research: Populate All Polls

Every requirements finding (AM1–AM5, UA1–UA7, NC1) was resolved in `/speckit-requirements`, and three spec
clarifications were answered on 2026-11-01. The Technical Context therefore held no `NEEDS CLARIFICATION`;
the items below settle how each decision is carried out, read from the code and the Node/npm documentation.

## R1. The two npm scripts and argument passing

- **Decision**: `"populate-poll": "tsx devScripts/populate/populate-poll.ts"` and
  `"populate-all-polls": "tsx devScripts/populate/populate-all-polls.ts"` in `package.json` `scripts`, placed
  after `"reconcile"` with the other `devScripts` entries.
- **Rationale**: matches the existing entries (`reconcile`, `fix-migrations`, `file-manifest`). npm 11 (installed)
  forwards positional arguments after the script name to the script (`npm run populate-poll polldata/x.json`);
  only an argument starting with `-` needs a `--` before it, and neither command takes options.
- **Alternatives considered**: `npx tsx …` in the script line — slower, and `tsx` is already a dependency.

## R2. Resolving the data path: `INIT_CWD` and the `.json` fallback (FR-002, FR-003)

- **Decision**: a new exported `resolveDataPath(arg, baseDir, exists)` in `populate-poll.ts`:
  `candidate = path.resolve(baseDir, arg)`; if `exists(candidate)` → it; else if `path.extname(arg) === ""` and
  `exists(candidate + ".json")` → that; else the candidate (so the read error names the path as typed).
  `main()` calls it with `baseDir = process.env.INIT_CWD ?? process.cwd()` and `existsSync`.
- **Rationale**: `npm run` always starts in the package root and records the caller's folder in `INIT_CWD`;
  `file-manifest.ts`, `capture-admin-card.ts` and `render-invitation-email.ts` already resolve from it. With the
  long `npx tsx` form `INIT_CWD` is unset (or the caller's folder), so behaviour from the root is unchanged
  (SC-006). Only `.json` is tried, because `polldata/` holds `.har`, `.html` and `.yaml` siblings.
- **Alternatives considered**: always appending `.json` when absent — would break a file legitimately named
  without extension; trying several extensions — would pick up `.har`.

## R3. Usage line (FR-004)

- **Decision**: `readArguments` throws `InputError("Usage: npm run populate-poll <poll-data.json>")`; `main()`
  already prints it as `[populate] Error: …` and exits 1.
- **Rationale**: one string changes; the existing test asserts the usage error and is updated with it.

## R4. Running each file as a child process (FR-011, clarification 2)

- **Decision**: `spawn(process.execPath, ["--import", "tsx", POPULATE_POLL_SCRIPT, absoluteFile], { stdio:
  ["inherit", "pipe", "pipe"], env: process.env })`, no shell. Each stdout/stderr chunk is written straight to
  the parent's `process.stdout`/`process.stderr` (live, unchanged) and also appended to an in-memory copy for
  parsing. `POPULATE_POLL_SCRIPT` is `populate-poll.ts` resolved beside the new script via `import.meta.url`.
  The child gets the **absolute** file path, so its own `INIT_CWD` resolution (inherited env) cannot move it.
- **Rationale**: `process.execPath` + `--import tsx` (supported by tsx 4 on Node ≥ 20.6) avoids `npx`/`.cmd`
  shims, which on Windows need a shell; an argument array with no shell cannot be broken by spaces or quotes in
  a path. Piping and re-writing keeps the output identical while letting the parent read the summary.
  Files run strictly one after another (`await` the child's `close`).
- **Alternatives considered**: `stdio: "inherit"` — the summary could not be read; importing `populatePoll`
  (AM3 A) — rejected by the developer in favour of process isolation (AM3 B).

## R5. Reading the child's result (FR-011, FR-015, clarification 3)

- **Decision**: a pure exported `readPopulateResult(exitCode, signal, stdout, stderr)` returning either
  `{ ok: true, pollId, outcome, votesWritten }` or `{ ok: false, message }`:
  - exit 0 → match `^\[populate\] Done: poll (\S+) (created|refreshed)$` and
    `^\[populate\]\s+Votes deleted: [\d,]+\s+Votes written: ([\d,]+)$` (multiline; commas removed); either
    missing → `{ ok: false, message: "populated, but its summary could not be read" }`;
  - non-zero exit → the last stderr line starting `[populate] Error: ` or `[populate] failed: `, prefix
    removed; none → `exited with code <n>`;
  - killed by a signal → `stopped by <signal>`.
- **Rationale**: the lines are exactly what `populatePoll` logs today (`Done: poll ${pid} ${outcome}`,
  `Votes deleted: … Votes written: …` with `toLocaleString("en-US")` grouping). A pure function is testable
  without spawning. This settles the "`<message>`" detail the clarify step left to planning.
- **Alternatives considered**: a machine-readable output flag on `populate-poll.ts` — a new option beyond the
  requirements (Simplicity First).

## R6. The content fingerprint (FR-012, FR-013)

- **Decision**: `createHash("sha256").update(readFileSync(file)).digest("hex")`, over the raw bytes, computed
  by the parent before deciding to skip.
- **Rationale**: built into `node:crypto`; byte-exact, so any edit re-populates (accepted in AM4 B).

## R7. The password-free database identity (FR-020, NC1)

- **Decision**: `databaseIdentity(url)`: `const u = new URL(url); u.password = ""; return u.toString();`.
  `ENV_DATABASE_URL` is read directly from `process.env` (as `fix-migrations.ts` does); unset or not a
  `postgres:`/`postgresql:` URL → `[populate-all] Error: ENV_DATABASE_URL is not set to a PostgreSQL URL`,
  exit 1, before any file.
- **Rationale**: WHATWG `URL` parses non-special schemes and drops the `:` when the password is emptied
  (`postgres://user@host:5432/db`); user, host, port, database and query stay, so two databases never
  collide and a password rotation changes nothing. The parent does not call `loadConfig`, which needs many
  more settings; the child validates the full configuration itself.
- **Alternatives considered**: host only (as the `Target:` line prints) — two databases on one host would
  collide.

## R8. The history file (FR-014, FR-018, FR-019, FR-021, clarification 1)

- **Decision**: `HISTORY_FILE` = `devScripts/populate/populate-all-polls-history.json`, resolved from the
  script's own location. Read once at start: missing (`ENOENT`) → `{ entries: [] }`; unreadable, not JSON, or
  not `{ entries: [...] }` → `[populate-all] Error: cannot read <path>: <reason>`, exit 1, before any file.
  After each success: drop any entry with the same `database` and `file`, append the new entry, write
  `JSON.stringify(history, null, 2) + "\n"` to `<path>.tmp`, then `renameSync` over the file.
- **Rationale**: one entry per database and file name (clarification 1); write-then-rename means an
  interruption leaves either the old or the new file, never half of one (SC-005). `.gitignore` already
  ignores everything under `devScripts/populate/` that is not named with `!`, so the history is never
  committed (FR-018); the new script needs `!devScripts/populate/populate-all-polls.ts`.
- **Alternatives considered**: appending every run (clarification 1, B) — rejected.

## R9. Listing the data files (FR-007, FR-009, FR-010, FR-017)

- **Decision**: directory = `path.resolve(INIT_CWD ?? cwd, arg)` when given, else `<project root>/polldata`
  (project root = two folders above the script). `readdirSync(dir, { withFileTypes: true })`, keep
  `isFile()` entries whose name matches `/\.json$/i`, sort by name with `localeCompare` (`en`, base order).
  A missing or unreadable directory → `[populate-all] Error: cannot read the directory <dir>: <reason>`;
  none found → `[populate-all] No .json files in <dir>` and exit 0.
- **Rationale**: no recursion, case-insensitive extension, repeatable order.

## R10. Run order, log lines and exit code (FR-008, FR-012, FR-016)

- **Decision**: arguments → `ENV_DATABASE_URL` → directory → history → files. Lines:
  `[populate-all] Target: <identity>` first; per file `[populate-all] <file>: populating` before the child,
  `[populate-all] Skipped <file> (populated <populatedAt>)` for a skip, `[populate-all] Error: <file>: <message>`
  for a failure; finally `[populate-all] Done: <p> populated, <s> skipped, <f> failed`, then, when `f > 0`,
  `[populate-all] Failed files:` and one `[populate-all]   <file>: <message>` per failure; exit 1 when `f > 0`,
  else 0. Errors go to `console.error`, the rest to `console.log`, as in `populate-poll.ts`.
- **Rationale**: the target line mirrors `[populate] Target:` and shows the password-free identity only; the
  closing list satisfies UA4's developer resolution.

## R11. Testing approach

- **Decision**: `tests/populate-all-polls.test.ts`. The run is an exported `populateAllPolls(options)` taking
  `argv`, `env`, `historyPath`, `projectRoot`, `runPopulate(file) → Promise<{ exitCode, signal, stdout, stderr }>`
  and `log`/`logError`; `main()` wires the real values. Unit tests use temporary folders and a fake
  `runPopulate`; `readPopulateResult`, `databaseIdentity` and `resolveDataPath` get direct tests. One
  end-to-end test spawns the real child against the suite's embedded database (`ENV_DATABASE_URL`,
  `ENV_BETTER_AUTH_SECRET`, `ENV_PUBLIC_ORIGIN` in its env) with the existing fixture and checks the poll row
  and the history entry. `tests/populate-poll.test.ts` gains `resolveDataPath` tests and the new usage text.
- **Rationale**: dependency injection only where a test needs it (the child runner); the real child path is
  covered once.
