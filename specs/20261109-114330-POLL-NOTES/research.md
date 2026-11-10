# Research: Poll Notes

Decisions already made in `requirements/20261109-114330-poll-notes/requirements.md` (Decisions section) and in the spec's
Clarifications are not reopened here. This settles what the spec left to the plan, and records two places where the code
read during planning required a decision to be refined (R3, R7).

## R1. The stored format, exactly

**Decision**: notes are plain text read by one small tokenizer, `src/polls/notes.ts`:

- `\` followed by any character is that character, literally; a trailing lone `\` is a literal `\`.
- `++` toggles underline. A run of `*` toggles bold (`**`) and italic (`*`): when closing, a run first closes the marks
  on top of the stack that it can (`*` closes italic, `**` closes bold), so `***x***` is bold and italic in either
  nesting; what is left of the run opens, `**` before `*`.
- A newline is a line break, kept inside any open mark.
- A mark opened and never closed, or a closer with no opener, is shown as the characters typed. Nothing is ever dropped.

The client writes the format in one canonical form: marks nested bold, then underline, then italic; never an empty mark;
`\`, `*` and `+` in text escaped. Reading that form back gives the same text and marks (round trip, SC-003).

**Rationale**: a stack tokenizer is a few dozen lines with no dependency, and its failure mode (show the raw characters)
is always safe. Treating unbalanced marks as text keeps the rule "nothing typed is lost".

**Alternatives considered**: CommonMark's delimiter-run rules (far more cases than three marks need, and Markdown has no
underline); `__underline__` (`_` is common in text and in Markdown means italic).

## R2. One server module for notes

**Decision**: `src/polls/notes.ts` exports `NOTES_MAX = 6000`, `NOTES_PREVIEW_CHARS = 300`, and:

| Function | Result |
|---|---|
| `parseNotes(notes)` | runs of text with their marks, and line breaks |
| `renderNotesHtml(notes)` | every character escaped with `escapeHtml`, the marks as `<strong>`, `<u>`, `<em>`, newlines as `<br>` |
| `renderNotesPreview(notes)` | `{ html, hasMore }`: the first `NOTES_PREVIEW_CHARS` characters of text, cut at the last space when there is more, every open mark closed, then "…" when there is more (CSS also draws one when it clamps) |
| `notesPlainText(notes)` | the text without marks or escapes, for screening and OpenSearch |
| `normalizeNotes(notes)` | `""` when the plain text is only whitespace; otherwise unchanged |

`escapeHtml` moves from `src/email/templates.ts` to a shared `src/html.ts`, re-exported where it is used today. No other
module turns notes into HTML.

**Rationale**: one renderer for every reader (UA2, FR-016), and a preview that cannot break a mark because it cuts the
parsed runs, not the stored string.

**Alternatives considered**: cutting the stored string (could split `**` or an escape); rendering in the browser (the
spec puts rendering on the server).

## R3. How the 6000 characters are counted

**Decision**: `validateFieldLength(notes, NOTES_MAX, "Notes")`, which counts UTF-16 units, as it does for every field;
the editor's counter counts the same way (`string.length`), as `adminCard.js` already does for Title and Subtitle.

**Rationale**: AM1 asked for code points *and* "like every other field"; the code read during planning shows every field
counts UTF-16 units (`service.ts:1036`, and the comment at `adminCard.js:518`). The spec says "the same counting as other
poll fields", so that wins. Only characters outside the Basic Multilingual Plane (most emoji) count twice.

**Alternatives considered**: code points for notes only (one field counting differently from all others, with a second
counter rule in the client).

## R4. What each payload carries

**Decision**:

| Payload | Notes fields |
|---|---|
| `PollProjection` (`projectPoll`), so every listing, Trending/Newest, search, Live and deltas | `notesPreviewHtml`, `hasMoreNotes` |
| `GET /api/polls/:pid/card` and `GET /api/me/polls/:pid` (one card) | the projection, plus `notesHtml` (all of it) |
| Admin detail (`buildAdminPollDetail`) | `notes` (stored) and `notesHtml` |
| Admin list rows (`adminListRow`) | `notesPreviewHtml`, `hasMoreNotes` (no `notes`) |
| `pendingUpdate` in the admin detail | may hold `notes` |

The preview is rendered in `projectPoll`, so once per content version for every cached reader. The full HTML is rendered
when one card is asked for; it is a single pass over at most 6000 characters.

**Rationale**: UA6 (lists carry a preview, one card carries all), SC-007. There is one projection builder for every
listing (`versions.ts`), so the preview belongs there; the two one-card routes build from the row and can add the rest.

**Alternatives considered**: the full HTML in the projection (up to tens of kilobytes per card in every listing and
delta); a new `/notes` route (a new entry in the Terms gate for what the card route already answers).

## R5. The editor (`src/public/notesEditor.js`)

**Decision**: `window.NotesEditor.open(host, { html, onDone, onCancel, onChange })` builds:

- a bar with the "Notes" heading, Cancel and Done, and a toolbar of three `aria-pressed` buttons (Bold, Italic,
  Underline) with labels and tooltips, kept at the top with `position: sticky`;
- a `div` with `contenteditable="true"`, `role="textbox"` and `aria-multiline="true"`, filled with the server's
  `notesHtml` (R6), and a counter.

The behaviour:

- **One `execCommand` wrapper**, `applyMark(name)`, calls `document.execCommand(name)` after
  `execCommand("styleWithCSS", false, false)`. `document.queryCommandState` sets each button's `aria-pressed` on
  `selectionchange` (UA10).
- **`beforeinput`**: `insertParagraph` becomes `insertLineBreak`. Every `format*` input type other than `formatBold`,
  `formatItalic` and `formatUnderline` is cancelled.
- **`paste` and `drop`** are cancelled, and their `text/plain` is inserted with `execCommand("insertText")`.
- **`serialize(root)`** walks the DOM and writes the canonical format of R1:
  - text nodes become text;
  - `<b>`, `<strong>`, or `font-weight` ≥ 600 is bold; `<i>`, `<em>` is italic; `<u>` is underline;
  - `<br>` and the boundaries of `div` and `p` become newlines;
  - every other element contributes only its text.
  - So whatever a browser produces, only the three marks reach the server.
- **Counter and Done**: on `input`, the counter shows `serialize(...).length / 6000`, and Done is disabled above 6000.
- **Height**: `max-height: calc(100dvh - var(--fixed-chrome-height) - <bar>)` and `overflow-y: auto` (AM6).
- **Keys and focus**: Escape is Cancel, and stops there (`stopPropagation`), so it never also reaches the card. When the editor opens, the focus goes into it; when it closes, the focus goes
  back to the element it was opened from.

jsdom has neither `execCommand` nor editing behaviour. The client tests stub `execCommand` and `queryCommandState` with
`beforeScripts`, and test `serialize` on DOM built by hand and on the server's own `renderNotesHtml` output (round trip).

**Rationale**: RS1. Every browser quirk (`<b>` vs `<strong>`, `<div>` on Enter, spans from paste) ends at `serialize`, so
the server never sees the browser's markup.

**Alternatives considered**: `defaultParagraphSeparator` (a separator is still produced; the walker handles it anyway,
but `insertLineBreak` keeps the DOM flat); parsing the stored format in the browser to load the editor (a second parser;
the server already sends `notesHtml`).

## R6. Server-rendered HTML in the page

**Decision**: `notesPreviewHtml` and `notesHtml` are inserted with `innerHTML`, and nothing else from the server is.
They come only from `renderNotesHtml`/`renderNotesPreview`, which escape every character before adding the four tags.

**Rationale**: it is the first server HTML the pages insert (today every `innerHTML` is a static template), so it is
limited to two named fields from one tested function. The tests pin `<script>`, `<img onerror>`, `javascript:`, quotes
and entity tricks (SC-002).

**Alternatives considered**: building DOM from the stored text in the browser (a second renderer, which the spec rules out).

## R7. Editing a published poll: no stash, a pending update

**Decision**: notes follow the subtitle exactly:

- **EDIT mode**: they are written on publish.
- **UPDATE mode** (ever voted on): a changed `notes` moves into `pending_update` with title and subtitle, and is screened
  by `screenPendingUpdate` (`pending.notes ?? claimed.notes`) and applied by `applyPendingUpdate`.
- **The publish route**: `UPDATE_FIELDS` gains `notes`, and so does the log line. The client's `reviewNeeded()` compares
  `notes` too.

**Rationale**: UA4 spoke of "stashed notes", but the code read during planning shows no content is stashed while a poll
is `EDITING`. Content is written only when published, and in UPDATE mode only after screening, so voters keep seeing the
old notes until then (FR-014). Notes need no new mechanism.

## R8. Search

**Decision**:

- **PostgreSQL**: migration 018 drops and re-adds the generated `search` column with
  `setweight(to_tsvector('english', coalesce("notes", '')), 'D')` added, level with keywords, and recreates
  `polls_home_search` and `polls_search`. The parser treats `*`, `+` and `\` as separators, so the marks never become
  terms.
- **OpenSearch**:
  - `PollDocument` gains `notes` (plain text, `notesPlainText`), and the mapping gains `notes` (`text`, `english`).
  - `multi_match` gains `"notes"` with no boost, like `keywords`.
  - `ensureIndex` also calls `indices.putMapping` for `notes` when the index exists, since adding a field needs no
    reindex.
  - Existing documents have no notes, so nothing is resent.

**Rationale**: UA5 and FR-023. All four PostgreSQL weights are already used, so the lowest is shared.

**Alternatives considered**: a separate `notes_text` column holding plain text (a second copy to keep in step, for no
gain in ranking).

## R9. The Maximized view

**Decision**: in `index.html`, the `.maximized-space-right` template gets two children, `.maximized-notes` and
`.maximized-graph`, and `tabs.js` mounts the line graph into `.maximized-graph`. This is needed because
`PollLineGraph.mount` calls `replaceChildren` on its host, which would erase the notes.

When the card's detail has `notesPreviewHtml`, `maximize` fetches the card, from `/api/me/polls/:pid` when logged in and
`/api/polls/:pid/card` otherwise (the same choice `mountLinkedPoll` makes), and sets `.maximized-notes` from `notesHtml`.

- The notes are fetched again when a content refresh changes the card's `contentVersion` while it is maximized.
- They are cleared on `restore`.
- A failed fetch leaves the area empty, and the card still works.

`setMaximized(true)` puts a class on the card that hides its preview and "Show more ⌄" (AM5).

**Rationale**: FR-020 and FR-021. With the fetch, lists stay small. The single-column order (card, notes, graph) follows
from the DOM order.

## R10. The public poll page

**Decision**: `renderPollPage` takes `notesHtml` (rendered in the `/poll/:pid` route from the row it has already read),
and `summary()` adds `<div class="poll-notes">…</div>` after the subtitle paragraph inside `#poll-summary`. `describe()`
and the JSON-LD are unchanged.

