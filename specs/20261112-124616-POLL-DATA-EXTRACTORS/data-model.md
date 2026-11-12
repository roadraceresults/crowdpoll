# Data Model: Poll Data Extractors

The database does not change. The entities are files, in htmlparser's formats, unchanged.

## Configuration file (`<name>.yaml`, input)

| Key | Required | Meaning |
|---|---|---|
| `graph_title` | yes | The chart's title as the page shows it, used to find the chart |
| `input_html` | yes | The saved page (`.html`), relative to the configuration file's folder |
| `input_history` | `extract-polymarket` and `extract-politico` (optional for `extract-all`) | The saved price history (`.har`), relative to the configuration file's folder; POLITICO only records it and never opens it |
| `url` | `extract-politico` (optional for `extract-all`) | The page's address, carried into the poll data file |
| `output_json` | yes | The poll data file to write (`.json`), relative to the configuration file's folder |
| `type` | no | One of `cnn line graph`, `polymarket line graph`, `politico line graph` or `polymarket yes no` (case-insensitive). When it is absent, `extract-all` detects the kind |
| `title`, `subtitle` | no | Replace the poll's title and subtitle |

Each command accepts only its own keys: `extract-cnn` accepts no `url` or `input_history`.

Validation (htmlparser's, kept):
- An unknown key, a missing required key or an empty value is an error that names the key.
- An `output_json` equal to `input_html` or `input_history` is refused.
- A `type` of another kind is refused by the four kind-specific commands.

## Poll data file (`<output>.json`, output)

The JSON that the populate commands read. It holds:
- the title;
- the subtitle (default `Poll for Demonstration`);
- the creator email (default `devadmin01@crowdpoll.vote`);
- the vote count (default `1000`);
- optionally, the page kind and address;
- the choice labels and the dated data points.

The file is written atomically: first to a temporary file, then renamed. For the same inputs, its content must equal
htmlparser's (FR-003).

## Relationships

One configuration file names one saved page, plus one price history for a Polymarket line graph. Extraction writes
one poll data file from it. `npm run populate-poll` turns that file into one poll, and `npm run populate-all-polls`
does the same for a folder of them.
