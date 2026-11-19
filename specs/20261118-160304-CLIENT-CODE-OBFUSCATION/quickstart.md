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
Nothing is deployed by this step; it runs on the development machine only.
The maps are for later, when the live site reports an error: check out, on the development machine, the commit
that was released, run this command there, open the live site's script in the browser's developer tools, choose
"Add source map" and give the local map file. The build is repeatable, so the local map fits the released script.

In Chrome or Edge:

1. Developer tools, Sources: open the script from the `assets` folder (`assets/<hash>/pollCard.js`).
2. Right-click inside the code (not on the file in the tree) and choose "Add source map…". The entry is missing
   when "JavaScript source maps" is off in the developer tools' Settings, Preferences, Sources.
3. Enter the map's address as a file URL, for example `file:///C:/crowdPoll/obfuscate/dist-maps/pollCard.js.map`.
4. `pollCard.js` as written, with its comments, appears in the tree; breakpoints and error positions now refer to it.

The map holds the source text, so nothing else has to be reachable. The attachment lasts until the page is reloaded.

To try this on the development machine: with `./devScripts/launch-dev.ps1 -Built` running, run
`npm run build -- --source-maps` in a second terminal (it rewrites `dist/public` with the same bytes), reload the
page, and follow the four steps.

## 4. Function checklist (by hand, on a transformed build)

Run the built app on the development machine and keep the browser's console open. No step may log an error.

```
./devScripts/launch-dev.ps1 -Built
```

The switch runs `npm run build` and then `npm start` with the development settings, so the browser receives the
transformed files of `dist/public`; without it the script runs `npm run dev`, which serves `src/public` as written.

Where to see the transformed files:

- in the browser's developer tools, Sources, under the site's address: the `assets` folder holds one folder per
  fingerprint, and each holds one file (`assets/<hash>/pollCard.js`); the entry named after the address
  (`?tab=home`) is the page itself;
- by address: `http://localhost:<port>/pollCard.js` is the same file without the fingerprint;
- on disk: `dist/public/pollCard.js` and `dist/public/assets/<hash>/pollCard.js`.

The pages ask for the fingerprinted copies, which is why no script is listed beside the page.

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
| Chrome, desktop | passed |
| Edge, desktop | passed |
| Firefox, desktop | passed |
| Safari, desktop | passed |
| Safari, iPhone | passed |
| Chrome, Android | passed |

Run on BrowserStack, 2026-11-19, on the transformed build.

## 5. Speed comparison (by hand, once before the first release)

On a phone and on a desktop, use a transformed build and compare with a readable build of the same commit:

- the home page with a full tab of cards: until the first card responds to a tap;
- a poll's maximized view: opening the line graph until its lines are drawn.

For the readable build, set `$env:ENV_OBFUSCATE_ASSETS = "off"` in `devScripts/launch-dev.ps1` and run
`./devScripts/launch-dev.ps1 -Built`; set it back to `"on"` for the transformed one.

Nothing is noticeably slower on the transformed build. If something is, name the heaviest script in
`LIGHTER_SCRIPTS`, rebuild, compare again, and record the exception in the documentation.

Result, 2026-11-19, on the transformed build through BrowserStack: the speed difference is not noticeable, and the
site feels quite responsive to the user. No times were measured.

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
