# UI Contract: UI/UX Revisions

**Feature**: 013-UI-UX-revisions | **Date**: 2026-09-07

## C1 — The card shell

`window.CardShell`, from `src/public/cardShell.js`, loaded `defer` after `/app.js`.

```
CardShell.mount(container, {
  title,       // string — rendered as the page's <h1>, styled .question
  subtitle,    // string | node | omitted — the subtitle slot
  closeHref    // string — the close control's destination
}) -> { subtitle, body, actions }   // regions the caller fills
```

**Structure**: one face, no rear face, no flip, no timer. A title row carrying the title and the
close control; an optional subtitle slot; a body region; an optional action row.

**Rendering rule**: only regions with content are rendered. A card with no subtitle renders no
subtitle region and no space where one would have been. Nothing pads a card to a fixed size.

**Styling**: reuses `pollCard.css`'s `.card-face`, `.question`, `.subtitle`,
`.btn-primary.btn-vote`, `.icon-btn` and `.card-viewport` without redefining them. Shell-specific
rules live in `site.css`. Consumers do **not** instantiate `PollCard`.

**Close control**: an `<a href>` to `closeHref` carrying an × glyph in `.icon-btn` chrome,
`aria-label="Back to the home page"`, its SVG `aria-hidden="true"`. It follows the title in markup,
is the card's first focusable element, and takes a visible focus indicator. **Escape does not
dismiss the card.**

**Sizing**: `.card-viewport` gives `width:100%`, `max-width:420px`, `margin:0 auto`. Consumers set
their own `min-height` or none. A card taller than the viewport scrolls the page; it never becomes
a scroll container and never clips.

### Consumers

| Page | Title | Subtitle slot | Body | Actions |
|---|---|---|---|---|
| Login | "Login" | Explanatory line | Address field, stay-signed-in checkbox | One, right-justified |
| Create Account | "Create Account" | Explanatory line | Address field | One, right-justified |
| Profile | "Profile" | Avatar, right-aligned, no text | Name group, address value, change-address group | Two, one per group |
| Not Authorized | "Not Authorized" | Explanatory line | — | — |

---

## C2 — Status lines

Every action has a `<p role="status">` directly below it, present and empty from first paint.
Login, Create Account and Not Authorized have at most one; Profile has two, one per action.

A refusal renders into the status line of the action that was submitted. A notice arriving with the
page rather than from an action renders into the status line of the action it concerns, or into the
first status line where it concerns none: `/login?error=invalid-link` goes into the Login card's
only status line, and a `/profile` verification result goes into the Change Email Address group's.

The element must exist before the text does: a live region announces text arriving *into* it, so a
message rendered into an element created at the same moment announces nothing.

A page-load notice that can reach two different audiences carries a wording for each. The
`/profile` verification result is the only one: on the session-less result card it tells the person
to sign in with their new address, because they have no session in that browser; in the Profile
card's status line it does not, because the change does not end a session and that visitor is
already signed in. Same event, two readers, two sentences.

---

## C3 — Submission behaviour

| Card | Action | Success | Refusal / rate limit |
|---|---|---|---|
| Login | Email me a login link | Stay; "Check your inbox — click the link we sent you to sign in"; action settles | Stay; reason in the status line |
| Create Account | Create Account | Stay; "Check your inbox — click the link we sent you to activate your account"; action settles | Stay; reason in the status line |
| Profile | Save User Name | Stay; card and header show the new name | Stay; reason in that action's status line |
| Profile | Send Verification Link | Stay; status line names the address the link went to | Stay; reason in that action's status line |

Success for Send Verification Link is a **successful response**, not a particular code — that
endpoint answers `202`.

**While a submission is in flight** its action is unavailable and shows that work is in progress.
No further submission is possible until the outcome arrives, so one intended action consumes at
most one attempt against a rate limit.

**An action may be held unavailable by its page** until its inputs are usable. Every card action is
held while the field it acts on is empty; the sign-in card holds its stay-signed-in choice with it.
The profile card re-evaluates both gates whenever it adopts a snapshot, because adoption writes the
display name and can clear the change-address box. The shell
keeps that gate separate from the in-flight and settled states, so typing during a request cannot
re-enable the button and a completed request stays settled whatever the fields say.

**An action that has succeeded settles**: it stays unavailable rather than returning to its resting
state, so a link already sent cannot be requested again by a second click. An unavailable action
must also *look* unavailable — neither `pollCard.css` nor `site.css` styles `:disabled`, so the
shell supplies that itself; without it the control ignores clicks while still inviting them. **No card action
navigates away on success** — the Profile card's two never did, and Login and Create Account no
longer do either, because the card's status line is the only place their confirmation can appear.

---

## C4 — The session snapshot surface

`app.js` exposes, on the existing client namespace:

```
getSession()            -> snapshot | null     // the page's current view
subscribe(fn)           -> unsubscribe          // fn(snapshot) on every adoption
```

Consumers read `getSession()` at evaluation time rather than caching it. `pollGrid.js`'s
`isSignedIn` becomes such a read.

Adoption re-renders the header, any signed-in gating and whatever the page derives from the
session. It does not navigate, except: Login and Create Account go to `/` on `null` → signed-in,
and a session-required page goes to `/login` on signed-in → `null`.

On the Profile card, an adopted snapshot whose `emailAddress` differs updates the displayed address
and clears the change-address box. A display name the person is currently editing is not
overwritten.

---

## C5 — Participant rows

`emailAddress <userName>` where a name is known, else `emailAddress`, followed by ` - Invited`
and/or ` - Voted`:

| Poll visibility | Row source | Suffixes |
|---|---|---|
| Private — invitation only | Invited list in the editor, incl. unsaved | ` - Invited`, plus ` - Voted` when in `voted` |
| Private — anyone with the link | `voted` | ` - Voted` |
| Public | `voted` | ` - Voted` |

All lists sort by code-point order on the lower-cased address. The banned list keeps its current
rendering, takes the same sort, and carries neither suffix. The invite control is labelled
**"Invite"**.

---

## C6 — Header

Source order becomes: `a.brand` → `.header-search` → `.header-nav` → `#header-actions`. No spacer,
no `margin-left:auto`, no change to `justify-content`. `<div class="brand">` becomes
`<a class="brand" href="/">` with both SVGs as decorative children.

Below 768 px `site.css` gives `.header-search` `order:3`, which overrides source order — the narrow
arrangement is identical before and after, and that media block must not be "corrected".

The administration list gains a back control matching the poll-editing page's `.admin-back-link`,
left-justified above "Create New Poll", pointing at `/`.

Every navigation this feature introduces is an anchor with a literal `href`, or a `location.href`
assignment. Nothing calls `history.back()`.
