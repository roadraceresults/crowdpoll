# Research: Social Login Avatar

Decisions already made in `requirements/20261105-161242-social-login-avatar/requirements.md` (Decisions section) are not reopened here; this settles what the spec left to the plan.

## R1. Where the picture is read during a login

**Decision**: a BetterAuth `hooks.after` middleware that acts when `ctx.path === "/callback/:id"`, `ctx.params.id === "google"` and `ctx.context.newSession` is set. It reads that user's `account` row for `providerId = 'google'`, takes the `idToken`, and decodes the `picture` claim from its payload.

**Rationale**, from reading better-auth 1.6.26 (the locked version; this worktree has no `node_modules`, so `../main/node_modules` was read):

- `handleOAuthUserInfo` (`oauth2/link-account.mjs`) writes a fresh `idToken` to the account on every login, and on linking and creation too.
- `callback.mjs` calls `setSessionCookie`, which calls `setNewSession`, then throws the redirect; `api/dispatch.mjs` runs the after hooks with that redirect as the returned value, so the work finishes before the browser moves on (SC-001).
- An `idToken` from Google's token endpoint over TLS may be read without re-checking its signature; better-auth's Google provider does the same with `decodeJwt`.

**Alternatives considered**:

- `overrideUserInfoOnSignIn`: also overwrites `name` and `email` on every login, and writes Google's URL into `user.image`.
- `updateUserInfoOnLink`: runs only when an account is linked, not on later logins.
- `mapProfileToUser`: sees the picture, but not the user it belongs to.

## R2. Google's picture host

**Decision**: accept `https` URLs whose host is `googleusercontent.com` or ends in `.googleusercontent.com`; use `redirect: "error"`, so any redirect is a failure.

**Rationale**: Google's [OpenID Connect reference](https://developers.google.com/identity/openid-connect/reference) documents `picture` as a URL and names no host. `lh3.googleusercontent.com` is the host commonly seen, so a suffix rule allows for its siblings. This could not be confirmed from Google's documentation; the quickstart checks it against a real login (Q3), and a host outside the rule fails safely, leaving the default avatar.

**Alternatives considered**: any `https` host (the server would fetch whatever address a token named); following redirects within the host (more code, and no redirect has been seen to need it).

## R3. How long the CDN keeps a picture

**Decision**: `Cache-Control: public, max-age=86400, immutable`, one day, with no purge.

**Rationale**: the requirements ask for a long lifetime, because the address changes with the image. But the same lifetime is how long a deleted picture can stay reachable through the CDN (SC-006). [DigitalOcean's documentation](https://docs.digitalocean.com/products/spaces/how-to/manage-cdn-cache/) gives a default edge lifetime of one hour and a per-object `max-age` override, and `src/trending/publish.ts` already relies on `max-age` being honoured. It does not say exactly how `Cache-Control` on an object interacts with the edge setting, so one day is the assumed upper bound, which quickstart Q9 checks against the real CDN before the policy's wording ships. One day keeps the cost of a repeat load negligible, since only the owner loads the picture, and bounds how long a deleted photograph lasts.

**Alternatives considered**:

- A year: harmless for freshness, but a deleted photograph could stay reachable for that long.
- [Purging through DigitalOcean's API](https://docs.digitalocean.com/reference/api/reference/cdn-endpoints/): gives the app a platform token with far wider powers than storing a file, for a rare event.

## R4. What makes one image "differ"

**Decision**: the SHA-256 of the bytes, in a new `user.profile_avatar_hash`.

**Rationale**: Google's URL can change while the image does not. The object key cannot carry the hash, because the key must not be derivable from the image.

## R5. Order of upload and database write

**Decision**: upload the new object, then in one transaction update the `user` row and queue the old key. When the update touches no row, because the account was deleted meanwhile, queue the new key.

**Rationale**: the row never points at an object that does not exist. A crash between the upload and the transaction leaves one unreferenced object with an unguessable key and no owner in the database; this is rare and accepted, and a listing sweep to catch it is not justified.

## R6. Removing objects

**Decision**: a table `avatar_removals` and a sweep every 5 minutes, under a new advisory lock `avatarRemovals: 13`, deleting up to 100 objects per tick. A row goes only when its delete succeeds. S3's `DeleteObject` succeeds on a missing key, so retrying is safe. The sweep is scheduled only when Spaces is configured.

**Rationale**: `deleteAccount` runs in a transaction, and a call to Spaces inside it could neither be rolled back nor be allowed to fail the deletion. The interval is a constant, not a setting: nothing suggests operators need to tune it (Principle II).

## R7. Telling the first page that a provider login just happened

**Decision**: `loginCard.js` and `inviteCard.js` add `signedIn=1` to the provider `callbackURL`. `app.js` shows the snackbar when the parameter is present and the person is logged in and has accepted the Terms, and always removes it with `history.replaceState`. `acceptTermsCard.js` removes it from `next`.

**Rationale**: an emailed link never carries the parameter (FR-023); removing it means a reload shows nothing (FR-022). A hand-typed `?signedIn=1` only shows a logged-in person their own address, so it needs no protection. Because Accept Terms already showed the address, removing it from `next` keeps the snackbar from appearing a second time.

**Alternatives considered**: a cookie (a new Cookie Use row and legal text, for one message); a column on `user` (a write per login).

## R8. The snackbar's style

**Decision**: move `.m3-snackbar` out of `admin-card-m3.css` into a new `snackbar-m3.css`, linked by `index.html` and `admin.html`.

**Rationale**: every provider `callbackURL` lands on `/`, so `index.html` is the only new page. Copying the rule would let the two drift apart; the Back arrow's `back-arrow-m3.css` set this precedent. `adminCard.js` keeps its own function, 3-second timing and place at the bottom; the login notice moved to the top with `.m3-snackbar--top`, because at the bottom it went unnoticed (TWEAK06).

## R9. Reading a size-limited body

**Decision**: one `AbortSignal.timeout(3000)` covers the fetch and the upload together; the body is read as a stream and abandoned past 256 KB. A `Content-Length` header is not trusted. Type is judged by leading bytes: PNG `89 50 4E 47 0D 0A 1A 0A`; JPEG `FF D8 FF`; WebP `RIFF` then `WEBP` at offset 8. The content type sent at upload comes from those bytes.

**Rationale**: SC-002 bounds the delay of the whole step, not only the fetch. No new dependency is needed.

## R10. Who else reads `profileAvatar`

**Decision**: `GET /api/me` and `PATCH /api/me` map the stored value through one function, `avatarUrl`: a value starting `avatars/` becomes the CDN URL when Spaces is configured, and anything else, including that value when Spaces has since been removed, becomes the stored path or the default.

**Rationale**: those are the only two responses carrying it, and `app.js` and `profileCard.js` only set it as an image source, so they do not change. The session cache copy is dropped with `cache.del(sessionKey(token))`, as `session.create.before` does for revoked sessions, since `SessionCache` is built from `auth` and is not available inside it.
