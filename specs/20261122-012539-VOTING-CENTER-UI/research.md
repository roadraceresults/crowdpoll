# Research: Voting Center

**Feature**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md) | **Date**: 2026-11-23

Every decision below was checked against the code as it stands on branch `voting` (`src/public/pollCard.js`,
`tabs.js`, `addChoiceDialog.js`, `whoVoted.js`, `index.html` and the `*-m3.css` layers). Spec requirements are
cited as FR-nnn; the requirements report's resolutions as (AM1), (UA2) and so on.

## R1. A client-only change

- **Decision**: Every requirement is met in `src/public/`. `POST /api/polls/:pid/choices`, the vote route, the bookmark
  routes, payloads, tables, routes and `postman/openapi.json` are unchanged.
- **Rationale**: The server already checks who may add a choice, duplicates (`normalizedChoiceKey`), the maximum number
  of choices (`choicesFullError`), the label length and the add rate (429). Its answer
  (`{ choices, contentVersion }`) already updates every copy of a card (`tabs.js` `applyAddedChoices`).
- **Alternatives considered**: A server-side "Choice added" event, rejected because the existing answer already
  carries everything the cards need.

## R2. One add-your-own row builder, a persistent element per face

- **Decision**: `pollCard.js` gains one builder, `createAddOwnRow(face)`. It returns an `<li class="add-own-item">`
  holding an `<input class="add-own-input">` and a counter `<span class="add-own-counter">`. It also returns a support
  line `<p class="add-own-support" aria-live="polite">`, which goes directly under the face's bar area: after
  `.results-scroll-wrap` on the front, and after `.voting-scroll-wrap` (before `.poll-vote-error`) on the back.
  - Each card builds the row once per face, on first need, and keeps it.
  - `renderPollResults` and `renderVotingOptions` today clear their lists with `list.innerHTML = ''`. They will instead
    remove every child except `.add-own-item`, insert the new rows before it, and append the item when it is missing.
  - The in-place results path counts the item in its child-count check.
- **Rationale**: FR-025 requires that a live update keeps the typed text, the caret and the focus. Re-creating or
  re-appending the input would lose all three. A node that never leaves the document keeps them without any
  save-and-restore code.
- **Alternatives considered**:
  - Saving and restoring the value and selection around each render: more code, and the field still blurs, so screen
    readers re-announce it.
  - Holding live updates while the row is in use (clarification option B): rejected by the developer.

## R3. Who sees the row

- **Decision**: `showsAddOwnRow()` is `mayAddChoice() && poll.choices.length < maxChoices && !isEditing() &&
  !poll.notPublished`, using today's `mayAddChoice()` unchanged and `opts.choiceBounds.maxChoices`.
  - It applies to both faces, compact and maximized, on every tab (the Search and Live Results tabs included), and on
    the `/poll/<pid>` card (FR-007).
  - It is evaluated in `render()`. A hidden row keeps its element, with `hidden` set and its text cleared.
- **Rationale**: (UA2): one rule for every face; a row that cannot be used is hidden, not refused. `mayAddChoice()`
  already excludes guests, Public polls, polls that are not `OPEN`, blocked viewers and a final vote (the creator
  excepted).
- **Alternatives considered**: Hiding the row on the Search tab, where Vote is hidden. Rejected because FR-007 says
  every tab.

## R4. The row is one bar when the bars are sized

