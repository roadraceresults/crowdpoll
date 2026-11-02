# Research: Site Settings and Color Scheme

Every decision below traces to the spec (`spec.md`, FR-001–FR-020 and FR-011a, Clarifications 2026-11-02) and to the
resolved findings of `requirements/20261102-134601-site-settings/requirements-report.md` (cited by id).

## R1. The choice is one nullable column on `user`

- **Decision**: migration `016-color-scheme` adds `"user"."color_scheme" text null` with the check
  `color_scheme in ('light', 'dark')`; `UserTable.color_scheme: string | null` in `src/db/schema.ts`. `NULL` means
  never chosen and is shown as Light (FR-017). Not declared to BetterAuth: `sessionCache.ts` `lookup()` already reads
  `permissions` and `terms_version` from the row beside BetterAuth's user, and reads `color_scheme` the same way into
  `session.user.colorScheme` (UA5).
- **Rationale**: one additive column, enforced by the database as well as the route; it goes with the row when
  `deleteAccount` deletes the user (FR-019), so no deletion code changes.
- **Alternatives**: a BetterAuth `additionalFields` entry — rejected: it would let BetterAuth's own update paths write
  it and adds a second way to read the row; a separate `user_settings` table — rejected: one setting does not justify
  a join on every session lookup.

## R2. Read through `GET /api/me`, written through `PATCH /api/me`

- **Decision**: `GET /api/me` adds `colorScheme: "light" | "dark"` (`NULL` answered as `"light"`). `PATCH /api/me`
  accepts `userName` and/or `colorScheme`; at least one must be present, each is validated on its own, and an invalid
  `colorScheme` answers `400` with nothing stored. A `colorScheme`-only request updates the one column and
  `updatedAt`, touches no poll and bumps no `content_version`. Every successful PATCH calls
  `sessions.forgetUserSessions(userId)` so the cached session, and so the next `GET /api/me`, carries the new value.
  The response adds `colorScheme`. `postman/openapi.json` follows (FR-018, FR-020; contracts A1, A2).
- **Rationale**: `/api/me` is already the one request every page load makes, so the scheme costs nothing extra; the
  PATCH route is already behind the terms gate and already the profile's writer.
- **Alternatives**: a new `PUT /api/me/settings` — rejected: a second route and gate entry for one field. Requiring
  `userName` on every PATCH — rejected: the Settings page has no name to send.

## R3. A synchronous head script paints the right scheme first (UA7)

- **Decision**: a new `src/public/colorScheme.js`, loaded **without** `defer` as the first `<script>` in every
  page's `<head>` (`<script src="/colorScheme.js"></script>`), before `/fonts/fonts.css` and every other stylesheet. It reads
  `localStorage.colorScheme`; when it is `"dark"` it sets `<html data-theme="dark">`, otherwise it leaves the
  attribute absent (Light). It exposes `window.ColorScheme = { apply(scheme), current() }`: `apply` sets or removes
  the attribute and writes `"dark"` to the key, or removes the key for Light. Every storage access is inside
  `try/catch`; blocked storage just means Light until the account is read (spec Edge Cases).
- **Rationale**: an external file, not an inline script, keeps the pages free of inline code and cacheable; a
  synchronous script before the stylesheets runs before first paint, which is what FR-012 needs.
- **Alternatives**: the server writes `data-theme` into the HTML (UA7 B) — rejected in the requirements report: every
  page would become a per-user response. Inline `<script>` — rejected: repeated in 13 pages, and a future
  Content-Security-Policy would have to allow it.

## R4. The account corrects the copy through the session subscription

- **Decision**: `colorScheme.js` subscribes, at `DOMContentLoaded` (after the deferred `app.js` has defined
  `window.Session`), to `Session.subscribe(me => ColorScheme.apply(me ? me.colorScheme : "light"))`. So: a signed-in
  load applies and stores the account's value; a `401` (no session — expired, signed out elsewhere, account deleted,
  or Logout) applies Light and removes the key (FR-015, Clarification Q1); a network failure holds what is shown,
  since `refreshSession` keeps the snapshot.
- **Rationale**: every page already runs that subscription chain; the logout path already ends in `adopt(null, true)`.
- **Alternatives**: separate code in the Logout handler — rejected: it would miss the session that ends without
  Logout.

