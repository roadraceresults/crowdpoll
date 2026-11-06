# Quickstart: Social Login Avatar

## Automated

```
npx tsc --noEmit
npm test
```

`npm test` runs the automated test files in `tests/`. They use fakes in place of Google's picture host and Spaces, so neither is needed.

## Manual checks

These need real provider credentials and, for Q1–Q3, `ENV_SPACES_*`. Without Spaces, the picture cannot be seen, by design (contract A2). For the checks that go through the CDN, `ENV_SPACES_CDN_URL` must be the CDN's address, `https://crowdpoll-cdn.tor1.cdn.digitaloceanspaces.com`, which Terraform sets in production. An address without `.cdn.` is the Spaces bucket itself, which skips the CDN.

**Q1. The picture appears.** Log in with a Google account that has a photo. Expected: it shows in the header and on the Profile card, and the browser's network panel shows it loaded from the CDN, with no request to any Google address. Requesting the CDN's root address lists nothing.

**Q2. A Google account with no photo.** Log in with one of the test accounts showing a coloured letter. Expected: whatever Google supplies is shown. Record whether it is the letter, since the documentation did not settle this.

**Q3. The picture's host.** After Q1, read the avatar's address on the Profile card. Expected: it ends in `/avatars/` and 32 hexadecimal characters. An object is stored only after the host rule (research R2) accepts Google's address, so this confirms the rule accepted it. If the default avatar stays instead, read the server's `[profile-picture] Kept the current picture` line: a refused host means the rule must change.

**Q4. A new picture.** Change the photo at Google, sign out and log in. Expected: the new photo appears with a new address, and the old object goes within about 5 minutes. Requesting the old address through the CDN may still work for up to a day (research R3).

**Q5. Amazon.** Log in with Amazon. Expected: the default avatar, or the picture from an earlier Google login, and the "Logged in as" snackbar at the top of the screen for about 6 seconds. It does not return on a reload.

**Q6. Accept Terms.** Log in with a new account, by provider and then by emailed link. Expected: "Logged in as" and the address on the Accept Terms page both times, and no snackbar after accepting.

**Q7. What is shared.** Open `/login`. Expected: each configured provider's sentence is directly under its button, with no link, and "Stay logged in" and "By logging in", with a working Privacy Policy link, are above the buttons. Open an invitation's `/invite` page, and log in from there with a provider. Expected: one line under the buttons, with a working Privacy Policy link, and the snackbar of Q5.

**Q8. The provider screens (FR-028).** Remove CrowdPoll's access at Amazon (Manage apps & services with data access) and at Google (your Google Account's third-party access), delete the test account on CrowdPoll, and log in again. Record what each provider's screen shows, and whether consent was asked again.

**Q10. Stay logged in with a provider.** On `/login`, tick the box and log in with Google, then with Amazon. Expected: `session_token` has a `Max-Age` of 30 days each time. Log in with the box clear. Expected: no `Max-Age`, and closing the browser signs you out. Repeat one of these from an invitation's `/invite` page.

**Q9. Deleting the account.** Delete an account with a picture, using the Privacy Policy's "Delete your account" link. The footer's Delete Account link, from another page and from `/profile`, opens the same dialog, and a signed-out visitor does not see it. Expected: its object goes within about 5 minutes, and `avatar_removals` is empty afterwards. Before deleting, request the picture twice through the CDN and record its `Cache-Control` and `Age`. Request its address again a day after deleting. Expected: it no longer loads, which is what the Privacy Policy's "up to a day" promises, so do this before that wording ships.
