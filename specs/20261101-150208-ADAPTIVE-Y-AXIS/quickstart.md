# Quickstart: Adaptive Y Axis for the Line Graph

## Prerequisites

- The development server runs (`devScripts/launch-dev.ps1`), signed in as an administrator.
- `ENV_LINE_GRAPH_MIN_VOTE_PERCENTAGE` is `0` or `1`.

## 1. Automated checks

```bash
npx tsc --noEmit
npx vitest run tests/line-graph-ui.test.ts
npm test
```

Expected: all pass; the new cases cover each top (C1), its labels (C2), the unchanged tooltip, a scale switch and the
no-line case (C3).

## 2. Each top in the browser

Create polls with **Show the line graph** on, publish them, and vote from test accounts (or use
`devScripts/populate/populate-poll.ts` with a file whose shares stay in range):

| Poll | Votes | Expected Y labels |
|---|---|---|
| A, 4 choices | one vote on each, in the same hour | 0, 5, 10, 15, 20, 25% |
| B, 2 choices | one vote on each, in the same hour | 0, 10, 20, 30, 40, 50% |
| C, 2 choices | three votes on one, one on the other | 0, 15, 30, 45, 60, 75% |
| D, 2 choices | one vote | 0, 25, 50, 75, 100% (as before) |

Maximize each and check the labels, that the highest line reaches the top gridline when its share equals the top,
and that the tooltip shows the real shares.

## 3. Redraws

- Switch the time scale on a poll whose older history peaks higher: the labels change with the scale.
- Leave a graph open and add votes that push a share over the top: within `ENV_LINE_GRAPH_REFRESH_INTERVAL` the axis
  steps up; the crosshair, if shown, stays at its time.
- Resize the window: the axis keeps its top.

## 4. Contract

```bash
grep -n "chosen per draw" specs/20261027-151601-POLL-LINE-GRAPH/contracts/ui-contracts.md   # 1 (C4)
```
