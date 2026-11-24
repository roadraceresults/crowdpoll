# Contract: Colours on the page

**Feature**: [../spec.md](../spec.md) | **Data model**: [../data-model.md](../data-model.md)

Each clause is checked in both schemes unless it names one.

## Tokens

- **C1** `m3-tokens.css` sets every alias of the data model's alias table for Light under
  `:root:not([data-theme="dark"])` and for Dark under `:root[data-theme="dark"]`, with the values listed. The legacy
  `:root` blocks of `tabs.css`, `pollCard.css` and `site.css` are not edited.
- **C2** The frozen roles keep their current values in both schemes (FR-012).
- **C3** No M3 layer gains a literal colour for this feature except through a role in `m3-tokens.css`
  (`m3-assets.test.ts` rule). The aliases set in `m3-tokens.css` (`--paper`, `--choice-*`, `--on-choice-selected`) and
  the per-row `--bar-*` properties count as tokens for the invariant "M3 layers hold only M3 tokens", as `--ink` and
  `--bar-track` already do in `pollCard-m3.css`.

## Page and card

- **C4** The page uses `--paper`, a card `--paper-raised` and a card's border `--line`. Card/page differ in tone; border
  contrasts at least 1.5:1 and below 3:1 with both (FR-011).

## Vote rows

- **C5** An unselected vote row has fill `--choice-unselected` and a 1 px border `--choice-edge`, compact rows included
  (FR-004).
- **C6** A selected vote row has fill `--choice-selected` and a 2 px border `--choice-selected`; its label, radio ring,
  radio dot and check mark use `--on-choice-selected` (FR-005, research R4).
- **C7** No vote row takes its choice's result colour; no selected-state colour is a `primary` role (FR-006).
- **C8** Selecting or unselecting a row changes only its row's look; the row's height and the label's position do not
  move by more than the 1 px border difference (the 2 px edge is drawn inside the row).

## Result bars

- **C9** Each row's fill, track and inks come from the derivation in the data model, for both schemes (FR-007, FR-009).
- **C10** The results graph's line for a choice equals that choice's drawn fill in the same scheme (FR-008).
- **C11** A creator-stored colour, the poll's palette offset and the Yes/No detection are unchanged (FR-010).
- **C12** The base palette is the fourteen entries of the data model, in order, with the three replacements.

## Other options

- **C13** Tabs, Settings radios, card-shell checkboxes, the admin search field and admin radios keep their current rules;
  their pairs are listed in the guideline and pass (research R9).

## Logo and icons

- **C14** The header logo's Light artwork is untouched; its Dark substitution rules in `header-tab-bar-m3.css` are
  untouched (FR-014). Icons drawn with `--md-sys-color-primary` keep that role (FR-013).