## R5. Other tabs follow through the existing session broadcast (UA9)

- **Decision**: after a successful save the Settings page calls `Session.refresh()`. `refreshSession()` adopts the new
  snapshot and publishes it on the `auth-state` BroadcastChannel (or the `authStateChangedAt` fallback);
  `sameSnapshot` compares every key, `colorScheme` included, so other tabs adopt it and their subscription applies
  the scheme at once (FR-014). Other devices read it on their next `GET /api/me`.
- **Rationale**: no new channel, key or message type.
- **Alternatives**: a `storage` listener on the `colorScheme` key — rejected: a second sync path that would also fire
  on the head script's own corrections.

## R6. The Settings page: `/settings`, `settings.html`, `settingsCard.js`

- **Decision**: `GET /settings` in `src/routes/pages.ts`, guarded like `/profile` without the verification-result
  exception (no session → `302 /login`) (FR-005, UA4). `settings.html` loads exactly `profile.html`'s sheets and
  scripts, with `settingsCard.js` in place of `profileCard.js` and one new layer, `site-settings-m3.css`, after
  `profile-editor-m3.css` in `LAYER_ORDER`. `settingsCard.js` builds the card through `cardShell.js` with the title
  "Site Settings", the gear in the avatar's slot and size (FR-006), and one `role="radiogroup"` labelled
  "Color Scheme" of two native radios (FR-007, UA10; contract C3).
- **Rationale**: reusing the Profile page's shell is what the requirements ask for and keeps the layout identical.
- **Alternatives**: a section on the Profile page — rejected by the requirements (a separate page and menu item).

## R7. Saving: apply at once, one request in flight, revert on failure (UA8)

