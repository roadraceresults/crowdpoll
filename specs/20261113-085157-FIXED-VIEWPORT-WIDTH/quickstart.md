# Quickstart: Fixed Viewport Width Trial

This is the trial's checklist (FR-011). The branch is the trial: it is merged only if §6 records "kept".

Prerequisites: Node ≥ 22, `npm install` done, the development server running from this branch (the local launch
script made from `devScripts.example/launch-dev.ps1`), a Chromium-based browser, one real phone that can reach the
development server (see the next section), and a signed-in account that may create polls (for the wizard on `/admin`). The comparison site,
called `main` below, is a second checkout of `origin/main` (there is no local `main` branch) or the production site.

## Reaching the development server from a phone

The session cookies are `secure`, so a phone cannot sign in at the computer's LAN address (`http://<computer's IP>:8080`
shows the guest pages only). To sign in from any phone, iPhone included, give the development server an HTTPS address
with a tunnel, and tell the server that address is its origin.

The tunnel makes this computer's development server, and through it the development database, reachable from the
internet by anyone who has the address, for as long as the tunnel runs. Stop it when the review is done.

1. Start a tunnel to the server's port (the `ENV_PORT` of the launch file, 8080 here) and note the HTTPS address it
   prints. The tunnel must pass the visitor's `Host` header through unchanged: the server builds emailed links, and
   checks the browser's origin on account creation, sign-in confirmation, invitations, account deletion and accepting
   the Terms, from the host of the request it receives. Either:
   - `cloudflared tunnel --url http://localhost:8080` (install once with `winget install Cloudflare.cloudflared`; no
     account needed; prints a `https://<random words>.trycloudflare.com` address, new on every start; passes the host
     through by default); or
   - Dev Tunnels from the `devtunnel` command line, with the host header left unchanged (`--host-header unchanged`; see
     `devtunnel host --help` and `devtunnel update --help` for where the installed version takes it).

   Do not use the Ports panel of VS Code for this. It rewrites the host to `localhost:8080` and has no setting to stop
   it, so the emailed login link reads `https://localhost:8080/…` and the five checks above answer 403.
2. In the local, git-ignored file the server is started from, for the length of the review. That is
   `devScripts/launch-dev.ps1` when it is started from a terminal and `.vscode/launch.json` when it is started from
   VS Code; the two are separate, and a change in one does nothing for a server started from the other:
   - set `$env:ENV_PUBLIC_ORIGIN` to the tunnel's address, with no trailing slash: login links, the trusted origin and
     the cookies all follow it;
   - set `$env:ENV_FCAPTCHA_ENABLED = ""`: the local human check is only proxied for a `localhost` origin, so with a
     tunnel address a phone could not reach it and no login would get through;
   - set `$env:ENV_SIGNIN_METHOD = "native"`: the social providers only redirect to origins registered with them, so
     their buttons would fail at the tunnel address; the emailed login link works;
   - set `$env:ENV_ALLOWED_EMAILS` to your own address(es), so nobody else who finds the address can create an account;
   - leave every `ENV_SPACES_*` empty: the guard that stops a local run from publishing over the deployment's TRENDING
     objects only recognises a `localhost` origin.
3. Restart the server and open the tunnel's address on the phone. Log in there with the emailed link, opened on the
   same phone.
4. Afterwards: stop the tunnel, restore the five settings in the same file, and restart the server.
   `http://localhost:8080` does not work for login while `ENV_PUBLIC_ORIGIN` is the tunnel's address.

If the login card says "The human check is unavailable right now." and "Email a login link" only returns to the login
card with no email sent, the running server still has the human check on. Check it with
`curl http://localhost:8080/api/config`: the answer must hold no `"humanCheck"` entry, and `"signinMethod"` should be
`"native"`. If it does not, the file that was edited is not the one the server was started from, or the server was
not restarted.

If the emailed login link starts with `https://localhost:8080`, the tunnel is rewriting the `Host` header (step 1).

## 1. Run the tests

```
npx tsc --noEmit
npm test
```

Expected: all pass, including `client-viewport-width.test.ts` (contract V2–V5) and `viewport-width-pages.test.ts`
(contract V1).

## 2. Phones in portrait, in device emulation

In the browser's device toolbar, with the device type set to a mobile (touch) device, open each page at each width,
reloading after each change of width. "Wizard" is Create New Poll on `/admin`; "maximized card" is a poll on the home
page opened with its maximize button.

For each cell: the page is laid out 480 px wide (`document.documentElement.clientWidth` is `480`), fills the screen's
width, does not scroll sideways, and looks the same as at the other widths apart from its size. Write ✔ or the problem.

