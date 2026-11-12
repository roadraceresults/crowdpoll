# Quickstart: Extract All Poll Data

Validation scenarios; the command contract is in [contracts/cli.md](contracts/cli.md), the history file in
[data-model.md](data-model.md).

## Prerequisites

- `npm ci` done; no database or `ENV_*` setting is needed.
- `polldata/` holds configurations with their saved pages (e.g. `netflix_show.yaml`, `.html`, `.har`).

## Automated

```
npx vitest run tests/extract/integration/extractAllPolldata.test.ts
npx tsc --noEmit
```

## Manual

1. **First run** — move `devScripts/extract/extract-all-polldata-history.json` aside if present, then
   `npm run extract-all-polldata`. Each configuration shows `: extracting`; the run ends with
   `Done: <n> extracted, 0 skipped, <f> failed`, and each failure is listed again (status 1 when `<f>` > 0).
2. **Same output** — for one configuration, copy its `.json`, run `npm run extract-all polldata/<name>.yaml`, and
   compare: the files are identical.
3. **Second run** — `npm run extract-all-polldata` again: every configuration that succeeded is `Skipped`.
4. **Changed page** — re-save (or touch the contents of) one `.html`; run again: only that configuration is extracted.
5. **Re-extract by hand** — remove one entry from the history file; run again: only that configuration is extracted.
6. **Folder argument** — `cd polldata` then `npm run extract-all-polldata .`: the same folder is used (relative to
   where the command was typed).
7. **Errors** — `npm run extract-all-polldata a b` prints the usage error; `npm run extract-all-polldata nowhere`
   prints the directory error; both exit 1 and extract nothing.
8. **Then populate** — `npm run populate-all-polls`: the re-extracted files whose contents changed are populated again.
