# Implementation Plan: Human Check Before Sign-In, and Search Engine Indexing of Public Polls

**Branch**: `fcaptcha` | **Date**: 2026-11-02 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/20261102-144053-FCAPTCHA-AND-SEO/spec.md`

## Summary

A self-hosted FCaptcha check stands before every sign-in start, and public polls become crawlable.

**Human check.**
- FCaptcha runs in its standalone Node.js server mode as a second App Platform service, `fcaptcha`, built from a new
  `fcaptcha-server/` folder pinned to `@webdecoy/fcaptcha` 1.46.1. App Platform's ingress serves it at `/fcaptcha` on
  the site's own domain, and its state is in the existing Valkey, database 1 (R1, R2).
- On `/login`, `/create-account` and `/invite`, a new browser module, `humanCheck.js`, first shows a "Check you're
  human" card with the widget: checkbox mode, `data-theme="auto"`, and the page as its `action`. Once passed, the same
  page draws its own card and keeps the pass in memory (R7, clarification Q1).
- Sign-in start requests carry the pass in an `X-Human-Check` header (R3). A middleware, `requireHumanCheck`, verifies
  it with FCaptcha server to server. It checks hostname, single use, lifetime and an action that matches the route
  (R4), before the honeypot, the allowlist, the rate limit or any email. A failed check answers
  `400 challenge-required`.
- If FCaptcha is unreachable, the request proceeds under the existing limits, and `abuse.humanCheckSkipped` is counted
  on `/healthz`. The page falls back after 10 s without the widget (R5, clarification Q3).
- Four `ENV_FCAPTCHA_*` settings control it, off by default (R8). The Privacy Policy gains "Bot check" (R14).

**SEO.**
- A new `src/routes/seo.ts` serves `/robots.txt` and a cached `/sitemap.xml` (split above 50,000 addresses) (R12).
- It also serves `/poll/:pid`: `index.html` with the poll's title, description, canonical, Open Graph and JSON-LD tags,
  plus a static, escaped poll summary in `<main>`. In the browser, `tabs.js` replaces the summary with the live card,
  maximized, using a new guest route, `GET /api/polls/:pid/card` (R9, R11).
- Only public polls that are open or closed are indexable (R10). A guest opening `/?PID=` for one is sent there
  instead of to sign in.
- Other public pages get titles, descriptions and canonical links. Sign-in, account and admin pages get `noindex`
  (R13).

## Technical Context

**Language/Version**: TypeScript on Node ≥ 22, ESM. `fcaptcha-server/` is plain Node (FCaptcha's own `server.js`).

**Primary Dependencies**: Express 5, Kysely (PostgreSQL), BetterAuth. Browser: vanilla JavaScript and CSS. The new
dependencies are `@webdecoy/fcaptcha` and `@webdecoy/fcaptcha-client` at exactly `1.46.1`, and only in
`fcaptcha-server/package.json`. The web service gains no dependency: it calls FCaptcha with `fetch`.

**Storage**: No migration. FCaptcha keeps its short-lived state in Valkey, database 1. The sitemap is cached under
`seo:sitemap*` for 5 minutes (data-model.md).

**Testing**: Vitest with supertest and embedded PostgreSQL. jsdom client suites go through `tests/helpers/browser.ts`.
FCaptcha's verify call is stubbed by injecting `fetch`. One integration suite skips without `FCAPTCHA_TEST_URL`.

**Target Platform**: DigitalOcean App Platform: the `web` service plus the new `fcaptcha` service, behind one
ingress. Desktop and phone browsers.

**Project Type**: Web service with a browser client, plus one standalone helper service.

**Performance Goals**:
- A sign-in start gains one server-to-server verify call (3 s timeout). A request without a pass also gains a health
  probe (1 s timeout).
- The vote and refresh paths are unchanged.
- The sitemap is one indexed query per 5 minutes.
- `/poll/:pid` costs one row read plus the counters, like the existing landing.
- SC-002: the check is passed and the form reached in under 10 s.

**Constraints**:
- No third-party request from any page (FR-004). No new cookie or browser storage key (Q1).
- `X-Human-Check` is the only new request header. The new routes are `/api/polls/:pid/card`, `/poll/:pid`,
  `/robots.txt`, `/sitemap.xml` and `/sitemap-<n>.xml`.
- `postman/openapi.json` follows A1–A4 and A6. The verify secret is never logged or published.

**Scale/Scope**:
- Server, about 9 files:
  - new: `src/auth/humanCheck.ts`, `src/seo/pollPage.ts`, `src/routes/seo.ts`
  - changed: `src/config.ts`, `src/server.ts`, `src/routes/api.ts`, `src/routes/pages.ts`, `src/routes/assets.ts`,
    `src/routes/healthz.ts`, `src/routes/tabsApi.ts`
- Client, about 6 files:
  - new: `humanCheck.js`, `human-check-m3.css`
  - changed: `loginCard.js`, `createAccountCard.js`, `inviteCard.js`, `tabs.js`, and 12 HTML pages' heads
- New `fcaptcha-server/` folder, `.do/app.yaml`, `privacy.html`, `.claude/rules/environment.md`.
- Four new test suites, plus extensions to the config and m3-assets suites.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Check | Result |
|---|---|---|
| I. Think Before Coding | Every decision cites its requirements finding or clarification (R1–R14). Package details not yet seen in the installed package are marked **confirm** in research.md: the `server.js` path, the widget attribute names and the client-address header. Each has a deploy check (D3) | Pass |
| II. Simplicity First | One middleware, one verify function and one browser module. The poll page reuses `index.html` and the card pipeline. There is no new table, cookie or storage key, and no setting beyond the four the requirements name | Pass |
| III. Surgical Changes | The existing sign-in routes gain one middleware each and keep their order of checks. `trust proxy` is not changed (R6). The card scripts change only to wrap their render and add one header | Pass |
| IV. Goal-Driven Execution | quickstart.md scenarios 1–15 map to US1–US7. R15 names the suites, and D1–D4 check the deployment | Pass |
| V. Code Quality | The server logs each refusal and fail-open with `maskIp`. The browser logs one warning when the widget fails to load, with no token or address. A missing setting fails safe as a `ConfigError` | Pass |
| VI. Self-Documenting Code | Names carry the meaning (`requireHumanCheck`, `isIndexable`, `renderPollPage`, `humanCheckSkipped`). Comments only point to FCaptcha's docs and sitemaps.org | Pass |
| Security, Privacy & Reliability | The check is enforced on the server, ahead of every sign-in start (FR-006). The secret stays server-side. Hostname and action are checked. Poll text is escaped. The Privacy Policy discloses the fingerprinting. Failing open is bounded by the existing limits and is visible on `/healthz` | Pass |
| Performance & Operational Efficiency | No polling. The sitemap is cached. FCaptcha scales on its own, with 1–3 instances | Pass |
| Documentation Deliverables | README.md and ARCHITECTURE.md are updated after implementation, covering the second service, its settings and the SEO files | Deferred to after implementation |

**Gate result**: no violations, and Complexity Tracking is empty. The one new third-party dependency sits in a
separate service. The constitution allows a mature library that avoids re-implementing a hard problem, and the
requirements report (RS1, UA6) records its maturity risk and the exact-version pin.

**Post-design re-check**: unchanged. The design adds one guest route (A4), because no single-poll route exists for
guests. It returns the same shape as `/api/me/polls/:pid`, so the browser reuses `DeltaClient` unchanged.

## Project Structure

### Documentation (this feature)

```text
specs/20261102-144053-FCAPTCHA-AND-SEO/
├── plan.md
├── research.md          # R1–R15
├── data-model.md        # pass, settings, indexable poll, sitemap cache
├── quickstart.md        # scenarios 1–15, deployment checks D1–D4
├── contracts/
│   ├── api.md           # A1–A6
│   └── ui-contracts.md  # C1–C5
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
fcaptcha-server/                 # new: standalone FCaptcha service (App Platform source_dir)
├── package.json                 # @webdecoy/fcaptcha, @webdecoy/fcaptcha-client @ 1.46.1; "start"
└── package-lock.json

