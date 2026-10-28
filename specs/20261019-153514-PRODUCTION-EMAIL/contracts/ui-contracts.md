# UI Contracts: Production Email

## C1. The hidden field (login, create account, email change)

In the login, create-account and email-change forms, which `loginCard.js`, `createAccountCard.js` and `profileCard.js` build in JavaScript; one helper, `CardShell.hiddenField(parent)` in `cardShell.js`, adds this markup to each:

```html
<div class="hp-field" aria-hidden="true">
  <label>Leave this field empty <input type="text" name="homepage" tabindex="-1" autocomplete="off"></label>
</div>
```

- `.hp-field` is positioned off-screen (`position:absolute; left:-10000px; width:1px; height:1px; overflow:hidden`) in `site.css`;
  never `display:none`.
- `loginCard.js`, `createAccountCard.js` and `profileCard.js` add `homepage: <the input's value>` to the JSON they already send.
- Keyboard focus never reaches it (`tabindex="-1"`), screen readers skip it (`aria-hidden`), and its label tells a human who
  somehow sees it to leave it empty.

## C2. The confirmation page, `/confirm-signin`

A new page, `src/public/confirm-signin.html`, with `confirmSigninCard.js`, served by `src/routes/pages.ts` like `/login`, in the
same card style as the login page (`card-shell-m3.css`), with the site header and favicon links of the other pages.

| State | Content |
|---|---|
| Loading | The card with "Checking your sign-in link…". |
| Valid link (A5 `200`) | Heading "Sign in on this device?"; "This link signs you in as **`<email>`**. It was requested on `<date and time, in the visitor's locale>` from another browser or device."; buttons **Sign in** (primary) and **Not now** (text button). |
| After **Sign in** | Posts A6; on `200` goes to `redirect`; on `400` goes to its `redirect`. The button is disabled while the request runs. |
| **Not now** | Goes to `/login` (keeping `?PID=` when present). |
| Invalid link (A5 `404`) | "This sign-in link is invalid or has expired." with a link to `/login` to request a new one. |

The address is inserted as text (`textContent`), never as HTML.

## C3. The cookie banner

`src/public/app.js` banner text: "This app uses a strictly necessary session cookie to keep you signed in, and a short-lived
security cookie while a sign-in link is waiting to be used. No other cookies are set." The **I Understand** button and its
`localStorage` acknowledgement are unchanged.

## C4. The email layout

Every message (`src/email/templates.ts`, research R6):

| Part | HTML | Text |
|---|---|---|
| Preheader | Hidden preview line (the message's first sentence). | — |
| Header | A `#2C6A46` bar with `<origin>/email-logo.png` (48 × 48, `alt="CrowdPoll"`) and the word mark "CrowdPoll" in white. | `CrowdPoll` |
| Heading | The message's heading. | The heading. |
| Body | The message's paragraphs, every inserted value escaped. | The same paragraphs. |
| Action (if any) | A `#2C6A46` button with white text, then "Or copy this link: `<url>`". | The URL on its own line. |
| Footer | "Questions? Write to support@crowdpoll.vote." and "You received this email because someone entered this address at crowdpoll.vote." | The same two lines. |

Width 600 px, table layout, inline styles only, system font stack, no tracking pixels, no `Reply-To`. The wording of each message is in
`email-messages.md` and is approved by the developer before implementation.
