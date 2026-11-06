---

description: "Tasks for the Social Login Avatar feature"
---

# Tasks: Social Login Avatar

**Input**: Design documents from `specs/20261105-161242-SOCIAL-LOGIN-AVATAR/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: included, because the constitution's Principle IV makes each change verifiable and the project's features all carry suites. Write each test first and see it fail.

**Organization**: by user story, so each can be built and tested on its own.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on an unfinished task)
- **[Story]**: the user story the task serves

## Phase 1: Setup

- [X] T001 Install dependencies in this worktree, which has no `node_modules`, with `npm ci` in the repository root, and confirm `npx tsc --noEmit` passes before any change

---

## Phase 2: Foundational

**Purpose**: what stories 1 and 5 both need. No story can start before this is finished.

- [X] T002 Create `src/db/migrations/017-profile-picture.ts` per `data-model.md` (`user.profile_avatar_hash`, table `avatar_removals`), and register it in `src/db/migrations/index.ts`
- [X] T003 Add `profile_avatar_hash` to the `user` table type and add the `avatar_removals` table type in `src/db/schema.ts`
- [X] T004 Add `delete(key: string): Promise<void>` to `ObjectStore` and to `createSpacesStore` (`DeleteObjectCommand`), and an optional `signal` to `put`, in `src/trending/publish.ts`
- [X] T005 Build the store once and share it: in `src/server.ts` build it before `createAuth` and pass it through `AppDeps` as `objectStore: ObjectStore | null`, so `createAppContext` takes it from `deps` rather than building it; `createAuth` in `src/auth/auth.ts` gains a `store` parameter; `tests/helpers/setup.ts` does the same with an explicit fake store, which tests with `config.spaces` set use in place of a real S3 client

**Checkpoint**: the suites still pass, with the new column and table in place.

---

## Phase 3: User Story 1 - See my Google profile picture (Priority: P1) 🎯 MVP

**Goal**: a Google login shows the person's picture in the header and on the Profile card, from the CDN, and a failure never affects the login.

**Independent Test**: quickstart Q1–Q3; `tests/profile-picture.test.ts`.

### Tests for User Story 1

- [X] T006 [P] [US1] In new `tests/profile-picture.test.ts`, with `fetch` stubbed and a fake store, cover the pure limits of `src/auth/profilePicture.ts`: host rule (accepted subdomain, other host, `http`), redirect refused, the 256 KB cap with no `Content-Length`, PNG, JPEG, WebP, SVG and text by leading bytes, and the timeout
- [X] T007 [US1] In `tests/profile-picture.test.ts`, drive `GET /api/auth/callback/google` per contract A2: new account gets a key and hash; same image leaves the key alone with no upload; changed image gets a new key and queues the old; no `picture` claim, a refused image and a failed upload each still answer the same redirect and leave the account as it was; no store means no fetch; a refused allowlist means no fetch; the logs never contain the URL; a stored change drops the session's cached copy
- [X] T008 [US1] In `tests/profile-picture.test.ts`, confirm that Amazon, Apple and Microsoft logins never fetch and never change a stored picture, that a linked account's stored picture survives an Amazon login, and that `GET /api/me` and `PATCH /api/me` map `profileAvatar` per contract A1, including a key with Spaces no longer configured
- [X] T009 [P] [US1] In `tests/oauth-providers.test.ts`, keep the expectation at line 128 true by running that suite without a store, and say so in the test's name; `user.image` stays null

### Implementation for User Story 1

- [X] T010 [P] [US1] Create `src/auth/profilePicture.ts`: the `picture` claim from an `idToken`; `allowedPictureUrl`; `fetchPicture` per research R2 and R9; `avatarUrl(stored, config)` per R10; `storeProfilePicture`, which hashes, compares, uploads with the `Cache-Control` of R3 and the random key of `data-model.md`, then runs the transaction of R5
- [X] T011 [US1] In `src/auth/auth.ts`, add `hooks.after` with `createAuthMiddleware` per research R1, sharing one `AbortSignal.timeout(3000)`, catching every failure and logging without the URL; drop the session's cached copy with `cache.del(sessionKey(token))`; remove the comment saying a provider's picture is not kept
- [X] T012 [US1] In `src/routes/api.ts`, return `avatarUrl(user.profileAvatar, config)` from `GET /api/me` and `PATCH /api/me`
- [X] T013 [P] [US1] In `postman/openapi.json`, describe `profileAvatar` per contract A1

**Checkpoint**: User Story 1 works on its own.

---

## Phase 4: User Story 2 - Know what is shared before logging in (Priority: P2)

**Goal**: the Login and invitation pages say what each configured provider shares, with a link to the Privacy Policy.

**Independent Test**: quickstart Q7; `tests/client-oauth-login.test.ts`, `tests/client-invite-card.test.ts`.

- [X] T014 [US2] In `tests/client-oauth-login.test.ts`, cover contract C2: Google alone, one other, several others, Google with others, the link to `/privacy`, and nothing in email-only mode
- [X] T015 [US2] In `src/public/cardShell.js`, add `addOauthSharing(card, providers)`, which builds the `oauth-sharing` paragraph per contract C2, and call it from `renderOauth` in `src/public/loginCard.js`
- [X] T016 [P] [US2] In `src/public/card-shell-m3.css`, style `.oauth-sharing` with M3 tokens only
- [X] T036 [US2] In `tests/client-invite-card.test.ts`, cover contract C2 on the invitation card: the line and its link appear under the provider buttons, and nothing appears when the page lists no provider
- [X] T037 [US2] In `src/public/inviteCard.js`, call `addOauthSharing` from `renderProviders`

**Checkpoint**: User Story 2 works on its own.

---

## Phase 5: User Story 3 - Know which account I logged in with (Priority: P2)

**Goal**: "Logged in as" and the address appear on Accept Terms, and as a snackbar after a provider login that does not reach it.

**Independent Test**: quickstart Q5–Q6; `tests/client-sign-in-notice.test.ts`.

### Tests for User Story 3

- [X] T017 [P] [US3] In new `tests/client-sign-in-notice.test.ts`, cover contract C4: the snackbar shows once with `role="status"` and no action, and hides after 6 seconds; a guest and a person who has not accepted the Terms see none; the parameter is removed in every case, keeping `PID`; no parameter means no snackbar
- [X] T018 [US3] In `tests/client-sign-in-notice.test.ts`, cover contract C3: the line appears for a new account and for updated Terms, is left out with no address, and `signedIn` is gone from the `next` that is posted, with other parameters kept
- [X] T019 [P] [US3] In `tests/client-oauth-login.test.ts`, confirm the `callbackURL` carries `signedIn=1`, with and without a shared `PID` (contract A3)
- [X] T038 [US3] In `tests/client-invite-card.test.ts`, confirm the `callbackURL` carries `signedIn=1`, with and without a `PID`, for a Google and an Amazon button (contract A3)

### Implementation for User Story 3

- [X] T020 [US3] In `src/public/loginCard.js`, add `signedIn=1` to `callbackURL` in `startSignin`
- [X] T039 [US3] In `src/public/inviteCard.js`, add `signedIn=1` to `callbackURL` in `startSignin`
- [X] T021 [P] [US3] In `src/public/acceptTermsCard.js`, pass `me` to `render`, add the `accept-terms-account` line, and remove `signedIn` from `next`, per contract C3
- [X] T022 [P] [US3] In `src/public/app.js`, show the snackbar and remove the parameter per contract C4, after the first `adopt`
- [X] T023 [US3] Move the `.m3-snackbar` rules from `src/public/admin-card-m3.css` to new `src/public/snackbar-m3.css`, with the bottom offset of contract C5, and link it from `src/public/index.html` and `src/public/admin.html`
- [X] T024 [US3] In `tests/m3-assets.test.ts`, list `snackbar-m3.css` in `LAYER_ORDER` for `index.html` and `admin.html`, and assert the sheet holds `bottom:calc(16px + var(--cookie-banner-offset, 0px))`

**Checkpoint**: User Story 3 works on its own.

---

## Phase 6: User Story 4 - An honest Privacy Policy, accepted once (Priority: P3)

**Goal**: the policy states what is kept, and every account accepts once.

**Independent Test**: `tests/legal-pages.test.ts`; log in with an account on the previous version.

- [X] T025 [US4] In `tests/legal-pages.test.ts`, assert "We keep no picture" is gone, the new sentence and Google's row are present, and the avatar sentence is unchanged, per contract C6
- [X] T026 [US4] In `src/public/privacy.html`, make the two wording changes of contract C6
- [X] T041 [US1] Add the down icon to the right of the avatar in `src/public/app.js` and `src/public/header-tab-bar-m3.css`, per contract C8; `tests/client-m3-header.test.ts` covers it
- [X] T042 [US3] Show the login snackbar at the top of the screen with `.m3-snackbar--top` in `src/public/snackbar-m3.css` and `src/public/app.js`, per contracts C4 and C5; `tests/client-sign-in-notice.test.ts` and `tests/m3-assets.test.ts` cover it
- [X] T043 Move the Back to top button to the left edge of the container in `src/public/back-to-top-m3.css`, per contract C9; `tests/back-to-top-sheet.test.ts` covers it
- [X] T046 [US3] Apply Stay logged in to provider logins in `src/public/loginCard.js`, `src/public/inviteCard.js` and `src/auth/auth.ts`, per contract C11; `tests/oauth-providers.test.ts`, `tests/client-oauth-login.test.ts` and `tests/client-invite-card.test.ts` cover it
- [X] T047 Change the wording to "Log in" across the code base, per contract C12; new `tests/login-wording.test.ts` covers the pages and the emails
- [X] T048 [US2] Rearrange the Login card's provider text in `src/public/loginCard.js`, `src/public/cardShell.js` and `src/public/card-shell-m3.css`, per contract C2; `tests/client-oauth-login.test.ts` covers it
- [X] T049 For testing, set `TERMS_VERSION` in `src/legal/version.ts` and the version line of `src/public/privacy.html` and `src/public/terms.html` to 2026-11-06, and the Privacy Policy's date to 6 November 2026; T027's release date is still to be set
- [X] T050 [US4] Name the changed documents on the Accept Terms card, from per-document dates in `src/legal/version.ts`, per contract C13; `tests/terms-gate.test.ts`, `tests/client-sign-in-notice.test.ts`, `tests/client-terms-box.test.ts` and `tests/legal-pages.test.ts` cover it
- [X] T051 [US4] Read the version to agree to past the browser's cache in `src/public/cardShell.js`, and name both documents in the refusal in `src/routes/api.ts`, per contract C13; `tests/client-terms-box.test.ts` and `tests/terms-agreement.test.ts` cover it
- [X] T052 [US4] Name Cookie Use in the Accept Terms box and show the address in bold, in `src/public/cardShell.js` and `src/public/acceptTermsCard.js`, per contracts C3 and C13; `tests/client-terms-box.test.ts` covers it
- [X] T053 [US4] Link every "delete your account" in `src/public/privacy.html`, and serve both legal pages' dates from `src/legal/version.ts` through `src/routes/assets.ts`, per contracts C6 and C13; `tests/legal-pages.test.ts` and `tests/client-delete-account.test.ts` cover it
- [X] T054 [US4] Make the Privacy Policy changes in `src/public/privacy.html`, per contract C14, and set `PRIVACY_UPDATED`; `tests/legal-pages.test.ts` and `tests/privacy-minimization.test.ts` cover it
- [X] T055 [US4] Make the Terms of Service changes in `src/public/terms.html`, per contract C15, and set `TERMS_UPDATED`; `tests/legal-pages.test.ts` covers it
- [X] T056 Fix what the full test run found: the Login card's not-launched notice in `src/public/loginCard.js`, left broken by TWEAK10; the wording missed in `tests/fixtures/email-messages-before-heading-line-2.json` by TWEAK11; and the pattern in `tests/m3-assets.test.ts` from TWEAK06
- [X] T044 [US5] Add the logged-in Delete Account link to the footer in `src/public/app.js`, and open the dialog on `hashchange` in `src/public/profileCard.js`, per contract C10; `tests/client-footer.test.ts` and `tests/client-delete-account.test.ts` cover it
- [X] T045 Make the Back to top button's background `#3A8C5D` in `src/public/back-to-top-m3.css`, per contract C9; `tests/back-to-top-sheet.test.ts` covers it
- [X] T040 [US4] Remove the Your Data section from `src/public/profileCard.js` and `src/public/profile-editor-m3.css`, open the delete dialog at `/profile#delete-account`, and link it from "Delete your account" in `src/public/privacy.html`, per contract C7; `tests/client-delete-account.test.ts` covers it
- [X] T027 [US4] In `src/legal/version.ts`, set `TERMS_VERSION` to the release date, and send no 30-day email

