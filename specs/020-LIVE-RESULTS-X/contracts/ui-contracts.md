# UI Contracts: Live Results X

What a poll card shows and does, stated as behaviour the tests and the quickstart can observe.
This document **supersedes the Live Results rows of
`specs/017-SEARCH-AND-SCALABILITY-DATABASE/contracts/ui-contracts.md`** — the line that says the
Live Results tab's cards carry no Live Results link, and that feature's FIX025 record describing
the corner X as the removal control. Everything else in 017's contract — the tabs, the floors, the
deltas, the refresh timer, the idle prompt, the `409 live-cap` refusal — is unchanged and still
governs; 017's file is annotated, not rewritten.

Client files: `pollCard.js` (the control), `pollCard.css` (the icon's box), `site.css` (the two
deleted corner rules), `liveResults.js` (the grid's options and the focus placement). `tabs.js` is
not written.

## The control

One element in the left slot of the card's **front-face** bottom row, on every tab.

| | Add form | Remove form |
|---|---|---|
| Where | every tab but Live Results | the Live Results tab |
| Icon | `.live-bars` — three animated bars | `.live-x` — a plain stroked X, 14 × 14, `currentColor`, no border or background |
| Label | `Live Results` | `Live Results` |
| `title` | `Add to Live Results` | `Remove from Live Results` |
| `aria-label` | absent (the label names it) | `Remove from Live Results` |
| Activation | adds the poll and switches to the Live Results tab | removes the poll from the tab |
| Selected by | the tab supplies no remove handler | the tab supplies a remove handler |

- Exactly one icon is present in the layout at a time; the other carries `hidden`.
- The label element is never touched between forms, so it does not move.
- Hover: the label takes its underline in both forms; the icon takes no hover, colour or size
  change of its own.
- Focus: the control is reachable by Tab and shows the focus indication it shows today.
- The X never animates. The reduced-motion and guest rules continue to govern the bars alone.

## The title row

- The card's title row is `question · Bookmark` on **every** tab, including Live Results. No card
  carries a corner removal button any more, hidden or otherwise.
- The Bookmark star's position is the one every other tab has today.

## When the control is shown

| Poll state | Add form | Remove form |
|---|---|---|
| Open | shown | shown |
| Closed | hidden (a closed poll may not be added) | **shown**, with `Poll closed on <date>` beside it in the same row |
| Being edited | hidden | **shown**, with the editing note beside it |
| Viewer may not vote | shown; the blocked note withdraws Vote and Submit only | shown; same |
| Tab passes `showLive: false` | hidden | not applicable — the Live Results tab no longer passes it |

The notes' precedence rules are unchanged: editing over closed, and both beside the control rather
than in place of it.

## Activation

| Input | Effect |
|---|---|
| Click | the form's action |
| Enter | the form's action; the page does not navigate |
| Space | the form's action; the page does not scroll |
| Any other key | nothing |

In add form a guest is sent to sign in first, exactly as today. The Live Results tab is
members-only, so the remove form never meets a guest.

## Removal

Unchanged from today in every observable way: the same request, the same `live-membership`
allowance and its "please wait" notice, the same server answer replacing the tab's order, the same
empty-state line when the last poll goes, the same behaviour on a network failure (the card
stays).

**New**: after a removal the member performed, focus is placed —

| Situation | Focus |
|---|---|
| A card now occupies the vacated position | that card's control |
| None does, others remain | the previous card's control |
| No cards remain | the tab's empty-state line (given `tabindex="-1"` when shown) |
| Refused or failed | unchanged; the control keeps focus |

## What the card must never do after this feature

- Render a removal button in the title row, on any tab.
- Show both icons at once, or neither, in a visible link.
- Hide the control on the Live Results tab because the poll closed, is being edited, or the viewer
  may not vote in it.
- Offer the control on the card's voting face.
- Leave focus on the document body after a removal.
- Announce the remove form as "Add to Live Results".
