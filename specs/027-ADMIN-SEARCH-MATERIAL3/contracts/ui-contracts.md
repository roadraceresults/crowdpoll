# Contract: user interface

There is no API change; `GET /api/admin/polls/search` and its query are untouched. These are the UI contracts.

## C1 — Panel geometry
`.admin-search` and `.poll-admin-card` share one rule: `width:100%; max-width:420px; margin:0 auto`, the same
padding (14 px under 640 px), corners (18 px under 480 px), border and shadow. Centred with the tabs, the
status line, Create New Poll and the cards; no sideways scroll at any width.

## C2 — Preserved identifiers
Ids `adminSearchForm`, `adminSearchClear`, `adminSearchNotice`; every control `name` listed in `data-model.md`;
classes `admin-search`, `admin-search-notice`, `admin-search-btn`, `admin-search-clear`. The panel keeps its
`hidden` attribute outside the Search view. New: `adminMoreToggle`, `adminMoreFilters`.

## C3 — Fields
One column in this order: `q`, `state`, the three radio groups (`visibility`, `choiceMode`, `voteMutability`),
`createdBy`, the `createdAt`, `startAt`, `endAt` groups (operator beside date), the `voteCount`,
`invitedVoterCount`, `bannedVoterCount` groups (operator beside number); then the actions. Text, number, date and
select fields are 56 px outlined fields with a visible `<label>`; operator and value in equal columns down to
320 px, stacked below. Labels: `q` "Words in the title, subtitle or choices"; `state` "State (Initialized, Open, Closed,
etc.)"; `createdBy` "Created by user name (contains)"; the operator selects "Created on", "Starts on", "Ends on",
"Vote count", "Invitee count", "Banned users count", with "Date" or "Count" on each value field. The state select, operator selects and `input[type=date]` stay native.

## C4 — Radio groups
`div[role=radiogroup][aria-label]` per group (Visibility, Choice mode, Vote mutability), three
`label.admin-radio > input[type=radio] + span` options in a row (single column under 360 px), each at least 48 px
tall, "Any" first with `value=""` and `checked`. Values and labels are in `data-model.md`. A group sends a filter
only when an option other than Any is chosen; Clear puts every group back on Any. The ring is 20 px in
on-surface-variant, primary with a primary dot when chosen.

## C5 — Buttons
**Search** filled, **Clear** a text button; each at least 48 px tall; state layers and ripple as the other admin
controls. There is no More filters control: every field is always shown.

## C6 — Status line
`p#adminSearchNotice[role=status]`, outside the panel, centred in the card column in every view, body-small
type in on-surface-variant, never boxed. Messages and error display are unchanged, except that the Search view shows
nothing (the line is empty and hidden) before a search has been run.

## C7 — The read-only card's Created By line
In the dates panel (`.card-dates-panel`), after the state buttons and before Created and Launched, one
`readOnlyField("Created By", …)` with the existing field styling. Value: `<username> (<email>)`; the email alone when
there is no username; no field when no creator is recorded. Data: `createdByName` and `createdByEmail` on the admin list
rows (`GET /api/admin/polls`, `GET /api/admin/polls/search`), empty when no creator is recorded; `AdminPollSummary` in
`postman/openapi.json` carries both.

## C8 — Collapsing the panel
`div.admin-search-toggle-row` holds `button#adminSearchToggle[type=button][aria-expanded][aria-controls=adminSearchForm]`
(a text button, at least 48 px tall, a chevron, state layers and ripple), directly above `#adminSearchForm` and outside it,
in the cards' 420 px column, right-aligned, shown only in the Search view and absent for a poll creator who is not an
administrator. Text: **Collapse Search** while open, **Expand Search** while collapsed (chevron turned over). Collapsed is
`data-collapsed` on the form (`display:none`), so its controls leave the tab order and keep their values. It collapses after
a search the user ran leaves one or more result cards on screen, stays open for no matches or an error, is expanded by the
toggle, by a click on the Search view tab (from another view or from the Search view itself) and by Clear, and is
never changed by the list's own refresh. In memory only.