**Checkpoint**: User Story 4 works on its own.

---

## Phase 7: User Story 5 - My picture goes when my account goes (Priority: P3)

**Goal**: a picture no longer in use is removed from storage, even after a failure.

**Independent Test**: quickstart Q9; `tests/profile-picture.test.ts`.

- [X] T028 [US5] In `tests/profile-picture.test.ts`, cover: deleting an account with a picture queues its key and one with the default avatar queues nothing; the sweep deletes the object and the row; a failed delete keeps the row and succeeds on a later tick; a tick deletes at most 100
- [X] T029 [US5] In `src/legal/deleteAccount.ts`, read `profileAvatar` and queue an `avatars/` key in the deletion's transaction
- [X] T030 [US5] In `src/polls/sweeps.ts`, add lock `avatarRemovals: 13`, `removeAvatarObjects` and its 5-minute schedule per research R6, scheduled only when `objectStore` is set; `SweepDeps` gains it

**Checkpoint**: all stories work.

---

## Phase 8: Polish & Cross-Cutting Concerns

- [X] T032 [P] Add the object-removal invariant to the Cross-feature invariants of `CLAUDE.md`, and the feature's notes to `CLAUDE_COMPLETE.md`
- [X] T033 [P] Update `README.md` and `ARCHITECTURE.md` per the constitution's Documentation Deliverables: the picture, what is shared, and the removal sweep
- [X] T034 Run `npx tsc --noEmit` and `npm test`, and fix what fails
- [X] T035 Run the manual checks of `specs/20261105-161242-SOCIAL-LOGIN-AVATAR/quickstart.md`, and record Q2, Q3, Q8 and Q9's results; change the host rule of `src/auth/profilePicture.ts` if Q3 shows it is wrong; if Q9 shows a cached copy lasting past a day, change the object's lifetime or the Privacy Policy's wording before release The developer reported on 2026-11-06 that all manual tests passed; the developer accepted T035 without recording the individual Q2, Q3, Q8 and Q9 results or screenshots.