- **Decision**:
  - **Bar sizing**: both renderers take an `addOwn` flag. The layout is computed for `count + (lastRow ? 1 : 0) +
    (addOwn ? 1 : 0)`, and the row gets the bar height (phone layout: `PHONE_BAR_HEIGHT` on the front,
    `PHONE_VOTE_ROW_HEIGHT` on the back).
  - **Compact results face**: `fitting()` reserves one more place (`places - 1 - addOwn`, and `places - addOwn` when no
    "More choices" row is needed) (FR-010).
  - **Compact ballot**: `ballotOpensMaximized()` compares `data.length + addOwn` with `capacity(votingWrap)`. A ballot
    that only fits without the row now opens maximized, where the row is shown. `render()`'s forced turn-back of a
    compact Voting Center that no longer fits is skipped while the voting row's input has focus or text, so it happens
    at the first render once the row is both left and empty; until then the bars are drawn at the floor height (FR-025).
  - **Maximized and phone views** use `essential()`. The row is added after "Show all"/"Show fewer" and does not change
    how many choices are essential.
  - The results render signature gains the flag, so showing or hiding the row rebuilds the rows.
- **Rationale**: (UA2): "it counts as one bar, so one fewer result may fit before More choices". (IN1): "the bars
  shrink to make room" holds for every face.
- **Alternatives considered**: A row outside the bar area. Rejected because the requirements make it the last bar,
  with the same size as the others.

## R5. Order inside the lists

- **Decision**: The results list holds the result rows, then "More choices" or "Show all …" when shown, then the
  add-your-own row. The voting list holds the choices in ballot order, then the add-your-own row.
- **Rationale**: (NC2): Requirement 7's bar is the add-your-own row, after "More choices".

## R6. The row on the results face only focuses

- **Decision**: The `resultsList` click handler returns first when `event.target.closest('.add-own-item')`. The row
  carries no `result-row` class, so the bar-click rule and the pointer cursor rule
  (`.card-front:has(.vote-btn…) .result-row`) never apply to it. The `votingList` handler already ignores anything that
  is not `.vote-row`.
- **Rationale**: (UA8) and FR-016: a click or tap only focuses the field. Escape inside an input already does not
  minimize (`tabs.js:1520` skips `INPUT` targets).

## R7. Adding a choice

- **Decision**: On Enter, the row calls today's `saveChoice(label)` with the trimmed text. `saveChoice` already applies
  the answer (`applyAddedChoices`) and tells the tabs (`onChoicesAdded`).
  - **Before sending**: Enter does nothing while a request is in flight, when the trimmed text is empty, or when it
    duplicates an existing choice (`keyOf`, as the dialog compares: trimmed, collapsed spaces, lower case, checked
    against `poll.choices`).
  - **On success**: the field empties and keeps focus, and `window.SharePoll.snackbar('Choice added')` is shown
    (clarification 2). Its `m3-snackbar` already exists on every page that draws cards.
  - **On refusal**: the text and focus are kept, and the support line shows the dialog's message. 429 gives "Please
    wait a moment and try again."; a known server error gives its own text (for example the full-poll message);
    anything else gives "Your choice could not be added. Please try again." The input gets `aria-invalid="true"`.
  - **Moved over from the dialog**: the message constants, `keyOf`, the paste flattening and the `"n / max"` counter
    move into `pollCard.js`. The dialog's `latestDetail()` prefetch and the Add Choice click handler are removed, with
    their orphans (`latestDetail`, `addChoiceBtn`).
- **Rationale**:
  - The server is the authority on duplicates and the maximum; the prefetch only existed to fill the dialog.
  - The selection is already kept: `applyPoll` stores the flipped card's ticks in `pendingSelection`, a front-face card
    rebuilds from `pendingSelection ?? myChoiceIds`, and the new choice is in neither, so it is never ticked (FR-015).
- **Alternatives considered**: A second confirmation inside the card. Rejected because the snackbar was chosen.

## R8. Hint, keyboard and accessible name

- **Decision**:
  - **Attributes**: the input is `type="text"`, `autocomplete="off"`, `enterkeyhint="enter"`,
    `maxlength=choiceLabelMax`, `aria-label="Add your own choice"`, and `aria-describedby` pointing to the support line.
  - **Hint**: "Enter your own choice, then press ↵." when `matchMedia('(pointer: coarse)')` matches and
    `matchMedia('(any-pointer: fine)')` does not; otherwise "Enter your own choice, then press Enter." It is set when
    the row is built and again on each render, so docking a mouse changes it.
  - **Escape** empties the field and clears the support line.
