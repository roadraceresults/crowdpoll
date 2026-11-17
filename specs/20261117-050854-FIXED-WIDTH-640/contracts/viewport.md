# UI Contract: the viewport rule with two fixed widths

No API change. This contract replaces V2 and V5 of `specs/20261113-085157-FIXED-VIEWPORT-WIDTH/contracts/viewport.md`;
its V1 (every page's head) is unchanged and still holds.

## V1. The decision (FR-001 to FR-004)

`heldWidth` is the screen's longer side in landscape and its shorter side in portrait.

| Screen sides | Orientation | `heldWidth` | Meta `content` (not iOS) |
|---|---|---|---|
| 320 × 568 | portrait | 320 | `width=480` |
| 390 × 844 | portrait | 390 | `width=480` |
| 479 × 900 | portrait | 479 | `width=480` |
| 480 × 900 | portrait | 480 | `width=device-width, initial-scale=1` |
| 481 × 900 | portrait | 481 | `width=640` |
| 540 × 720 | portrait | 540 | `width=640` |
| 600 × 960 | portrait | 600 | `width=640` |
| 639 × 900 | portrait | 639 | `width=640` |
| 640 × 900 | portrait | 640 | `width=device-width, initial-scale=1` |
| 320 × 568 (reported 320 wide, iOS style) | landscape | 568 | `width=640` |
| 568 × 320 (reported 568 wide, Android style) | landscape | 568 | `width=640` |
| 390 × 844 (iOS style) | landscape | 844 | `width=device-width, initial-scale=1` |
| 844 × 390 (Android style) | landscape | 844 | `width=device-width, initial-scale=1` |
| 768 × 1024 | portrait | 768 | `width=device-width, initial-scale=1` |
| 1920 × 1080 | landscape | 1920 | `width=device-width, initial-scale=1` |

Without `screen.orientation`, `window.orientation` of `90` or `-90` is landscape and anything else portrait.

## V2. Applying it again (FR-005)

- After `screen.orientation` fires `change`, `window` fires `resize`, or `window` fires `pageshow`, the meta holds the
  content V1 gives for the screen as it is then.
- 320 × 568: portrait → landscape → portrait gives `width=480` → `width=640` → `width=480`.
- 390 × 844: portrait → landscape → portrait gives `width=480` → device content → `width=480`.
- 600 × 960: portrait → landscape (960) → portrait gives `width=640` → device content → `width=640`.
- An event that does not change the decision does not write the meta (no attribute mutation).

## V3. Text size adjustment (FR-006)

- While the content is `width=480` or `width=640`, the root element's inline style has `text-size-adjust: 100%` and
  `-webkit-text-size-adjust: 100%`.
- While it is the device content, it has neither.

## V4. iOS (FR-006, FR-007)

- On iOS (`iPhone`, `iPod` or `iPad` in the user agent) the fixed content is
  `width=<W>, maximum-scale=<S>`, with `S = ceil(heldWidth / W × 10000) / 10000` and `W` the fixed width in force:
  568 held → `width=640, maximum-scale=0.8875`; 390 held → `width=480, maximum-scale=0.8125`.
- On every other browser the fixed content is `width=<W>` alone.

## V5. What the script does not do (FR-022)

- It never writes `initial-scale`, `minimum-scale` or `user-scalable` beside a fixed width.
- It makes no request, reads and writes no cookie or storage, defines no global, and logs nothing to the console.
- It reads no setting: the widths are the constants 480 and 640.
