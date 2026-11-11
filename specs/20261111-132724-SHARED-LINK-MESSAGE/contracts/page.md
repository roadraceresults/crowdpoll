# Page Contract: `GET /login`, `GET /poll/:pid`, `GET /robots.txt`, `GET /og-image.png`

## P1. `GET /login?PID=<pid>` for a guest and a published poll

As the previous feature's P1 (status `200`, `Cache-Control: no-cache`, the weak ETag, `login.html` with its
`<title>Login</title>` replaced), with these differences in the head:

```html
<title>{title} · CrowdPoll</title>
<meta name="description" content="{description}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="CrowdPoll">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{description}">
<meta property="og:url" content="{origin}/?PID={pid}">
<meta property="og:image" content="{origin}/og-image.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:type" content="image/png">
<meta name="twitter:card" content="summary">
```

- `{description}` is one line: the subtitle, ` - `, then the plain text of the poll's **mode message** with every run
  of white space (line breaks included) collapsed to one space; the subtitle alone or the message alone when only one
  exists; `{default}` (the `ENV_DEFAULT_LINK_PREVIEW_MESSAGE` value) when neither; cut to 300 characters with the
  ellipsis inside.
- The mode message is `link_preview_message` for a private "Anyone With The Link" poll, `invitation_message` for an
  "Invitation Only" poll, nothing for a public poll; always the approved column.
- Still no `<link rel="canonical">` and no JSON-LD; `noindex` stays.

## P2. Every other `GET /login`

Unchanged: the plain page, `<title>Login</title>`, `sendPage`'s ETag and 304.

## P3. `GET /poll/:pid`

Unchanged except the four `og:image*` tags above, inserted after `og:url` (before `twitter:card`), with the same
image. The description stays `describe()`'s: the subtitle or `Vote and see live results: {title}`, cut at 160.

## P4. `GET /robots.txt`

```text
User-agent: *
Allow: /
Allow: /poll/
Allow: /privacy
Allow: /terms
Disallow: /api/
Disallow: /admin
Disallow: /profile
Disallow: /login
Disallow: /create-account
Disallow: /invite
Disallow: /confirm-signin
Disallow: /accept-terms

User-agent: facebookexternalhit
User-agent: meta-externalfetcher
Allow: /
Allow: /login
Disallow: /api/
Disallow: /admin
Disallow: /profile
Disallow: /create-account
Disallow: /invite
Disallow: /confirm-signin
Disallow: /accept-terms
Sitemap: {origin}/sitemap.xml
```

`200 text/plain`, cached as today.

## P5. `GET /og-image.png`

`200 image/png`, served by `express.static` from `src/public` (production: `dist/public`): a 1200 × 630 PNG under
300 KB, the CrowdPoll figures on a white background.
