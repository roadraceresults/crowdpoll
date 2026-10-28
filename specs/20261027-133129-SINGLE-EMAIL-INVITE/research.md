# Research: Single-Email Invitation

Every decision below was taken in the requirements review (`requirements/20261027-133129-single-email-invite/requirements-report.md`, findings RS1–RS3, IN1–IN2, AM1, UA1–UA10, NC1–NC2) or in `/speckit-clarify` (2026-10-27); this file records how each one maps onto the code.

## R1. Where the token lives

- **Decision**: three nullable columns on `poll_invitations`: `token_hash` (`hashToken` of the token, the SHA-256 already used for sign-in bindings), `token_expires_at`, `token_used_at`. One migration, `011-invitation-tokens`, with a unique partial index on `token_hash`.
- **Rationale**: one current token per invitation (UA5); the row already has the poll and the address; removing the address deletes the row and so revokes the token (UA4) with no extra code; the poll id travels in the link (IN2), so superseded hashes need not be kept.
- **Alternatives considered**: a separate `invitation_tokens` table keeping every hash (IN2 Recommendation B, rejected); a BetterAuth magic-link token minted at send time (rejected: they live 15 minutes, RS1).

## R2. Issuing the token

- **Decision**: `issueInvitationToken(db, pid, email, poll)` in `src/invitations/tokens.ts` makes 32 random bytes (`base64url`), writes the hash, `token_expires_at = min(poll.end_at, now + 30 days)` and `token_used_at = null` on the row, and returns the token. `sender.ts` calls it for each recipient immediately before `deliver`, in `sendPendingInvitations` and in `sendReminder` (which Resend also uses).
- **Rationale**: every email carries the newest token (UA5); a token is never issued for an email that is not attempted.
- **Consequence**: `buildInvitation` reads the poll once per poll as today, and the message is rendered per recipient (its link and address differ); the render is in-memory and cheap.
- **OAuth**: with `config.nativeSignin` false, no token is issued and the link stays `/?PID=<pid>` (UA6, FR-007).

## R3. The link

- **Decision**: `${publicOrigin}/invite?PID=<pid>&token=<token>`.
- **Rationale**: IN2 Recommendation A; `PID` matches the spelling of every other poll link.

## R4. Opening the link: `GET /invite` (pages.ts)

Decided on the server, in this order, with nothing written except in the third case:

1. `PID` not a valid poll id → signed-out: `/login?error=invalid-link`; signed-in: `/` (UA9, FR-016).
2. The token cannot sign in (`data-model.md`, "can a token sign in?": no matching row, used, expired, or the poll closed, archived or no longer Invitation Only) → `302 /?PID=<pid>` (FR-015), which keeps today's behaviour.
3. Signed in as the invited address by email key (`emailKeyOf`, the TypeScript twin of the SQL `emailKey`) → set `token_used_at` and `302 /?PID=<pid>` (FR-012, UA8); the existing pages route then adopts, accepts and lands.
4. Otherwise serve `invite.html` (`Cache-Control: no-store`); the page reads the card's facts from A2.

A mail scanner never holds the invitee's session, so step 3 cannot be triggered by one (SC-005).

`/invite` is one of the terms gate's page routes, like every other page: a browser signed in as another account that has not accepted the current Terms goes through `/accept-terms?next=` before it sees the card (decided 2026-10-27, analysis finding I2).

## R5. Signing in without an email

- **Decision**: mint a BetterAuth magic-link token on the server and consume it at once through the existing `completeSignIn(req, res, token, stay, pid)`.
  - `issueLoginLink`'s call `auth.api.signInMagicLink` gains a sibling, `mintLoginToken(email)`, which calls it with `metadata: { mint: <random id> }`; `sendMagicLink` in `auth.ts` stores the token in an in-process map under that id instead of emailing it when `metadata.mint` is present; the caller takes it out right after the awaited call.