| Width | Home | Maximized card | Wizard | Legal (`/privacy`) |
|---|---|---|---|---|
| 320 | ✔ measured | | | ✔ measured |
| 360 | ✔ measured | | | ✔ measured |
| 390 | ✔ measured | | | ✔ measured |
| 430 | ✔ measured | | | ✔ measured |

"✔ measured" (2026-11-13, at 480 px, headless Chrome in mobile emulation, the pages served as static files to a guest
with no polls loaded): the layout is 480 px wide, the scale is 0.67, 0.75, 0.81 and 0.90, the `639.98px` phone query
matches and the card grid is one column. `/login` measured the same. At 320 and 360 px the page's scroll width equals
its layout width; at 390 and 430 px the browser reports 481 against 480, a rounding of the layout viewport itself (no
element is wider than the page), so check on the phone that the page cannot be nudged sideways at those widths. The
same measurement at the first width tried, 640 px, showed two card columns and no such difference. Still to do by eye,
with the development server and a signed-in account: real poll cards, the maximized card and the wizard, and the
comparison with `main`.

At each width also check (research R6): one card column with the card at its full width; the compact phone header; the
tab bar scrolls sideways within itself; pinch-zoom (Shift-drag in emulation) zooms in and back out.

## 3. Landscape, tablet, desktop and no scripts

| Check | Expected | Result |
|---|---|---|
| 390 × 844 phone turned to landscape, without reloading | laid out 844 px wide, identical to `main` | ✔ measured: 844 px, the page's own declaration (not compared with `main` by eye) |
| turned back to portrait, 10 times in all | the 480 px layout returns every time | ✔ measured: 10 of 10 |
| 768 × 1024 tablet, portrait | laid out 768 px wide, identical to `main` | ✔ measured: 768 px, the page's own declaration (not compared with `main` by eye) |
| desktop window, dragged from wide to 320 px | identical to `main` at every width, phone layout below the 640 CSS-pixel breakpoint | |
| 390 px phone with JavaScript disabled, `/privacy` | laid out 390 px wide, as on `main` | ✔ measured: 390 px |
| 390 px phone, open `/privacy`, go to `/`, turn to landscape, press Back | `/privacy` is laid out 844 px wide | |
| on a tablet, the browser in a split-screen pane narrower than 480 px (write "no tablet" if none is at hand) | laid out at the pane's width, as on `main`; not the 480 px layout | |

## 4. On a real phone

Repeat §2's home page and wizard, and §3's turn, on the phone. Also record the points research left **to verify**:

| Check | Result |
|---|---|
| No flash of the narrow layout while a page loads (FR-009) | |
| iOS only: in landscape the page uses the device's width (research R2) | |
| Typing in the search field or the wizard with the on-screen keyboard open does not change the layout (research R2) | |
| Paragraphs on `/privacy` and poll notes are all scaled alike, none enlarged on its own (research R5) | |
| A tap on a tab, a choice and Vote responds at once (research R7) | |
| Pinch to zoom in, then turn the phone to landscape and back: each turn shows the layout for that orientation, and pinch-zoom still works afterwards | |
| Every control on the four pages can be tapped accurately without zooming (SC-005) | |

## 5. Sizes on screen

The size at which something appears is its designed size × (width of the screen as held ÷ 480). Confirm the phone's
figure against a ruler or a screenshot where possible, and record what was seen.

| Screen | Scale | 16 px text shows at | 48 px control shows at | Readable and tappable? |
|---|---|---|---|---|
| 320 portrait | 0.67 | 10.7 px | 32 px | |
| 360 portrait | 0.75 | 12.0 px | 36 px | |
| 390 portrait | 0.81 | 13.0 px | 39 px | |
| 430 portrait | 0.90 | 14.3 px | 43 px | |
| phone in landscape (≥ 480) | 1.00 | 16 px | 48 px | |
| 768 tablet | 1.00 | 16 px | 48 px | |

## 6. Outcome

The trial passes only if all four hold:

- [ ] no page scrolls sideways (§2, §3);
- [ ] the layout is the same at the four phone widths apart from its size (§2);
- [ ] every control can be tapped without zooming (§4);
- [X] the developer prefers the result to `main` at the same width.

Outcome (one of): kept · **kept with a different width** (which: **480 px**) · dropped

Date, and notes on anything recorded as a problem above:

2026-11-13. The developer reviewed the 640 px layout on a real phone through the tunnel, then the 480 px layout, judged
480 px right, and declared the feature complete (`tweaks.md`, TWEAK04 to TWEAK07). The first three conditions were not
ticked by the developer and the tables of §2 to §5 were not all filled in; the cells marked "measured" are from headless
Chrome. Validation on further phones continues on BrowserStack. One point is open from the measurements: at 390 and
430 px the browser reports a scroll width of 481 against a layout width of 480 (§2). The phone layout itself is to be
redesigned at 480 px in a following feature.
