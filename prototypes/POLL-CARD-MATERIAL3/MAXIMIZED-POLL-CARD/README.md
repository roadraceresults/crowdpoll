# Maximized Poll Card — Material 3

Open `single-card.html` in a browser (`file://` is enough). `single-card-back.html` opens it on the
back face (`single-card.html#back`); adding or removing `#back` in the address bar turns the card.

Since REQUIREMENT006 (`../iterative-requirements.md`) this page is **live**: it is the approved
Material 3 Poll Card from the parent folder, maximized the way the app maximizes a tab's card, not
a frozen copy of its DOM. Anything changed in the parent's card or its M3 layer shows here too.

## How it is put together

- **Styles:** `../tabs.css`, `../pollCard.css`, `../site.css`, then `../pollCard-m3.css`. The first
  three are copies of `src/public`; `tabs.css` carries production's `.maximized-card-grid`,
  `.col-rule` and `.maximized-space-right` rules word for word. The M3 look is in
  `pollCard-m3.css`, section 8 "Maximized view".
- **Scripts:** `../pollCard.js` (the card, with its own maximized mode: `setMaximized`,
  `maximizedBarLayout`), `../pollCard-m3.js` (the ripple), `../fixtures.js` (the sample polls and
  the stub `VoteClient`, shared with the other prototype pages) and `../harness.js`.
- **The page:** `<body data-maximized data-default-fixture="fifty">` tells `harness.js` to mount the
  card into `.maximized-card-grid` ahead of `.col-rule`, call `setMaximized(true)` with
  `choiceBounds` `{ minChoices: 2, maxChoices: 50 }` (standing in for `ENV_MIN_CHOICES` /
  `ENV_MAX_CHOICES`), and start on the 50-choice poll. The markup around it is production's
  `maximizedCardGrid` template from `src/public/index.html`, plus the close row.
- **Controls:** the same bar as `../poll-card.html` — fixture poll (six, including the 50-choice
  stress case), Theme (System / Light / Dark) and the Live Results remove-form checkbox.

## What the maximized view adds, in Material 3

| Part | Look |
|---|---|
| Title | Title Large exactly, 22px / 28px (the grid card shrinks to 18px on narrow windows) |
| Bars | 50px at 2 choices down to 25px at 50, 2px gap, never scrolling (`maximizedBarLayout`); colours, text sizes and everything else as on the grid card |
| Close control (×) | M3 standard icon button: 40px, full radius, 24px icon, `on-surface-variant`, state layers, `secondary` focus ring, ripple. On its own row at the top right, outside the card, on both faces |
| Panel (`.maximized-space-right`) | M3 outlined card: `surface`, 1px `outline-variant`, 12px radius, 16px padding, Body Medium in `on-surface-variant` |
| Rule (`.col-rule`) | `outline-variant`, still 2px wide |

The layout is production's: the card is at most 420px, the panel takes the rest, both shrink
together from a 898px window to 808px, and the panel wraps below the card (and the rule goes) when
`.maximized-card-grid` is narrower than 768px.

The close control and the card's Minimize button both call `closeMaximizedCard` in `harness.js`,
which goes back one page. Production has no close control; there, Minimize, a click on the
active tab and Escape close the view.

## Kept, not loaded

The static extraction this page replaced (2026-09-22, with the experimental "vibrant" bar palette)
is kept as `single-card-static.html`, with the files only it loads: `poll-card.css`,
`page-layout.css` and `poll-card-app.css`. `color-palette.md` and this folder's own
`iterative-requirements.md` belong to that earlier work. None of them is used by
`single-card.html`.
