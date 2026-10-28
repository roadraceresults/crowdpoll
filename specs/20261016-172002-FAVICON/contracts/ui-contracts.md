# UI Contracts: Site Favicon

## C1. `favicon.svg`

- Served as `image/svg+xml`, at `/favicon.svg` (no manifest) or `/assets/<hash>/favicon.svg` / the CDN (built).
- Root element: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="10 4.5 96 96">`, no `width`/`height`, so it scales to whatever square the browser asks for.
- First child `<title>CrowdPoll</title>`; no other text, no comments.
- Draws the two figures only (data-model.md); transparent background.

## C2. `favicon.ico`

- ICO header with count 3; directory entries in the order 16, 32, 48 px; each entry's data begins with the PNG signature `89 50 4E 47 0D 0A 1A 0A`.
- Every image is the rendering of C1 at that size.

## C3. Page links (all seven pages)

Directly after `<meta name="viewport" content="width=device-width, initial-scale=1">`, exactly:

```html
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="icon" href="/favicon.ico" sizes="16x16 32x32 48x48">
```

As served, the `href`s are `assets.ts`'s rewrite of these (unchanged when there is no manifest). Pages: `index.html`, `login.html`, `create-account.html`, `profile.html`, `admin.html`, `admin-results.html`, `not-authorized.html`. Nothing else in any page changes; titles stay as they are.

## C4. `GET /favicon.ico`

- `200`, `Content-Type` `image/vnd.microsoft.icon` (from `express.static`) or `image/x-icon`; body identical to C2.
- Served whether or not the visitor is signed in; no new route.

## C5. `devScripts/favicon-ico.ts`

- Usage: `npx tsx devScripts/favicon-ico.ts` from the project root.
- Browser: `FAVICON_BROWSER` if set, else `C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe`. Missing browser → exits non-zero with `[favicon] Browser not found: <path>. Set FAVICON_BROWSER to a Chromium-based browser.`
- Renders C1 at 16, 32 and 48 px (headless, device scale 1, transparent background, a temporary profile directory); a PNG of the wrong size → exits non-zero naming the size. A browser that exits non-zero or runs past 30 s → exits non-zero with `[favicon] Browser failed rendering <s> px: <message>`; no screenshot written → exits non-zero with `[favicon] No screenshot for <s> px`.
- Writes C2 to `src/public/favicon.ico`, logs `[favicon] wrote src/public/favicon.ico (16, 32, 48 px, <bytes> bytes)`, and removes its temporary directory on every exit path.
- Not run by `npm run build` or `npm test`.
