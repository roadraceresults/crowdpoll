# Page Route Contract: UI/UX Revisions

**Feature**: 013-UI-UX-revisions | **Date**: 2026-09-07

Two page routes change behaviour. **No API endpoint changes**, and `postman/openapi.json` — which
documents `/api/*` only and carries no page routes — needs no edit.

Earlier features' page-route contracts (`specs/003-…`, `specs/004-…`, `specs/011-…`) record what
those features did and remain accurate as records; they are not edited.

---

## `GET /profile`

| Session | Query | Before (001, 003, 004) | After |
|---|---|---|---|
| Valid | any | `200`, sends `profile.html` | unchanged |
| None | no result parameter | `302` → `/login` | unchanged |
| None | `changed=1` | `302` → `/login` | **`200`, sends `profile.html`** |
| None | `error=invalid-link` | `302` → `/login` | **`200`, sends `profile.html`** |

**Matching is exact.** `changed` with any value other than `1`, and `error` with any value other
than `invalid-link`, fall through to the redirect. A parameter that is neither does not qualify a
request on its own, but neither does it disqualify one: `?changed=1&from=email` is served, so a
verification link can carry additional parameters without the guard refusing it. What is matched
exactly is the value of the two recognised parameters, not the shape of the whole query string.

**Disclosure**: the relaxed branch sends a static file. `GET /api/me` still answers `401` to that
window, and the page renders only the result state — no name, address, avatar or profile card.

**Client behaviour once the file is sent**: `/api/me` returning `200` renders the profile card with
the result on it; `401` renders the result card — a title, a subtitle and a single "Log In" action.

---

## `GET /admin`, `GET /admin/poll`, `GET /admin/poll/update`, `GET /admin/poll/results`

| Caller | Before | After |
|---|---|---|
| Administrator | `200`, sends the page | unchanged |
| Signed-in non-administrator | `403`, `{"error":"Not authorized"}`, `application/json` | **`403`, sends `not-authorized.html`, `text/html`** |
| No session | `403`, `{"error":"Not authorized"}`, `application/json` | **`403`, sends `not-authorized.html`, `text/html`** |

**Status is unchanged at `403`.** The request is still refused; a `200` would report a successful
load to caches, crawlers and monitoring, and would break the two assertions in
`tests/pages.test.ts` that check status alone.

**One page for both callers.** The refusal does not distinguish a guest from a signed-in
non-administrator, and does not indicate whether signing in would help. Guests are **not**
redirected to `/login`.

**On `PID`-bearing routes** the guard runs before the poll lookup, so a refused caller receives the
card rather than a `404` for a poll they were never permitted to see.

---

## `/api/admin/*` — explicitly unchanged

Every administration API route continues to refuse with `403` and
`{"error":"Not authorized"}` as `application/json`.

This needs stating because there is no separate page-routes guard today to modify.
`createRequireAdmin` (`src/polls/service.ts:697`) is a single factory with two instances —
`pages.ts:38` and `pollsApi.ts:118`. **Editing the factory is the obvious implementation and the
wrong one**: it would convert every admin API refusal to HTML. The factory takes a parameter
selecting the refusal shape; the API instance keeps today's behaviour.

---

## Unchanged page routes

`GET /`, `GET /login`, `GET /create-account` — no behaviour delta in this feature. `GET /login`
still redirects a signed-in caller to `/`, and `GET /create-account` still `404`s outside native
sign-in mode.
