# Contract: UI behaviour

What the administration page must do, expressed so it can be verified. Layout is governed by
`designDocs/014-poll-edit-card-mockup.jpg`, which is authoritative for arrangement only — where it and
the requirements disagree (a `Discard` label, a `Refresh` icon, a four-item actions menu, old constant
spellings), the requirements govern.

## C1 — The card list

- One card per poll, one per row, single column, newest first, no filter, no paging of the list itself.
- Card width follows the existing container rules; height follows content. The page must never scroll
  horizontally at any window width. The table's horizontal-scroll wrapper has no successor — a card
  reflows where a ten-column row could not.
- Every `table.admin-poll-list` rule in `admin.css` is removed rather than left dead.

## C2 — Read-only form (the default for every card on load)

Displays: title, subtitle, choices, start, end, voter count limit as read-only values; choice mode,
vote mutability and visibility as text; state, rejection reason, created; and the three counts.

Offers: the pen control; open, close and archive; the action icons and the actions menu.

Hides: save, cancel, and both roster sections.

Enablement for open, close, archive and every action comes from the server's capability flags, exactly
as the table's did. In read-only form the poll carries its real state, so those flags are meaningful —
which is why these controls live here and not in editing form.

## C3 — Editing form

Editable: title, subtitle, choices, start, end, voter count limit. Mechanics settings render as
selectable groups or as frozen text according to the poll's vote history — a value the server would
refuse must never look editable.

Offers: save and publish (enabled only when there are valid changes), cancel (**always** enabled), and
both roster sections.

Hides: the action icons and menu; open, close and archive; the state label, state and rejection reason;
the three counts and their labels.

Cancel is always enabled because it and save are the only two controls that return a card to read-only
form, and save is disabled until the card is dirty. A cancel that greyed itself out would strand a card
opened by mistake while it still held the poll.

## C4 — Mode transitions and the editing session

Entering: the pen control shows it is working and cannot be activated twice while the claim is in
flight; the card changes form only once the claim succeeds. A refusal leaves the card in read-only form
with the server's message on it.

Leaving: save and publish (both outcomes), cancel, navigating away, or a lost claim. The first three
release the session; the fourth has nothing to release.

**Invariant to test directly**: no card in read-only form holds an editing session.

At most one card per open page may be in editing form. While one is, every other pen and the create
control are disabled.

## C5 — The background refresh

Continues at the existing interval. It reconciles membership, states, counts and capability flags for
every card **except** the one in editing form, whose DOM is not replaced and whose row in the response
is ignored entirely.

Nothing visible goes stale: state, rejection reason and the counts are hidden in editing form.

## C6 — Roster sections

Both appear only in editing form, both collapsed initially. The first is labelled `Invitations` on an
invitation-only poll and `Participants` otherwise; the second is always `Banned Voter List`.

Rows: email address first, then display name in angle brackets where known, then one status suffix per
applicable state, each preceded by " - ". Sorted ascending by lower-cased address in code-point order.
Banned rows carry an address only.

Per-row actions are local edits saved with the poll: ban, un-ban, and — on an invitation-only poll only
— invite. Cancel discards them with everything else.

The pager, shown only when expanded and only when the list is displayable: range `i - j` with `j`
clamped to the total; `(N items)`; `Page [p] of [q]`; previous and next. The page box commits on Enter
or blur, clamps to `[1, q]`, reverts unparseable input, and always shows the page actually rendered.

Three list states, two of which replace the list entirely:

| State | Shows |
|---|---|
| Displayable | Rows, one page at a time, at the configured page size, fixed height, no scrollbar |
| Empty | "No participants yet." / "No invitations yet." / "No banned voters." — no pager |
| Over the ceiling | "There are `N` …. This list is too large to display (limit …)." — no rows, no pager. `N` is the card's count field, not a length of the empty array |

The list area keeps the same height in all three, so paging and expanding never resize the card.

## C7 — Messages

A message about a poll appears on that poll's card, in a status line at the top. Nothing about a card is
reported by navigating or reloading.

The status line is a **separate element** from the standing state-detail field beside `State`. They
stack; neither overwrites the other. Both appear together on a rejected poll whose edit claim is
refused, and on a held-back publish of a previously rejected poll.

The status line is transient and clears on the next successful action on that card.

## C8 — Constants rendered verbatim

Choice mode, vote mutability and visibility render as the stored value, unchanged, everywhere: editable
or frozen, administrator or voter. No abbreviation, no title-casing at render time, no lookup table.

Today the same setting reads two ways on one page — a friendly label when editable, the raw constant
when frozen. After this feature both read `Single-Choice Poll`.

## C9 — Accessibility

- Every control keyboard-operable: pen, actions, state controls, expand and collapse, pager, per-row
  actions.
- Every control names both its action and its poll, so a control reached out of visual context is
  unambiguous.
- Focus moves deliberately across a mode change: to the title field on entering, back to the pen on
  leaving by any route.
- Expanded/collapsed state and current/total page conveyed to assistive technology, not by styling
  alone.
- A message appearing on a card is announced, so a refusal is not silent to a user who cannot see it.
- This restates the standard the existing actions menu already meets (`role="menu"`, `aria-expanded`,
  arrow-key navigation, Escape to close). The feature must not regress it. No formal conformance level
  is claimed.
