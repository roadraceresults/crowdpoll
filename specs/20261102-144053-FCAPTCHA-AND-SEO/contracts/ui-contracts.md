# UI Contracts

## C1. The human check view (`src/public/humanCheck.js`, `human-check-m3.css`)

On `/login`, `/create-account` (form mode; not when opened with an emailed `token`) and `/invite`, when
`/api/config` carries `humanCheck`:

- The page's card is not drawn. In its place, a `CardShell` card titled **"Vote protection"** holds:
  - the FCaptcha widget, checkbox mode, labelled **"I am not a Bot or AI Agent"**, without FCaptcha's maker name, `data-theme="auto"`, `data-action` = `login` | `create-account` | `invite`,
    `data-endpoint="/fcaptcha"`, its script loaded once from `/fcaptcha/fcaptcha.js`;
  - a line holding only the link **"What this safeguard checks."** to `/privacy#bot-check`, which lands with the
    section's "Bot check" title below the fixed header;
  - a status line, `role="status"` (`aria-live="polite"`).
- **Passed** → the same page, same address, draws its own card; the token is held in memory only.
- **Failed** → status: "We couldn't confirm you're a person. Please try again." and a **Try again** button that
  redraws the widget. On the third failure in a row in this page visit the status adds
  "If this keeps happening, write to support@crowdpoll.vote."
- **Not loaded within 10 s, or a load error** → status: "The human check is unavailable right now." and the page's
  own card is drawn without a token.
- When `humanCheck` is null, the page's card is drawn at once (as today).
- Nothing is logged to the browser console except one `console.warn` when the widget fails to load (no token, no
  address).

## C2. The sign-in cards after the check

- Each sign-in start request carries `X-Human-Check` when a token is held; the token is cleared once sent.
- A `400` with `code: "challenge-required"` → the card's typed values (email, "stay signed in", terms box) are kept,
  the check view (C1) is shown again, and on passing the card is redrawn with those values.
- Every other answer is handled exactly as today.

## C3. The poll page (`/poll/:pid`, guest)

`index.html`, served with:

- `<title>`: `<poll title> · CrowdPoll`;
- `<meta name="description">`: the poll description, or "Vote and see live results: <title>" when it has none,
  cut to 160 characters;
- `<link rel="canonical" href="<origin>/poll/<pid>">`;
- `og:type` `website`, `og:title`, `og:description`, `og:url`, `og:site_name` `CrowdPoll`, `twitter:card` `summary`
  (no image);
- `<script type="application/ld+json">`: a schema.org `Question` with `name`, `text`, `url`, `answerCount` and one
  `suggestedAnswer` (`Answer`, `text`) per choice;
- `<body data-poll-page="<pid>">`;
- at the start of `<main>`, `<article id="poll-summary">`: `h1` title, the description paragraph, a list of choices
  each with its percentage, and "N votes"; every value HTML-escaped (JSON-LD escaped for `</script>`).

In the browser, `tabs.js` opens Trending, fetches A4, mounts the card with `DeltaClient`, maximizes it, and removes
`#poll-summary`. If A4 fails, the summary stays and a notice says "This poll could not be opened."

## C4. Head tags of the other pages

- `index.html`: title "CrowdPoll — live opinion polls"; description "Vote on live opinion polls and see the
  results change as people vote."; canonical `<origin>/`.
- `privacy.html`, `terms.html`: their titles, a one-line description, canonical injected.
- `<meta name="robots" content="noindex">` on `login`, `create-account`, `invite`, `confirm-signin`, `accept-terms`,
  `profile`, `admin`, `admin-results`, `not-authorized`.

## C5. Privacy Policy

`privacy.html` gains `<section id="bot-check">` **"Bot check"** after `#cookies`: what is measured (device and browser
characteristics such as graphics, audio and font measurements; pointer, touch and typing timing; connection details),
why (to tell people from automated programs before a sign-in starts), where (CrowdPoll's own servers, never a third
party), how long (in memory for at most one hour), and that it sets no cookie and stores nothing in the browser. The
"In short" summary gains one line pointing to it. The Cookie Use table is unchanged.
