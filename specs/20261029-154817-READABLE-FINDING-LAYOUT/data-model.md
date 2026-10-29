# Data Model: Readable Finding Layout

Nothing is stored in a database or settings file.
The "data" is the Markdown in `requirements-report.md`, read and written by the skill; `.specify/requirements.json` is unchanged.

## Report

| Attribute | Meaning |
|---|---|
| form | `old` or `new`; read from the Accept lines each time (`contracts/finding-layout.md` L3.5), never stored |
| findings | in document order, grouped under Inconsistencies, Ambiguities, Unspecified Aspects, Needs Clarifications and Research Results |

## Finding

| Attribute | Rule |
|---|---|
| id | `(IN|AM|UA|NC|RS)` + number, unique in the report |
| title | the text after `<id>. ` in the bold title line |
| explanation | block-quoted lines (new form) or plain lines (old form) |
| options | one or more Recommendations, then one Developer Resolution |
| state | `open` or `resolved`, from the `✅ Resolved` line only |
| marker | `❌ NOT Resolved` line, new form only, present exactly when open (kept in step by "Next") |
| resolution record | when resolved: the requirements line and the `**Notes**:` line |

## Option

| Attribute | Rule |
|---|---|
| label | `Recommendation` (single), `Recommendation A`, `B`, … (several), or `Developer Resolution <next letter>` |
| recommended | at most one of several Recommendations, `_(recommended)_` |
| box | ticked / unticked (L3.1) |
| accept line text | open: `Accept (To Accept …)`; resolved: `Accepted` (chosen) or `Not Accepted` (others) |
| developer text | Developer Resolution only: lines under it other than the instruction line |

## State transitions (one finding, new form)

```text
open, nothing ticked ──developer ticks one──▶ open, one ticked ──"Next"──▶ resolved
open, nothing ticked ──"Accept", "Accept <ID>[, X]", "Accept all" (single option)──▶ resolved
open, one ticked ──"Accept <ID>, Y" (Y ≠ ticked)──▶ resolved with Y, the other tick cleared
open, two or more ticked ──"Next"──▶ unchanged, the developer is asked to keep one
resolved ──any command──▶ unchanged ("Accept <ID>" says it is already resolved), except that "Next" removes a stray ❌ line (FR-011)
```

On entering `resolved`: the marker is removed, the record is written, the chosen box becomes `[X] ➡️ **Accepted**`, the others `[ ] ➡️ **Not Accepted**`, and the instructions are removed.
