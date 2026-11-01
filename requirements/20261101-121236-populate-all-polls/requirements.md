Start a new spec for these requirements called `20261101-121236-POPULATE-ALL-POLLS`  
!! THIS FILE IS GENERATED USING THE SKILL `/speckit-requirements`. DO NOT EDIT OR DELETE THIS FILE !!  

# Initial High-Level Requirements

The script `devScripts/populate/populate-poll.ts` creates or refreshes one demonstration poll from a JSON data file and replays its time series as simulated votes.  

This feature incluydes two related requirements:

Requirement 1:  
Currently, the `populate-poll.ts` script is executed as follows:  
`npx tsx devScripts/populate/populate-poll.ts polldata/trump_approval_rating_over_time`

Add to the `scripts` section of `package.json` a command to execute the `populate-poll.ts` script  by entering a simple command, as follows:  
`npm run populate-poll polldata/trump_approval_rating_over_time`

Decisions for Requirement 1 (from `requirements-report.md`):  

- The data file's path may be given with or without `.json`: when the path as given does not exist and has no extension, `populate-poll.ts` tries `<path>.json` (AM1).  
- A relative path is resolved from the folder the command was typed in (`INIT_CWD`, else the working directory) (UA1).  
- `populate-poll` takes exactly one argument;  
  its usage line becomes `Usage: npm run populate-poll <poll-data.json>`, and the populate `README.md` shows the npm forms (UA7).  
- A single `populate-poll` run neither reads nor writes `## Commands

```
npm run dev     # tsx watch src/server.ts (needs ENV_* env; use devScripts/launch-dev.ps1)
npm run build   # tsc + devScripts/build-assets.ts (dist/public with fingerprinted copies under assets/)
npx tsc --noEmit    # type-check only (there is no linter)
npm start       # node dist/server.js
npm test        # vitest run — all suites under ./tests on an embedded PostgreSQL; no local services needed
npx vitest run tests/auth.test.ts      # one file
npx vitest run -t "name of the test"   # tests matching a name
npm run reconcile       # recompute vote counters from the votes table (operator use)
npm run fix-migrations  # repair the local database's migration record after a branch merge (-- --apply to write)
npm run publish-assets  # push fingerprinted assets to Spaces
npm run file-manifest   # file manifest reports (feature 028)
npm run prototypes      # serve prototypes/ locally
```.json`;  
  a file populated singly is populated again (a refresh, keeping its poll id) by the next `populate-all-polls` run that has no entry for it (AM5).  

Requirement 2:  
The second command will allow the user to populate the database specified in the Environment Variable `ENV_DATABASE_URL`,  
with the data in all the JSON data files found in the directory specified as the argument to the script.  
The script wil be called `populate-all-polls.ts pollDirectoryName`.  
The script will keep track of a list of all the polls it has populated, in the past.  
This will include a record of the JSON data files that have been used to populate the database.  
The record will include the database URL that has been populated, the JSON data files it has processed and the timestamps of when they were populated.  
This record will be recorded in a separate file, such called `populate-all-polls-history.json`.  

The script will iterate through all the JSON data files found in the specified directory and determine if they have already been processed and recorded in `populate-all-polls-history.json`.  
If a JSON data file has not been processed before, the script will populate the database with its data and update `populate-all-polls-history.json` accordingly.  
If a JSON data file has already been processed, the script will skip it and move on to the next file.  
The script will log to the console if a JSON file is skipped.  

The `populate-all-polls.ts` script will use the `populate-poll.ts` script to do the actual population of each individual poll.  

An entry will be added to the `scripts` section of `package.json` to more easily execute this script:
`npm run populate-all-polls pollDirectoryName`.

If `pollDirectoryName` is not provided (i.e. no arguments are passed to the script), the script will attempt to use a directory called `polldata` orr the root of the project. If that directory does not exist, an error will be logged to the console and the script will terminate.  

Decisions for Requirement 2 (from `requirements-report.md`):  

- JSON data files are the files directly in the directory whose name ends in `.json` (any letter case), taken in name order;  
  subfolders are not searched (AM2).  
- Each file is populated by running `tsx devScripts/populate/populate-poll.ts <file>` as a child process, one file after another;  
  its exit code tells success or failure, and the poll id, outcome and votes written are read from its `[populate] Done:` and `Votes written:` lines (AM3).  
- A file is skipped when the history has an entry with the same database, the same file name and the same SHA-256 of the file's contents;  
  a file whose contents changed is populated again, which refreshes its poll and keeps the poll id (AM4).  
- A relative directory is resolved from `INIT_CWD` (else the working directory);  
  the default `polldata` is always the project root's (UA1).  
- The history file is `devScripts/populate/populate-all-polls-history.json`, git-ignored (already, by `devScripts/populate/*`) (UA2).  
- It holds `{ "entries": [ … ] }`, one entry per populated file: `database`, `file` (name), `sha256`, `pollId`, `outcome` (`created` or `refreshed`), `votesWritten` and `populatedAt` (ISO 8601) (UA3, AM4).  
  It is written after each file succeeds, so an interrupted run keeps what it finished;  
  a missing history file is an empty history, and an unreadable one stops the run with an error before any file is populated (UA3).  
- `database` is `ENV_DATABASE_URL` with its password removed (`postgres://user@host:port/db`), and entries are compared by that form (NC1).  
- A file that fails is logged as `[populate-all] Error: <file>: <message>`, nothing is recorded for it, and the run goes on to the next file;  
  when the run is finished, every failed file is listed again with its message, so no error is lost earlier in the console output, and the run exits 1 if any file failed (UA4).  
- A missing or unreadable directory, given or default, is one `[populate-all] Error:` line and exit 1 before any file is populated;  
  otherwise the run ends with `[populate-all] Done: <n> populated, <n> skipped, <n> failed`, and a directory with no `.json` file says so and exits 0 (UA5).  
- To populate a recorded file again, remove its entry from the history file (or delete the history file), or run `npm run populate-poll <file>`;  
  the populate `README.md` says both (UA6).  
- Two or more arguments print `Usage: npm run populate-all-polls [<directory>]` as one `[populate-all] Error:` line and exit 1 (UA7).  
