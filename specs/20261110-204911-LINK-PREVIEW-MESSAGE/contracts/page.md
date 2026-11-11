# Page Contract: `GET /login`

The feature changes one page route. No API route changes; `postman/openapi.json` documents API routes only and is
unchanged.

## P1. A guest with a published poll's PID

`GET /login?PID=<pid>` without a session, where `<pid>` names a poll for which `isOpenOrClosed` holds (public or
private; open or closed, a poll under edit by the state it held before).

- Status `200`, `Content-Type: text/html`, `Cache-Control: no-cache`, and the weak `ETag` Express gives every sent body
  (as `/poll/:pid` has), so a revalidation can answer `304`.
- The body is `login.html` as served today (fingerprinted assets, `<meta name="robots" content="noindex">`, the
  `/loginCard.js` form, every stylesheet in its pinned order), with its `<title>Login</title>` replaced by, in order:

  ```html
  <title>{title} · CrowdPoll</title>
  <meta name="description" content="{description}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="CrowdPoll">
  <meta property="og:title" content="{title}">
  <meta property="og:description" content="{description}">
  <meta property="og:url" content="{origin}/?PID={pid}">
  <meta name="twitter:card" content="summary">
  ```

  where `{title}` is the published title, `{description}` is as `data-model.md` defines it (subtitle, blank line,
  plain-text approved message; fallback; ≤ 300 characters), and every value is HTML-attribute-escaped.
- No `<link rel="canonical">`, no JSON-LD, no `og:image`.
- Other query parameters (`error`, `signedIn`, …) do not change the head; the PID alone decides it.

## P2. Every other request

`GET /login` without a PID, with a malformed one, with a PID that names no poll, or one whose poll is not published:
exactly today's response — `sendPage("login.html")`, `<title>Login</title>`, `ETag` and `304` on `If-None-Match`,
`Cache-Control: no-cache`.

## P3. Unchanged routes

- `GET /login` with a session: `302` to `/?PID=<pid>` (or `/`), before any lookup.
- `GET /?PID=<pid>`: a guest is sent to `/poll/<pid>` for an indexable poll, else to `/login?PID=<pid>`; a signed-in
  user to the poll's tab. Untouched.
- `GET /poll/:pid`: untouched in behaviour; its head tags are now built by the exported `previewHeadTags` plus its
  canonical link and JSON-LD, byte-for-byte as before.
- `GET /invite`, `/create-account`, `/confirm-signin`: untouched.