src/
├── auth/humanCheck.ts           # new: createHumanCheck (verify, probe), requireHumanCheck middleware
├── polls/access.ts              # isIndexable, indexable-polls query (beside mayViewResults)
├── seo/pollPage.ts              # new: renderPollPage (head tags, JSON-LD, summary; escaped)
├── routes/seo.ts                # new: /robots.txt, /sitemap.xml, /sitemap-<n>.xml, /poll/:pid
├── routes/api.ts                # request-login-link, create-account, invitations/redeem: middleware; /api/config humanCheck
├── routes/tabsApi.ts            # GET /api/polls/:pid/card
├── routes/pages.ts              # /?PID= guest → /poll/<pid>; canonical for /, /privacy, /terms
├── routes/assets.ts             # sendPage(…, canonicalPath?)
├── routes/healthz.ts            # abuse.humanCheckSkipped
├── config.ts                    # ENV_FCAPTCHA_* → AppConfig.humanCheck
├── server.ts                    # middleware before BetterAuth's sign-in/social, sign-in/oauth2; seo router before static
└── public/
    ├── humanCheck.js            # new: window.HumanCheck (gate, headers, refused)
    ├── human-check-m3.css       # new: M3 layer for the check card
    ├── loginCard.js, createAccountCard.js, inviteCard.js
    ├── tabs.js                  # data-poll-page landing for guests
    ├── privacy.html             # #bot-check
    └── *.html                   # titles, descriptions, noindex

tests/
├── human-check.test.ts          # new
├── client-human-check.test.ts   # new (jsdom)
├── seo.test.ts                  # new
├── fcaptcha.integration.test.ts # new (skips without FCAPTCHA_TEST_URL)
├── config.test.ts, m3-assets.test.ts   # extended
.do/app.yaml                     # fcaptcha service, ingress rules, envs
.claude/rules/environment.md     # four settings
postman/openapi.json             # A1–A4, A6
```

**Structure Decision**: the existing single project layout is kept. The only new top-level folder is
`fcaptcha-server/`, a deployable component with no code of its own: it holds FCaptcha's pinned package and its start
command. It is outside `src/`, so `tsc` and `npm test` never touch it.

## Complexity Tracking

No violations to justify.
