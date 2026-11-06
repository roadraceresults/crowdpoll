# UI Contracts: Social Login Avatar

## C1. The picture

`app.js` and `profileCard.js` keep `me.profileAvatar || "/avatar-default.svg"`; neither changes.

## C2. What is shared (`CardShell.addOauthSharing`, on the Login and invitation cards)

**Login card**: each provider's button and a sentence with `class="oauth-sharing"` sit together in a `class="oauth-provider"` row, built by `CardShell.addProviderSharing`, with no link: "Google shares your name, email address and profile picture.", or "Amazon shares your name and email address.", and likewise for Apple and Microsoft. The Stay logged in box and the "By logging in" line, with its Terms of Service and Privacy Policy links, sit above the buttons. With the email form alone, both stay where they were.

**Invitation card**: one paragraph, `class="oauth-sharing"`, under the provider buttons, styled in `card-shell-m3.css` with M3 tokens only. It is built from the configured providers:

| Configured | Text |
|---|---|
| Google | "Google shares your name, email address and profile picture." |
| One other | "Amazon shares your name and email address." |
| Several others | "Apple, Microsoft and Amazon share your name and email address." |

The sentences join in that order, followed by a link, "Privacy Policy", to `/privacy`. `renderProviders` in `inviteCard.js` calls `CardShell.addOauthSharing`. With no provider configured, as in email-only mode, neither card draws its buttons and nothing appears.

## C3. "Logged in as" on Accept Terms (`acceptTermsCard.js`)

- `render` receives `me`, and adds `<p class="accept-terms-account">Logged in as <strong><address></strong></p>` to the card's body before the terms box, always, however the person logged in.
- The address is set with `textContent`. When `/api/me` gave no address, the line is left out.
- `signedIn` is removed from `next` before it is posted.

## C4. "Logged in as" snackbar (`app.js`)

| At load | Result |
|---|---|
| URL has `signedIn=1`, logged in, Terms accepted | Snackbar "Logged in as <address>" for 6 seconds |
| URL has `signedIn=1`, otherwise | No snackbar |
| In every case with the parameter | It is removed with `history.replaceState`, keeping any other parameter |

The element is `<div class="m3-snackbar m3-snackbar--top" role="status">`, at the top of the screen and over the header while it shows, whose role announces it politely. It has no action. The address is set with `textContent`. A person who prefers reduced motion gets no transition, as the sheet already provides.

## C5. Stylesheets

- New `snackbar-m3.css` holds the `.m3-snackbar` rules moved from `admin-card-m3.css`, with `bottom:calc(16px + var(--cookie-banner-offset, 0px))`, so it clears the cookie banner. `.m3-snackbar--top` holds `top:16px; bottom:auto`, for the login notice only; the admin page's snackbar stays at the bottom.
- `index.html` and `admin.html` link it, and `tests/m3-assets.test.ts` (`LAYER_ORDER`) lists it for both.

## C6. Privacy Policy (`privacy.html`)

- In section 2, "We keep no picture, contacts or anything else from your account there." becomes: "If you log in with Google, we keep a copy of the profile picture it shares, and show it to you where your avatar appears. We keep no contacts or anything else from your account there, and no picture from any other provider. The copy is kept on our content delivery network at an address that cannot be guessed and that we give only to you, though anyone holding that address could load it. If you delete your account it is removed within minutes, a cached copy can last up to a day, and the network may hold cached copies outside Canada."
- Google's row in the table: "the name, email address and profile picture you choose to share when you log in with it".
- The sentence "Your user name and avatar: shown with your polls…" does not change, and no row is added.
- `src/legal/version.ts`: the changed document's date becomes the release date, and `TERMS_VERSION` follows it (C13). No 30-day email.
- Every "delete your account" on the page is a link to `/profile#delete-account`. In section 8, the line no longer says "on your Profile page, under Your Data". The line's last two sentences read "…cannot be used to get around the ban" and "…can be removed by request at privacy@crowdpoll.vote".

## C7. Reaching the delete dialog (`profileCard.js`)

The Profile card has no Your Data section: no heading, copy sentence, policy link or Delete Account button. `/profile#delete-account` opens the delete dialog once the card is drawn, and the hash is removed with `history.replaceState`, so a reload does not reopen it. A guest following the link is sent to `/login` by the page's guard, as for any `/profile` request. Closing the dialog puts focus on the New User Name field.

## C8. The menu's down icon (`app.js`, `header-tab-bar-m3.css`)

A down chevron sits immediately to the right of the avatar, inside `.avatar-btn`, for every logged-in user on every page, whichever picture the avatar shows. It is an inline SVG drawn in `currentColor` (`on-surface-variant`) and hidden from assistive technology; the button's name, `aria-haspopup` and `aria-expanded` do not change. It does not turn when the menu opens.

