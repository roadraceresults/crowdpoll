# Contract: Guideline and its test

**Feature**: [../spec.md](../spec.md) | **Research**: [../research.md](../research.md) R10–R12

## Guideline document

- **G1** `COLOR-CONTRAST.md` at the project root, with these sections in order: purpose and standard (WCAG 2.2 AA plus
  the house rules); **Frozen colours**; **Required pairs**; **Result colours** (the derivation of the data model in
  prose); **Techniques** (the five levers of the requirements, RS3); **Change log** (this feature's before → after values
  for every changed alias and palette entry).
- **G2** **Required pairs** is one Markdown table with the columns `Foreground | Background | Minimum | Schemes | Why`;
  roles are written as custom-property names in backticks (`--choice-edge`), a minimum as `3`, `4.5`, `7`, `1.5` or a
  range `1.5–<3`, schemes as `both`, `light` or `dark`. It lists at least: text on page, card, vote row and selected row;
  vote-row edge on card; selected fill on unselected fill; card border on card and on page; card on page (tone, no
  minimum); tab text and indicator on page; radio/checkbox ring on card; admin search border on card.
- **G3** **Frozen colours** is one Markdown table `Role | Light | Dark` listing the frozen roles with their values, plus
  the Yes colour.
- **G4** `CLAUDE.md` gains one line under *Cross-feature invariants*: a colour change keeps every pair in
  `COLOR-CONTRAST.md` and its frozen colours; `tests/color-contrast.test.ts` checks them.

## Test

- **G5** `tests/color-contrast.test.ts` parses G2 and G3 from `COLOR-CONTRAST.md`, resolves each role per scheme from
  `m3-tokens.css` (research R11), and has one test per row and scheme, named after the pair (e.g.
  `light: --choice-edge on --paper-raised ≥ 3`), so a failure names the pair or the colour.
- **G6** A row whose role cannot be resolved fails the test (a renamed role cannot silently drop a check).
- **G7** The same file checks, through `window.PollCard` in jsdom, every base palette entry, Yes/No, and the creator
  swatches `#FFFFFF`, `#000000`, `#FFFF00`, `#E0E0E0`, `#E3E335` in both schemes: fill ≥ 3:1 on the card, track
  ≥ 1.5:1, ink on track ≥ 7:1, ink on fill ≥ 4.5:1; and the ΔE rule over the lifted base palette.
- **G8** The test needs no network and no database; it runs in `npm test` and `npm run test:built`'s client set is
  unaffected (it reads source files).
