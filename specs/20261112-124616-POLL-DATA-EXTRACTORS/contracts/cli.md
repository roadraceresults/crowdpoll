# Contract: Extraction Commands

Run each command from the repository root. Each takes exactly one argument: the configuration file
([data-model.md](../data-model.md)).

| Command | Extracts | Page kind check |
|---|---|---|
| `npm run extract-all <config.yaml>` | Any supported kind: the `type` when given, otherwise the detected kind. It announces the kind it used | none |
| `npm run extract-cnn <config.yaml>` | CNN line graph | `type`, when given, must be `cnn line graph` |
| `npm run extract-polymarket <config.yaml>` | Polymarket line graph (needs `input_history`) | `polymarket line graph` |
| `npm run extract-politico <config.yaml>` | POLITICO Poll of Polls | `politico line graph` |
| `npm run extract-polymarket-yes-no <config.yaml>` | Polymarket yes/no page | `polymarket yes no` |

## Outcomes

| Case | Output | Exit status |
|---|---|---|
| Success | Progress lines (`Read config …`, `Read page …`) and `Wrote <output_json>` on stdout; the poll data file is written | 0 |
| No argument, or more than one | `Usage: npm run <command> <config.yaml>` on stderr | 1 |
| Configuration error (an unknown, missing or empty key, or an output that would overwrite an input) | A message naming the key or file on stderr; nothing is written | 1 |
| Missing page or price history | A message naming the file on stderr; nothing is written | 1 |
| Chart not found or unreadable | A message saying why on stderr; nothing is written | 1 |
| Wrong kind for a kind-specific command | `type "<value>" is not supported by <command>; it extracts "<kind>"; use extract-all for other types` | 1 |

Every message is htmlparser's, word for word, except the usage line and `<command>`: both give the `npm run` form
(research R3). Paths are resolved against the configuration file's folder, wherever the command is run from.