- **Rationale**: (UA3). `enterkeyhint` is harmless where there is no on-screen keyboard, so it is always set. The
  placeholder is not a label, so the field needs its own accessible name; this is the gap the clarify session left to
  the plan.

## R9. The row's look uses tokens only

- **Decision**: `add-own-*` styles go in `add-own-m3.css` (renamed from `add-choice-m3.css`, see R10).
  - **Row**: fill `--md-sys-color-surface-container-lowest`, a 1px `--md-sys-color-outline` border, the bar's radius.
  - **Text**: `--md-sys-color-on-surface`; the placeholder in `--md-sys-color-on-surface-variant`, italic.
  - **Focus**: the site's text-field focus, a 2px `--md-sys-color-primary` border.
  - **Support line**: `--md-sys-color-error`.
  - **Counter**: right-aligned inside the row, where a result's percentage sits, in `--md-sys-color-on-surface-variant`.
  - `m3-tokens.css` gains the missing `--md-sys-color-surface-container-lowest`: `#FFFFFF` light and `#0A0F0B` dark,
    one step below the dark `surface` `#0F1511`.
- **Rationale**: (UA4). `m3-assets.test.ts` requires M3 layers to hold tokens only, and that token is not defined
  today.
- **Alternatives considered**: Using `--md-sys-color-surface`, rejected because it is the card's own fill, so the row
  would not stand out (FR-008).

## R10. The Add Choice dialog is removed

- **Decision**: Delete `src/public/addChoiceDialog.js` and its `<script>` in `index.html`, the `.add-choice-btn`
  markup, its `M3Ripple` selector and click handler, the dialog's and button's rules in `add-choice-m3.css`, and the
  `.add-choice-btn` rules in `phone-card-m3.css`.
  - The sheet is renamed `add-own-m3.css`, holding only the row's rules. Its `<link>` in `index.html` and its place in
    `LAYER_ORDER` and the page's `layers` in `tests/m3-assets.test.ts` follow.
  - `tests/m3-assets.test.ts` drops `addChoiceDialog.js` from the page's scripts.
  - `tests/phone-sheets.test.ts` drops `.card-face .add-choice-btn` and adds the row's touch-target selector, if the
    phone sheet gives it one.
- **Rationale**: (UA7), FR-006. The constitution's Principle III asks for no orphans.

## R11. Button labels and width

- **Decision**:
  - **Labels**: `.vote-btn`'s label reads "Cast Your Vote". `updateSubmitState` writes "Remove vote" for a removal,
    otherwise "Cast these votes" when `selectedIds().length >= 2` and "Cast this vote" otherwise. `submitLabel` and its
    assignment in `setText` go.
  - **Width**: the sizer spans keep today's text (`"Submit votes"` or `"Submit vote"`, plus `"Remove vote"` on a
    Dynamic-Vote poll), held in a constant named for its job, so both buttons keep today's width exactly (FR-005).
    Today the visible label shares the sizers' grid cell under `white-space:nowrap`, so it sets the width too; a longer
    label would widen the button and never overflow. The label is therefore taken out of the width calculation: in
    `site.css`, `.btn-vote-label` inside these buttons gets `width:0; min-width:100%`, so the cell is as wide as the
    widest sizer and the label fills it. `.top-submit-btn` joins the same grid rules.
  - **Fitting the label**: a small `fitLabel(button)` sets the label's font size down from the button's own, in 0.5px
    steps to a 9px floor, until `scrollWidth <= clientWidth`, then wraps (`white-space: normal`) only if the floor is
    reached. It runs after every label change and on render, since a resize re-renders.
- **Rationale**: (IN5): today's width, with the label shrunk or wrapped. The button is 28px high (`pollCard.css`), so
  shrinking comes first and wrapping is the last resort.
