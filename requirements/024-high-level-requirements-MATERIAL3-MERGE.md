Start a new spec for these requirements called `024-MATERIAL3-MERGE`.

The path to these requirements is `designDocs\024-high-level-requirements-MATERIAL3-MERGE.md`.
The SKILL used to refine these requirements and to create the specs is:  
`speckit-mdd-architecture designDocs/024-high-level-requirements-MATERIAL3-MERGE.md`.

# Overview
This requirements document is the plan for bringing the Material 3 (M3) prototypes in
`prototypes/POLL-CARD-MATERIAL3/` into the CrowdPoll webapp (`src/public`). The prototypes, and the
decisions behind every look in them, are recorded in
`prototypes/POLL-CARD-MATERIAL3/iterative-requirements.md`. The merge route was chosen in that
file's REQUIREMENT "Merging Prototypes into CrowdPoll Webapp" (recommendation 1, clarifications
1–5).

The route has four parts:
- A shared foundation is merged first.
- Each area then merges one at a time on top of it.
- Dark mode is switched on (Step 5).
- The admin cards merge last (Step 6), added by that file's REQUIREMENT "Merge Material 3 Admin
  page".

All of it happens on a feature branch that reaches `dev`, and so production, once.

# Design

## What the prototypes are
The restyle prototypes are layers, not rewrites. Each keeps byte-identical copies of the
production files it extracted and puts its M3 look in files loaded last:

