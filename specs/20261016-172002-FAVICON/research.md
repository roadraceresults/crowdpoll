# Research: Site Favicon

**Feature**: `specs/20261016-172002-FAVICON` · **Date**: 2026-10-17
**Inputs**: `spec.md`, `architecture/20261016-172002-site-favicon/architecture.md` (11 findings, all resolved)

No `NEEDS CLARIFICATION` remained in the Technical Context; each item below records a decision checked against the code.

## R1. Serving: the existing asset pipeline already covers both files

- **Decision**: Put `favicon.svg` and `favicon.ico` in `src/public/` and change no server code.
- **Rationale**:
  - `devScripts/build-assets.ts` fingerprints every top-level `src/public` file whose extension is in `ASSET_EXTENSIONS`, which already holds `.svg` and `.ico`, and `cpSync` also copies both to `dist/public/` unchanged.
  - `createAssetServing().render()` in `src/routes/assets.ts` rewrites any `href="/name.ext"` with those extensions, so `<link rel="icon" href="/favicon.svg">` becomes `/assets/<hash>/favicon.svg` (or the CDN URL), cached `immutable` for a year.
  - `devScripts/publish-assets.ts` already maps `.svg` → `image/svg+xml` and `.ico` → `image/x-icon` for Spaces.
  - Without a manifest (development, tests) the hrefs stay `/favicon.svg` and `/favicon.ico`, served by `express.static(publicDir)`.
- **Alternatives considered**: a dedicated `/favicon.ico` route — rejected: `express.static` already answers it (R2).

## R2. The root `/favicon.ico`

- **Decision**: Rely on `app.use(express.static(publicDir, { index: false }))` in `src/server.ts`.
- **Rationale**: In production `publicDir` is `dist/public`, which `cpSync` fills with an un-fingerprinted `favicon.ico`; in development it is `src/public`. Requests reach it after `shedding.shedOther` and the page routers, none of which match `/favicon.ico`. It gets `express.static`'s default caching (`max-age=0` with an ETag), which suits a file whose name never changes.
- **Content type**: `express.static` (the `mime` package) answers `.ico` with `image/vnd.microsoft.icon`, not `image/x-icon`; the Spaces copy uses `image/x-icon`. Both are valid for browsers, so tests accept either (`/^image\/(x-icon|vnd\.microsoft\.icon)/`).
- **Alternatives considered**: forcing `image/x-icon` with `setHeaders` — rejected as an unrequested server change (Constitution II, III).

## R3. The page links

- **Decision**: In each of the seven pages, insert right after `<meta name="viewport" …>`:
  ```html
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="icon" href="/favicon.ico" sizes="16x16 32x32 48x48">
  ```
- **Rationale**: Browsers that support SVG icons pick the `type="image/svg+xml"` link; the others take the ICO. Both `href`s match the `assets.ts` rewrite pattern.
- **Checked**: `tests/m3-assets.test.ts` only collects `<link rel="stylesheet" …>` and the Google Fonts link, so two `rel="icon"` links do not disturb its allowlist.

## R4. Drawing the mark: `favicon.svg`

- **Decision**: Copy the figure geometry from `.brand-logo` in `SITE_HEADER_MARKUP` (`src/public/app.js`) — the mask `brand-logo-front`, the red group, the green circle and body — and drop both speech-bubble paths (fill and stroke). Use a cropped square `viewBox="10 4.5 96 96"`.
- **Rationale** (geometry from the logo):
  - The figures span x 16–100 and y 15–90 (84 × 75 units, the mockup's 23 × 20 ratio).
  - At 16 px one pixel is 6 units; filling the width with 1 px each side gives 84 + 12 = 96 units, so x 10–106; centring 75 units vertically in 96 gives y 4.5–100.5.
  - No background rectangle, so it is transparent (U1).
  - Give the mask a file-local id (`favicon-front`); the file is standalone.
- **Markup rules**: `<title>CrowdPoll</title>` as the first child (A2); no `role`/`aria-*` (a favicon is not in the accessibility tree); no comments (Constitution VI).
- **Alternatives considered**: the full logo with the bubble — rejected by NC1 (Recommendation A).

## R5. Making `favicon.ico`: `devScripts/favicon-ico.ts`

- **Decision**: A one-file script, run by hand (`npx tsx devScripts/favicon-ico.ts`), that:
  1. for each size 16, 32, 48 runs the browser: `--headless --disable-gpu --hide-scrollbars --force-device-scale-factor=1 --default-background-color=00000000 --user-data-dir=<temp dir> --window-size=<s>,<s> --screenshot=<temp>/<s>.png file:///<abs>/src/public/favicon.svg`, via `execFileSync` with an argument array (no shell), with a 30 s timeout; a failed or timed-out run, or a missing screenshot, stops the script with a `[favicon]` message;
  2. checks each PNG's IHDR width and height equal the size requested, and fails otherwise;
  3. writes `src/public/favicon.ico`: a 6-byte header (reserved 0, type 1, count 3), three 16-byte directory entries (width, height, 0 colours, 0, 1 plane, 32 bpp, byte size, offset), then the three PNGs in order;
  4. removes its temporary directory and logs what it wrote.
- **Browser path**: `FAVICON_BROWSER` if set, else `C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe`. It is a developer setting, not runtime configuration, so it is not an `ENV_*` variable.
- **Verified on this machine (2026-10-17)**: Edge headless rendered a test SVG to exactly 16 × 16 and 48 × 48 PNGs, colour type 6 (RGBA) with a transparent background.
- **Repository**: `.gitignore` ignores `devScripts/*` except listed files, so add `!devScripts/favicon-ico.ts` next to the others (as 028 did for `file-manifest.ts`). Not part of `npm run build` (FR-008).
- **Alternatives considered**: a developer export by hand (U5 Recommendation B) — rejected; `sharp`/`png-to-ico` — rejected, new dependencies.

## R6. Tests

- **Decision**: One new `describe` in `tests/pages.test.ts`, using the file's existing `ctx`:
  1. each of the seven pages, as served (`/`, `/login`, `/create-account`, `/profile` signed in, `/admin` and `/admin/poll/results?PID=<pid>` as an authorized creator, and the not-authorized card from `/admin` as a guest) answers 200 (403 for the not-authorized card) and contains both `<link rel="icon">` tags exactly as in R3;
  2. `GET /favicon.ico` answers 200 with an icon content type (R2) and a non-empty body;
  3. `src/public/favicon.ico` read from disk has the ICO header with count 3, and its directory entries are 16, 32 and 48 px, each pointing at a PNG signature.
- **Rationale**: These are FR-010's three checks. The page check uses the served HTML (not the file) so the `assets.ts` path is exercised.
- **Not tested automatically**: how the icon looks (SC-004) — checked by eye in `quickstart.md`.

## R7. Out of scope (U3)

No Apple touch icon, no web app manifest, no 192/512 px icons, no dark-mode variant, no change to the header's brand logo (FR-009).