- **Decision**: selecting a radio calls `ColorScheme.apply(choice)` at once, then saves. Saves are serialized: one
  `PATCH` in flight; a newer choice made meanwhile replaces any queued one and is sent when the first returns, so the
  last choice is the one stored (spec Edge Cases). Re-selecting the checked radio fires no `change` and sends nothing.
  Success records `lastSaved` and calls `Session.refresh()`. Failure (network or non-2xx other than `401`) applies
  `lastSaved`, checks its radio and shows `Your color scheme could not be saved. Please try again.` in a
  `role="status"` line under the group; `401` goes to `/login` (FR-009). While a save is in flight or queued, the
  pending choice wins: `ColorScheme.setSaving(true)` stops `colorScheme.js` from applying session snapshots, and the
  card ignores them for its radio; the `Session.refresh()` after the last save (or the failure's revert) reconciles
  both.
- **Rationale**: a server can receive two quick PATCHes out of order; serializing removes that race without a version
  field. A snapshot arriving mid-save (another tab, a focus refresh) would otherwise flip the page away from the
  user's pending choice.
- **Alternatives**: debounce — rejected: it delays the save the user is waiting on, and still races.

## R8. Light by default: the media-query dark rules are removed (NC1, FR-010)

- **Decision**: delete every `@media (prefers-color-scheme: dark){ :root:not([data-theme="light"]) … }` block (in
  `m3-tokens.css`, `card-shell-m3.css`, `header-tab-bar-m3.css`, `pollCard-m3.css`, `tabs-modal-m3.css`), keeping
  their `:root[data-theme="dark"]` twins. `m3-assets.test.ts`'s twin check becomes "no sheet contains
  `prefers-color-scheme`". `admin.html` and `admin-results.html` drop `data-theme="light"` (FR-011, UA6).
- **Rationale**: one set of dark rules; the device setting no longer applies anywhere, which is the accepted breaking
  change.
- **Alternatives**: keep the media blocks behind `:root:not([data-theme])` — rejected: that is the device-following
  behaviour NC1 rejected.

## R9. The line graph follows `<html data-theme>` (UA11, FR-016)

- **Decision**: `lineGraph.js` replaces `matchMedia('(prefers-color-scheme: dark)')` with a `MutationObserver` on
  `document.documentElement` (`attributeFilter: ['data-theme']`), calling the same `onSchemeChange` (legend and SVG
  redraw, line colours from `surfaceHex()`), disconnected in `unmount`. `tests/line-graph-ui.test.ts` switches its
  fake from `matchMedia` to setting the attribute.
- **Rationale**: the graph already reads its surface colour from computed style, so only the trigger changes.

## R10. Icons: the gear moves, the checklist is drawn as a glyph (UA3, FR-002–FR-004)

- **Decision**: in `app.js`, today's `ADMIN_GLYPH` is renamed `SETTINGS_GLYPH` unchanged; a new `ADMIN_GLYPH` draws,
  in the 64×64 box, the `currentColor` circle and three rows of a paper-coloured (`var(--paper)`) rounded square with
  a `currentColor` tick, followed by a `var(--paper)` bar, the middle bar shorter (traced from
  `requirements/20261102-134601-site-settings/poll-admin-icon.jpg`). "Site Settings" is inserted after "Edit
  Profile" for every signed-in user, never `aria-disabled` (FR-001, AM1, UA1). `settingsCard.js` draws the same gear;
  the glyph string is shared through `window.SiteGlyphs = { settings }` from `app.js` rather than copied.
- **Rationale**: every menu icon is already an inline glyph in `currentColor` / `var(--paper)`, so both icons follow
  the scheme (FR-004).

## R11. The contrast audit (FR-011a, SC-007, Clarification Q2)

- **Decision**: two parts.
  1. **Automated**: `tests/color-scheme-contrast.test.ts` parses `m3-tokens.css` and checks, for Light and for the
     `[data-theme="dark"]` block, the WCAG ratio of each text/background role pair (`on-surface`/`surface` and the
     `surface-container*` roles, `on-surface-variant`/`surface`, `on-primary`/`primary`, each `on-*-container` on its
     container, `error`/`surface`, `outline`/`surface` ≥ 3:1) — ≥ 4.5:1 for text pairs, ≥ 3:1 for non-text.
  2. **Manual**: quickstart scenario 9 walks every page (13 pages, admin tabs and wizard included) in both schemes
     with the browser's accessibility contrast checker; each failure is fixed in the sheet that owns the colour,
     preferring a token over a literal. The hard-coded colours in `site.css`, `pollCard.css`, `tabs.css`,
     `styles.css` and `admin.css` are the likely sources; each fix is listed in `contracts/ui-contracts.md` C6.
- **Rationale**: jsdom has no layout or cascade colours, so a full-page check cannot run in the test suite; the
  token test guards the palette, the walk-through covers the pages.
- **Alternatives**: adding axe-core or Playwright — rejected: a new dependency (constitution, Simplicity First) for a
  one-time audit.

## R12. Privacy disclosure (FR-013)

- **Decision**: one Cookie Use row in `privacy.html`:
  `<tr data-storage="local" data-name="colorScheme">` — "remembers your color scheme so each page opens in it" —
  "until you sign out". `colorScheme.js` names the key as `const STORAGE_KEY = "colorScheme";` so
  `tests/cookie-use-list.test.ts` finds it. The existing sentence "only remember a choice you made … we do not ask for
  consent" covers it.

## R13. Tests

- `tests/color-scheme.test.ts` (new, supertest): migration and check constraint; `GET /api/me` default and stored
  values; `PATCH /api/me` with `colorScheme` alone, with `userName` alone (unchanged behaviour), both, neither (`400`),
  an invalid value (`400`, nothing stored), signed out (`401`); the session cache returns the new value at once;
  account deletion removes it; `GET /settings` signed in (`200`) and signed out (`302 /login`).
- `tests/client-site-settings.test.ts` (new, jsdom): the menu item's place, icon and enabled state for a user with and
  without permissions; Poll Administration's new glyph; the Settings card (title, gear, radios, initial selection);
  apply-at-once; serialized saves; failure revert and message; `401` redirect; `colorScheme.js` head behaviour (copy
  applied, absent → Light, blocked storage, `401` clears).
- `tests/color-scheme-contrast.test.ts` (new, R11).
- Extended: `m3-assets.test.ts` (settings page, `site-settings-m3.css`, the head script on every page, no
  `prefers-color-scheme`), `line-graph-ui.test.ts` (R9), `cookie-use-list.test.ts` (passes with the new row), the
  existing profile PATCH tests (unchanged behaviour).