| Prototype | Page | M3 layer | Production changes it needs |
|---|---|---|---|
| Poll Card (front and back) | `poll-card.html` | `pollCard-m3.css`, `pollCard-m3.js` (the ripple) | two edits in `pollCard.js` marked `M3:` (below), plus the ripple registration |
| Maximized Poll Card | `MAXIMIZED-POLL-CARD/single-card.html` | section 8 of `pollCard-m3.css` | none beyond the card's |
| Header, Tab Bar, notice, cookie banner | `HEADER-TAB-BAR/header-tab-bar.html` | `header-tab-bar-m3.css`, `header-tab-bar-m3.js` | `notice()` in `tabs.js` gains a close control |
| Profile Editor | `PROFILE-EDITOR/profile-editor.html` | `card-shell-m3.css`, `profile-editor-m3.css` | `profileCard.js` shows a snackbar after a save |
| Login | `LOGIN-DIALOG/login-dialog.html` | `card-shell-m3.css` (sections 9–11) | none |
| Create Account | `CREATE-ACCOUNT-DIALOG/create-account-dialog.html` | `card-shell-m3.css` | none (the 021 hover fix is Step 3's) |
| Not Authorized | `NOT-AUTHORIZED-DIALOG/not-authorized-dialog.html` | `card-shell-m3.css` (section 12) | none |
| `Tabs.modal` dialog | `TABS-MODAL/tabs-modal.html` | `tabs-modal-m3.css`, `tabs-modal-m3.js` (the ripple) | two edits in `modal()` in `tabs.js` marked `M3:` |
| Live Results idle prompt | `LIVE-RESULTS-IDLE-PROMPT/live-results-idle-prompt.html` | `live-idle-prompt-m3.css`, `live-idle-prompt-m3.js` (the ripple) | edits in `liveResults.js` marked `M3:` |
| Empty-tab line | `EMPTY-TAB-LINE/empty-tab-line.html` | `empty-tab-line-m3.css` | none; `tabs.css` splits a rule (Step 2) |
| Tooltips | `poll-card.html`, `MAXIMIZED-POLL-CARD/`, `HEADER-TAB-BAR/`, `ADMIN-CARDS/` | `tooltip-m3.css`, `tooltip-m3.js` (both arrive in Step 2) | the guest's tabs become `aria-disabled` (Step 2), and the admin cards' blocked Publish, Save and Save changes become `aria-disabled` (Step 6) |
| Not Saved dialog (admin page) | `DISCARD-DIALOG/discard-dialog.html` | `TABS-MODAL/`'s layer, `discard-dialog-m3.css`, `discard-dialog-m3.js` (the ripple) | `confirmDiscard()` in `adminCard.js` and its two callers (`adminCard.js`, `adminList.js`), marked `M3:` |
| Poll Editing Card (admin page) | `ADMIN-CARDS/admin-cards.html` | `admin-card-m3.css` | the prototype's `adminCard.js` and `admin.css` changes, and the five server changes (Step 6) |

The two `pollCard.js` edits:
1. `render()` toggles `is-multi` on `.voting-list` for a multi-choice poll, so the vote rows
   draw an M3 checkbox instead of a radio.
2. `BAR_COLORS_DARK` (with `mixWith`, `lightShadeFor` and `darkBarColorsFor`) is added after
   `BAR_COLORS`. `applyBarColors` then writes `--bar-track`, `--bar-ink`, `--bar-track-dark` and
   `--bar-ink-dark` on each result row, instead of an inline background and colour. The light
   values are 022's exactly. Without the M3 layer's `.result-row` rules, the rows lose their
   tints, so the edit and the layer merge together.

The Poll Editing Card prototype (`ADMIN-CARDS/admin-cards.html`, made from
`NON-ADMIN-POLL-EDITING/admin-cards.html`) is a redesign as well as a restyle. It adds a new-poll
wizard, an anonymity switch, a settings summary, a redesigned read-only card and a when-line
worded by the poll's state. It merges whole in Step 6. Step 4's range is already dropped from it
(see Step 6).

## The shared design
These are carried over from the prototypes unchanged:
- **Colour roles.** `--md-sys-color-*` in light and dark, generated with
  `@material/material-color-utilities` (tonal spot, moss `#3D5A46` seed, amber `#E8A33D` as the
  tertiary palette).
  - Light surfaces are anchored to the site: `surface` `#FFFFFF`, `surface-container-low`
    `#F1F3EE`, `on-surface` `#1E2422`.
  - The production tokens (`--ink`, `--paper`, `--paper-raised`, `--moss`, `--line`, `--track`,
    `--choice-*`, `--muted`, `--shadow`) are restated as roles in dark only, so in light every
    production colour is unchanged.
  - The inverse roles (`#2C322D` / `#EDF2EB` / `#94D5A8` light; `#DFE4DD` / `#2C322D` /
    `#2C6A46` dark) serve the snackbars.
- **Type.** Roboto on the M3 type scale: Headline Small (the Not Saved dialog's headline), Title
  Large, Title Medium, Title Small, Body Large, Body Medium, Body Small, Label Large, Label Medium
  and Label Small.
  - The admin cards (Step 6) bring three of them: Title Medium (the wizard's step heading),
    Label Medium (the current step's name and the read-only face's field labels) and Label Small
    (the Named Circles' names).
  - Each text element takes an M3 role, which supplies its font, weight, line height and tracking.
  - Two sizes are custom:
    - The card title shrinks from Title Large's 22px to 18px on narrow windows
      (`clamp(18px, 1.8vw, 22px)`), so long titles fit narrow cards.
    - The bar labels and percentages keep production's 7–11px, scaled with bar height
      (`scaleFontSize` in `pollCard.js`).
- **Shape, state and elevation tokens.** Corners: full, 28px (the dialogs), 12px, 8px and 4px.
  State layers: 8% hover, 10% focus, 10% pressed. Elevations 2 and 3.
- **Interaction.** A `currentColor` state layer on every control, a 3px `secondary` focus ring,
  and a press ripple, with none of these under `prefers-reduced-motion`.
- **022's bar colours.** These are untouched in light. In dark, each fill keeps its colour, and
  its track and ink are recomputed for the dark surface at 7:1 or more.

## Merge order

### Prerequisites (before `/speckit-specify`): done
The surfaces that had no prototype were prototyped first, as further requirements in
`prototypes/POLL-CARD-MATERIAL3/iterative-requirements.md`, on the same layers. All are resolved:
- Login (`login.html`, `loginCard.js`), Create Account (`create-account.html`,
  `createAccountCard.js`) and Not Authorized (`not-authorized.html`, `notAuthorizedCard.js`), on
  the shared `card-shell-m3.css`.
- The `Tabs.modal` dialog, the Live Results idle prompt, and the empty-tab line (`.tab-empty`).
- Material 3 plain tooltips in place of the browser's `title` tooltips.
- The admin page's Not Saved dialog, in place of the browser's `window.confirm`.
- The admin cards on the M3 foundation: REQUIREMENT "Use Material 3 For the admin cards" put
  `NON-ADMIN-POLL-EDITING/admin-cards.html` onto the layers above as a new prototype,
  `ADMIN-CARDS/admin-cards.html`, with `admin-card-m3.css` and a dark scheme.

The rest of the admin pages are not prototyped here: the admin toolbar, search, back link and
list notices on `admin.html`, and `admin-results.html`. They belong to the admin feature.

### Branching
- All of 024 is committed straight onto a feature branch, `024-MATERIAL3-MERGE`, with no pull
  request per step. Steps 1–5 are one commit, since they were built together. Step 6 follows.
  Each step still has its own tests.
- The only pull request is `024-MATERIAL3-MERGE` into `dev`, after Step 6, with the developers'
  go-ahead. `dev` autodeploys to production (`.do/app.yaml`), so it receives 024 once and no user
  sees a partly restyled or half-dark site.
- `dev` is merged into the feature branch if it moves while 024 is in progress.
- The checklist for each commit, the push and the pull request is REQUIREMENT "Merge to CrowdPoll
  Webapp" in `prototypes/POLL-CARD-MATERIAL3/iterative-requirements.md` (recommendation 2).

### Step 1: the shared foundation (no visible change)
- New `src/public/m3-tokens.css`: the colour roles (light and dark, including the inverse
  roles), the type scale, and the shape, state and elevation tokens.
  - Its dark blocks are written only under `:root[data-theme="dark"]` until Step 5, so dark is
    opt-in and is used only for development and tests.
  - The same holds for every layer ported in Steps 2–4: the prototype layers already carry
    `@media (prefers-color-scheme: dark)` blocks, and only their `:root[data-theme="dark"]`
    blocks are ported until Step 5. An asset test asserts that no sheet in `src/public` contains
    `prefers-color-scheme: dark`; Step 5 turns that assertion around.
  - It replaces the token sections now repeated in the prototype layers:
    - `pollCard-m3.css` (the roles, type scale, shape and state tokens);
    - `header-tab-bar-m3.css` and `card-shell-m3.css` (the inverse roles and elevations), and
      `tooltip-m3.css` (the inverse roles);
    - `tabs-modal-m3.css` (the scrim, the extra-large corner, elevation 3 and the
      emphasized-decelerate easing);
    - `live-idle-prompt-m3.css` (the easing);
    - `discard-dialog-m3.css` (Headline Small).

    `m3-tokens.css` therefore also holds the scrim role, the 28px corner, the easing and
    Headline Small. `profile-editor-m3.css` declares none.
- New `src/public/m3-ripple.js`: one delegated `pointerdown` listener, merged from the five
  prototype copies: `pollCard-m3.js`, `header-tab-bar-m3.js`, `tabs-modal-m3.js`,
  `live-idle-prompt-m3.js` and `discard-dialog-m3.js`.
  - It registers nothing itself. The script each step already edits registers that area's
    controls, as `window.M3Ripple.add(selector)`: `app.js` (header, tab bar, search, avatar menu,
    cookie banner, `.tab-notice-close`), `tabs.js` (`.modal .modal-ok`), `liveResults.js` (the idle
    prompt's actions), `adminCard.js` (`.modal .modal-action`, and from Step 6 the admin cards'
    targets) and `pollCard.js` (the card targets and `.maximized-card-close`).
  - It skips a target that is `disabled`, `[aria-disabled="true"]` or `.is-inert`, as the header
    copy does.
  - `m3-tokens.css` holds the `.m3-ripple` and `.m3-ripple-host` rules and their keyframes (in
    the prototypes they are in `pollCard-m3.css`), so Step 2's ripples have them before Step 3.
  - It keeps the poll card's vote-row hosting, because a vote row is rebuilt by the click.
- All seven pages link `m3-tokens.css` before their other sheets, and `m3-ripple.js`. The Google
  Fonts link adds Roboto. Fraunces and Inter stay, for the surfaces not yet ported. (The tooltips
  arrive in Step 2, since they change what users see.)
- Tests check that every page loads `m3-tokens.css` before its other sheets, and `m3-ripple.js`,
  that the font link includes Roboto, and that nothing else in the served HTML changes.

### Step 2: header, tab bar, notice, dialog and the page
- Port `header-tab-bar-m3.css` as `src/public/header-tab-bar-m3.css`, reading `m3-tokens.css`.
  This covers:
  - M3 primary tabs: a 3px indicator on a 1px full-bleed divider, and monochrome 16px icons
    (including the Live Results bars).
  - The 56px search bar.
  - Refresh as a 40px standard icon button.
  - Log In outlined, Create Account to Vote filled, and Create Poll as a disabled text button.
  - The 32px avatar and the M3 menu.
  - The logo recoloured in dark.
  - The tab notice and the cookie banner as snackbars.
- Port `header-tab-bar-m3.js`: the header's ripple registration and the `--cookie-banner-offset`
  watcher go into `app.js`, which every page loads (the profile snackbar of Step 4 needs the
  offset too). `role="status"` on `#tabNotice` goes into `tabs.js`, beside `notice()`.
- **Tooltips.** New `src/public/tooltip-m3.css` and `src/public/tooltip-m3.js`, linked on all
  seven pages: the M3 plain tooltip, ported from the prototypes' shared files. They arrive here,
  beside the guests' `aria-disabled` tabs, because they change what users see.
  - One `aria-hidden` tooltip on `<body>`, `position:fixed`, so a card's `overflow:hidden` never
    clips it: `inverse-surface`, Body Small, a 4px corner, 24px minimum height, wrapping at 240px.
  - Production keeps writing `title`. The script moves every `title`, now or later, to
    `data-tooltip` and removes it, so the browser's tooltip never shows. No other script changes
    for it.
  - Shown 500ms after the mouse enters, and hidden 150ms after it leaves the control and the
    tooltip. Shown at once on keyboard focus. On touch, a 500ms press shows it for 1.5s and does
    not activate the control, and the browser's long-press menu is cancelled on these controls.
    Escape, a press, scrolling and resizing hide it.
  - Placed centred 4px below the control, above it when there is no room, and 8px inside the
    viewport.
  - A `.result-row` or `.vote-row` shows its tooltip only while its label is cut off.
- `notice(text, ms)` in `tabs.js`: when `ms` is omitted, it appends the 40px close control
  (`.tab-notice-close`, `aria-label="Close"`). Close hides the notice, as `notice("")` does, and
  the next notice replaces it. Showing a notice never moves focus (`role="status"` announces it);
  if Close had focus when the notice hides, focus goes to the Refresh control. Today, "You are
  refreshing too quickly." in `trending.js` and `newest.js` is the only notice with no timeout.
- **The Not Saved dialog (the one admin-page change in 024).**
  - `admin.html` links `tabs-modal-m3.css` and `discard-dialog-m3.css`. Its `tabs.css`
    already holds production's `.modal` rules.
  - `confirmDiscard()` in `adminCard.js` changes from `window.confirm("Any edits will be lost.
    Continue?")` to the prototype's page dialog, which returns a `Promise<boolean>`:
    - `role="alertdialog"`;
    - the headline "Discard changes?" and the text "Your edits will be lost.";
    - the text buttons **Keep editing** and **Discard**.
    - Keep editing, Escape and a scrim click resolve `false`. Focus starts on Keep editing, Tab
      stays on the two actions, and focus returns to the opener.
  - Its two callers await it: the editing card's Cancel (`adminCard.js`), and the back link in
    `guardNavigation()` (`adminList.js`), which keeps `preventDefault()` before the `await`.
  - `adminCard.js` registers `.modal .modal-action` with `m3-ripple.js`.
  - Client tests:
    - with no edits, Cancel and the back link act at once;
    - with edits, the dialog opens with focus on Keep editing;
    - Keep editing, Escape and the scrim keep the edits, and Discard proceeds;
    - focus returns to the opener.
- Replace the literal font sizes in `header-tab-bar-m3.css` (14px and 16px, commented Body Medium
  and Label Large) with the `--md-sys-typescale-*` variables, as `m3-tokens.css` provides them.
- **`Tabs.modal`.** Port `tabs-modal-m3.css` as `src/public/tabs-modal-m3.css`, an M3 basic
  dialog with no headline:
  - a 32% black scrim;
  - `surface-container-high` with a 28px corner and 24px padding;
  - elevation 3 in light only;
  - Body Medium text;
  - OK as a text button;
  - a 200ms entrance.

  `tabs.js` registers OK with `m3-ripple.js`. Edit `modal()` in `tabs.js` as the prototype's two
  `M3:` edits: the box gets `aria-labelledby` pointing at its text, and Tab and Shift+Tab stay on OK.
- **Live Results idle prompt.** Port `live-idle-prompt-m3.css` as
  `src/public/live-idle-prompt-m3.css`:
  - an inline outlined card: `surface-container-low`, an `outline-variant` hairline, a 12px
    corner;
  - Cancel and Yes as text buttons;
  - an entrance that fades and slides 8px.

  `liveResults.js` registers Cancel and Yes with `m3-ripple.js`. Edit `liveResults.js` as the
  prototype's `M3:` edits:
  - `IDLE_PROMPT` drops "for this poll";
  - the prompt is no longer `aria-modal` (which also gives Escape back to the maximized view);
  - it is named by its text;
  - focus moves to Yes, and returns after Yes.
- **Empty-tab line.** Port `empty-tab-line-m3.css` as `src/public/empty-tab-line-m3.css`:
  - Body Medium supporting text in `on-surface-variant`, centred on every tab, with no container
    and 16px of padding;
  - 18px above it when the grid has cards;
  - the focus ring on `:focus-visible` only.

  In `tabs.css`, split the grouped `.tab-notice, .tab-empty` rule, since `.tab-notice` is now a
  snackbar, and delete FIX029's Search-only centring rule.
- Fixes in this step:
  - **The 640px rule.** `tabs.css` line 223: the comment's `btn-header-*/` ends it early, so the
    `@media (max-width:639.98px)` block after it is dropped. Reword the comment, so the tighter
    `.container` padding and the one-column `.card-grid` apply on phones.
  - **The avatar.** It becomes a `<button>` wrapping the `<img>`, with `aria-haspopup="menu"`
    and `aria-expanded`. It gets the focus ring and the state layer. Escape closes the menu and
    returns focus to the button.
  - **Disabled tabs.** Make the personal tabs `aria-disabled="true"` instead of `disabled` for a
    guest, so a guest's click reaches the existing `/login` path in `tabs.js`. Today a disabled
    `<button>` fires no click, so that path never runs. It also lets their tooltip, "Sign in to
    use this tab", show, since a disabled `<button>` gets no pointer or focus events. The M3
    disabled colours, the `not-allowed` cursor and the absent state layer follow
    `[aria-disabled="true"]`, as `header-tab-bar-m3.css` already does. In detail:
    - `applyGuestState()` sets and removes `aria-disabled="true"` instead of `disabled`;
    - the click handler's `btn.disabled` check becomes
      `btn.getAttribute("aria-disabled") === "true"`, so the redirect happens before `select()`;
    - the `tabs.css` hover rule `.tab:hover:not(.is-active):not(:disabled)` also excludes
      `[aria-disabled="true"]`;
    - Enter or Space on a focused guest tab takes the same `/login` path.
- Tests: `tests/tab-bar-assets.test.ts` is updated for the icon fills (now CSS) and the new CSS.
  New client tests cover:
  - the notice's close control and `role="status"`;
  - the avatar button and menu by keyboard;
  - a guest's click on a personal tab going to `/login`;
  - `Tabs.modal`'s name and Tab trap;
  - the idle prompt's text, name and focus;
  - the tooltip (no `title` left, the text shown on hover and keyboard focus, a long press that
    does not click, rows only when cut off). The default script list in `tests/helpers/browser.ts`
    stays as it is, so existing tests keep reading `title`. The tooltip tests load
    `tooltip-m3.js` through `options.scripts`, and stub `scrollWidth` / `clientWidth` for the
    cut-off case, since jsdom has no layout.

  Existing tests updated:
  - `tests/client-home.test.ts`'s guest-tab assertions read `aria-disabled` instead of
    `disabled`;
  - its idle-prompt assertion takes the new text, without "for this poll".

### Step 3: the Poll Card and the maximized view
- Port `pollCard-m3.css` as `src/public/pollCard-m3.css`, reading `m3-tokens.css`. This covers:
  - The type scale on the card.
  - The filled Vote and Submit buttons, the 32px icon buttons, Live Results as a tonal button
    (an input chip on the Live Results tab), the M3 radio and checkbox, and the supporting text.
  - The dark container, the dark bar colours, and the maximized view's section 8.
- Apply the two `pollCard.js` edits above, and a third marked `M3:` edit that registers the
  card's ripple targets and `.maximized-card-close` with `m3-ripple.js`.
- Tests: `tests/client-bar-colours.test.ts` reads the bar colours from the four custom
  properties instead of `row.style.background` and `style.color`.
  - Every light value stays pinned to 022's.
  - Each dark ink is asserted at 7:1 or more against its dark track.
  - A test covers `is-multi` on multi-choice polls only.
  - `tests/client-maximized.test.ts` is re-run, and updated where it reads inline colours.
- Fix in this step: the 021 rule in `site.css`,
  `.card-viewport:not(.maximized-card-viewport) .question:hover` (and its `.subtitle` and cursor
  siblings), also matches the card-shell pages. It is scoped to poll cards, for example by adding
  `:not(.card-shell-viewport)`.

### Step 4: the card-shell pages
- Port the prototypes' `card-shell-m3.css` as `src/public/card-shell-m3.css`. It was already
  generalised from the profile layer while prototyping, and serves Profile, Login (sections 9–11:
  the checkbox, the outlined OAuth buttons, the field error), Create Account and Not Authorized
  (section 12: an empty body takes no space). Port `profile-editor-m3.css` beside it, for
  Profile's current values. Together they cover:
  - Underlined text fields (the admin-card wizard's style, in Roboto and the M3 roles).
  - Current values as a label over the value, with no box.
  - 40px filled buttons.
  - Status lines in Body Small, with the field's error state while its status is an error.
  - No title hover underline.
  - The snackbar.
- `profileCard.js`: on a successful `PATCH /api/me` (`r.res.ok`), show "User name saved" as a
  snackbar for 4 s. Today "Saved." is cleared as soon as the refreshed session arrives (FR-018).
  The snackbar gives the confirmation that clearing takes away.
  - One `role="status"` snackbar element, created on demand, as the card-shell prototype does.
  - A second success while it shows replaces its text and restarts the 4 s timer.
  - It is raised above the cookie banner by `--cookie-banner-offset` (Step 2).
  - The inline "Saved." status is unchanged (FR-018 still clears it).
- Replace the literal `font-size:14px` on the field labels in `card-shell-m3.css` with
  `--md-sys-typescale-body-medium-size`, as Step 2 does for `header-tab-bar-m3.css`. The label
  keeps its 500 weight and 18px line height.
- Tests: client tests for the snackbar after a successful save, and not after a refusal, a 429 or
  a network failure. The existing profile and page tests are re-run unchanged.

### Step 5: dark mode on, and the cross-page check
- `m3-tokens.css` and the area layers add their dark blocks under
  `@media (prefers-color-scheme: dark){ :root:not([data-theme="light"]){ … } }`, beside
  `:root[data-theme="dark"]`, so the site follows the visitor's system setting.
- `admin.html` and `admin-results.html` carry `<html data-theme="light">`, so they stay fully
  light, header, Not Saved dialog and admin cards (Step 6) included, until the admin toolbar,
  search and `admin-results.html` have dark styles (the admin feature). A
  page test asserts the attribute on those two pages and its absence on the other five.
- A browser pass over every page, in both schemes, at 320px, 640px, 768px and desktop widths.
- The browser checklist below comes from each prototype's NOTES and the compliance review. It is
  the one maintained from here on. Check each prototype with Theme on Light and on Dark, then the
  same surface on the merged page.
  - [ ] `poll-card.html`:
    - every fixture, with and without the remove-form checkbox, at about 1280, 640 and 375px;
    - the ripple and the state layers;
    - the radio and checkbox at small bar heights;
    - the 32px controls in the action and title rows.
  - [ ] `MAXIMIZED-POLL-CARD/single-card.html`:
    - at about 1280, 850 and 375px, on `fifty`, `yesno` and `closed`, and once with `#back`;
    - the ×, the outlined panel and the rule;
    - the 898 / 808 / 768px thresholds.
  - [ ] `HEADER-TAB-BAR/header-tab-bar.html`:
    - the indicator on the divider, and the 56px header row at each width, with the search bar
      wrapping below 768px;
    - the logo in dark, and the icon cut-outs on hover;
    - the snackbar's position with and without the cookie banner.
  - [ ] `PROFILE-EDITOR/profile-editor.html`:
    - the underline in its focus and error states;
    - the current values lining up with the fields;
    - the 40px buttons;
    - the snackbar.
  - [ ] `LOGIN-DIALOG/login-dialog.html`:
    - the checkbox in each state, by mouse and by keyboard;
    - the outlined OAuth buttons;
    - the field error after typing versus at load.
  - [ ] `CREATE-ACCOUNT-DIALOG/create-account-dialog.html`: the field error after typing, and
    the title hover.
  - [ ] `NOT-AUTHORIZED-DIALOG/not-authorized-dialog.html`: the spacing. Then the Profile Editor
    with "No session", and with "Email changed" or "Invalid link".
  - [ ] `TABS-MODAL/tabs-modal.html`: the scrim, the entrance and the ripple, from both
    triggers.
  - [ ] `LIVE-RESULTS-IDLE-PROMPT/live-results-idle-prompt.html`: the outlined card, the state
    layers, the focus ring on Yes and the entrance.
  - [ ] `EMPTY-TAB-LINE/empty-tab-line.html`:
    - the centring;
    - the 34px gap with "More results…";
    - the focus ring with **Focus line** pressed by Enter or Space, and none by mouse.
  - [ ] Tooltips, on `poll-card.html`, `MAXIMIZED-POLL-CARD/single-card.html` and
    `HEADER-TAB-BAR/header-tab-bar.html`:
    - hover and keyboard focus on each icon control;
    - a guest's tabs (Session: a guest);
    - a cut-off result or vote label;
    - placement near the viewport edges;
    - moving the pointer onto the tooltip;
    - a long press on a touch device, including the Live Results link opening no menu.
  - [ ] `DISCARD-DIALOG/discard-dialog.html`:
    - the headline's spacing;
    - the two actions;
    - the entrance and the ripple;
    - Cancel and the back link, with the title unedited and edited.
  - [ ] `ADMIN-CARDS/admin-cards.html`, at 320px, 360px and desktop widths:
    - the read-only face: the state, the 40px icon buttons, the ⋮ menu, the outlined panels and
      the Open / Close / Archive buttons;
    - the Settings Summary: the title and subtitle as the Poll Card's, and the underlined
      tappable parts, by mouse and by keyboard;
    - the Named Circles: current, visited and not yet visited, the joining line, the state layer
      and focus ring on the circle, and the 11px names below 360px;
    - each step: the radio rows and their state layers, the switch on and off, the underlined
      fields in focus and error, the keyword chips, the date and time inputs, Copy link and
      "What does this mean?";
    - the footer: Cancel and Save outlined, Publish filled, and a blocked Publish greyed with its
      tooltip on hover, focus and a long press;
    - an existing poll in the wizard (close the new poll's wizard first, then tap a Summary Text
      part of the OPEN, CLOSED or WAITING TO OPEN card): only the parts its state lets change
      are links; the wizard opens at that step with every circle visited; locked controls are
      greyed with their reason line; the "reviewed again" line; Save changes blocked until an
      edit, with its tooltip;
    - every Cancel and the back link with edits, through "Discard changes?";
    - the snackbar after Copy link;
    - the ripples, and none under reduced motion.

### Step 6: the admin cards
Added by REQUIREMENT "Merge Material 3 Admin page" (clarifications 1–8). Its prototype is
`ADMIN-CARDS/admin-cards.html`, made by REQUIREMENT "Use Material 3 For the admin cards"
(Prerequisites). The design decisions are in
`NON-ADMIN-POLL-EDITING/accepted-recommendations.md` (A24–A31) and that folder's
`iterative-requirements.md` (REQUIREMENT001–022). The prototype links the root's M3 files, as the
other prototypes do, so this is a normal port, as in Steps 2–4:
- Port `ADMIN-CARDS/admin-card-m3.css` as `src/public/admin-card-m3.css`, reading
  `m3-tokens.css`. `admin.html` links it last.
  - Its section 1 declares the tokens the root files lack. They move to `m3-tokens.css`, which
    does not have them yet: Title Medium, Label Medium and Label Small. Title Small, Body Large
    and elevation 2 are already there.
  - It has no dark blocks of its own: every colour is an M3 role, which `m3-tokens.css` already
    switches for dark (Step 5). `admin.html` stays light (Step 5).
  - The REQUIREMENT comments go (Constitution VI).
- `adminCard.js` takes `ADMIN-CARDS/adminCard.js`, without its `M3:` and REQUIREMENT comments. It
  already holds production's 024 edits:
  - `confirmDiscard()` as Step 2's page dialog, returning a `Promise<boolean>`, awaited by every
    Cancel;
  - `.modal .modal-action` registered with `m3-ripple.js`.

  `ADMIN-CARDS/admin-card-m3.js` (the prototype's ripple) is not ported. Its target list becomes
  `window.M3Ripple?.add(…)` calls in `adminCard.js`.
- `admin.css` takes `ADMIN-CARDS/admin.css`: production's sheet plus the cards' layout only.
- What it brings, each as resolved in `accepted-recommendations.md`:
  - the five-step wizard for an INITIALIZED poll, with the Named Circles, Next, Save, Cancel and
    Publish (A24–A29):
    - A poll is in its wizard when its worded state is INITIALIZED: `pollState` is INITIALIZED,
      or it is EDITING with `pollStateBeforeEditUpdate` INITIALIZED (the second server change
      below). No other field is needed. The prototype's `cardType` is a harness-only fixture flag
      and is not ported as a production field.
    - A24.4's saved progress (the current step and the visited and answered steps) lives in the
      card instance. After a page reload, an INITIALIZED poll's wizard reopens at Step 1 with its
      stored answers.
    - Create New Poll opens the new poll's wizard at Step 1. `adminCard.js`'s controller exposes
      `openWizard()` (`requestEdit(1)`), and `adminList.js` calls `controller.openWizard()` in
      place of today's click on `.card-pen`, which this step removes.
  - Step 1's "Users can see who voted for what" switch, stored in `voteAnonymity` as the admin
    card's radio group does today (A25.4);
  - Step 1's default stays production's: `createDefaultPoll` keeps `pollVisibility` `Public
    Poll`, so a new poll's wizard opens with "Everyone on CrowdPoll" selected. A25.1's private
    default (and the harness's `Private Poll` fixture) is not adopted; the list's order is
    unchanged (024 spec clarification, 2026-10-03, Q2 B);
  - the Settings Summary and its tappable Summary Text (A24.3, A30.3);
  - the redesigned read-only face (A30);
  - the when-line worded by the poll's state (A31);
  - **the wizard for every existing poll, in place of production's edit face** (A24.6, resolved
    by REQUIREMENT "Wizard When Editing An Existing Poll"):
    - A Summary Text part is a link only when its field can change in the poll's state. Nothing
      changes while AWAITING APPROVAL or ARCHIVED, or while the poll is edited elsewhere. With
      no votes, everything can change. With votes, only the title, subtitle and dates can
      change (`editModeFor`, `UPDATE_FIELDS`). The start can change only before the poll
      opens, and the end only until it closes, which is tighter than the server.
    - A tap opens the wizard at that part's step, with every step visited. What cannot change
      is greyed, with one line saying why.
    - The footer is Cancel and **Save changes**, `aria-disabled` until something valid has
      changed. Save changes sends only the changed fields to `/publish`, as the edit face's
      Save and Publish does. As today, that sends every saved poll back to AWAITING APPROVAL,
      with or without votes, and a line above the footer says so.
  - every admin card fluid and capped at 420px, and the wizard working down to a 320px window
    (A24.5).
- What it removes: production's edit face, with its Voter Count Limit, invitation list and
  banned voter list. Those three return in a later requirement. Until then a poll's stored
  limit, invitations and bans stay as they are, but cannot be changed in the app. Their routes
  stay, unused by the page.
- What it leaves as production has it:
  - **Step 4's range.** "From [a] to [b] choices" and "Exactly [k] choices" need
    `minSelections` / `maxSelections` columns (A28.4), and `validatePollFields` ignores fields it
    does not know, so such a poll would be saved silently as a plain multiple-choice poll. The
    prototype drops them: "More than one" saves `Multiple-Choice Poll`, which allows 1 to N, as
    today.
  - Who gets the card: admins on `admin.html`, gated by `ENV_ADMINS`. Poll creation for every
    user, and the tabs in A1–A23, are later features.
  - Who sees who voted for what: admins only, as today. The switch's help text describes voters
    seeing it, which A25.4 defers.
- Every Cancel on the card, the wizard's included, and the back link await `confirmDiscard()`.
  A24.4's "Any edits will be lost. Continue?" is superseded by "Discard changes?".
- The wizard's Publish and Save are `aria-disabled="true"` while blocked, not `disabled`, so the
  tooltip naming what is missing shows on hover, focus and a long press. Their clicks do nothing
  while blocked. The M3 disabled colours follow `[aria-disabled="true"]`, as for the guest tabs.
- **The five server changes in 024:**
  - `createDefaultPoll` (`src/polls/service.ts`) defaults `voteMutability` to `Dynamic-Vote Poll`
    for every new poll (A28.1).
  - `adminListRow` (`src/routes/pollsApi.ts`) adds `pollStateBeforeEditUpdate`, which the poll row
    already holds, so an EDITING poll's when-line is worded exactly (A31).
    `postman/openapi.json` describes it on the admin list and search responses.
  - A new route, `POST /api/admin/polls/:pid/save` (`src/routes/pollsApi.ts`), for the new poll's
    Save (A24.4: keep the answers, finish later). The prototype's `adminCard.js` already posts to
    it.
    - It takes the same body as `/publish` (`clientGuid` and the fields), holds the same
      edit-session lock (`resolveEditContext`), and validates with `validatePollFields`.
    - It accepts only a poll whose effective state is INITIALIZED (INITIALIZED, or EDITING with
      `pollStateBeforeEditUpdate` INITIALIZED), and refuses any other with `409`.
    - It stores the fields, leaves the poll INITIALIZED, clears the edit session, and does not
      request approval. The "still has its default values" hold does not apply, since nothing
      is published.
    - `postman/openapi.json` describes it.
  - `validatePollFields` (`src/polls/service.ts`) accepts `keywords`, so the wizard's keywords
    are stored on `/publish` and `/save` (024 spec clarification, 2026-10-03, Q1 A). Today it
    ignores them. The `keywords` column and its search weighting already exist, so there is no
    database change.
    - The value is one comma-separated string. Each keyword holds only `a-z`, `0-9` and single
      spaces, with no leading or trailing space; duplicates are refused; the whole string is at
      most 200 characters (A26.3). A bad value is refused with `400`.
    - A private poll stores `""`: keywords sent with, or kept on, a poll that is or becomes
      private are cleared.
    - Keywords are not in `UPDATE_FIELDS`, so they cannot change once the poll has votes, like
      the other Step 1–4 settings.
    - `postman/openapi.json` describes `keywords` on the publish and save bodies.
  - `/publish` (`src/routes/pollsApi.ts`) holds a poll back as INITIALIZED for still having the
    starter choices only when the poll has not been published (effective state INITIALIZED).
    A published poll with those choices (old data) goes to AWAITING APPROVAL like any other,
    instead of returning to INITIALIZED (024 spec FR-049, found after Step 6 was built).
- Tests:
  - server: the new default (`tests/polls-service.test.ts` and `tests/polls-admin-crud.test.ts`
    assert `Final-Vote Poll` today), and `pollStateBeforeEditUpdate` on an EDITING poll's admin
    list and search rows;
  - server, `/save`: it stores the fields and leaves the poll INITIALIZED with its session
    cleared; it refuses a poll in any other state, a missing or foreign `clientGuid`, and invalid
    fields; it never sends a poll to screening;
  - server, keywords: stored on publish and save for a public poll; refused when malformed,
    duplicated or over 200 characters; cleared for a private poll; refused with votes;
  - client: the wizard's steps and Named Circles, Publish's enabling (`aria-disabled`, and a
    blocked click sends nothing), Save and reopening at the tapped step, every Cancel through
    the dialog, the switch, and the when-line in each state;
  - client, existing polls: the Summary Text links for each state, with and without votes; the
    wizard opening at the tapped step; the locked steps and their lines; Save changes, its
    enabling, and the fields it sends;
  - client: Create New Poll opens the new poll's wizard at Step 1 (`openWizard()`), and a poll
    that is EDITING from INITIALIZED takes the new-poll wizard (Cancel / Save / Publish);
  - the existing admin client tests, updated where the read-only face changed;
  - the existing tests that read the edit face, by name:
    - `tests/poll-card-assets.test.ts`: the 012 sections on the edit face (Save and Publish
      availability, participant edits, which slice `adminCard.js` at `participantRows`,
      `rosterCount`, …) are retired, with a note naming this step;
    - `tests/polls-editing-eligibility.test.ts`: "offers Save and Publish, then Cancel, on the
      card's editing face" and its neighbours that read the edit face are retired the same way;
    - `tests/client-admin-discard.test.ts` is rewritten to open the wizard from the Summary Text
      (not `.card-pen`, not `.card-header--editing`) and to use the wizard's Cancel and the back
      link;
    - server suites that name "Save and Publish" only in comments or route names (for example
      `tests/polls-admin-crud.test.ts`) are unaffected;
  - the page test for `admin.html`'s link to `admin-card-m3.css`.
- Two client follow-ups found after Step 6 was built (024 spec FR-040, FR-050):
  - a new poll's saved wizard progress survives switching admin views while the page stays
    open: `adminList.js` keeps the card of a poll whose progress is saved;
  - `admin.css` loses every rule nothing on the two admin pages uses (the removed edit face's
    and older admin-list leftovers), with no visible change.
- The Step 5 browser checklist's entry for `ADMIN-CARDS/admin-cards.html` passes on the prototype
  and then on the merged page.
- 024 then merges to `dev`.

### Afterwards: the admin feature
What is left of the admin feature becomes its own feature (025 or later) through the Spec Kit
workflow, on `m3-tokens.css` and `m3-ripple.js`. Its inputs are
`prototypes/POLL-CARD-MATERIAL3/NON-ADMIN-POLL-EDITING/` (`accepted-recommendations.md`,
`iterative-requirements.md`). It covers:
- the admin toolbar, search, back link and list notices, and `admin-results.html`, prototyped
  first;
- removing `data-theme="light"` from `admin.html` and `admin-results.html` once their content has
  dark styles (Step 5);
- poll creation for every user, and the tabs in A1–A23;
- the Voter Count Limit, the invitation list and the banned voter list, in the wizard (they
  leave the admin page in Step 6);
- Step 4's range (`minSelections` / `maxSelections`, A28.2 and A28.4).

## Effect on the current implementation
- **Seven pages change their look** (light mode first, then dark): `index.html`, `profile.html`,
  `login.html`, `create-account.html` and `not-authorized.html`, plus the header on
  `admin.html` and `admin-results.html`. The admin pages' own content is unchanged, except the
  Not Saved dialog (Step 2) and the admin cards (Step 6) on `admin.html`.
- **New files** in `src/public`:
  - `m3-tokens.css` and `m3-ripple.js` (Step 1);
  - `tooltip-m3.css` and `tooltip-m3.js` (Step 2);
  - `header-tab-bar-m3.css`, `tabs-modal-m3.css`, `live-idle-prompt-m3.css`,
    `empty-tab-line-m3.css` and `discard-dialog-m3.css` (Step 2);
  - `pollCard-m3.css` (Step 3);
  - `card-shell-m3.css` and `profile-editor-m3.css` (Step 4);
  - `admin-card-m3.css` (Step 6).

  `devScripts/build-assets.ts` fingerprints every top-level `.css` and `.js` in `src/public`, so
  the build needs no change.
- **Which page links which file.** Each step's page test asserts its rows:

  | File | index | profile | login | create-account | not-authorized | admin | admin-results |
  |---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
  | `m3-tokens.css`, `m3-ripple.js`, Roboto (1) | ● | ● | ● | ● | ● | ● | ● |
  | `tooltip-m3.css`, `tooltip-m3.js` (2) | ● | ● | ● | ● | ● | ● | ● |
  | `header-tab-bar-m3.css` (2) | ● | ● | ● | ● | ● | ● | ● |
  | `tabs-modal-m3.css` (2) | ● | | | | | ● | |
  | `live-idle-prompt-m3.css`, `empty-tab-line-m3.css` (2) | ● | | | | | | |
  | `discard-dialog-m3.css` (2) | | | | | | ● | |
  | `pollCard-m3.css` (3) | ● | | | | | | |
  | `card-shell-m3.css` (4) | | ● | ● | ● | ● | | |
  | `profile-editor-m3.css` (4) | | ● | | | | | |
  | `admin-card-m3.css` (6) | | | | | | ● | |
- **Changed scripts:**
  - `tabs.js`: `notice()`, `role="status"` on `#tabNotice`, the disabled tabs, and `modal()`;
  - `liveResults.js`: `IDLE_PROMPT`, `showIdlePrompt()` and the ripple registration;
  - `app.js`: the avatar button, the header's ripple registration and the cookie-banner offset;
  - `adminCard.js` and `adminList.js`: `confirmDiscard()` and its two callers;
  - `adminCard.js`: the prototype's version, keeping the 024 edits above, with `openWizard()` on
    its controller (Step 6);
  - `adminList.js`: Create New Poll calls `controller.openWizard()` in place of the `.card-pen`
    click (Step 6);
  - `pollCard.js`: the two edits and the ripple registration;
  - `profileCard.js`: the snackbar.
- **Changed styles:** `tabs.css` (the comment, the `.tab-notice, .tab-empty` split and the FIX029
  deletion), `site.css` (the 021 rule's scope) and `admin.css` (the admin cards, Step 6).
- **Server (Step 6 only):** `src/polls/service.ts` (`createDefaultPoll`'s default and
  `validatePollFields`' `keywords`),
  `src/routes/pollsApi.ts` (`adminListRow`, the new `POST /api/admin/polls/:pid/save` and
  `/publish`'s starter-choices hold) and
  `postman/openapi.json` (the admin list row, the new route and `keywords`).
- **Documents:**
  - The README's description of the look and the bar colours is updated.
  - `ARCHITECTURE.md` and `specs/021-MAXIMIZED-POLL-CARD/contracts/ui-contracts.md` (which
    describe inline bar colours) are annotated to point to this feature.
  - `CLAUDE.md` gains this feature's decisions.

## Material 3 compliance review
The review in `prototypes/POLL-CARD-MATERIAL3/iterative-requirements.md`, REQUIREMENT "Question:
Everything Prototyped in Material3?", found the following:
- Every surface in 024's scope is prototyped in Material 3 and verified in code. The surfaces are:
  - the Poll Card front and back, and the maximized view;
  - the header, tab bar, tab notice and cookie banner;
  - Profile, Login, Create Account and Not Authorized;
  - `Tabs.modal`, the Live Results idle prompt and the empty-tab line;
  - the tooltips.
- The verification in code covers four checks:
  - Every class the in-scope pages create is styled by an M3 layer or is a layout wrapper.
  - Every copied production rule and script matches `src/public`, apart from the marked `M3:`
    edits.
  - Every layer parses and every prototype page loads without script errors in both schemes.
  - Colour, type and shape come from the M3 tokens.
- The one gap the review found, the browser's `title` tooltips, was closed by REQUIREMENT "Use
  Material 3 For tooltips".
- Found after the review: the admin page's Not Saved dialog (`window.confirm`), outside the
  review's scope. REQUIREMENT "Not Saved Dialog Box" prototyped it in M3 and brought it into 024
  (Step 2).
- Brought into 024 after the review: the admin cards. REQUIREMENT "Merge Material 3 Admin page"
  added them as Step 6, and REQUIREMENT "Use Material 3 For the admin cards" prototyped them on
  the M3 foundation (`ADMIN-CARDS/`).
- The look is pending the browser checklist in Step 5 (each prototype, Light and Dark). It was
  first gathered in that review's NOTES. Step 5's copy adds the later prototypes and is the one
  maintained.

# Functional Requirements
This feature restyles the webapp. It does not change what any page does, with these exceptions,
each a fix or decision made while prototyping:
- A guest's click on a personal tab goes to `/login`, as `tabs.js` already intends.
- The header avatar can be opened with the keyboard.
- Below 640px, the page padding and the one-column grid that `tabs.css` intends apply.
- A successful user-name save is confirmed by a snackbar.
- The `Tabs.modal` dialog is named by its message, and Tab stays on its OK button.
- The Live Results idle prompt:
  - reads "Do you want to continue to receive Live Results updates?", without "for this poll";
  - is no longer `aria-modal`, so the maximized view's Escape works while it shows;
  - is named by its text;
  - takes focus on Yes, and returns it after Yes.
- The empty-tab line is centred on every tab, not on Search only.
- Leaving an edited poll card on the admin page (Cancel or the back link) asks "Discard
  changes?" in a page dialog, with **Keep editing** and **Discard**, in place of the browser's
  "Any edits will be lost. Continue?". Keep editing, Escape and a click outside keep the edits.
- Tooltips are M3 plain tooltips, not the browser's.
  - A result or vote row shows one only when its label is cut off.
  - A blocked Publish, Save or Save changes on an admin card shows what is missing in its
    tooltip.
  - On touch, a long press on a control with a tooltip shows the tooltip instead of the browser's
    menu, and does not activate the control. The Live Results link therefore loses "open in new
    tab".
- The admin cards (Step 6):
  - A new poll is set up in a five-step wizard inside its card, with Save, Cancel and Publish.
    Save keeps the answers and leaves the poll INITIALIZED, to finish later.
  - The card shows a Settings Summary, a redesigned read-only face, and a when-line worded by the
    poll's state.
  - The wizard's Cancel asks "Discard changes?", as the other Cancels do.
  - An existing poll is edited in the same wizard, at the tapped step, in place of the edit
    face. Only what its state lets change is a link or can be changed, and the start and end
    dates follow a tighter rule than the server's. Save changes sends the poll back to review,
    as Save and Publish does today.
  - The Voter Count Limit, the invitation list and the banned voter list can no longer be
    changed on the admin page until their own requirement. Stored values stay as they are.
  - New polls default to `Dynamic-Vote Poll` ("Can voters change their vote?" answered Yes), in
    place of `Final-Vote Poll`. They stay Public, so the wizard opens on "Everyone on CrowdPoll".
  - A public poll's keywords are saved and make it findable in search. Today the admin card
    cannot set them.

# Assumptions
- **The prerequisites are done.** Every prototype listed under Prerequisites is completed and
  resolved in `iterative-requirements.md`, ahead of `/speckit-specify` for 024 (the admin cards
  ahead of Step 6).
- **The prototypes are the design source of truth.** Where the spec and a prototype differ, the
  prototype's NOTES record the decision.
- **The browser floor is current evergreen browsers.** The field error state uses `:has()` and
  `:user-valid` / `:user-invalid`. Without them, only the status line shows the error, which is
  acceptable.
- **There is one dark scheme,** which follows the system setting. There is no theme picker in
  the product. The prototypes' Theme picker is a development aid, kept as `data-theme` for
  testing. Its one production use is `data-theme="light"` on the two admin pages (Step 5).
- **No production colour token changes in light mode.** `--ink`, `--paper`, `--moss` and the
  other production tokens, and 022's bar colours, keep today's values. Components take their M3
  roles, so the snackbars, dialogs, tonal and disabled controls and the focus ring use the light
  M3 colours shown in the prototypes.
- **The spec directory** is `specs/024-MATERIAL3-MERGE/`.

# Exclusions
- From `NON-ADMIN-POLL-EDITING/`: poll creation for non-admins, the tabs in A1–A23 and Step 4's
  range (A28.2). Also the Voter Count Limit, the invitation list and the banned voter list (a
  later requirement), and the admin toolbar, search, back link and list notices, and
  `admin-results.html`. They are a separate, later feature.
- Any server change beyond Step 6's five, any route beyond Step 6's `/save`, and any
  configuration or database change.
- The bar palette's contents and order, the semantic Yes/No colours, and the 022 starting-entry
  rule.
- A user-facing theme picker.
- Replacing the logo with a light-on-dark version. The dark scheme recolours the current SVG.
- The browser's leave-page prompt (`beforeunload`, on reload, closing the tab or typing a new
  URL while a poll card has edits). Browsers do not let a page replace or reword it.

