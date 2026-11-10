# Research: Multiple Account Prevention

The requirements report settled the product decisions; these records settle how they are built.
The package facts in R1 and R2 come from reading the published `@fingerprintjs/fingerprintjs@5.3.0` package itself.

## R1. The library file and how it is served

- **Decision**: commit `dist/fp.min.js` of `@fingerprintjs/fingerprintjs` 5.3.0 (37 KB, MIT, published 2026-10-07) as `src/public/vendor/fingerprintjs-5.3.0.min.js`, keeping its licence header. `deviceEvidence.js` injects it with a same-origin `<script>` only when collection is on and the viewer is signed in. Its global is `FingerprintJS`.
- **Rationale**: no bundler and no third-party request are project rules; a versioned file name caches safely; injecting it on demand means guests and a switched-off site never download it.
- **Alternatives considered**: the `openfpcdn.io` CDN (a third-party request); an npm dependency (nothing on the server uses it, and pages have no bundler); a `<script>` tag in each page (guests would load it).

## R2. Two things the library does that the requirements did not foresee

- **Decision 1**: always call `FingerprintJS.load({ monitoring: false })`, pinned by a test.
  The npm build otherwise sends usage statistics to `m1.openfpcdn.io`, with the client's IP and referrer, on 0.1% of loads ([API docs](https://github.com/fingerprintjs/fingerprintjs/blob/master/docs/api.md)); only the vendor's CDN build disables that by default. Without this flag the "no third-party request" requirement would fail rarely enough to go unnoticed.
- **Decision 2**: accept the library's momentary test cookie.
  Its `cookiesEnabled` source sets `cookietest=1` and deletes it in the same synchronous call, so it never accompanies a request and never remains. The test for "no cookie appears" checks what remains after the fingerprint is computed. The policy mentions it in one plain clause (`ui-contracts.md` C5), and it needs no Cookie Use row, since nothing is kept.
- **Alternatives considered for 2**: patching the vendored file (it would then differ from the published one, and upgrades get harder); a custom source list (the sources are not individually selectable in the public API).

## R3. The two fingerprint values

