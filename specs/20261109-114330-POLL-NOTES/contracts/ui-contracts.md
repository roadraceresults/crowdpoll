# UI Contracts: Poll Notes

## C1. Notes on the poll card (`pollCard.js`, `pollCard-m3.css`)

The front of the card gains this markup between `.question-row` and the choices:

```html
<div class="poll-notes" hidden>
  <div class="poll-notes-text"></div>
  <button type="button" class="poll-notes-more" hidden>Show more<svg class="poll-notes-more-chevron" …><path d="m6 9 6 6 6-6"/></svg></button>
</div>
```
- The "⌄" of "Show more ⌄" and "... edit ⌄" is drawn as the avatar menu's chevron (`AVATAR_CHEVRON` in `app.js`): a
  20×20 `aria-hidden` SVG in `currentColor` after the text (TWEAK01).
- "Show more" is a label-medium tonal button, 24px tall, pulled up 4px to meet the text, with an 18×18 chevron; it is
  always tinted 8% primary, 16% on hover (TWEAK02).
- `.poll-notes` has `margin:0 0 8px` and `padding:4px 0 0 14px`; the card's minimum height adds two lines of notes and
  16px (TWEAK03).

The card's back is unchanged.

| `notesPreviewHtml` | `hasMoreNotes` | Shown |
|---|---|---|
| `""` or missing | — | nothing; `.poll-notes` stays hidden |
| text | false, fits in two lines | the notes, no ellipsis, no button |
| text | false, but clamped by the width | two lines with an ellipsis, and the button |
| text | true | two lines with an ellipsis, and the button |

- `.poll-notes-text` is set with `innerHTML` from `notesPreviewHtml` only (research R6).
- The clamp is CSS (`line-clamp: 2`); the button's visibility is decided after the text is set, and again from a `ResizeObserver` on `.poll-notes-text` (R13).
- "Show more ⌄" calls `requestMaximize`, as clicking the title does.
- `deltaClient.js` `toPollDetail` carries both fields; a placeholder has `""` and `false`.
- In the Maximized view, `setMaximized(true)` gives the card its existing `maximized-card-viewport` class, which also hides `.poll-notes`.

## C2. The Maximized view (`tabs.js`, `index.html`)

```html
<div class="maximized-space-right">
  <section class="maximized-notes" aria-label="Notes" hidden></section>
  <div class="maximized-graph"></div>
</div>
```

| Situation | Result |
|---|---|
| Opened ("Show more ⌄" or the maximize button) on a poll with notes | one-card fetch; `.maximized-notes` gets `notesHtml` and is shown above the graph |
| Poll without notes | no fetch; the view is as today |
| Content refresh with a new `contentVersion` while maximized | fetched again |
| Fetch fails | the area stays hidden; nothing else changes |
| Closed (`restore`) | emptied and hidden |
| Single column | card, notes, graph, in DOM order |

The line graph mounts into `.maximized-graph`, not into `.maximized-space-right`.

While the view is open, a Back arrow is shown (TWEAK05, TWEAK06): `div#maximizedBack.back-arrow-bar.maximized-back-bar`
in `.tab-bar-wrap`, holding `button.back-arrow.maximized-back` (`aria-label="Back"`), dressed by `back-arrow-m3.css`,
which `index.html` loads. `maximize` shows it, `restore` hides it, and a click is `closeMaximized()`, as Escape is.

| Width | Arrow | Refresh | View's top gutter |
|---|---|---|---|
| Over 900px | fixed 12px under the chrome, in line with the logo | unchanged | 32px |
| 900px and under | in the row under the tab bar, at `left:var(--tab-edge)`; 36×36 with 2px above and below (TWEAK08) | moves right, beside the All-tabs menu | none |

## C3. Step 2 and the editor (`adminCard.js`, `notesEditor.js`, `admin-card-m3.css`)

Step 2 lists Title, Subtitle, Notes, then Keywords for public polls. The Notes field:

- a label "Notes", with the support text "Optional. Shown under the title on the poll card.";
- `.wizard-notes-preview`, two clamped lines of `notesHtml`, with a `button.wizard-notes-edit` "... edit" and its SVG chevron (`.wizard-notes-edit-chevron`, built by DOM) always
  ending the second line;
- the counter, `n / 6000`.

`NotesEditor.open(host, options)` replaces the preview in place:

| Part | Behaviour |
|---|---|
| Bar | "Notes" heading; Cancel and Done at its right; sticky at the top of the editor |
| Toolbar | Bold, Italic, Underline: `aria-pressed`, `aria-label`, a tooltip naming the shortcut |
| Text | `contenteditable`, `role="textbox"`, `aria-multiline="true"`, labelled "Notes" |
| Ctrl/⌘+B, I, U | toggle the marks |
| Enter | a line break |
| Paste, drop | plain text only |
| Other formatting input | cancelled |
| Counter | the serialized length; Done disabled (`aria-disabled`) above 6000 |
| Done | closes; the notes go into the wizard state; the focus returns to "... edit ⌄" |
| "Next >>" or a numbered step | as Done |
| Cancel or Escape, unchanged | closes |
| Cancel or Escape, changed | `confirmDiscard()`; confirmed → closes without the changes |
| Escape, either way | `stopPropagation()`: the card's own key handling never sees it |
| Height | grows with the text up to the window less the fixed chrome and its bar, then scrolls inside |

The serialized text is sent as `notes` with the card's Save or Publish. The card's Cancel discards it.

## C4. The Admin Poll Card's summary (read-only face and wizard)

The summary (`buildSummary`) has a notes line right after the subtitle, `p.wizard-summary-text.wizard-summary-notes`,
when the notes are not empty: the text "Notes: " and then a part holding the rendered notes, clamped to 4 lines
(TWEAK04). The wizard's summary uses `notesHtml` and follows the editor's Done; the read-only face uses the list row's
`notesPreviewHtml`. There is no separate notes preview after the summary. A 1px `outline-variant` line separates the title,
subtitle and notes from the settings sentences: a top border on `.wizard-summary-who`, drawn only when one of them
comes before it (TWEAK07).

- On the read-only face the part is a `tappablePart` labelled "Notes: change in Step 2" when the editor may open and
  `canChange("notes")` is true; in the wizard, once Step 2 is answered.
- Otherwise it is plain.

## C5. The stored format, both ways

| Direction | Where | Rule |
|---|---|---|
| Stored → HTML | `src/polls/notes.ts` | research R1, R2 |
| DOM → stored | `notesEditor.js` `serialize` | research R1 (canonical form), R5 |

For every case in the shared fixture list, `serialize(renderNotesHtml(s))` equals `s` for canonical `s`.
