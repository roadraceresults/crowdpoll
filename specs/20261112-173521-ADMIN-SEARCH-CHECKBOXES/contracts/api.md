# Contract: `GET /api/admin/polls/search` (two new parameters)

Administrators only (`requireAdmin`; others `403`), unchanged. Every other parameter, the response shape
(`{ polls, truncated }`), the order (newest first) and the cap are unchanged.

| Parameter | Values | Meaning |
|---|---|---|
| `lineGraphEnabled` | `true`, or missing/blank | `true`: only polls whose line graph is on |
| `customColors` | `true`, or missing/blank | `true`: only polls with at least one choice whose color was picked by hand |

- **A1**: both missing → the same result as today for the same other parameters.
- **A2**: `lineGraphEnabled=true` → every returned poll has `line_graph_enabled` true.
- **A3**: `customColors=true` → every returned poll has at least one saved choice with a color; `pending_update` is
  not considered.
- **A4**: both, and any other filter → ANDed.
- **A5**: any other value (e.g. `false`, `1`, `yes`) → `400 { "error": "Invalid <name> \"<value>\"; expected true." }`.
- **A6**: `postman/openapi.json` lists both parameters (`schema: { type: string, enum: ["true"] }`).
