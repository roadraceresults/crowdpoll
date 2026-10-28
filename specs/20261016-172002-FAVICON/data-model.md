# Data Model: Site Favicon

No stored data, no schema change, no migration. The feature's "entities" are two static files.

## favicon.svg (scalable icon)

| Attribute | Value | Source |
|---|---|---|
| Location | `src/public/favicon.svg` | R1 |
| `viewBox` | `10 4.5 96 96` (square; figures span x 16–100, y 15–90) | R4, FR-006 |
| Background | none (transparent) | FR-006 |
| Title | `<title>CrowdPoll</title>`, first child | FR-007 |
| Content | red figure `#E04A4A` (circle `cx=73 cy=30 r=15`, body `M46 78 C46 58 58 49 73 49 C88 49 100 58 100 78 Z`) under a mask that cuts a 3.5-unit gap around the green figure; green figure `#3FB34F` (circle `cx=42 cy=42 r=13`, body `M16 90 C16 70 28 61 43 61 C58 61 70 70 70 90 Z`) | R4, FR-005 |
| Excluded | both speech-bubble paths of `.brand-logo` | NC1, FR-005 |

Copied from `.brand-logo` in `src/public/app.js`. A later change to the logo's figures must be repeated here, and the ICO then regenerated (architecture, Technical Debt).

## favicon.ico (traditional icon file)

| Attribute | Value | Source |
|---|---|---|
| Location | `src/public/favicon.ico`, generated | R5 |
| Header | reserved `0`, type `1` (icon), count `3` (6 bytes, little-endian) | R5 |
| Entries | 16 × 16, 32 × 32, 48 × 48, in that order; each 32 bpp, 1 plane, 0 colours | FR-002 |
| Images | PNG (RGBA, transparent background), rendered from `favicon.svg` | R5 |
| Produced by | `npx tsx devScripts/favicon-ico.ts` only | FR-008 |

## Lifecycle

`favicon.svg` is edited by hand → the script is run → both files are committed together. Nothing changes at runtime.
