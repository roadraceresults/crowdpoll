# Research: Email Logo With Speech Bubble

**Feature**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md) | **Date**: 2026-11-12

The decisions of the requirements report (`requirements/20261112-175743-email-logo/requirements-report.md`, AM1–NC1)
are taken as given; this file settles how they are built.

## R1. Rendering the email logo from `og-logo.svg`

- **Decision**: `renderPng` in `devScripts/favicon-ico.ts` takes the SVG to render as a parameter
  (`renderPng(browser, workDir, svgPath, size, scale)`); the favicon calls pass `SVG_PATH`, the email logo passes
  `OG_LOGO_PATH`. `EMAIL_LOGO_SIZE` becomes 56 and `EMAIL_LOGO_SCALE` 3, so the window is 56 × 56 at
  `--force-device-scale-factor=3` and the existing size check expects 168 × 168.
- **Rationale**:
  - `og-logo.svg` has a `viewBox` and no `width`/`height`, so opened on its own it fills the window, exactly as
    `favicon.svg` does today; no wrapper page is needed (unlike the 1200 × 630 preview, which centres the logo on white).
  - `--default-background-color=00000000` already keeps the area outside the bubble transparent.
  - The 56 px window is larger than the 48 px one that already renders; the blank-window problem the docblock names
    was at 96 px at 1×.
  - The temporary file names (`<size>x<scale>.png`) stay distinct: 16x1, 32x1, 48x1, 56x3.
- **Alternatives considered**: a second render function for the email logo (duplicates `renderPng` for one argument);
  an HTML wrapper page as for `og-image.png` (no centring or background is needed); a new cropped `email-logo.svg`
  (rejected by requirements UA1, B).

## R2. Refusing an opaque background without an image library

- **Decision**: a small `topLeftAlpha(png)` reads the PNG's `IHDR` (bit depth 8, colour type 6, RGBA, else refuse),
  joins its `IDAT` chunks, inflates them with `node:zlib` `inflateSync`, and returns byte 4 of the first scanline (the
  filter byte, then R, G, B, A of pixel 0). The email logo is refused unless it is 0.
- **Rationale**:
  - For the first pixel of the first row every PNG filter (None, Sub, Up, Average, Paeth) predicts 0, so the raw byte
    is the value; no unfiltering is needed.
  - The script deliberately has no image dependency (it writes the ICO container itself); `node:zlib` keeps it so.
  - The bubble's outline starts about 7 units in from the corner of the 120-unit `viewBox`, so a correct render has a
    transparent top-left pixel; a white page or a lost `--default-background-color` makes it opaque.
- **Alternatives considered**: `pngjs` or `sharp` as devDependencies (a dependency for one byte); checking only the
  size (misses the background regression the requirements name, UA4).

## R3. The email header at 56 × 56

- **Decision**: in `layout()` (`src/email/templates.ts`) the `<img>` gets `width="56" height="56"`; nothing else in the
  header changes (`vertical-align:middle`, `border:0`, the 12 px `margin-left` of the word mark, 22 px type).
- **Rationale**: the attributes are what Outlook and Gmail honour for image size; the cell has no fixed height, so the
  bar grows by 8 px on its own.
- **Alternatives considered**: a CSS `width`/`height` only (Outlook desktop ignores it); a named constant shared with
  the script (two programs, one literal each; the contract C1 pins both).

## R4. Tests and the stored expected emails

- **Decision**: in `tests/fixtures/email-messages-before-heading-line-2.json` replace the six
  `width=\"48\" height=\"48\"` with `width=\"56\" height=\"56\"` and nothing else; `email-layout.test.ts`'s
  "leaves every existing message exactly as it was" then pins every other byte. `tests/mailer.test.ts` asserts on the
  `src` only and is unchanged. A new assertion in `email-layout.test.ts` checks `layout()` writes the 56 × 56 `<img>`
  with `alt="CrowdPoll"`.
- **Rationale**: the fixture's purpose is to catch unintended changes to the messages; one intended, mechanical change
  keeps that purpose. A separate assertion names the new size where a reader looks for it.
- **Alternatives considered**: regenerating the fixture from the new code (it would accept any accidental change made
  in the same commit).
- **No test renders the image**: the script needs a local Chromium browser; its own checks (R1, R2) and the visual
  review (quickstart §3) cover the drawing, as for the favicon. As `tests/pages.test.ts` does for `favicon.ico`, a new
  `tests/favicon-ico.test.ts` checks the committed `email-logo.png` (168 × 168, top-left alpha 0) with the script's
  exported `topLeftAlpha`, and that it refuses `og-image.png`, an 8-bit RGB file, as not RGBA.

## R5. Address and caching

- **Decision**: no change. Emails keep `<ENV_EMAIL_ASSET_ORIGIN or the link's origin>/email-logo.png`; production's
  `express.static` serves the un-fingerprinted file with an ETag, so the next request after `npm run deploy` gets the
  new image.
- **Rationale**: requirements UA3. Gmail's image proxy caches independently and may show the old image for a while;
  that is accepted and written in the quickstart.

## R6. The OAuth providers' square logo

- **Decision**: update `specs/20261022-131728-SOCIAL-OAUTH-PROVIDERS/provider-setup.md` (line 7; the Google and
  Microsoft steps only name `email-logo.png` and stay as they are) to describe the icon as the figures in the speech bubble, 168 × 168 px,
  transparent, and add that logos already uploaded stay as they are until re-uploaded.
- **Rationale**: requirements NC1, A. Google's consent screen asks for a square image and scales it to 120 × 120;
  Microsoft Entra's branding takes a square image and scales it. The exact current upper size limits of both consoles
  were not re-verified for this plan; the image is small (a few KB), and the developer sees any refusal at upload time.
- **Alternatives considered**: a separate figures-only `app-icon.png` (rejected, NC1 B).

## R7. Documentation and comments

- **Decision**: update `devScripts/favicon-ico.ts`'s docblock (it names the email logo's source and size, and it is the
  region being changed), `ARCHITECTURE.md` (§ email messages and § Site icon: the email logo comes from `og-logo.svg`,
  56 px at 3×) and the `CLAUDE_COMPLETE.md` line that names `email-logo.png`. `README.md` describes no logo and is
  unchanged. `devScripts/render-invitation-email.ts` already copies `email-logo.png` beside its page and needs no change.
- **Rationale**: Constitution "Documentation Deliverables" and VI (no new comments; the docblock is updated only
  where it describes what changes).