## C9. The Back to top button (`back-to-top-m3.css`)

On every page, the button sits at the bottom of the viewport on the left edge of the site's container, in line with the header's logo: `left:max(20px, calc((100% - var(--max-width,1280px)) / 2 + 20px))`, or `left:14px` below 640px, the header's gutter there. Its background is `#3A8C5D` in both colour schemes, a literal the developer chose, and the arrow keeps `on-primary`. It stays above the cookie banner, and its behaviour does not change. This replaces the centring from `specs/20261104-180032-LEGAL-PAGE-UPDATES`.

## C10. Delete Account in the footer (`app.js`, `profileCard.js`)

The footer's first line ends with " · Delete Account", a link to `/profile#delete-account`, for a logged-in user only. It is hidden until the session is known, and again after signing out. Following it while already on `/profile` opens the dialog too, through `hashchange`, as in C7.

## C11. Stay logged in on a provider login (`loginCard.js`, `inviteCard.js`, `auth.ts`)

The box applies to every way of logging in. On the Login card with provider buttons, it sits above them and is always available; with the email form alone, it stays in the form and is held until there is an address. The invitation card's box does not move. A ticked box adds `additionalData: { staySignedIn: true }` to the provider start, and the callback hook reads it from the OAuth state.

| Box | Session | `session_token` cookie |
|---|---|---|
| Ticked | `ENV_MAX_SIGNIN_COOKIE_DURATION` (30 days) | `Max-Age` of the same length |
| Clear | 24 hours | Browser session |

This is the same as the emailed link. A failure in this step leaves BetterAuth's 24-hour session and a 24-hour cookie, and never stops the login.

## C12. Wording

The site says "Log in" and "Logged in", and "login" as a noun, as in "login link". The exceptions are the "Sign in with Google", "Sign in with Apple" and "Sign in with Microsoft" buttons, whose wording those providers set, and BetterAuth's `/api/auth/sign-in/*` routes. Identifiers such as `ENV_SIGNIN_METHOD` and `signin_binding`, and "Sign out", do not change.

## C13. What the Accept Terms notice names (`version.ts`, `api.ts`, `acceptTermsCard.js`)

`TERMS_UPDATED` and `PRIVACY_UPDATED` hold the day each document last changed, and `createAssetServing` fills them into each page's "Last Updated YYYY-MM-DD" line when it serves the page. `TERMS_VERSION` is the later of the two, so a change to either asks every account again; no page prints it. `GET /api/me` reports `termsUpdated` and `privacyUpdated`, true when that date is later than the version the account accepted.

| Changed since acceptance | Title | Subtitle |
|---|---|---|
| Both | "Updated Terms of Service and Privacy Policy" | "Please read and accept the Terms of Service and Privacy Policy to continue." |
| Terms | "Updated Terms of Service" | "Please read and accept the Terms of Service to continue." |
| Privacy Policy | "Updated Privacy Policy" | "Please read and accept the Privacy Policy to continue." |

The browser tab's title matches. If `/api/me` gives no answer, the card names the Terms. A first acceptance still gets the welcome, and no migration is needed.

`CardShell.termsVersion` asks for `/api/config` with `cache: "no-cache"`, because that response may be cached for five minutes and a stale version is refused. The route stays cacheable for every other reader. A refusal says "The Terms of Service or Privacy Policy have changed. Reload the page and accept them again."

This card's box reads "I agree to the Terms of Service and have read the Privacy Policy and Cookie Use.", with Cookie Use a link to `/privacy#cookies`. The Create Account and invitation cards keep their wording.

## C14. Privacy Policy changes (`privacy.html`)

- "In short" says one cookie lasts, and two temporary cookies exist only during login. The table's Kind for `signin_binding` and `oauth_state` is "temporary cookie". Both stay cookies, because the server must read them and an emailed link usually opens in a new tab; `oauth_state` is BetterAuth's check against logging a visitor into the wrong account.
- Section 2 says no poll update emails are sent, and that any would go only to people who opt in. There is no separate section and no Profile checkbox.
- The invitation paragraph, `id="invitations"`, says accepting gives an ordinary account, not limited to that poll. The one-time login stays.
- Section 3 reads "We use your data, as described in section 2, to provide the services of CrowdPoll.vote and to keep them secure."
- In section 5, ImprovMX receives "mail you send to our @crowdpoll.vote addresses", and Google (Gmail) "mail you send to us, forwarded by ImprovMX".
- New section 6, `id="no-advertisers"`, "No advertisers, data brokers or analytics". Later sections renumber, and the policy has 11 sections.

## C15. Terms of Service changes (`terms.html`)

The Terms have no liability cap and promise no email: not before CrowdPoll stops, and not before the Terms change. A change takes effect for an account when it accepts on its next visit, through the terms gate. The Privacy Policy's section 11 keeps its own 30-day email promise.
