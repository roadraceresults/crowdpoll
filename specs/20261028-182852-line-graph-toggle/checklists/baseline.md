# Baseline: before feature 20261028-182852-line-graph-toggle

Recorded from a clean checkout of the feature's starting commit `cfd97ff`, before any change of this feature.

| Check | Result |
|---|---|
| `npx tsc --noEmit` | exit 0, no errors |
| `npm test` (`vitest run`) | 1 test file failed, 131 passed, 1 skipped; 1 test failed, 1807 passed, 15 skipped |

Pre-existing failure, unrelated to this feature:

- `tests/client-maximized.test.ts` › maximizing and restoring › shows both the Maximize icon and the Watch control on a Shared With You card

Any later failure of this test is not caused by this feature; any other failure is.