---

## Dependencies & Execution Order

- **Setup (Phase 1)** comes first, then **Foundational (Phase 2)**.
- **US1** and **US5** need Phase 2. **US5** also uses `storeProfilePicture`'s queueing from **US1** for a replaced picture, but its own tasks build on Phase 2 alone.
- **US2**, **US3** and **US4** need only Phase 1, and can run in any order.
- `src/public/loginCard.js` is edited by T015 and T020, and `tests/client-oauth-login.test.ts` by T014 and T019, so those are done one after the other. The same goes for `src/public/inviteCard.js` (T037, T039) and `tests/client-invite-card.test.ts` (T036, T038); T037 needs T015.
- **Polish** comes last.

### Within each story

Tests come first and must fail; then the implementation.

### Parallel Opportunities

- US1: T006, T009, T010 and T013 touch different files.
- US3: T018 follows T017, since they share a new file; T019, T021 and T022 touch separate files.
- US2, US3 and US4 can run side by side once Phase 1 is finished, apart from the `loginCard.js` overlap above.

```text
# User Story 1, in parallel:
T006 tests/profile-picture.test.ts
T010 src/auth/profilePicture.ts
T013 postman/openapi.json
```

## Implementation Strategy

### MVP First

Phases 1–3 give a working picture for Google users. **Do not release this alone**: the Privacy Policy still promises that no picture is kept, so User Story 4 must ship with it, and User Story 5 before any photograph is stored in production.

### Incremental Delivery

1. Phases 1–2: the foundation.
2. US1: the picture.
3. US2 and US3: informing the user; they can land in either order.
4. US4 and US5: required before release.
5. Polish, including the manual checks.

## Notes

- Comments carry no requirement references (Principle VI).
- The changed document's date in `src/legal/version.ts`, which `TERMS_VERSION` follows, is the actual release date, so set it when the release date is known.
