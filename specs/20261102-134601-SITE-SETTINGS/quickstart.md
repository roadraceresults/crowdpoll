# Quickstart: Site Settings and Color Scheme

## Prerequisites

- PostgreSQL for development (see README.md); the app runs migration `016-color-scheme` at start-up.
- Two browsers (or a normal and a private window) and an account in each; one account with permission to create polls.
- The device's appearance set to **dark** for scenarios 5 and 6.

## Automated

```
npx tsc --noEmit
npx vitest run tests/color-scheme.test.ts tests/client-site-settings.test.ts tests/color-scheme-contrast.test.ts
npx vitest run tests/m3-assets.test.ts tests/line-graph-ui.test.ts tests/cookie-use-list.test.ts
npm test
```

## Manual scenarios

1. **Menu** (US1, US3; C1): sign in as a user without poll permissions.
   Expected: the avatar menu shows Edit Profile, then Site Settings with the gear (enabled), then Create Poll (disabled), then Logout.
   Then sign in as a poll creator.
   Expected: Poll Administration shows the checklist icon.
   Check both icons in Light and in Dark.
2. **Page** (US1; C3, A3): choose Site Settings.
   Expected: `/settings` shows the card titled "Site Settings", with the gear at the avatar's size and "Light (default)" selected. No Profile fields appear.
   Open `/settings` signed out.
   Expected: you are taken to `/login`.
3. **Switch** (US1; C4): select Dark.
   Expected: the page turns dark at once and there is no Save button.
   Reload and open the home page, a poll's line graph and `/admin`.
   Expected: every page is dark from its first paint, with no light flash.
4. **Other device and tabs** (US1, US4; R5): with a second tab open, select Light in the first.
   Expected: the second tab turns light at once.
   Select Dark, then sign in to the same account in the second browser.
   Expected: it shows Dark after its first `/api/me`.
5. **Default** (US2): with the device set to dark, open the site signed out, then as a user who never chose a scheme.
   Expected: both show Light.
6. **Session ends** (US2; Clarification Q1): as a Dark user, Logout.
   Expected: Light, and `localStorage.colorScheme` is gone.
   Sign in again with Dark and delete the `session_token` cookie in devtools, then reload.
   Expected: Light after `/api/me` answers `401`, and the key is gone.
7. **Failed save** (US4; C4): in devtools set the network offline, then select the other scheme.
   Expected: the page returns to the saved scheme, its radio is checked again, and the message appears.
8. **Quick changes** (Edge Cases; C4): toggle the scheme five times quickly.
   Expected: the final choice is shown, and after a reload it is the one stored.
9. **Contrast audit** (FR-011a, SC-007; R11): on each of the 13 pages, in Light and in Dark, check text, controls, icons and graph lines with the browser's contrast checker. The pages are home with each tab and a maximized poll card, login, create-account, confirm-signin, accept-terms, invite, not-authorized, privacy, terms, profile, settings, admin (each tab and the wizard) and admin-results.
   Expected: no AA failure. Each failure found is fixed and recorded in tasks.md.