## R11. Screening

**Decision**:

- `ScreeningInput` gains `notes`, which holds the plain text from `notesPlainText`.
- `localScreener` joins `[title, subtitle, notes, ...choiceLabels]`.
- The message becomes "Please revise the title, subtitle, notes and choices."
- Every caller passes it:
  - first publish (`sweeps.ts`);
  - a pending update (`pending.notes ?? claimed.notes`);
  - an added choice (`notes: ""`).

## R12. Exports and copies

**Decision**:

- `exportPollData` adds `notes`, as stored.
- `exportPollMarkdown` writes it after the subtitle, followed by a blank line, only when it is not empty. The marks
  `**` and `*` read as Markdown, and `++` stays literal (Clarification Q1).
- `duplicatePoll` copies `notes`.
- `isAllDefaults` is unchanged. Default choices already block publishing, so notes alone change nothing there.

## R13. Styles

**Decision**: no new style sheet.

- **Card notes**: they go in `pollCard-m3.css`, in a container in M3 tokens (`--md-sys-color-surface-container-low`,
  shape `small`, body-medium type), and the preview is clamped with `-webkit-line-clamp: 2` and `line-clamp: 2`.
- **"Show more ⌄"**:
  - It is a text button.
  - It is shown when `hasMoreNotes` is true, or when the clamped box's `scrollHeight` exceeds its `clientHeight`,
    measured after the notes are set and again whenever the box changes size (a `ResizeObserver`), so a card drawn
    while hidden is right once shown.
