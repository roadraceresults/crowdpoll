# Overview: `specs/022-BAR-COLORS`

## Document History

| Record | Value |
|---|---|
| Feature directory | `specs/022-BAR-COLORS` |
| Fix file created | 2026-09-25 12:51 |
| Last updated | 2026-09-25 14:05 |

Legend: `[ ]` open · `[X]` resolved · `[-]` resolved manually (or accepted as-is) by the developer.
Tick `No Tests` to postpone this fix's automated tests; leave it empty to have them written and run as usual.

"What's next" always returns the first `[ ]` item below.

The developer is expected to create the individual fix requirements in this file, and then run the `/speckit-fix` command to have the AI implement them, one at a time.  
Each fix requirement initially carries an empty checkbox; tick it when the item is resolved or consciously accepted.  


# Fixes

## FIX01 Show the starting color index on the Poll Card
[X] Resolved
[ ] No Tests
For validation, render the starting color index anywhere on the Poll Card, to check that it is distributed relatively evenly across the 0-49 range.

### RESOLUTION
- `src/public/pollCard.js`: the front face's `.card-foot-row` gains `<p class="palette-start">` between the vote count and "you voted"; `initPollCard` writes `Color index <n>` into it once, from the card's `paletteOffset` (0–49, the array index; the requirements' 1-based colour is n + 1).
- `src/public/site.css`: `.palette-start` takes the muted small type of the card-foot lines.
- `tests/client-bar-colours.test.ts`: "starts different polls at different entries" also asserts `Color index 40` and `Color index 21` for `poll-colours-a` / `poll-colours-b`.
- Full suite: 44 files passed, 1 skipped / 691 tests passed, 15 skipped; build clean, 23 assets.
- Artifacts: none changed. The label is a validation aid outside the spec; if it is to stay, the spec and the 022 UI contract need a line for it, and if it is to go, remove the element, the one line in `initPollCard`, the CSS rule and the two assertions. (2026-09-25 13:08)

## FIX02 Client-side Logging
[X] Resolved
[X] No Tests

On the client-side create a distribution of the starting color index across the 0-49 range, and log it to the console for each Poll Card rendered.  
The format of the log should be:  
Color Index 0 -> poll count n0  [id0-1, id0-2, id0-3, ...]
Color Index 1 -> poll count n1  [id1-1, id1-2, id1-3, ...]
Color Index 2 -> poll count n2  [id2-1, id2-2, id2-3, ...]
Color Index 3 -> poll count n3  [id3-1, id3-2, id3-3, ...]
...continue up to Color Index 49.


### RESOLUTION
Option B (one table per batch of rendered cards, each poll counted once, cumulative since page load).
- `src/public/pollCard.js`: a page-wide `pollIdsByPaletteStart` (index → set of poll ids); `window.PollCard.mount` calls `recordPaletteStart(pid)` for every card it mounts, which adds the id under `paletteOffsetFor(pid)` and schedules one `setTimeout(logPaletteDistribution, 0)` unless one is pending; `logPaletteDistribution()` prints 50 `console.log` lines, `Color Index <i> -> poll count <n>  [<id>, <id>, …]`, for i = 0 … 49.
- `tests/client-bar-colours.test.ts`: new case "logs one 50-line colour index distribution per batch of rendered cards, counting each poll once" (mounts `poll-colours-a` once and `poll-colours-b` twice, expects 50 lines, `Color Index 40 -> poll count 1  [poll-colours-a]` and `Color Index 21 -> poll count 1  [poll-colours-b]`).
- Tests postponed by the developer (No Tests); the new case was written but not run, so the fix is unverified by a run. `tsc --noEmit` and `node --check src/public/pollCard.js` pass.
- Artifacts: none changed. Like FIX01, this is a temporary validation aid outside the spec, and a deliberate exception to constitution V's minimal client logging; remove both together once the distribution is confirmed. (2026-09-25 13:25)


## FIX03 Test for Color Index Function
[X] Resolved
[X] No Tests
  
On the client-side, on PageLoad, create a test that generated 200 guids and calls the function that generates the a RESULT for each guid.  
Accumulate the RESULTs in an array where the index of the array is the result of the function. 
Then log to the console, the distribution of the RESULTs across the 0-49 range.  
If a result  is < 0 or > 49, log an error message to the console.
The format of the log should be:  
```
TEST: Index Distribution for 200 guids
Result 0 -> GUID Count 0  [id0-1, id0-2, id0-3, ...]  
Result 1 -> GUID Count 1  [id1-1, id1-2, id1-3, ...]  
Result 2 -> GUID Count 2  [id2-1, id2-2, id2-3, ...]  
Result 3 -> GUID Count 3  [id3-1, id3-2, id3-3, ...]
...continue to Result 49.
```

### RESOLUTION
- `src/public/pollCard.js`: `randomGuid()` builds a version-4 GUID from `crypto.getRandomValues` (available outside secure contexts, unlike `crypto.randomUUID`). `logRandomIdIndexDistribution(count)` calls `paletteOffsetFor` for each of `count` GUIDs, accumulates them in `guidsByResult` (50 arrays, indexed by result), logs `console.error('TEST: Result <r> for <guid> is outside 0-49')` for any result that is not an integer in 0–49, then logs `TEST: Index Distribution for <count> guids` and 50 lines `Result <i> -> GUID Count <n>  [<guid>, …]`. `window.addEventListener('load', …)` runs it with 200 on every home-page load. FIX02's per-render table is unchanged.
- `tests/client-bar-colours.test.ts`: new case "logs the index distribution of 200 random guids, with no result outside 0-49" (no errors; 51 lines; header; each line's count equals its listed GUIDs, all version-4; counts sum to 200).
- Tests postponed by the developer (No Tests); the new case was written but not run, so the fix is unverified by a run. `tsc --noEmit` and `node --check src/public/pollCard.js` pass.
- Artifacts: none changed. A temporary validation aid like FIX01 and FIX02; remove the three together once the distribution is confirmed. (2026-09-25 13:43)

## FIX04 Remove Test Logging
[X] Resolved
[X] No Tests

The testing proves that the index generating function distrubutes well across the 0-49 range.
Remove the test logging from the client-side code, and remove the starting color index from the Poll Card.

### RESOLUTION
Everything FIX01–FIX03 added is removed; the colour code (`paletteOffsetFor`, the offset through `renderPollResults`) stays.
- `src/public/pollCard.js`: removed the `.palette-start` element and the line in `initPollCard` that filled it (FIX01); `pollIdsByPaletteStart`, `paletteDistributionLogPending`, `logPaletteDistribution()` and `recordPaletteStart()`, with `window.PollCard.mount` back to `if (instance) pollCardInstances.push(instance);` (FIX02); `randomGuid()`, `logRandomIdIndexDistribution()` and the `load` listener (FIX03).
- `src/public/site.css`: removed the `.palette-start` rule; the file is again identical to `HEAD`.
- `tests/client-bar-colours.test.ts`: removed the FIX02 and FIX03 cases and FIX01's two `Color index` assertions; the seven feature cases remain, including "derives a stable start from the poll id", which checks the 0–49 spread over 1,000 ids.
- Checks: a grep for `palette-start`, `logPaletteDistribution`, `recordPaletteStart`, `randomGuid`, `logRandomIdIndexDistribution` and `pollIdsByPaletteStart` over `src/` and `tests/` finds nothing; `git diff --stat -- src` shows `src/public/pollCard.js` +18 −9 only, the same as after T017; `tsc --noEmit` and `node --check src/public/pollCard.js` pass.
- Tests postponed by the developer (No Tests); no suite was run, so the fix is unverified by a run. The code under `src/` is back to the state T017 ran green (691 passed).
- Artifacts: none changed; FIX01–FIX03 never entered the spec or contracts. (2026-09-25 13:54)

## FIX04 Run Tests
[X] Resolved
[ ] No Tests

I manually validated the webapp.
I forgot to run the test suite after the last fix.
Please run the test suite to ensure that everything is still passing.

### RESOLUTION
- `npm test`: 44 files passed, 1 skipped / 691 tests passed, 15 skipped, identical to T017's run. This also verifies FIX04 (Remove Test Logging), whose tests had been postponed.
- `npm run build`: clean, 23 fingerprinted assets.
- No code, test or artifact changed. (2026-09-25 14:05)
