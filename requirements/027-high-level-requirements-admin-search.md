Start a new spec for these requirements called `027-ADMIN-SEARCH-MATERIAL3`.

# Overview
The purpose of this requirements doc is to describe enhancements to the admin search functionality.    

The html elements being redesigned are `<form class="admin-search" id="adminSearchForm">` and
`<p class="admin-search-notice" id="adminSearchNotice">`. Their ids, the `name` of every control, and
the classes `admin-search-btn` and `admin-search-clear` do not change.

## Search Panel Size  

The search panel should be responsive and have the exact same sizing as the Admin Poll Cards.

"Sizing" means the cards' whole container geometry: `width:100%; max-width:420px; margin:0 auto`, the
same padding (16px 18px, 14px under 640px), the same corners (20px, 18px under 480px), the hairline
border and the same shadow. The panel and the cards share one rule in `admin.css`, so they cannot drift
apart.

The notice is a separate element outside the panel, in the same centred 420px column. It also serves the
Newest, Awaiting Approval and Rejected views, where there is no form, so it is never boxed.

## Material 3 Compliance  

The admin search form and notice should follow Material 3 design principles, including proper spacing, typography, and responsive behavior. This ensures a consistent look and feel with the rest of the admin interface.

## Layout

The controls stack in one column of full-width fields, all shown at once, in this order: free text, state;
then visibility, choice mode and vote mutability as three radio groups; then created by; then Created,
Starts and Ends, each an operator select beside its date field; then Votes, Invited and Banned, each an
operator select beside its number field; then the actions, Clear and Search. Operator and value stay side
by side down to 320px, and stack below that.

## Collapsing the panel

A text button above the panel, outside it, in the same centred 420px column, collapses and expands it. It
reads **Collapse Search** while the panel is open and **Expand Search** while it is collapsed, is at least
48px tall, has a chevron, and reports its state with `aria-expanded` and `aria-controls`. It shows only in
the Search view, and a poll creator who is not an administrator sees neither the panel nor the button. A
collapsed panel keeps what was typed and cannot be reached by keyboard.

The panel collapses by itself after a search the administrator ran has put one or more results on screen. It
stays open when nothing matched or the search failed, so the filters can be changed, and it is never
collapsed by the list refreshing on its own. A click on the Search view tab, from another view or from the
Search view itself, expands a collapsed panel. The state is kept in memory only.

## Radio groups

Visibility, choice mode and vote mutability are each one row of three radio options, so the form is shorter
than three selects would make it:

| Group | Options, in order |
|---|---|
| Visibility | Any visibility (chosen by default), Public, Private |
| Choice mode | Any choice mode (chosen by default), Single Choice, Multiple Choice |
| Vote mutability | Any vote mode (chosen by default), Vote can change, First vote is final |

Each option is at least 48px tall, with a 20px ring in on-surface-variant that turns primary with a primary
dot when chosen, and no motion under `prefers-reduced-motion`. Under 360px a group becomes a single column.
Each group is a `role="radiogroup"` with an accessible name. The radios keep the `name`s `visibility`,
`choiceMode` and `voteMutability` and the values the selects had, with Any as the empty value, so the search
request is unchanged. A group sends a filter only when an option other than Any is chosen, and **Clear**
puts every group back on Any.

## Components

- Outlined text, number, date and select fields, 56px tall, with a visible label, on an 8px spacing grid.
  Operator selects are compact outlined selects, in an equal-width column beside their value. The labels are:
  "Words in the title, subtitle or choices"; "State (Initialized, Open, Closed, etc.)"; "Created by user name
  (contains)"; "Created on", "Starts on" and "Ends on" (each with a "Date" field); "Vote count", "Invitee
  count" and "Banned users count" (each with a "Count" field).
- Roboto: body large for values, body small for labels and for the notice (supporting text, in
  on-surface-variant).
- **Search** is a filled button and **Clear** a text button, each at least 48px tall, with the focus ring,
  state layers and ripple the other admin controls use.
- The state select, the operator selects and `<input type="date">` stay native.

## Accessibility

Every control has a real visible label: a `<label>` for each field, and each radio option's own text, with
an accessible name on each radio group. The notice is a live region (`role="status"`), so a result count or
an error is announced.

## Themes and scope

Colours come from the tokens only, so dark mode follows wherever it is turned on; `admin.html` stays
light, as it is today. `admin-results.html` has no search form and is untouched. Validation is unchanged:
an invalid search still answers with an error shown in the notice, and no per-field error states are
added. The search request, the views and the creator-only view are unchanged.

## The status line before a search

The Search view shows no message before a search has been run: the notice is empty and hidden there. The
old "Fill in the form and press Search." prompt is removed, because this form is not user facing. The
notice's other messages (the cut-off texts, the empty-view texts, "No polls match." and search errors) are
unchanged.

## The read-only poll card

The read-only poll card shows who created the poll, in the same style as its dates and above them:
`Created By: <username> (<email>)`, above Created and Launched. With no username it shows the email alone,
and with no recorded creator it shows no such line. The administration list and the search results carry
the creator's username and email address for this; the email is looked up from the creator's account, not
stored on the poll.
