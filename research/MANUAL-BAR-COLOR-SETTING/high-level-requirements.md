Start a new spec for these requirements called `029-MANUAL-BAR-COLORS`.

# Overview

Some polls have choices that suggest a colour: a Republican and a Democratic choice might be red and blue. Today every result bar is coloured automatically by its rank, so a creator cannot say what colour a choice should have. This feature lets the poll's creator, or an administrator, give each choice a colour by hand, picked from a predefined palette, after the choices have been entered. No AI is involved.

The colour is set on a new numbered circle of the poll edit card, **Colors**, which lists every choice with a colour selector beside it. A choice left on **Automatic** is coloured exactly as it is today.

# Design

## The palette

A predefined palette of 16 colours, taken from `dontTrack\manual-bar-color-palette.jpg` (the teal is darkened from the image's `#008488`; see *Assumptions*). It is kept as one ordered list of name and hex code in a single place, so adding a colour is adding one line. The list is validated against when a colour is written, and is sent to the browser with the other settings it already receives, so the card's picker and the server never disagree. The picker shows the colours in this order, in a grid of four columns:

| Name | Hex |
|---|---|
| Red | `#FF0000` |
| Maroon | `#880015` |
| Orange | `#FF6601` |
| Yellow | `#FFFF00` |
| Bright green | `#06D400` |
| Green | `#00A636` |
| Teal | `#007A7E` |
| Sky blue | `#0695F5` |
| Blue | `#0000FF` |
| Steel blue | `#7092BE` |
| Purple | `#800080` |
| Pink | `#FF91CB` |
| Brown | `#784315` |
| Black | `#000000` |
| Gray | `#7F7F7F` |
| Silver | `#C0C0C0` |

This palette is separate from the automatic palette that colours bars by rank and is not changed by this feature.

## The Colors step

The poll edit card's numbered circles become: `Who`, `Title`, `Choices`, `Colors`, `How`, `When`. `Colors` is step 4, so `How` and `When` become steps 5 and 6. Next on `Choices` leads to `Colors`, so the rule that every step must be visited before Publish needs no change.

Each choice is one row: the choice's label on the left (with an ellipsis if it is long, and the whole label as a tooltip), and on the right one button at least 48 dp tall showing a 24 dp colour dot, the colour's name (or **Automatic**) and a drop-down arrow. The button's accessible name is "Color for" followed by the choice. Every choice starts on **Automatic**, so the step can be passed through untouched; its one line of help says: "Optional. Leave a choice on Automatic to colour it for you."

Pressing the button opens a small raised surface under it holding **Automatic** first, then the 16 swatches as a grid of four columns of 48 dp targets with 8 dp gaps. Choosing one closes the surface, returns focus to the button, and updates the dot and name. The grid is a single-choice group: each swatch has the colour's name as its accessible name and as a tooltip, the chosen swatch shows a check mark (colour is never the only cue), every swatch has a 1 dp outline in the theme's outline colour in light and dark mode so that black and silver show on any surface, arrow keys move between swatches, Home and End jump to the first and last, and Escape closes the surface. The surface follows the same positioning approach as the card's existing actions menu.

The list of choices comes from the Choices box as it currently stands, including lines typed but not yet saved. A colour follows its choice's label (labels are unique within a poll): if the lines are reordered, every colour stays with its label; if a line is renamed or removed, that line's colour is dropped. When the Choices box holds no choice, the list is replaced by one line, "Add your choices first, then come back to choose their colours.", and no colour buttons are shown.

## Who may set colours, and when

The poll's creator and administrators, as for every other edit of a poll. Colours can be set while choices can be edited, and also **after votes have been cast**: choices, choice mode and visibility are frozen once there is a vote, but the `Colors` step stays open to the creator and administrators, in every state in which the card can be opened for editing (not while the poll is being edited, awaiting approval or archived), so a closed poll's colours can be changed too. A change of colours alone is saved without screening the poll again and without moving it out of the state it was in (see *The save request*), so voting is paused only while the card is open, as for any edit. The change then reaches voters looking at the poll through the content refresh.

## Storage

Each choice of a poll carries its own optional `color`: the palette's hex code, absent for Automatic. No migration and no backfill are needed, because every existing poll is already Automatic. The stored value is the hex code, not a colour name, so a poll keeps its look if the palette is edited later; a stored colour no longer in the palette is still drawn and a save keeps it: the server accepts, for each choice, a palette colour or a colour that the poll already stores, and the picker shows such a colour as its hex code, selected, so the creator can keep it or replace it.

## The save request

The `Colors` step sends its colours in the same request as the choice labels, as a list of the same length and in the same order: a palette hex code, or `null` for Automatic. The server pairs each colour with its label before it discards empty labels, checks every colour against the palette (or against the colours the poll already stores), and stores the colour on the choice it creates. A hex code is compared without regard to letter case and stored in the palette's spelling, and a request that carries labels and no colours replaces the choices with none coloured, as before this feature. On a poll that has votes, where labels are refused, colours are saved on their own: when colours are the only thing the wizard changed, the card calls `POST /api/admin/polls/:pid/colors` with the edit session's `clientGuid` and the `colors` list. The server sets the colour on the existing choices by position and changes nothing else, so every vote still points at its choice; it puts the poll back in the state it had before the edit session, ends the session, and neither screens the poll again nor moves it to Awaiting Approval. When anything else changed as well, the card uses Publish as for any change, and Publish accepts `colors` beside the other fields it allows after votes. Duplicating a poll copies its colours.

## What the voter sees

On a result bar, a colour set by hand always wins over the fixed Yes and No colours and over the automatic palette. A choice left on Automatic is coloured exactly as today: a choice that has a manual colour and would otherwise have taken an automatic palette entry still advances the palette without drawing it, and a choice that reads as yes or no still does not, so setting a colour on one choice never changes the colour of an Automatic choice. Two choices may have the same colour. The bar's track, its text colours, and its dark-mode colours are derived from the chosen colour by the code that already derives them for the automatic palette, so the card needs no list of colours to draw one.

# Functional Requirements

- **FR-001.** The poll edit card has a sixth numbered circle, `Colors`, as step 4, between `Choices` and `How`; `How` and `When` become steps 5 and 6. The row of circles shows six equal columns, with the joining line running from the first circle's centre to the last's.
- **FR-002.** The `Colors` step lists one row per choice, in the order of the lines of the Choices box, each with a colour button as described under *The Colors step*. The list reflects unsaved edits to the Choices box. When the Choices box holds no choice, the list is replaced by the line "Add your choices first, then come back to choose their colours." and no colour buttons are shown.
- **FR-003.** Every choice starts on **Automatic**. **Automatic** is the first entry of the colour menu and clears a colour that was set.
- **FR-004.** The colour menu offers exactly the 16 palette colours, in the order of the palette table, as a grid of four columns. Each swatch is a target of at least 48 dp, has the colour's name as its accessible name and tooltip, shows a check mark when chosen, and is reachable and choosable by keyboard (arrow keys, Home, End, Enter or Space, Escape to close). Every swatch has a 1 dp outline in the theme's outline colour in light and dark mode.
- **FR-005.** Choosing a colour closes the menu, returns focus to the colour button, and updates the button's dot and name.
- **FR-006.** A colour follows its choice's label: reordering the lines keeps every colour with its label, and renaming or removing a line drops that line's colour.
- **FR-007.** The palette is one ordered list of name and hex code in one place on the server, is the only list a colour is validated against, and is sent to the browser with its other settings. Adding a colour to the list adds it to the menu without any other change.
- **FR-008.** Each choice stores its optional `color` as the palette's hex code. No migration is run, and an existing poll's choices, which have no colour, are Automatic.
- **FR-009.** The save and publish requests accept a `colors` list beside `labels`, of the same length and in the same order, whose entries are a palette hex code, a colour that the poll already stores on one of its choices, or `null`. A list of a different length, or any other entry, is refused with `400` and nothing is saved. A hex code is compared without regard to letter case and stored in the palette's spelling. A request that carries `labels` and no `colors` replaces the choices with none coloured. The server pairs each colour with its label before empty labels are discarded.
- **FR-010.** On a poll that has votes, `POST /api/admin/polls/:pid/colors` (the poll's creator or an administrator, `404` for anyone else, `409` unless the caller holds the poll's edit session) sets the colour of the existing choices by position, changes no id, label, position or vote, puts the poll back in the state it had before the edit session, ends the session, and does not screen the poll again. Its list must be exactly as long as the choice list, with the entry rules of FR-009. Publish, for such a poll, still refuses any field other than the allowed ones, and `colors` is one of them.
- **FR-011.** Colours can be changed by the poll's creator and by administrators, while choices can be edited and also after the poll has votes. After votes, the `Colors` step is open while the `Choices` step stays locked. This applies in every state in which the card can be opened for editing, including a closed poll.
- **FR-012.** Duplicating a poll copies the colours of its choices.
- **FR-013.** A result bar uses a choice's colour when it has one, in preference to the Yes and No colours and to the automatic palette.
- **FR-014.** A choice without a colour is coloured exactly as before. A choice with a colour that would otherwise have taken an automatic palette entry still advances the palette without drawing it, and a choice that reads as yes or no still does not advance it, so setting a colour on a choice does not change the colour of any Automatic choice.
- **FR-015.** Two choices of one poll may have the same colour.
- **FR-016.** A bar's colours, in light and dark mode, and its text colours are derived from the choice's colour on demand, for any hex code, by the existing derivation; a colour outside the 50 automatic colours does not cause an error.
- **FR-017.** A change of colour reaches a card that is already showing the poll the next time it refreshes the poll's content. Because a colours-only save restores the poll's state, voting resumes as soon as it is saved.
- **FR-018.** The request and response descriptions in `postman/openapi.json` include `colors` on the save and publish requests, `color` on a choice, and the colours route.
- **FR-019.** Tests cover the palette and its validation, the pairing of colours with labels when empty labels are dropped, the colours route (the state restored, no screening, a caller who is neither creator nor administrator, a caller without the session, a list of the wrong length), duplication, the bar colours (manual wins, Automatic unchanged, no entry used up by a manual choice, any hex drawn), the wizard's six steps, the `Colors` step's behaviour (including no choices, a reordered, renamed and removed line, and a stored colour the palette no longer holds), and a closed poll that has votes.
- **FR-020.** In the wizard, when the poll has votes and the only answers that differ from the stored ones are colours, Save uses the colours route; when anything else differs, it uses Publish.

# Assumptions

- The CrowdPoll web app, including the deployment on DigitalOcean, is still in development, so no migration or data conversion of existing polls is required.
- The text colour on the filled part of a bar is below 7:1 for eight of the 16 colours (lowest 4.60:1), as it is for half of the automatic palette; this is accepted. The one colour that fell below 4.5:1, the image's teal `#008488` (4.29:1), is replaced by `#007A7E` (4.88:1); the text on the unfilled part of every colour is at least 7:1.
- The names in the palette table are proposals and can be changed without affecting anything else.
- A bar's colour is not previewed on the edit card in this version; the colour dot is the preview, because the bar derivation is not available on the administration page.
- The administration page does not need the bar derivation. Only the poll card does.
- Choice ids are reissued whenever the choices are saved, as they are today; colours do not depend on them.

# Exclusions

- Choosing a colour with AI, or automatically from the choice's label.
- A free colour picker or a typed hex code; only the predefined palette.
- A preview of the result bar on the edit card.
- Changing the automatic palette, the Yes and No colours, or how Automatic choices are coloured.
- Making choice ids stable across saves.
- Avoiding automatic bars that look like a manual colour, or two bars of the same colour.
- A way to change colours without taking an edit session, and a colours-only save for a published poll that has no votes (it uses Publish, as a title change does).
- Any change to search, to acceptability screening, or to the vote path; colours are not text and are not votes.
- Any change to the Settings Summary, the read-only administration card, the JSON and Markdown exports, or the administration results page; none of them shows colours.
