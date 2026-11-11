# Quickstart: Footer Links

## Automated

```
npx tsc --noEmit
npx vitest run tests/legal-pages.test.ts tests/m3-assets.test.ts tests/cookie-use-list.test.ts
npx vitest run tests/client-back-arrow.test.ts tests/client-tab-address.test.ts tests/client-delete-account.test.ts
npx vitest run tests/client-admin-discard.test.ts tests/client-landing.test.ts tests/client-home.test.ts tests/client-home-tab.test.ts tests/client-footer.test.ts
npm test
```

## Manual (development server, native sign-in)

1. **Phone layout** (C1): in DevTools pick a 390 px phone, open `/`, then Privacy Policy from the footer. The arrow
   sits above the title, the title and the "In short" box span the screen, no word is cut off, no sideways scroll.
   Scroll down and tap Back to top: the arrow is visible again. Follow Cookie Use from the footer: the Cookie Use
   heading lands below the header. Widen past 640 px: the arrow is fixed under the header at the left and the text
   keeps clear of it, as before.
2. **Address names the tab** (C2): log in, open `/`: the address reads `/?tab=home`. Select Your Votes: `/?tab=your-votes`,
   and the browser's Back button is not a step richer (press it once: you leave the site, or the page before).
3. **Return to the tab**: from Your Votes open Privacy Policy, press the Back arrow: Your Votes is showing. Repeat with
   the browser's Back button and with a reload of the home page. Repeat for each of the nine tabs.
4. **Search terms**: from the Settings page search "senate" in the header box: the home page shows the Search tab with
   `/?q=senate&tab=search`. Select Trending: `/?tab=trending`; reload: Trending, no search.
5. **Guest fallback**: log out, open `/?tab=your-votes`: Trending shows, the address reads `/?tab=trending`, no login
   page. Open `/?tab=nonsense`: Trending.
6. **Card not restored**: maximize a poll on Trending, open the Terms, reload the Terms, press the arrow: Trending with
   its list, the card not maximized.
7. **Delete Account Cancel** (C3): from Your Votes press Delete Account in the footer, then Cancel: Your Votes is
   showing. Again with Escape. From the Privacy Policy's "delete your account" link, Cancel: the Privacy Policy. On the
   Profile page press its own footer's Delete Account, Cancel: the dialog closes, focus is in the name field; again:
   the same. Paste `/profile#delete-account` into a new tab, Cancel: the Profile page stays.
8. **Delete unchanged**: on a throwaway account type DELETE and press Delete Account: the account is deleted and the
   browser goes home as before.
9. **Admin arrow** (C5): as an administrator, from the home page's Home tab open `/admin` (avatar menu), press the
   arrow: the home page shows Home. Open `/admin` in a new tab, press the arrow: the home page opens. Start editing
   a poll, press the arrow: the discard dialog asks first, as before.
10. **Cookie Use table**: unchanged; DevTools → Application shows no new cookie or storage key.
