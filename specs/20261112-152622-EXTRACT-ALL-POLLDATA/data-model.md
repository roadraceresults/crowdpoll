# Data Model: Extract All Poll Data

Files only; no database table, migration or setting.

## Configuration file (existing, unchanged)

A `.yaml` or `.yml` file directly in the folder, in the format of `extract-all` (Poll Data Extractors data-model.md):
a YAML list of single-key settings (or one mapping). This feature reads only three of its keys, for the fingerprint:

| Key | Use here |
|---|---|
| `input_html` | the saved page, resolved from the configuration's folder; part of the fingerprint |
| `input_history` | optional price history, resolved the same way; part of the fingerprint when present |
| `output_json` | the poll data file written by `extract-all`; recorded in the history entry |

## Extraction history (`devScripts/extract/extract-all-polldata-history.json`)

Git-ignored (by `devScripts/extract/*`). Pretty-printed JSON (2 spaces) with a final newline.

```json
{
  "entries": [
    {
      "directory": "C:\\crowdPoll\\main\\polldata",
      "file": "netflix_show.yaml",
      "sha256": "…64 hex digits…",
      "outputJson": "C:\\crowdPoll\\main\\polldata\\netflix_show.json",
      "extractedAt": "2026-11-12T20:15:03.120Z"
    }
  ]
}
```

| Field | Type | Rule |
|---|---|---|
| `directory` | string | the folder's real on-disk path, `fs.realpathSync.native(dir)`, so every form of the same folder (letter case, `..`, a symlink) gives the same value (U1) |
| `file` | string | the configuration's file name, as listed |
| `sha256` | string | fingerprint (research R3) at the time of the successful extraction |
| `outputJson` | string | absolute path of the configuration's `output_json` |
| `extractedAt` | string | ISO 8601 time the extraction finished |

- **Identity**: (`directory`, `file`). At most one entry per pair; a new success replaces the old entry.
- **Skip rule**: an entry with the same identity and the same `sha256` as the current fingerprint → skipped. No
  fingerprint (research R3) → never skipped.
- **Lifecycle** (per configuration): *new* (no entry) → *extracted* (entry written on success) → *changed* (inputs
  edited, fingerprint differs) → *extracted* again. A failure writes nothing, so an earlier entry stays. Removing the
  entry by hand returns the configuration to *new*. Entries of configurations that no longer exist are kept and are
  harmless.
- **Read errors**: missing file → empty history; not JSON or no `entries` array → the run stops before extracting.

## Poll data file (existing, unchanged)

Written by `extract-all` at `output_json`; byte-identical to a single `npm run extract-all <configuration>` run. Since
TWEAK01 it carries `oldest_age_in_days: 365` after `type` and `url`.
