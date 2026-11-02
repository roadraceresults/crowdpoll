# UI Contracts: Site Settings and Color Scheme

## C1. Avatar menu (`app.js` `renderSiteHeader`)

- Order for a signed-in user:
  1. Edit Profile
  2. **Site Settings** (`<a href="/settings">`, `SETTINGS_GLYPH`)
  3. Create Poll
  4. Poll Administration (only with permission, new `ADMIN_GLYPH`)
  5. Logout
- Site Settings is never `aria-disabled` and has no reason line, whatever the user's permissions (FR-001).
- Signed-out visitors keep the "Log In" button and no menu.
- `SETTINGS_GLYPH` is today's gear glyph, unchanged.
- `ADMIN_GLYPH` (64×64) contains:
  - a `currentColor` circle, r 32;
  - three rows, each a `var(--paper)` rounded square with a `currentColor` tick, then a `var(--paper)` rounded bar;
  - the middle bar shorter, as in `requirements/20261102-134601-site-settings/poll-admin-icon.jpg`.
- The gear is exposed as `window.SiteGlyphs = { settings: SETTINGS_GLYPH }` for C3.

## C2. Head script (`colorScheme.js`, every page)

- Placement: `<script src="/colorScheme.js"></script>`, no `defer`.
  - It is the first `<script>` in `<head>`, before `/fonts/fonts.css` and every stylesheet.
  - It goes on all 13 pages: the 12 existing ones and `settings.html`.
- Load:
  - `localStorage.colorScheme === "dark"` → `document.documentElement.dataset.theme = "dark"`.
  - Otherwise the attribute stays absent.
- API: `window.ColorScheme`.
  - `apply("dark")` sets the attribute and stores `"dark"`.
  - `apply("light")` (or any other value) removes the attribute and the key.
  - `current()` returns `"dark"` or `"light"`.
- Session: at `DOMContentLoaded`, if `window.Session` exists, it subscribes
  `me => apply(me && me.colorScheme === "dark" ? "dark" : "light")`, except while saving is set (below).
- Saving: `window.ColorScheme.setSaving(flag)` sets a flag that only this page holds. While the flag is set, the
  session subscription leaves the page's scheme alone, so a snapshot that arrives during a save cannot overwrite the
  user's pending choice.
- Storage errors are caught; nothing is logged.

## C3. Site Settings card (`settings.html`, `settingsCard.js`, `site-settings-m3.css`)

- `cardShell.js` card with:
  - title `Site Settings`, also used as `document.title`;
  - the subtitle slot holding the gear (`SiteGlyphs.settings` in an `<svg viewBox="0 0 64 64" aria-hidden="true">`), at the size and alignment of the Profile card's avatar;
  - no other Profile fields or buttons.
- Body markup:

```html
<div role="radiogroup" aria-labelledby="color-scheme-label" class="settings-group">
  <span id="color-scheme-label" class="settings-group-label">Color Scheme</span>
  <label><input type="radio" name="colorScheme" value="light"> Light (default)</label>
  <label><input type="radio" name="colorScheme" value="dark"> Dark</label>
  <p class="settings-message" role="status"></p>
</div>
```

- The checked radio is the session's `colorScheme` when the card is built, and is kept in step by the session subscription.
- `site-settings-m3.css` styles the group as M3 radio buttons from tokens only: 48 px rows and a visible focus ring. It contains no literal font sizes and no dark block, because the tokens carry both schemes.

## C4. Saving (`settingsCard.js`)

1. A radio's `change` event calls `ColorScheme.setSaving(true)` and `ColorScheme.apply(value)`, and clears the message.
2. If no save is in flight, `PATCH /api/me { colorScheme: value }` is sent. Otherwise `value` becomes the one queued choice, replacing any earlier queued one.
3. When a save returns:
   - **`200`**: set `lastSaved`, then send the queued choice if any. When nothing is left to send, call `ColorScheme.setSaving(false)`, then `Session.refresh()`.
   - **`401`**: go to `/login`.
   - **Any other failure**:
     - drop the queued choice;
     - `ColorScheme.setSaving(false)`;
     - `ColorScheme.apply(lastSaved)` and check its radio;
     - set the message to `Your color scheme could not be saved. Please try again.`
4. `lastSaved` starts as the session's `colorScheme`. It is updated by every session update, including those that arrive while a save is in flight or queued, so a failed save falls back to what the account holds now. That may be another tab's newer choice.
5. **Pending choice wins.** While a save is in flight or queued, the card ignores session updates for its radio, and `colorScheme.js` leaves the page alone (C2). Only `lastSaved` records them. Once the last save ends, the `Session.refresh()` in step 3, or the failure's revert to `lastSaved`, makes the page, the radio and the session agree again.

## C5. Line graph (`lineGraph.js`)

- `mount` observes `document.documentElement` with `{ attributes: true, attributeFilter: ["data-theme"] }`.
- A change calls `onSchemeChange` (legend and SVG redraw).
- `unmount` disconnects the observer.
- `matchMedia` is no longer used.

## C6. Dark rules and admin pages

- No stylesheet contains `prefers-color-scheme`. Dark rules exist only under `:root[data-theme="dark"]`.
- `admin.html` and `admin-results.html` open with `<html lang="en">`.
- Contrast fixes found by the audit (quickstart 9) are made in the sheet that owns the colour, as token references where possible, and listed in tasks.md.
