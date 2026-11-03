# HTTP Contracts

`postman/openapi.json` is updated to match A1–A6.

## A1. The `X-Human-Check` header on sign-in start routes

Applies only when the check is on (`AppConfig.humanCheck` not null). Checked first, before the honeypot, the
allowlist, the rate limit and any email (FR-006).

| Route | Accepted pass actions |
|---|---|
| `POST /api/auth/request-login-link` | `login` |
| `POST /api/auth/create-account` (no `token` in the body) | `create-account` |
| `POST /api/invitations/redeem` | `invite` |
| `POST /api/auth/sign-in/social` | `login`, `create-account`, `invite` |
| `POST /api/auth/sign-in/oauth2` | `login`, `create-account`, `invite` |

Not checked: `POST /api/auth/create-account` with `token`, `GET /api/auth/verify`, `POST /api/auth/confirm-signin`,
the provider callbacks.

Refusal (missing pass while the service is reachable; pass invalid, expired, spent, foreign hostname or wrong action):

```
400 { "error": "Please complete the human check.", "code": "challenge-required" }
```

Service unreachable: the request proceeds as today; `/healthz` `abuse.humanCheckSkipped` grows by one.

## A2. `GET /api/config` gains `humanCheck`

```
"humanCheck": { "siteKey": "<ENV_FCAPTCHA_SITE_KEY>", "endpoint": "/fcaptcha" }   // or null when off
```

## A3. `GET /healthz` gains a counter

```
"abuse": { "ipVoteCap": <n>, "humanCheckSkipped": <n> }
```

## A4. `GET /api/polls/:pid/card` (new, no session needed)

Shed as `refresh`. For an indexable poll (data-model.md):

```
200 { "poll": <PollProjection>, "counts": { "voteCount", "choiceCounts", "countsVersion" },
      "overlay": { "voted": false, "bookmarked": false, "mayWatch": false, "voteBlockedReason": null } }
```

Otherwise (malformed id, missing, private, unpublished, rejected, archived): `404 { "error": "Not found" }`.

## A5. Pages and files for crawlers (not under `/api`, not in OpenAPI)

| Request | Answer |
|---|---|
| `GET /robots.txt` | `text/plain`: `User-agent: *`; `Allow: /`, `/poll/`, `/privacy`, `/terms`; `Disallow: /api/`, `/admin`, `/profile`, `/login`, `/create-account`, `/invite`, `/confirm-signin`, `/accept-terms`; `Sitemap: <origin>/sitemap.xml` |
| `GET /sitemap.xml` | `application/xml` urlset of `<origin>/` and every indexable `<origin>/poll/<id>` with `<lastmod>`; above 50,000 entries a `sitemapindex` of `/sitemap-<n>.xml`; `Cache-Control: public, max-age=300` |
| `GET /sitemap-<n>.xml` | part `n`; `404` when it does not exist |
| `GET /poll/:pid` | guest + indexable: `200` HTML (UI contract C3); signed in: `302 /?PID=<pid>`; otherwise `404 Not found` |

## A6. `GET /?PID=<pid>` for a guest

Indexable poll → `302 /poll/<pid>`. Any other poll → `302 /login?PID=<pid>` as today. Signed in → unchanged.
