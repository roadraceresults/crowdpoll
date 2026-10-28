# Poll Card — extracted for design work

The production poll card, lifted out of the application so a variation can be designed without a
server, a database or a sign-in. Open `poll-card.html` in a browser — `file://` is enough, nothing
here fetches anything except the Google font the application itself uses.

Extracted 2026-09-22 from the working tree at that date.

## The files

| File | What it is | Where it came from |
|---|---|---|
| `poll-card.html` | The harness: eight sample cards in the states worth designing against, with controls for signed-in / guest, the Live Results form, the Search form, and a flip-all button. The only file here that is **not** production code. | written for this extraction |
| `poll-card.css` | The card's own stylesheet — design tokens, the two faces and the flip, the result bars, the voting rows, the scroll arrows, the buttons, the type scale and the breakpoints. | copy of `src/public/pollCard.css` |
| `poll-card-app.css` | The rules the application adds on top: the title row and Bookmark star, the totals and "you voted" lines, the closed / editing / blocked / vote-notice messages, the Vote button's label sizing, the `[hidden]` overrides those need, and the card grid. Each block is labelled with the file and line it came from. | curated from `src/public/site.css` and `src/public/tabs.css` |
| `poll-card.js` | The card component: the markup template, the render, the flip, the vote flow, the scroll arrows, the state rules. | copy of `src/public/pollCard.js` |
| `sample-data.js` | Eight `PollDetail` objects — the shape the card is fed at runtime — with a field-by-field guide at the top. | written for this extraction |

Load order matters and is production's: `poll-card.css`, then `poll-card-app.css`. Several rules in
the second deliberately beat the first at equal specificity (the `.vote-btn` grid, the `[hidden]`
rules); swapping them breaks the card.

## What the harness shows

Eight cases, each in its own grid so you can see the card at grid width rather than in isolation:

1. an open poll the viewer has not voted in;
2. voted **and** bookmarked, with the personal-tab lines underneath;
3. multiple-choice, invitation-only, with "not yet voted" in the totals;
4. closed, with its closing date;
5. being edited by an administrator;
6. a viewer who may not vote, with the blocked message;
7. a deliberately long title, long labels and seven choices — the stress case for wrapping, bar
   heights and the scroll arrows;
8. no votes yet — every bar at zero.

The three toggles reproduce the three ways the application configures the card:

- **Signed in / guest** — a guest's card sends them to sign in on Vote, Live Results and Bookmark,
  and the Live Results bars freeze (`body.is-guest`).
- **Live Results tab (X form)** — the tab supplies a remove handler, so the bottom-row link shows an
  X and reads "Remove from Live Results" instead of the animated bars.
- **Search tab (no Vote)** — search results carry no Vote button.

The log in the bottom right records the callbacks the card fires (`onVoted`, `onLive`,
`onBookmark`, `onClose`), which is the whole of its interface with the page that owns it.

## How the card is driven

Two globals and one call. In the application, `tabs.js` mounts the card and `deltaClient.js` feeds
it; the harness does both directly:

```js
const instance = window.PollCard.mount(gridElement, pid, options);
instance.applyPoll(detail);   // again whenever the data changes
instance.unmount();           // when the poll leaves the listing
```

**`options`** — `isSignedIn()`, `showVote`, `showLive`, `showBookmark`, and the callbacks
`onVoted(pid, outcome)`, `onLive(pid, poll)`, `onBookmark(pid, bookmarked, poll)`,
`onClose(pid, poll)`. Supplying `onClose` is what puts the bottom-row link into its X (remove) form.

**`detail`** — a `PollDetail`: the poll's content, its choices with counts and percentages, the
totals, and the viewer's own overlay (what they voted, whether they bookmarked it, whether they may
vote at all). `sample-data.js` documents every field.

**`window.VoteClient`** — the card submits votes through it (`canVote()`, `submit(pid, choiceIds)`,
`QUEUED_NOTICE`). The harness stubs it: a vote is accepted, the counts move, and the bars re-render,
with nothing leaving the page.

## Designing a variation

Everything visual is in the two stylesheets; everything structural is the template at the bottom of
`poll-card.js` (`POLL_CARD_TEMPLATE`). A variation usually means one of:

- **Look only** — edit `poll-card.css` (and `poll-card-app.css` for the title row, the messages and
  the footer lines). Nothing in the script needs to change; the class names are the contract.
- **A new region or control** — add it to `POLL_CARD_TEMPLATE`, style it, and wire it in
  `initPollCard()` beside the existing controls. The card reads its data from the one `poll` object
  and re-renders on `applyPoll()`; keep new state on that object rather than in the DOM.
- **A different size or layout** — the card is fluid (`width:100%`), capped and centred by
  `.card-viewport { max-width:420px }`, and the two faces share a CSS grid cell so front and back are
  always the same height. The bars region is the flexible one: it takes the space left after the
  question and the actions, and scrolls when it runs out (`computeBarLayout()` in the script).

Three things that look like decoration but are load-bearing, worth knowing before you move them:

- The **grid that overlays the two faces** is what stops the card resizing when it flips.
- The **`.btn-vote-sizer`** inside the Vote button is a hidden copy of the longer label ("Submit
  vote") sharing one grid cell with the visible one, so the two buttons resolve to the same width at
  every card size.
- The **`[hidden]` overrides** in `poll-card-app.css` exist because several base rules set
  `display:flex`, which otherwise defeats the plain `hidden` attribute the script uses to show and
  hide the messages and buttons.

## Taking a variation back to the application

These files are a copy, not a link — editing them changes nothing in the app. When the design is
settled, the change lands in `src/public/pollCard.css`, `src/public/pollCard.js` and, for the rules
that live there, `src/public/site.css`. Diff the extracted file against its source first: the
application may have moved on since the extraction date above.

## Note on this directory

`research-requirements.md` in this directory is about a different topic (separate servers) — it
looks like a template copied here and not yet rewritten. Nothing in this extraction reads it.
