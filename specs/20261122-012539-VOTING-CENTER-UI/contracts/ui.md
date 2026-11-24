# UI Contract: Voting Center

**Feature**: [../spec.md](../spec.md) | **Research**: [../research.md](../research.md) |
**Data model**: [../data-model.md](../data-model.md)

The only interfaces this feature changes are what a poll card shows and how it responds. No HTTP route, payload or
address changes (R1). Each item is checked by the client suites named in research R19.

## Buttons

- **V1. Front action row**: `.vote-btn` (label "Cast Your Vote") is the row's first child and sits at the left; `.live-link`
  ("Live Results") follows at the right, and keeps the right edge when `.vote-btn` is hidden (R12, FR-001).
- **V2. Cast label**: `.submit-vote-btn .btn-vote-label` reads "Cast this vote" with 0–1 ticked, "Cast these votes" with
  ≥ 2, "Remove vote" when an empty selection removes a held vote (R11, FR-002).
- **V3. Back action row**: `.submit-vote-btn` is left of `.back-btn` (R12, FR-003).
- **V4. Phone vote bar**: `#voteBar` children in order `.vote-bar-submit`, `.vote-bar-count`, `.vote-bar-back`; the submit
  text equals the card's Cast label (R12, FR-004).
- **V5. Width**: `.vote-btn` and `.submit-vote-btn` keep the width today's sizer labels give them; the visible label is
  never clipped (`scrollWidth <= clientWidth`), shrinking to 9px before wrapping (R11, FR-005).

## Add-your-own row

- **V6. Removed**: no `.add-choice-btn`, no `.add-choice-dialog`, no `window.AddChoiceDialog`, no `/addChoiceDialog.js`
  (R10, FR-006).
- **V7. Presence**: `li.add-own-item` is the last child of `.results-list` and of `.voting-list` exactly when
  `showsAddOwnRow()`; otherwise it is absent or `hidden` (R3, FR-007).
- **V8. Field**: `input.add-own-input` with `type="text"`, `autocomplete="off"`, `enterkeyhint="enter"`,
  `maxlength=choiceLabelMax`, `aria-label="Add your own choice"`, `aria-describedby` → the face's `.add-own-support`;
  placeholder per R8; no checkbox or radio in the row (FR-008, FR-009).
- **V9. Size**: the row's height equals the face's bar height and it spans the list's width; bars are sized for one more
  bar; a compact results face fits one fewer result before "More choices" (R4, FR-010).
- **V10. Enter**: with valid text, `POST /api/polls/:pid/choices { label: trimmed }` is sent once; on 200 the choice is the
  last in `poll.choices`, the field is empty and focused, the ticks are unchanged, the new choice is unticked, and an
  `.m3-snackbar` reads "Choice added" (R7, FR-011, FR-015). When the addition brings the poll to `maxChoices`, the row
  is hidden and focus is on the face's primary button (Cast / `.vote-btn`) if shown and enabled, else `.maximize-btn`.
- **V11. Checks**: counter "n / max" while text is present; pasted line breaks → spaces, cut at max; empty or duplicate →
  no request (the duplicate message shows while typing); Escape → empty field (FR-012, FR-014).
- **V12. Refusal**: the support line shows the R7 message in the error colour, `aria-invalid="true"`, text and focus kept
  (FR-013).
- **V13. Results face**: a click or tap in the row changes neither `is-flipped` nor the maximized state; after an addition
  the card stays on its results face and the new choice shows at 0% in its place (FR-016).
- **V14. Every copy**: a choice added from any copy of a card appears on every mounted copy and the maximized view
  (`Tabs.applyAddedChoices`, unchanged) (FR-017).
- **V15. Live updates**: an `applyPoll` (new counts, another voter's choice) while the row holds text and focus leaves the
  same `input` element in the document with the same value, selection and focus; so does a grid reorder (R2, R18,
  FR-025). A compact Voting Center that no longer fits is not turned back while its row has focus or text. Flip,
  maximize and minimize clear the text.

## Long ballots

- **V16. Top row**: in a maximized card, desktop layout, `poll.choices.length >= 10`: `.top-divider` and
  `.actions--top` are shown after the back face's title; otherwise both are hidden (R13, FR-018).
- **V17. In step**: `.top-submit-btn` has the bottom Cast button's label, `disabled` and `hidden`; clicking it casts as
  the bottom one does; `.top-back-btn` flips back; the top row precedes the bottom in tab order (FR-019).
- **V18. Help line**: `.multi-help` "You may select more than one choice." follows each shown back-face action row on a
  Multiple-Choice poll, right-aligned, bold, upright, on-surface colour; never on a Single-Choice poll, and never in
  the phone `#voteBar` (R14, FR-020).

## Follow

- **V19. Back-face Follow**: a maximized card's back `.question-row` shows `.share-btn`, `.bookmark-btn`,
  `.maximize-btn` in that order; the back `.bookmark-btn` shows when the front's does, shares `aria-pressed`, and is not
  displayed on a compact card (R15, FR-021).
- **V20. Wording**: `title` "Follow this Poll" / "Stop following this Poll"; `aria-label` "Follow" / "Following"; tab
  label "Following"; reason "You are following"; empty texts and the cap modal speak of following (R16, FR-022).
- **V21. Names kept**: `/?tab=watching…` still selects that tab; `data-tab="watching"`, `bookmark` routes and fields are
  unchanged (FR-023, SC-006).

## Who Voted

- **V22.** Both orders' third heading is "Vote Cast Date" (R17, FR-024).
