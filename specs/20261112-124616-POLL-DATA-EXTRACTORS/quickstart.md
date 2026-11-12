# Quickstart: Poll Data Extractors

## Prerequisites

- Run `npm install` after the change; it adds the two devDependencies.
- Have saved pages and configuration files in `polldata/` ([data-model.md](data-model.md)).
- For step 3 only: an htmlparser checkout at `latest` (`90b7fb3`), built.

## 1. Tests

```
npx vitest run tests/extract
npm test
```

Expected: every moved test passes. The full run passes and takes no more than 5 seconds longer than before (SC-003).

## 2. Each command

```
npm run extract-all polldata/<cnn-page>.yaml
npm run extract-cnn polldata/<cnn-page>.yaml
npm run extract-polymarket polldata/<polymarket-page>.yaml
npm run extract-politico polldata/<politico-page>.yaml
npm run extract-polymarket-yes-no polldata/<yes-no-page>.yaml
npm run extract-cnn
```

Expected:
- Each of the first five writes the poll data file named by `output_json` and exits 0.
- The last prints `Usage: npm run extract-cnn <config.yaml>` and exits 1 ([contracts/cli.md](contracts/cli.md)).

## 3. Same output as htmlparser (SC-001)

For each configuration in `polldata/`:
1. Make two copies whose `output_json` names differ.
2. Run htmlparser's command on one and this project's command on the other.
3. Compare the two outputs (`cmp a.json b.json` or `git diff --no-index`).

Expected: no difference.

## 4. Extract, then populate (US3)

```
npm run extract-all polldata/<page>.yaml
npm run populate-poll polldata/<output>.json
```

Expected: the poll appears in the development database with its votes, as it does for a file written by htmlparser.

## 5. Production install (SC-004)

Run `npm ls cheerio yaml --omit=dev`. Expected: no `cheerio`; `yaml` appears only under `vite` (an optional peer, never
loaded by the application).