- **Decision**: the browser value is the library's `visitorId`. The hardware value is `FingerprintJS.hashComponents` over `screenResolution`, `colorDepth`, `hardwareConcurrency`, `timezone` and `platform`.
- **Rationale**: the reason for this value is linking two browsers on one device, so it holds only what browsers report alike. The GPU is left out: raw strings differ by browser (Chrome wraps them in `ANGLE (…)`), and the library does not read `rendererUnmasked` on Firefox (`shouldAvoidDebugRendererInfo` returns `isGecko()`). `deviceMemory` is left out as Chromium-only, to our knowledge. A failed component (`error` instead of `value`) hashes as absent.
- **Alternatives considered**: all of `webGlBasics` (differs by browser); a GPU family taken from the renderer string (empty on Firefox, so Firefox would match no other browser). The cost accepted is a less distinctive value, shared by more unrelated devices.
- **Unconfirmed**: how well the value matches across browsers on real devices can only be seen in real browsers, so `quickstart.md` Q3 checks it. Firefox 143+ also spoofs CPU count and screen size in private browsing (noted in the library's source), which the spec's acceptance scenario allows for.

## R4. Carrying the value to the server

- **Decision**: one request header on a vote, and the same header on the sign-in event: `X-Device-Fingerprint: <32 hex>.<32 hex>`. Anything else is treated as missing, without an error.
- **Rationale**: a header leaves the vote's body and validation untouched, and it is simple to validate strictly. A strict format also bounds the size.
- **Alternatives considered**: a body field (mixed with the vote's own validation); `sendBeacon` beside the vote (a second request per vote and no atomic link with it).

## R5. The keyed hash

- **Decision**: `HMAC-SHA-256(ENV_DEVICE_EVENTS_KEY, value)` as hex, computed in the web process before the vote enters the stream, so the stream too holds only keyed values. A constant `DEVICE_FINGERPRINT_VERSION` (starting at `1`) is stored on each row and is bumped when the library or the key changes.
- **Rationale**: the raw value is never queued or stored; HMAC costs microseconds; a code constant needs no further setting.
- **Alternatives considered**: hashing in the consumer (raw values would sit in Valkey); a version setting beside the key (one more setting to keep in step, for a rare event).

## R6. Writing vote events

- **Decision**: when collection is on, the vote route adds `accountId`, `browserHash` and `hardwareHash` to the stream entry; `parseEntry` reads them; `writeBatch` inserts one `device_events` row per entry carrying `accountId`, in the same transaction and taken from the full list before votes are reduced to one per participant.
- **Rationale**: this keeps the no-write-per-vote invariant and, because the batch already drops votes for missing polls and deleted accounts (`withoutDeletedAccounts`), events follow those rules with no new code. An entry without `accountId` makes no row: that covers entries queued before the release, collection off, and development scripts, which call `writeBatch` and `castVote` without a device value.
- **Alternatives considered**: a second stream (a second consumer and ordering questions); a column on `vote_history` (it holds the email and no account, is kept 12 months, and sign-ins do not belong there).

## R7. One sign-in event per session

- **Decision**: `GET /api/me` answers with a response header, `X-Device-Login-Due: 1`, when collection is on, the Terms are accepted and the cache key `device-signin:<sessionId>` is absent. The page then sends `POST /api/me/device-login`, which claims the key with `setNx` (TTL `maxSigninCookieDurationMs`), inserts one row when the claim succeeds, and deletes the key if the insert fails. A session open when collection starts is due as well, as clarified, because its key is absent.
- **Rationale**: a header, not a body field, because `sameSnapshot` compares every body field of `/api/me` by value, and a flag that flips after the report would re-render every subscriber and broadcast to other windows. `setNx` makes two tabs safe. No request is added to page loads once reported. The terms gate refuses the POST before acceptance with no new code.
- **`no-store`, found while building**: while collecting, `/api/me` is sent with `Cache-Control: no-store`. Express gives it an ETag, and a `304` leaves a browser's stored headers in place, so a stored copy would keep saying due after the report and every later page would post again.
- **Accepted risk**: if the cache loses the key, that session reports once more, which the analysis can tolerate.
- **Alternatives considered**: a POST on every page load (a request per load, across a very large audience); a column on `session` (touches BetterAuth's table and its cached copy); a flag in browser storage (forbidden, FR-008).

## R8. Which pages run the script

- **Decision**: `deviceEvidence.js` on the pages a signed-in user lands on: `index.html`, `profile.html`, `settings.html`, `admin.html`, `admin-results.html`. It computes only when `SiteConfig.deviceEventsEnabled` is true, the session snapshot is signed in, and either the page can vote (`index.html`) or a sign-in is due.
- **Rationale**: `/invite`, `/login` and `/accept-terms` all pass on to one of these, and running there would risk fingerprinting before acceptance. Pages that cannot vote stay free of the work once the session has reported.
- **Alternatives considered**: every page (guests' legal pages would load a script for nothing).

## R9. Table and retention

- **Decision**: a table partitioned by month on `at`, like `vote_history`, with the partition helper generalised to take the table's name. `retentionSweep` drops a partition once its month's end is more than 3 months old, so a row lives about 4 months at most. `scheduleSweep` keeps next month's partition ready, and `writeBatch` ensures the months of its votes.
- **Rationale**: dropping a partition is immediate at any volume, and the pattern exists and is tested. Each partition holds indexes only on `account_id` and `poll_id`, the two the deletions need; analysis indexes belong to the later feature.
- **Alternatives considered**: a daily `DELETE` for an exact 3 months (slow at volume, and the accepted decision names monthly partitions).

## R10. Deletions

- **Decision**: `deletePoll` and the own-polls branch of `deleteAccount` delete by `poll_id`; `deleteAccount` deletes by `account_id`. No foreign keys, matching `vote_history`. A ban or a vote reset removes the vote but keeps its events, since the clarification names only poll deletion.
- **Rationale**: those are the only two places that delete from `polls`. Events record what happened, and a ban is where they matter most.

## R11. The setting and the secret

- **Decision**: `ENV_DEVICE_EVENTS_ENABLED` (default `false`) and `ENV_DEVICE_EVENTS_KEY` (unset; required, at least 32 characters, when enabled; `ConfigError` otherwise). In `infra/`, the variable `device_events_key` comes from `secrets.auto.tfvars` as a `SECRET` environment value, and `ENV_DEVICE_EVENTS_ENABLED = "false"` joins the plain values. `/api/config` gains `deviceEventsEnabled`.
- **Rationale**: this follows the accepted decision. Starting collection is then a reviewed one-line infrastructure change, which is what FR-025 needs. `/api/config` is cached for 5 minutes, so an open page may send one more value after the switch, which the server ignores.

## R12. The coverage count

- **Decision**: `retentionSweep`, which is daily, logs `[device-events] last 24h: <n> with a fingerprint, <m> without`, split by event type, from `count(*)` over the current rows, and only when collection is on.
- **Rationale**: it needs no new sweep or advisory lock, and it carries no identifying value.
- **Alternatives considered**: an in-memory counter like `abuse` (per instance, and lost on restart).
