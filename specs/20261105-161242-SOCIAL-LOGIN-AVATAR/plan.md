# Implementation Plan: Social Login Avatar

**Branch**: `social-login-avatar` | **Date**: 2026-11-05 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/20261105-161242-SOCIAL-LOGIN-AVATAR/spec.md`

## Summary

At every Google login, the server reads the `picture` claim, fetches the image under strict limits, stores a changed image in Spaces at an unguessable public address, and points `user.profileAvatar` at it; a failure never affects the login. Objects no longer in use are queued in the same transaction and removed by a sweep. The Login and invitation pages say what each provider shares, "Logged in as" appears on Accept Terms and as a snackbar after a provider login, and the Privacy Policy takes a new version. Amazon, Apple and Microsoft keep the default avatar.

## Technical Context

**Language/Version**: TypeScript on Node ≥ 22 (ESM); vanilla JS in `src/public/`

**Primary Dependencies**: Express 5, Kysely, better-auth 1.6.26, `@aws-sdk/client-s3`; no new dependency

**Storage**: Spaces + CDN for the image; PostgreSQL for the reference, the hash and the removal queue (migration 017)

**Testing**: Vitest + supertest + embedded-postgres; jsdom for client scripts (`client-*.test.ts`)

**Target Platform**: DigitalOcean App Platform; development runs on PostgreSQL only

**Project Type**: Web service with server-rendered static pages

**Performance Goals**: at most about 3 seconds added to a Google login; no added work on any other request

**Constraints**: no third-party request from a page; no new cookie, setting or route; logs carry no picture URL

**Scale/Scope**: one object per account with a Google picture, each about 256 KB at most; one read per browser per day, by its owner only

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Check | Result |
|---|---|---|
| I. Think Before Coding | Open facts are stated, with what was and was not confirmed (R1–R3) | Pass |
| II. Simplicity First | No setting, route, cookie or dependency; a table and a sweep only where a failed delete must not lose a photograph | Pass |
| III. Surgical Changes | `app.js` and `profileCard.js` keep their image code; only the snackbar rule moves | Pass |
| IV. Goal-Driven Execution | Each FR maps to a suite or a quickstart check | Pass |
| V. Code Quality | Server logs say what happened, without the URL; the client logs nothing new | Pass |
| VI. Self-Documenting Code | New code carries no requirement references | Pass |
| Documentation Deliverables | `README.md` and `ARCHITECTURE.md` updated after implementation | Pass |

Re-checked after Phase 1: no change.

## Decisions Easy to Get Wrong

- **The hook is `hooks.after` on `/callback/:id` with `id === "google"`**, reading the fresh `idToken` from the `account` row; not `overrideUserInfoOnSignIn`, which rewrites name and email (R1).
- **`Cache-Control` is one day, not a year**: that lifetime is also how long a deleted picture can stay reachable (R3).
- **Upload first, then the transaction**; a row never points at a missing object (R5).
- **`profileAvatar` stores the key, and the API returns the URL**, through `avatarUrl` (R10).
- **`signedIn=1` is removed from `next`**, or the snackbar follows Accept Terms (R7).

## Project Structure

### Documentation (this feature)

```text
specs/20261105-161242-SOCIAL-LOGIN-AVATAR/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── api.md
│   └── ui-contracts.md
└── tasks.md
```

### Source Code (repository root)

```text
src/
├── auth/
│   ├── auth.ts                 # the after hook; store passed in; the old comment goes
│   └── profilePicture.ts       # new: claim, limits, fetch, store, avatarUrl
├── db/
│   ├── schema.ts
│   └── migrations/017-profile-picture.ts, index.ts
├── legal/
│   ├── deleteAccount.ts        # queues the key in its transaction
│   └── version.ts
├── polls/sweeps.ts             # avatarRemovals lock and schedule
├── routes/api.ts               # GET and PATCH /api/me use avatarUrl
├── trending/publish.ts         # ObjectStore gains delete
├── server.ts                   # the store reaches auth and the sweep
└── public/
    ├── cardShell.js, loginCard.js, inviteCard.js, card-shell-m3.css   # what is shared; signedIn=1
    ├── acceptTermsCard.js      # Logged in as; signedIn out of next
    ├── profileCard.js, profile-editor-m3.css   # no Your Data section; #delete-account opens the dialog, also by hashchange
    ├── app.js, header-tab-bar-m3.css   # the snackbar; the menu's down icon; the footer's Delete Account
    ├── loginCard.js, inviteCard.js   # Stay logged in carried through a provider login
    ├── snackbar-m3.css         # new, moved from admin-card-m3.css
    ├── back-to-top-m3.css      # the button moves to the container's left edge
    ├── index.html, admin.html
    └── privacy.html
postman/openapi.json
tests/
├── profile-picture.test.ts     # new
├── oauth-providers.test.ts     # runs without a store, so still pins the default avatar
├── client-invite-card.test.ts  # what is shared; signedIn=1
├── client-sign-in-notice.test.ts  # new
├── m3-assets.test.ts
└── legal-pages.test.ts
```

## Complexity Tracking

| Addition | Why needed | Simpler alternative rejected because |
|---|---|---|
| `avatar_removals` table and sweep | The Decisions require removal to survive a Spaces failure (UA9) | Best-effort deletion can leave a public photograph with no record of it |
