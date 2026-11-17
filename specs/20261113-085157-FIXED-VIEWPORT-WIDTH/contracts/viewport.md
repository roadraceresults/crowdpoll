# UI Contract: the viewport rule

The feature has no API change. Its contract is what every page's head contains and what `viewportWidth.js` writes.

## V1. Every page's head (FR-003, FR-007, FR-009, FR-010)

For each of the 13 files in `src/public/*.html`:

- the line `<meta name="viewport" content="width=device-width, initial-scale=1">` is present, unchanged;
- the line `<script src="/viewportWidth.js"></script>` is present exactly once, without `defer`, `async` or
  `type="module"`;
- it comes after the viewport meta and before the first `<link rel="stylesheet">`, on the line after
  `<script src="/colorScheme.js"></script>`, which stays the page's first script.

## V2. The decision (FR-001, FR-002)

`heldWidth` is the screen's longer side in landscape and its shorter side in portrait.

| Screen sides | Orientation | `heldWidth` | Meta `content` after the script loads |
|---|---|---|---|
| 320 × 568 | portrait | 320 | `width=480` |
| 360 × 800 | portrait | 360 | `width=480` |
| 390 × 844 | portrait | 390 | `width=480` |
| 430 × 932 | portrait | 430 | `width=480` |
| 390 × 844 (reported as 390 wide, iOS style) | landscape | 844 | `width=device-width, initial-scale=1` |
| 844 × 390 (reported as 844 wide, Android style) | landscape | 844 | `width=device-width, initial-scale=1` |
| 568 × 320 | landscape | 568 | `width=device-width, initial-scale=1` |
| 479 × 900 | portrait | 479 | `width=480` |
| 480 × 900 | portrait | 480 | `width=device-width, initial-scale=1` |
| 768 × 1024 | portrait | 768 | `width=device-width, initial-scale=1` |
| 1920 × 1080 | landscape | 1920 | `width=device-width, initial-scale=1` |

Without `screen.orientation`, `window.orientation` of `90` or `-90` is landscape and anything else portrait.

## V3. Applying it again (FR-004)

- After `screen.orientation` fires `change`, `window` fires `resize`, or `window` fires `pageshow`, the meta holds the
  content V2 gives for the screen as it is then.
- Portrait 390 → landscape 844 → portrait 390 gives `width=480` → device content → `width=480`.
- An event that does not change the decision does not write the meta (no attribute mutation).

## V4. Text size adjustment (FR-015, research R5)

- While the content is `width=480`, the root element's inline style has `text-size-adjust: 100%` and
  `-webkit-text-size-adjust: 100%`.
- While it is the device content, the root element's inline style has neither.

## V5. What the script does not do (FR-005, FR-012, FR-014)

- It never writes `initial-scale`, `minimum-scale`, `maximum-scale` or `user-scalable` beside `width=480`.
- It makes no request, reads and writes no cookie or storage, defines no global, and logs nothing to the console.
- It reads no setting: the width is the constant 480.
