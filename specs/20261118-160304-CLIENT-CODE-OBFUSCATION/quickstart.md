# Quickstart: Client Code Obfuscation

How to check the feature end to end. The contract is [contracts/build.md](contracts/build.md); the decisions are in
[research.md](research.md).

## Prerequisites

```
npm ci
```

## 1. Automated checks

```
npx tsc --noEmit
npm test                                   # source-only, no build needed
npx vitest run tests/build-assets.test.ts  # the build contract, B1–B14 and B16
npm run test:built                         # builds, then the client suites against dist/public
```

All four pass.

Recorded 2026-11-18, on the development machine: before any change, `npx tsc --noEmit` passed and `npm test`
passed (212 files, 3 skipped, about 23 minutes); nothing was already failing.
`npx vitest run tests/build-assets.test.ts` takes about 3 seconds for its 41 tests, well inside the 20 seconds of
SC-009.

## 2. Build both ways and look

```
npm run build
```

Expected: `[build] client files: transformed`, a `compressed size` line whose second number is smaller than its
first, and the fingerprinted-assets line.
Open `dist/public/pollCard.js`: one line, no comments, no readable message text.
Open `dist/public/index.html` and `dist/public/pollCard.css`: no comments.

Recorded 2026-11-18: `[build] compressed size: 278434 → 260096 bytes (-6.6%)`, 78 fingerprinted assets;
`pollCard.js` went from 75,418 to 47,687 bytes on one line.

PowerShell:

```
$env:ENV_OBFUSCATE_ASSETS = "off"; npm run build; Remove-Item Env:ENV_OBFUSCATE_ASSETS
```

Expected: `[build] client files: readable (ENV_OBFUSCATE_ASSETS=off)`, and `dist/public/pollCard.js` equals
`src/public/pollCard.js`.

```
$env:ENV_OBFUSCATE_ASSETS = "yes"; npm run build; Remove-Item Env:ENV_OBFUSCATE_ASSETS
```

Expected: the message naming the setting and its two values, and a failed command.

## 3. Source maps

```
npm run build -- --source-maps
```

Expected: `dist-maps/pollCard.js.map` exists, nothing named `*.map` under `dist/public`, and `git status` shows
nothing new.
To trace an error from the live site: check out the released commit, run this command, open the script in the
browser's developer tools, choose "Add source map" and give the local map file.

## 4. Function checklist (by hand, on a transformed build)

Run the built app (`npm run build`, then `npm start` with the development settings) and keep the browser's console
open. No step may log an error.

1. Sign in.
2. Vote on a public poll; change the vote.
3. Add a choice on a private poll that allows it.
4. Open a poll's maximized view; "Show all" and "Show fewer choices"; Back.
5. Open the line graph; select a time; highlight a line.
6. Open the Who voted report.
7. Search from the search tab.
8. Admin: search, open a poll, edit and save it.
9. Settings: change the colour scheme. Profile: change the display name.
10. Privacy and Terms: the dates show, and `/privacy#cookies` lands on the cookie section.
11. Sign out.

Run the list once in each of: Chrome, Edge, Firefox and Safari on a desktop; Safari on an iPhone; Chrome on an
Android phone.

Result per browser (a browser that is not available is recorded as not run, not as passed):

| Browser | Result |
|---|---|
| Chrome, desktop | not run |
| Edge, desktop | not run |
| Firefox, desktop | not run |
| Safari, desktop | not run |
| Safari, iPhone | not run |
| Chrome, Android | not run |

## 5. Speed comparison (by hand, once before the first release)

On a mid-range phone and on a desktop, for a transformed and a readable build of the same commit, with the cache
disabled, three runs each, taking the median:

- the home page with a full tab of cards: time from navigation to the first card that responds to a tap;
- a poll's maximized view: time from opening the line graph to its lines being drawn.

The transformed build is at most 10% slower on each. If it is not, name the heaviest script in `LIGHTER_SCRIPTS`,
rebuild, measure again, and record the exception in the documentation.

Result: not run. The eight numbers are still to be measured before the first release.

## 6. Reverting in production

In `infra/app.tf`, add `ENV_OBFUSCATE_ASSETS = "off"` to the web component's settings and run `npm run deploy`.
The build log shows the "readable" line. Remove the line and deploy again to restore.

## 7. One-time review of the source (FR-023)

Outcome, 2026-11-18. Searched every `.js`, `.css`, `.html` and `.svg` file under `src/public/` outside `vendor/`
for `secret`, `password`, `api key`, `token`, `localhost`, `TODO`, `FIXME`, `HACK`, `XXX`, every `http://` and
`https://` address, every email address, quoted literals of 32 or more characters, and key-like assignments, and
read each hit.

- Found: nothing that should not be public.
  `token` is the request budget's tokens, the Material design tokens and the `session_token` cookie's name in the
  privacy page; `password` and `secret` are sentences shown to visitors; `siteKey` in `humanCheck.js` is read from
  the server's public configuration, not written in the file.
  The addresses are standards and documentation references in comments (which the build removes) and the SVG
  namespace; the two email addresses are the published contact addresses `privacy@crowdpoll.vote` and
  `support@crowdpoll.vote`.
- Removed: nothing.
- No check moved from the server to the browser: the feature changes no file under `src/` (FR-024).
