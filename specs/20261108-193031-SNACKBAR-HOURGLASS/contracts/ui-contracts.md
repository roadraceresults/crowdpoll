# UI Contracts: Snackbar Hourglass

No HTTP contract changes: no route, request or response is added or altered, so `postman/openapi.json` is unchanged.

## C1. When the notice appears (`app.js`)

| At load | Result |
|---|---|
| `signedIn=1`, terms accepted, email known | the notice, with the hourglass (C2–C5) |
| `signedIn=1`, terms not accepted | no notice; the Accept Terms card says "Logged in as" (unchanged, no hourglass) |
| `signedIn=1`, no session or no email | no notice |
| no `signedIn` (reload, ordinary load) | no notice |

A provider login carries `signedIn=1` on its `callbackURL`. An emailed-link login carries it on the address `completeSignIn` (`src/routes/api.ts`) sends it to: `/?signedIn=1` or `/?PID=<pid>&signedIn=1`, for the login link, its confirmation page, the create-account link and an invitation's Continue.

In every case `signedIn` is removed from the address at once, as today.

## C2. The notice's markup (`showSignInNotice`)

- The bar gets `class="m3-snackbar m3-snackbar--top m3-snackbar--timed"`, `role="status"` and inline `--m3-snackbar-timer: <SIGN_IN_NOTICE_MS>ms`.
- In one `requestAnimationFrame` callback, these happen together:
  - `span.m3-snackbar-text` gets the text `Logged in as <email>` (`textContent`);
  - `svg.m3-snackbar-hourglass` is appended after it;
  - `is-shown` is added;
  - the `SIGN_IN_NOTICE_MS` timer starts.
- When the timer fires, it removes `is-shown`, as today.
- The SVG has `aria-hidden="true"`, `focusable="false"`, `viewBox="0 0 22 32"`, and the parts `hourglass-frame`, `hourglass-top`, `hourglass-stream` and `hourglass-bottom` (data-model.md).
- The bar's `textContent` is exactly `Logged in as <email>`, and it holds no button or link.
- `SIGN_IN_NOTICE_MS = 7000`.

## C3. Layout (`snackbar-m3.css`, under `.m3-snackbar--timed` only)

| Rule | Value |
|---|---|
| bar block padding | `8px` (inline padding stays `16px`) |
| text | `flex: 1 1 auto; min-width: 0; overflow-wrap: anywhere` |
| hourglass | `flex: none; width: 22px; height: 32px; margin-inline-start: 12px` |

One line of text gives a 48 px bar. A wrapped address makes the bar taller, while the hourglass keeps 22 × 32.

## C4. Colours and motion (`snackbar-m3.css`)

- `hourglass-frame`: `fill: none; stroke: var(--md-sys-color-inverse-on-surface)`.
- `hourglass-top`, `hourglass-bottom`, `hourglass-stream`: `fill: var(--md-sys-color-inverse-primary)`.
- Each `.hourglass-part`: `transform-box: fill-box`, `animation-duration: var(--m3-snackbar-timer)`, `animation-timing-function: linear`, `animation-fill-mode: forwards`, one iteration.
  - `hourglass-top`: origin bottom centre, `scaleY(1)` → `scaleY(0)`.
  - `hourglass-bottom`: origin bottom centre, `scaleY(0)` → `scaleY(1)`.
  - `hourglass-stream`: `opacity` 1 from 0% to 98%, then 0.
- The resting state is full: top `scaleY(1)`, bottom `scaleY(0)`, stream `opacity: 0`.
- `@media (prefers-reduced-motion: reduce)`: `.m3-snackbar--timed .hourglass-part{ animation:none; }`.
- The animation is keyed to `.m3-snackbar--timed`, never to `.is-shown`, so the fade at the end does not refill the sand.
- Only M3 tokens are used for colour, and there is no literal font size.

## C5. What does not change

- `adminCard.js`'s snackbar ("Link copied", "Choices pasted", …), `profileCard.js`'s `.profile-snackbar` and `acceptTermsCard.js`.
- The notice's position (top centre), its fade (150 ms, none under reduced motion) and its trigger (C1).
- Each page's stylesheet list (`tests/m3-assets.test.ts` `PAGES`, `LAYER_ORDER`).
