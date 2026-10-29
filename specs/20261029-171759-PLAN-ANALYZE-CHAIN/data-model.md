# Data Model: Plan Through Analyze Chain

Nothing is stored. The skill reads the feature's files, keeps a little state for one run, and writes nothing itself (the steps write their own files).

## Feature (read)

| Field | Source | Use |
|---|---|---|
| `FEATURE_DIR`, `FEATURE_SPEC`, `IMPL_PLAN` | `check-prerequisites.ps1 -Json -PathsOnly` | where the gate looks |
| planned | `IMPL_PLAN` exists | gate condition 1 |
| open markers | lines of `spec.md` holding `[NEEDS CLARIFICATION` | gate condition 2 |
| open clarification findings | `clarify-findings.md` sections (`### **<ID>**`) without `✅ Resolved` | gate condition 3; absent file = none |

## Gate result (one run)

- `passed`: all three conditions hold.
- `failures`: one entry per failed condition — `condition`, `open items` (marker lines or finding ids, may be empty), `next command`.

## Step (one run)

| Field | Values |
|---|---|
| `n` | 1–4 |
| `skill` | `speckit-plan`, `speckit-tasks`, `speckit-analyze`, `speckit-analyze-findings` |
| `args` | the command's argument for step 1; none for 2–4 |
| `expected output` | `plan.md`; `tasks.md`; a printed Specification Analysis Report; `analyze-findings.md` |
| `state` | not run → running → finished / failed |

## State transitions of a run

```text
start → gate
gate: failed  → stop (report failures; nothing run, nothing changed)
gate: passed  → step 1
step n: finished → step n+1 (n < 4) | end at the findings prompt (n = 4)
step n: failed   → stop (report step n, its error, steps 1..n-1 finished, n+1..4 not run)
```
