# Contract: the command

The only interface the feature exposes is a command-line one. Nothing is added to the web service, its
routes, `postman/openapi.json` or its configuration.

## Invocation

```text
npm run file-manifest -- <project>
```

| Part | Rule |
|---|---|
| `file-manifest` | the `package.json` script `tsx devScripts/file-manifest.ts` |
| `--` | npm's separator; everything after it reaches the script |
| `<project>` | required, exactly one. A relative path is resolved from the folder the command was typed in (`INIT_CWD`, else the working folder). The folder is the project, even inside a larger repository |

The script reads the project and writes only `<project>/manifests/<run>/`. It never changes a tracked file,
the index, or any ignore file.

## Success

Exit code `0`. Standard output, in this order:

```text
Manifest written to <absolute path of the run folder>
Files counted: <n>
Files skipped: <m>
  <path>: <reason>          (up to the first five, only when m > 0)
Reports: <comma-separated file names written>
```

The path uses the operating system's separators. The skipped lines are indented two spaces. Nothing is
printed while the run is in progress.

## Failure

Exit code `1`. Nothing is written when the failure is one of the first four rows; a report-write failure can
leave the reports already written.

| Condition | Standard error |
|---|---|
| no argument | `ERROR: <project> is required. Usage: npm run file-manifest -- <project>` |
| more than one argument | `ERROR: Unrecognized argument(s): <args>. Usage: npm run file-manifest -- <project>` |
| not a folder | `ERROR: Not a folder: <resolved path>. Usage: npm run file-manifest -- <project>` |
| not a git work tree, or `git` missing | `ERROR: Not a git repository: <resolved path>. Usage: npm run file-manifest -- <project>` |
| cannot create `manifests/` or the run folder, or write a report | `ERROR: Could not write <path>: <system message>` |

`<args>` is the extra arguments joined with a comma and a space.

## Environment read

| Variable | Use |
|---|---|
| `INIT_CWD` | set by npm to the folder the command was typed in; used to resolve a relative `<project>` |
| `PATH` | must find `git` |

No `ENV_*` variable is read or added.

## External command

`git` is run with an argument array, never through a shell, with the project folder as its working folder:

| Purpose | Arguments |
|---|---|
| is a work tree | `rev-parse --is-inside-work-tree` (output must be `true`) |
| tracked files | `ls-files -z` |
| untracked, not ignored | `ls-files -z -o --exclude-standard` |
| ignored | `ls-files -z -o -i --exclude-standard` |

## Compatibility

Additive. No existing command, script, route or file changes behaviour. The only edits outside the new
files are the `package.json` script entry and the `.gitignore` exception.
