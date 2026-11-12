Start a new spec for these requirements called `20261112-124616-POLL-DATA-EXTRACTORS`  
!! THIS FILE IS GENERATED USING THE SKILL `/speckit-requirements`. DO NOT EDIT OR DELETE THIS FILE !!  

# Initial High-Level Requirements

There is a repo called "htmlparser" on the same account (roadraceresults) as the "crowdpoll" repo that this project is in.  
The htmlparse project provides these 5 main scripts:  

| Command | Entry, then runner | What it does |
|---|---|---|
| `node dist/extract-cnn.js <config.yaml>` | `src/extract-cnn.ts` → `runExtract` in `src/extractCli.ts` | Line graph (CNN): pulls the data behind a line graph out of a saved poll page. |
| `node dist/extract-polymarket.js <config.yaml>` | `src/extract-polymarket.ts` → `runExtractPolymarket` in `src/polymarketCli.ts` | Polymarket line graph: takes the values from the `.har` price history saved beside the page. |
| `node dist/extract-politico.js <config.yaml>` | `src/extract-politico.ts` → `runExtractPolitico` in `src/politicoCli.ts` | POLITICO Poll of Polls: reads the trend chart off the drawn SVG. |
| `node dist/extract-polymarket-yes-no.js <config.yaml>` | `src/extract-polymarket-yes-no.ts` → `runExtractYesNo` in `src/extractAllCli.ts` | Polymarket yes/no: the current Buy Yes price of every outcome, as one data point. |
| `node dist/extract-all.js <config.yaml>` | `src/extract-all.ts` → `runExtractAll` in `src/extractAllCli.ts` | Any graph page: uses the config's `type`, or detects the page kind, and runs the matching extractor. |

Of course, the purpose of these scripts is to extract data from various types of poll pages to create json files that can then be used by the 
"devScripts\populate\populate-all-polls.ts" script
and the
-"devScripts\populate\populate-poll.ts" script  
to populate the poll data into the database specified in "env.ENV_DATABASE_URL".   

Please bring those scripts into this project so that the extraction and population can all be done in one place.


## Decisions (accepted in requirements-report.md, 2026-11-12)

- **Source (NC1)**: the code comes from htmlparser's `latest` branch, at the commit current when the move is made;  
  the commit message names that commit.  
- **What moves (UA1)**: the five entries, their runners and the modules they import, found by following the imports from the five entry files.  
  The title extractor (`src/index.ts`, `src/cli.ts`, `extractTitles.ts`, `pollsFile.ts`, `addTitles.ts`, `parseArguments.ts`, `loadConfig.ts`, `fetchPage.ts`) stays in htmlparser.  
- **Where and how they run (AM1)**: in `devScripts/extract/`, run with `tsx` through five `npm run` scripts (e.g. `npm run extract-all polldata/name.yaml`), like `devScripts/populate/`;  
  `.gitignore` gets the `!devScripts/extract/...` exceptions;  
  there is no build step and no `dist/`.  
- **Dependencies and toolchain (UA2)**: `cheerio` and `yaml` are added as `devDependencies`, pinned to the versions htmlparser uses;  
  the moved code type-checks and passes its tests under this project's TypeScript, Vitest and Node 22, and any newer language feature is rewritten in the move.  
- **Tests (UA3)**: the tests of the moved modules move into `tests/extract/` with their small fixtures;  
  the two large reference pages (4.2 MB and 1.0 MB) and the test that reads them (`reference.test.ts`) stay out.  
- **Code style (UA4)**: the moved files are converted to this project's style (double quotes, its import and comment habits) in the move, without any change of behaviour.  
- **htmlparser afterwards (NC2)**: htmlparser stays active as it is.  
- **One place, not one command (NC3)**: the extract commands and the populate commands stay separate;  
  no combined command is added.  
