# UI Contract: the Search view's results list

The server contract is unchanged: `GET /api/admin/polls/search` and `postman/openapi.json` are not touched. This file
is the contract between `admin.html` / `adminList.js` / `admin-search-m3.css` and their tests.

## U1. Structure

- In the Search view, each child of `#pollList` is `div.admin-result[data-pid]` holding, in order,
  `button.admin-result-row[type="button"]` and `div.admin-result-panel#admin-result-panel-<pid>`.
- The button holds `span.admin-result-main` and `.admin-result-chevron` (`aria-hidden`). The main span holds
  `span.admin-result-heading` (`.admin-result-title`, `.admin-result-subtitle`) and `span.admin-result-facts`
  (`.admin-result-visibility`, `.admin-result-state`, `.admin-result-creator`, `.admin-result-voters`), in that order.
- The button has `aria-controls` = the panel's id and `aria-expanded` = `"true"` or `"false"`.
- In every other view, and on the creator-only page, `#pollList` holds `.poll-admin-card` elements directly, as today.

## U2. Cell text

| Cell | Text |
|---|---|
| title | the poll's title; "(untitled)" when blank; the button's `title` attribute is the same text |
| subtitle | the poll's subtitle; empty (and not displayed) when blank |
| visibility | "Public", "Private (invitation)" (`Invitation Only`) or "Private (shared link)" |
| state | "Poll state: " + `pollState`, verbatim |
| creator | "Created by: <user name, else email> on <local date>", e.g. "… on Nov 12, 2026" in `en-US`; "Created on <date>" when there is no creator |
| voters | "0 voters", "1 voter", "1,204 voters" |

Rows are in the response's order.

## U3. Open and close

- Closed: `aria-expanded="false"`, the panel is `hidden` and has no child, no `.poll-admin-card` exists for the poll.
- Open: `aria-expanded="true"`, the result has `admin-result--open`, the panel is not hidden and its only child is the
  poll's `.poll-admin-card`.
- A click (or Enter / Space) on a closed row opens it and closes the open one; on the open row, closes it.
- At most one `.admin-result--open` exists.
- Focus stays on the clicked button.

## U4. Fresh loads

A fresh load is the Search submit, Clear, or a click on a view tab (returning to Search included).

- It leaves no result open, except that a response of exactly one poll is drawn open.
- Clear leaves the list empty and the notice hidden.

## U5. Held

While a card is being edited:

- every `.admin-result-row`, the form's submit button and `#adminSearchClear` are `disabled` with
  `title="Finish editing the open poll first"`;
- submitting the form does nothing;
- when the edit ends, they are enabled, the rows' `title` is the poll's title again, and the two buttons have no
  `title`.

## U6. Non-fresh loads

The periodic refresh and a reload caused by a card action:

- keep the same `.admin-result` elements for polls still in the response (same DOM nodes), with cell text updated;
- keep the open result open and its card's element in place;
- remove the result of a poll no longer in the response, unless it is being edited;
- add a closed result for a new poll, at its position in the response;
- never open a result.

## U7. Notice

`#adminSearchNotice` in the Search view, after a successful response: "N polls match." / "1 poll matches."; the
existing texts for none, cut-off and failure; hidden before a search.

## U8. Collapsing the search panel

Unchanged in behaviour: after a submitted search that put at least one `.admin-result` on screen the form gets
`data-collapsed`; it stays open when nothing matched or the search failed.

## U9. Styles (`admin-search-m3.css`)

- `admin.css`, `.admin-card-list:has(> .admin-result)`: the frame, `width:min(840px,100%)`, centred, `gap:0`, with the
  cards' `--paper-raised` fill, `--line` border, 20 px corners (18 px under 480 px) and `--shadow`; a `--line` hairline
  between results; the first and last result rounded into the frame.
- `.admin-result:nth-child(even)`: the stripe, `--md-sys-color-surface-container`.
- `.admin-result-row`: a flex row, `min-height:64px`, a `:focus-visible` outline, a `::before` state layer,
  a `:disabled` look, `scroll-margin-top` covering the fixed header.
- `.admin-result.admin-result--open`: the selected background, behind the row and its panel.
- `.admin-result-title`, `.admin-result-subtitle` and the facts wrap (`overflow-wrap:anywhere`); nothing is cut.
- The facts are separated by a 6 px round dot in `--md-sys-color-primary` (`::before`); an empty subtitle or fact is
  not displayed. The state has no border.
- `.admin-result-row[aria-expanded="true"] .admin-result-chevron`: rotated.
- `.admin-result--open .admin-result-row:disabled .admin-result-chevron`: `visibility:hidden` (the row being edited
  cannot be closed).
- Colors, type, shape and state opacities come from `--md-sys-*` tokens only; no new stylesheet is linked.