- **Alternatives considered**: Sizers carrying the new labels, rejected because the buttons would grow by up to a third
  ("Cast these votes").

## R12. Button order

- **Decision**:
  - **Front face**: `.vote-btn` moves before `.live-link` in `POLL_CARD_TEMPLATE`, and `site.css:332`'s
    `.card-front .actions .vote-btn{margin-left:auto}` becomes `.card-front .actions .live-link{margin-left:auto}`, so
    Live Results keeps the right edge when Voting Center is hidden.
  - **Back face**: `.back-btn` moves after `.submit-vote-btn`.
  - **Phone `#voteBar`** in `index.html`: `.vote-bar-submit`, then `.vote-bar-count`, then `.vote-bar-back`.
    `syncVoteBar` already copies the card's label.
  - The comments in the regions being changed (`pollCard.js`'s template, `site.css`, `pollCard.css`) are brought into
    line with Principle VI: no FR/FIX references, none stating the old order, none only describing the code; comments
    elsewhere are left alone (constitution, Governance scope clause).
- **Rationale**: (AM1), (AM3), FR-001, FR-003, FR-004.

## R13. The top action row on long ballots

- **Decision**:
  - **Markup**: the back face's template gains, after its `.question-wrap`, a `<hr class="top-divider" hidden>` and a
    `<div class="actions actions--top" hidden>` holding a Cast button (`btn-primary btn-vote top-submit-btn`, with the
    same label and sizers) and a flip-back button (`icon-btn top-back-btn`).
  - **When it shows**: `syncTopRow()` runs at the end of `render()` and of `updateSubmitState()`. It shows the divider
    and the row only when `isMaximized && !isPhoneLayout() && poll.choices.length >= 10` and the bottom Cast button is
    not hidden.
  - **Keeping in step**: it copies the bottom button's label, `disabled` and `hidden` state.
  - **Actions**: the top buttons' clicks call `submitBtn.click()` and the `.back-btn` click.
- **Rationale**:
  - (UA6), FR-018 and FR-019: the two rows are live copies, kept in step by one function, and the top row comes first in
    keyboard order because it comes first in the document.
  - The class names differ from `.submit-vote-btn` and `.back-btn` on purpose: `tabs.js`'s `syncVoteBar` and
    `clickInMaximizedCard` and the client suites look those up with `querySelector`, which would otherwise find the top
    copy first.
- **Alternatives considered**: Moving the one action row to the top, rejected because the requirements keep both.

## R14. The help line

- **Decision**: `<p class="multi-help" hidden>You may select more than one choice.</p>` follows each back-face action
  row (the bottom one and the top one). `render()` shows it when `poll.choiceMode === 'Multiple-Choice Poll'` and that
  row's Cast button is shown.
  - **Style**, in `pollCard-m3.css`: `--md-sys-color-on-surface`, `--md-sys-typescale-label-large-weight` (bold token),
    upright, `text-align: end`.
  - On a compact card the extra line takes height from the bar area, as the notes line does on the front, so both faces
    stay the same height.
  - The phone layout's `#voteBar` gets no help line: it mirrors the card's bottom action row, whose help line is the
    one shown, and the fixed bar keeps its height (FR-020).
- **Rationale**: (IN3), (IN4), (AM5), FR-020. The existing ballot-rules line ("Multiple-choice poll") is unchanged
  (Principle III).

## R15. Follow on the maximized Voting Center

- **Decision**: The back face's `.question-row` gains a `.bookmark-btn`, between `.share-btn` and `.maximize-btn`.
  - `bookmarkBtn` becomes `bookmarkBtns` (all of the card's). `updateActionButtons`, `updateStateMessage` and
    `syncTitleIcons` apply to each, and each gets the click handler.
  - `pollCard-m3.css` hides the back face's copy unless the card is maximized:
    `.card-flip:not(.maximized-card-flip) .card-back .bookmark-btn{display:none}`. `syncTitleIcons` sets `has-bookmark`
    per row from the button's computed visibility.
  - Both buttons read `poll.bookmarked`, and `toggleBookmark` re-applies the poll, so the two faces always agree
    (FR-021).
- **Rationale**: (AM6). The compact Voting Center's title row is unchanged.

## R16. Watch becomes Follow in what users see

- **Decision**: These strings change; identifiers do not.
  - **`pollCard.js`**: the button's `aria-label` "Follow" / "Following", its `title` "Follow this Poll" / "Stop
    following this Poll" (template default included), and the listed-because reason `bookmarked: 'You are following'`.
  - **`tabs.js`**:
    - Home's empty text: "…the polls you follow…".
    - The watching tab's empty text: "You aren't following any polls yet."
    - The bookmark-cap modal: "You have reached the maximum number of polls you can follow. The limit is n. Please stop
      following a poll on the Following tab before following another."
  - **`index.html`**: the tab label "Following".
  - **`README.md`**: the Watching / Watch paragraphs, the Vote and Submit wording, and the Add Choice paragraph, which
    becomes the add-your-own row.
  - **Unchanged**: the tab name `watching` (`TAB_NAMES`, `LANDING_TABS`, `parseTab`, deep links), the `#watching-eye`
    symbols, `bookmark` routes, tables and fields, and `mayWatch`/`canWatch`, so old addresses keep working (FR-023,
    SC-006). `liveResults.js`'s "Press Live Results on a poll to watch it here." means looking, not following, and is
    unchanged.
- **Rationale**: (NC1) C. This matches the "Bookmark is Favorites in the UI only" invariant in `CLAUDE.md`, which gains
  the same line for Watch.

## R17. Who Voted heading

- **Decision**: `whoVoted.js:217` reads `["Voter", "Choice", "Vote Cast Date"]` and `["Choice", "Voter", "Vote Cast
  Date"]`.
- **Rationale**: (UA5), FR-024.

## R18. A grid reorder must not blur a row in use

- **Decision**: `createGrid`'s `render` in `tabs.js` moves a card with `insertBefore` when its place changes, which
  blurs a focused element inside it. Before placing the cards, `render` notes `document.activeElement` when it is an
  `.add-own-input`, with its selection. After placing them, it re-focuses that input (`preventScroll: true`) and
  restores the selection, unless the card was unmounted.
- **Rationale**: FR-025 covers every live update. The value survives the move, being the same node, but focus and caret
  do not.
- **Alternatives considered**: Freezing a tab's order while any row has focus, rejected as a larger change to ordering
  rules other features rely on (`holdOrder`, `keptPid`).

## R19. Tests

- **Decision**:
  - **Rewritten**: `tests/client-add-choice.test.ts` drives the row on both faces, compact and maximized: visibility
    rules, Enter, duplicate, empty, 429, full, Escape, paste, counter, focus kept, selection kept, snackbar, a live
    update while typing, and a grid reorder while typing.
  - **Following the new wording**: `client-remove-vote`, `client-home`, `client-home-tab`, `client-phone-view` (vote
    bar order), `client-tabs-026`, `client-who-voted`, `client-maximized` (Follow on the back face, top row and help
    line), `poll-card-assets`, `m3-assets` and `phone-sheets`.
  - **New cases** for the top row (9 vs 10 choices, phone, compact) and the label fitting.
- **Rationale**: Principle IV: each requirement has a check. The suites are the documentation of behaviour
  (Principle VI).

## R20. No new storage, address or setting

- **Decision**: Nothing is stored. No cookie, browser storage key, route, `ENV_*` setting or new top-level client file
  is added (`add-own-m3.css` replaces `add-choice-m3.css`; the build transforms both alike). `privacy.html`'s Cookie Use
  list is unchanged.
- **Rationale**: Spec Assumptions; the `CLAUDE.md` invariants on cookies, build inputs and settings.
