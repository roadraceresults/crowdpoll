# Quickstart: Deep Links

## Automated

```
npx tsc --noEmit
npx vitest run tests/shared-link-tab.test.ts tests/client-maximized-history.test.ts tests/client-landing.test.ts tests/client-share-button.test.ts tests/client-search-address.test.ts
npm test
```

Expected: all pass; the `chooseTab` table covers every visitor kind × tab (contract L4), and no test writes a `bookmarked` row on
opening a link (L6).

## By hand (`npm run dev`, two accounts A and B, a guest window)

Prepare: A creates a public poll P1 and a private "Anyone with the link" poll P2; B votes on nothing.

1. **The address (L1–L3)**: as A on Trending, maximize P1. 
[X] The address is `/?tab=trending&PID=<P1>`.  
https://couples-subaru-astronomy-plug.trycloudflare.com/?tab=trending&PID=b6916ada-dedc-4668-98c0-39303e705071  

[X] Reload: P1 is maximized over  
[X]   Trending. Minimize: `/?tab=trending`.   
[X] Maximize again, press the browser's Back: the tab, address without `PID`.  

[x] 2. **Tab hint kept or replaced (L4)**: as B, open A's copied `/?tab=your-polls&PID=<P1>` → P1 over Home; open
   `/?tab=trending&PID=<P1>` → over Trending; open `/?tab=trending&PID=<P2>` → P2 over Shared With You. Minimize each: that tab
   shows, with the poll's card first in it (L10).  

[x] 3. **Nothing written (L6)**: B's Watching tab is unchanged after step 2.
[x] 4. **Back after a link (L3)**: open a link from another site's page; Minimize shows the tab; the browser's Back returns to that site.
[x] 5. **Search (L9)**: search "test": the address is `/?tab=search&q=test`. Maximize a result, reload: the result over the same
   results; Minimize returns to them. Clear: `q` leaves the address.
[x] 6. **Guest (L7, L8)**: in the guest window open `/?tab=trending&PID=<P1>` → P1's public page over Trending; open
   `/?tab=shared-with-you&PID=<P2>` → login page; log in as B → P2 over Shared With You.
[x] 7. **Share (S1–S9)**: on a phone, tap Share on P1 in the grid and maximized: the share sheet offers `/?PID=<P1>`; cancel: nothing.
   On desktop Firefox: "Link copied", and the clipboard holds `/?PID=<P1>`. A's unpublished poll in Your Polls shows no Share.
   The admin card's "Copy poll link" copies the same link.
[x] 8. **Old links (L11)**: an invitation email's link and `/?PID=<P1>` with no tab land as before for B (P1 over Home, now, instead
   of Trending — the one intended change).