- **Rationale**: `magicLinkVerify` already consumes the token atomically, sets `emailVerified` (better-auth 1.6.26, `plugins/magic-link/index.mjs:169`, the clarification of 2026-10-27), runs `session.create.before` (revoke other sessions, activate a pending account) and `session.create.after` (adopt invitations), and `completeSignIn` shapes the cookie for Stay signed in. One sign-in path, not two.
- **Alternatives considered**: writing BetterAuth's verification row ourselves (rejected: its value format is internal to the plugin and changes between versions); creating the session with `internalAdapter.createSession` (rejected: skips the hooks and `emailVerified`).
- **Note**: `mintLoginToken` calls `supersedeLoginLinks` like `issueLoginLink`, so a pending emailed sign-in link for that address is cancelled; it sets no `signin_binding` cookie (the confirmation card and the `Origin` check take its place, technical debt in the report).

## R6. Continue: `POST /api/invitations/redeem`

Body `{ pid, token, stay, acceptedTerms?, termsVersion?, signOut? }`. In order:

1. `Origin` must equal `requestOrigin(req)` (as `confirm-signin`) → else `403`.
2. Row checks as R4 step 2 → if the token cannot sign in, `200 { redirect: "/?PID=<pid>" }` (FR-019).
3. No account for the address (`userByKey`) → `acceptedTerms === true` and `termsVersion === TERMS_VERSION` required (else `400 terms-required`).
4. Rate limit: `consumeRateLimit` with a new rule `RATE_LIMITED.redeemInvitation`, using `emailRateLimit(config)` like the other sign-in routes (FR-017). It comes after steps 2 and 3, so a dead link or a forgotten Terms box costs no attempt; `.do/app.yaml` raises `ENV_EMAIL_RATE_LIMIT_MAX_REQUESTS_PER_WINDOW` from `2` to `5` per 15 minutes, since Continue shares the limit with the emailed links.
5. `isAllowed(email, config)` → else `403 NOT_LAUNCHED` (NC2); then, when there is no account, create the user as `create-account` does (`internalAdapter.createUser({ email, name: "", emailVerified: false })`) and `recordAgreement`.
6. A session for another account (`signOut: true` is required then, else `409 other-account`) → delete that session row and its cache entry, as logout does.
7. `mintLoginToken`; if it fails (the plugin errors, or no token is under the id), log `[invite] Sign-in could not be completed for <masked>` and answer `500` with the generic error body, leaving the token unused so Continue can be pressed again.
8. Mark the token used with a conditional update (`where token_used_at is null`); zero rows → as step 3 (a double press, edge case; the minted token is dropped unused and expires).
9. `completeSignIn(..., stay, pid)` → `200 { redirect: "/?PID=<pid>" }`.

The route is native-only (`nativeOnly`), is added to the terms gate's `ALLOWED_API`, and logs `[invite] Invitation redeemed for <masked> (new account|existing account)` or the refusal, never the token (FR-005).

## R7. The card's facts: `GET /api/invitations/link-info?PID&token`

`no-store`; answers `404` when the token cannot sign in (the card then follows `/?PID=`), else `{ email: <masked>, hasAccount, signedInAs: <masked current address> | null, termsVersion, providers: [...] }`. It writes nothing. Added to `ALLOWED_API`.

## R8. The confirmation card

`src/public/invite.html` + `inviteCard.js`, built from `confirm-signin.html` / `confirmSigninCard.js` and `createAccountCard.js` (the Terms box), on the same stylesheets; the Stay signed in box starts from `ENV_STAY_SIGNED_IN` as `loginCard.js` does (UA10); with `both`, the provider buttons from `loginCard.js` (UA6). `m3-assets.test.ts` and `build-assets.ts` list the new page. The page answers `404` in `oauth` mode.

## R9. Landing maximized

`tabs.js` `applyLanding`: after `mountLinkedPoll(grid, landing.pid)` mounts the card, call `grid.maximize(landing.pid)`, as the other branch does (RS2, FR-021). No server change; `sharedLink.ts` already lands an invitee on `shared-with-you`.

## R10. The email sentence

`invitationMessage` gains an optional `signInAddress`; when set, both text and HTML carry, under the button, "This button signs you in to CrowdPoll as <address>. Please don't forward this email." (UA7). The sender passes it only when a token is issued. Every other email's output is unchanged (the email-layout fixture test). `devScripts/render-invitation-email.ts` renders it with a sample address.

## R11. Privacy Policy and Cookie Use

No new cookie or storage key (the session cookie is the existing one). The Privacy Policy's invitation paragraph gains one sentence: the invitation link can sign the invitee in once, for up to 30 days. `cookie-use-list.test.ts` is unaffected.
