# CLI Contract: `extract-all-polldata`

```
npm run extract-all-polldata [<directory>]
```

| Argument | Rule |
|---|---|
| none | `<project root>/polldata` |
| `<directory>` | resolved from `INIT_CWD` (the folder the command was typed in), else the working directory |
| two or more | usage error |

## Output (stdout unless marked stderr)

Lines this command prints itself start with `[extract-all-polldata]`; `extract-all`'s own lines appear unchanged
between them.

| When | Line |
|---|---|
| each configuration skipped | `[extract-all-polldata] Skipped <file> (extracted <extractedAt>)` |
| each configuration extracted | `[extract-all-polldata] <file>: extracting`, then `extract-all`'s lines |
| a configuration failed (stderr) | `extract-all`'s `Error: <message>`, then `[extract-all-polldata] Error: <file>: <message>` |
| folder has no configuration | `[extract-all-polldata] No .yaml or .yml files in <dir>` |
| end of a run with configurations | `[extract-all-polldata] Done: <n> extracted, <n> skipped, <n> failed` |
| after `Done`, when any failed (stderr) | `[extract-all-polldata] Failed files:` then `[extract-all-polldata]   <file>: <message>` per failure |

## Errors before any extraction (stderr, status 1)

| Cause | Line |
|---|---|
| two or more arguments | `[extract-all-polldata] Error: Usage: npm run extract-all-polldata [<directory>]` |
| folder missing or unreadable | `[extract-all-polldata] Error: cannot read the directory <dir>: <reason>` |
| history unreadable | `[extract-all-polldata] Error: cannot read <history path>: <reason>` |

## Exit status

| Status | When |
|---|---|
| 0 | every configuration extracted or skipped, or none found |
| 1 | any configuration failed, or an error before any extraction |

## Unchanged

`npm run extract-all <config.yaml>` and the four kind-specific commands: same output, messages and status; they never
read or write the history.
