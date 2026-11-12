Start a new spec for these requirements called `20261112-152622-EXTRACT-ALL-POLLDATA`  
!! THIS FILE IS GENERATED USING THE SKILL `/speckit-requirements`. DO NOT EDIT OR DELETE THIS FILE !!  

# Initial High-Level Requirements

A previous feature of this project allowed the user to run the "populate-all-polls" script  
without specifying individual poll files, but rather the script iterates the ./polldata directory  
and works on the json files that haven't been marked as processed yet.  
The requirements for this feature are documented in "requirements\20261101-121236-populate-all-polls"  

We need the same convenience for the recently added extract-all script.  
The new script will be called "extract-all-polldata".
The only argument will be the optional directory name, that defaults to ./polldata.

## Decisions (from `requirements-report.md`, 2026-11-12 3:33 PM)

- Configurations are the files directly in the directory whose name ends in `.yaml` or `.yml` (any letter case), taken in name order;  
  subfolders are not searched (AM1).  
- A configuration is skipped when the history has an entry for it with the same SHA-256, one hash over the contents of the configuration, its `input_html` page and its `input_history` file (when it names one);  
  a configuration whose configuration, page or history file changed is extracted again (AM2).  
- Each configuration is extracted in the same process by calling `runExtractAll([<configuration path>])` (`devScripts/extract/extractAllCli.ts`), one after another;  
  status 0 is success, and its messages, output file and status are exactly those of `npm run extract-all <configuration>` (AM3).  
- The history file is `devScripts/extract/extract-all-polldata-history.json`, git-ignored (already, by `devScripts/extract/*`) (UA1).  
  - It holds `{ "entries": [ … ] }`, one entry per extracted configuration: `directory` (the folder's absolute path), `file` (the configuration's name), `sha256`, `outputJson` and `extractedAt` (ISO 8601);  
    entries are matched by `directory` and `file`.  
  - It is written atomically after each configuration succeeds, so an interrupted run keeps what it finished.  
  - A missing history file is an empty history;  
    an unreadable one stops the run with an error before any configuration is extracted.  
- The directory, its errors and the console output follow `populate-all-polls`, with the prefix `[extract-all-polldata]` (UA2):  
  - a relative directory is resolved from `INIT_CWD` (else the working directory);  
    the default `polldata` is always the project root's;  
  - two or more arguments print `Usage: npm run extract-all-polldata [<directory>]` as one `[extract-all-polldata] Error:` line and exit 1;  
  - a missing or unreadable directory is one `[extract-all-polldata] Error:` line and exit 1 before anything is extracted;  
    a directory with no configuration file says so and exits 0;  
  - each configuration is announced (`[extract-all-polldata] <file>: extracting`) before the `extract-all` messages, or logged as `[extract-all-polldata] Skipped <file> (extracted <time>)`;  
    the run ends with `[extract-all-polldata] Done: <n> extracted, <n> skipped, <n> failed`.  
- A configuration that fails is logged (`extract-all`'s own `Error:` line, then `[extract-all-polldata] Error: <file>: <message>`), nothing is recorded for it, and the run goes on to the next file (UA3).  
  - A configuration that fails after an earlier success keeps its old history entry, so it is tried again on every run until it succeeds;  
    its earlier output file is left as `extract-all` leaves it.  
  - When the run is finished, every failed file is listed again with its message, and the run exits 1 if any file failed.  
- A single `npm run extract-all <configuration>` neither reads nor writes the history (UA4).  
  - To extract a recorded configuration again, remove its entry from the history file (or delete the history file), or run `npm run extract-all <configuration>`;  
    the README says both.  
  - A configuration extracted singly is extracted again by the next batch run that has no entry for it.  
  - There is no option argument (such as `--force`): the directory is the only argument.  
- The script is `devScripts/extract/extract-all-polldata.ts`, run by the npm script `extract-all-polldata`, tracked through a `!devScripts/extract/extract-all-polldata.ts` line in `.gitignore` (UA5).  
  - Its tests live in `tests/extract/`, use temporary folders built from the existing `tests/extract/fixtures/` and need no database;  
    they cover skipping, a changed input, a failure that does not stop the run, the history file, and the argument and directory errors.  
  - The README extraction section shows the two-command workflow (`npm run extract-all-polldata`, then `npm run populate-all-polls`), and ARCHITECTURE.md places the new script.  
- `extract-all-polldata` extracts only; it never populates the database.  
  The README shows `npm run populate-all-polls` as the next step, and extraction needs no `ENV_*` setting (NC1).  
