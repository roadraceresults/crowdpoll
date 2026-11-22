# Quickstart: Color Contrast

**Feature**: [spec.md](spec.md) | **Contracts**: [contracts/colors.md](contracts/colors.md),
[contracts/guardrail.md](contracts/guardrail.md)

## Prerequisites

Node ≥ 22, `npm install`; development PostgreSQL as for any feature (`npm run dev`).

## Automated checks

```
npx vitest run tests/color-contrast.test.ts     # every guideline pair and frozen colour, both schemes; bar colours
npx vitest run tests/client-bar-colours.test.ts tests/client-line-colors.test.ts tests/m3-assets.test.ts
npx tsc --noEmit
npm test
```

Expected: all pass.

**Guardrail proof** (G5, G6; revert afterwards):
1. In `m3-tokens.css`, set the Light `--choice-edge` to `#C0C9C0` → `light: --choice-edge on --paper-raised ≥ 3` fails.
2. Change `--md-sys-color-primary` in Light → the frozen-colour test for it fails.
3. Rename `--choice-edge` in `m3-tokens.css` only → its rows fail as unresolved.

## By eye (SC-008), both schemes (Site Settings → Color scheme)

1. **Home grid**: cards stand apart from the page; each card's border is visible but light.
2. **Open poll, voting side**, single choice with 3 choices: every row has a visible edge; picking one turns it amber
   (dark amber with white text in Light, light amber with dark text in Dark) with a thicker edge and a visible dot;
   picking another moves it. Close the poll (or send the vote): the rows keep their edge and selected look and the
   labels stay readable. If a vote row can take keyboard focus (Tab), its focus outline is visible on both row states.
3. **Multiple choice with 50 choices** (populate script): compact rows keep their 1 px edge; checked rows are amber.
4. **Results side** of polls using palette colours, Yes/No, and a creator-stored black and white: every bar is visible
   on the card; Dark black draws mid grey; each bar's track is visible; text is legible on fill and track; the line
   graph's lines match the bars' colours.
5. **Settings, Profile, admin page, login, Privacy**: tabs, radios, checkboxes and the search field have clear edges;
   muted text is readable on the page.
6. **Logo and icons**: header logo unchanged in Light, black parts light in Dark; green icons unchanged.
7. Show steps 1, 2, 4 and 5 to the tester who reported the issue.

## Results

**2026-11-20, automated (all pass):**

- `npx tsc --noEmit`: no errors.
- `npm test`: 225 files, 3917 tests passed (27 skipped, as before the feature); baseline before the feature was
  224 files, 3804 tests.
- `npm run build`, then `npm run test:built`: 59 client files, 1033 tests passed on the obfuscated `dist/public`.
- `tests/color-contrast.test.ts`: 111 tests — 16 frozen-colour checks, 21 required pairs in both schemes, and every
  palette, Yes/No and creator colour's fill (≥ 3), track (≥ 1.5), ink on track (≥ 7) and ink on fill (≥ 4.5) in both
  schemes, plus the ΔE 13 palette rule.
- **Guardrail proof**: (1) Light `--choice-edge` set to `#C0C9C0` → `light: --choice-edge on --paper-raised ≥ 3`
  failed; (2) Light `--md-sys-color-primary` changed → `light: --md-sys-color-primary stays #2C6A46` failed;
  (3) `--choice-edge` renamed → "names only roles that resolve in their schemes" and both `--choice-edge` rows failed.
  `m3-tokens.css` restored byte for byte after each.
- **T020 finding**: the graph was not always on the card colour (desktop Dark side panel `#0F1511`; phone layout on
  the page). Both now draw on `--paper-raised`, so `lineGraph.js` is unchanged and its lines equal the bars' fills.

**By eye (steps 1–7): not yet done.** They need a person at a browser in both schemes, and step 7 needs the tester.

## Comparing tweak iterations

Each `/speckit-tweak` iteration is a commit tagged `color-contrast-TWEAK<nn>` (local tags):

```
devScripts/tweak.ps1 save 2 "Deeper amber"   # commit the working tree as TWEAK02 and tag it
devScripts/tweak.ps1 list                    # the saved iterations
devScripts/tweak.ps1 show 1                  # TWEAK01 on http://localhost:8081, beside the current one on 8080
devScripts/tweak.ps1 stop 1                  # remove TWEAK01's worktree
```

`show` checks the tag out into `C:\crowdPoll\color-scheme-TWEAK<nn>`, shares this worktree's `node_modules` and starts
a copy of the local `launch-dev.ps1` on the chosen port (`-Port`), on the same development database.