- **Card height**: the card's minimum height grows by two lines and the button.
- **Admin**: the editor, the step 2 preview and the read-only face's preview go in `admin-card-m3.css`.
- **Asset tests**: `m3-assets.test.ts` changes only because `admin.html` gains `notesEditor.js`.

## R14. The Admin Poll Card

**Decision**:

- **Wizard state**: it gains `notes`, in the same six places as `subtitle` (`pollAnswers`, `wizardBase`,
  `openWizardState`, `wizardDirty`, `wizardFields`, `keepWizardProgress`), and `notesHtml` for display, both taken from
  the poll's admin details; when the card holds only a list row, the details are fetched before the editor opens.
  `canChange("notes")` answers as for `subtitle`.
- **Step 2**: after Subtitle, it shows a `.wizard-notes` field. It has a clamped preview of `notesHtml`, an always-shown
  "... edit ⌄" button at the end of the second line, and a counter.
- **Done**: `wizard.notes` becomes the editor's serialized text and `wizard.notesHtml` the editor's own DOM, sanitised
  by being rebuilt from the serialized runs with `textContent` and the four elements. So an unsaved preview needs no
  server call.
- **Leaving the step**: `goToStep` first calls the open editor's `commit()`, so "Next >>" and the numbered steps keep
  the changes (AM3). The card's Cancel discards the wizard state, as today.
- **Editor Cancel**: it asks through `confirmDiscard()` only when the serialized text differs from what it opened with
  (UA9).
- **Read-only face**: it adds the clamped preview, from the list row's `notesPreviewHtml`, after the summary. The preview is a `tappablePart` that opens step 2
  when `canOpenEditor()` and `canChange("notes")` are true (Clarification Q2); otherwise it is plain.
