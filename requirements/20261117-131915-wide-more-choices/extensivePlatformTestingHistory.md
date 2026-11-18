## 2026-11-18 16:15:55 -05:00 — user input (remote: fileRemote/IN-20261112-211318-PM.md)

keep it in devScripts

### Reply

Done. The tap diagnostic is back, as **`devScripts/tapDebug.js`**, ready to commit.

**What's in it:**
- The final version we used: tap, click, focus, scroll, viewport and page-leave events, with the log kept in the tab's session so it survives a navigation.
- A usage note at the top:
  - **Using it:** copy it to `src/public/`, add `<script src="/tapDebug.js"></script>` after `viewportWidth.js` in the page under test, and open the page with `?tapdebug`. Remove both when done; never commit either step.
  - **Reading the log:** what `pointerdown … on A | at point: B` means (A is where the browser sent the tap, B is what's drawn there; when A isn't the control you touched, something is catching the tap), what a missing `click` line means, and that the lines before `pagehide (leaving)` say why the page left.
  - It sends nothing anywhere; the log lives in the tab's `sessionStorage`.

**`.gitignore`:** a new `!devScripts/tapDebug.js` line beside the other named dev scripts, so git now sees the file (`?? devScripts/tapDebug.js`). `node --check` passes.

**Not committed:** `.gitignore` (modified) and `devScripts/tapDebug.js` (new). Say "commit and push" when ready.

<!-- file-remote: end of entry -->

---

## 2026-11-18 16:13:26 -05:00 — user input (remote: fileRemote/IN-20261112-211318-PM.md)

tapdebug.js was very useful.  
Is it worth keeping? 

### Reply

**Yes, keep it, but not on the live site.** It found two causes we couldn't have found by reading the code: taps reaching the card's frame, and the Profile X's halo. Device testing will turn up more like them.

**Why not in `src/public`, loaded by every page:**
- Every visitor's browser would download it on every page view, only for it to do nothing.
- It would be one more script tag that `m3-assets` and `phone-sheets` have to account for.
- A tester could switch it on in production by adding `?tapdebug`. It records tap targets in the tab's own storage and sends nothing anywhere, so it's harmless, but a debugging overlay doesn't belong on the public site.

**What I suggest:** commit it as **`devScripts/tapDebug.js`**, with a usage note at the top, plus a `!devScripts/tapDebug.js` line in `.gitignore`, as the project's rules require for a new dev script. Using it next time is then two temporary steps:
1. copy it to `src/public/`;
2. add `<script src="/tapDebug.js"></script>` after `viewportWidth.js` in the page being tested.

Remove both when done. The note would also list what the log shows and how to read it:
- `event.target` vs `elementFromPoint`;
- the log that survives a page change;
- the `pagehide` line.

**One more option, if you'd rather skip the copying:** the dev server could inject it into every page itself when an `ENV_*` setting is on, e.g. `ENV_TAP_DEBUG=true`, and never in production. That needs:
- a small change in the page routes;
- a new validated setting in `src/config.ts`;
- a row in the settings table;
- a test.

That's more code than the convenience is worth for an occasional tool, so I'd go with the `devScripts/` copy.

I deleted the file during the clean-up, but I have its final version (with the log that survives navigation) and can recreate it exactly. Say "keep it in devScripts" and I'll add it, with the `.gitignore` line, ready to commit.

<!-- file-remote: end of entry -->

---

## 2026-11-18 16:07:35 -05:00 — user input (remote: fileRemote/IN-20261112-211318-PM.md)

We found and you fixed a large number of issue by testing on various phone, os and browser combinations.  

Ready to run the full test suite and then 
Ready to commit and push.

### Reply

Done: the full suite passed after three test fixes, and everything is committed and pushed.

**Full suite:** 215 files, 3,593 tests. The first run had **3 failures**:
- **2 in `tests/poll-card-assets.test.ts`:** these tests pinned the exact text of the old lookbehind word patterns. I updated them to the new `(?:^|[^a-z])` form and corrected their comment. The file passes (54 tests).
- **1 in `tests/client-home.test.ts`,** "a click with no token left is not sent…": a timing-based test that waits 1.3 s for a Watch token to refill. It passes alone and passes with the whole file (122 tests in the two files), so it was a timing flake under the full suite's load, not a regression. None of today's changes touch that code.

All else passed (3,565 tests); 25 were skipped, as usual for tests that need a live service.

**Commit `b4b9887`**, "Device testing fixes: card flip taps, older iOS, Copy link, Profile fields, card heights". 15 files, staged by name:
- **Poll card:**
  - scroll to the card's top after Show fewer, on Vote, on flip and after a vote;
  - the new flip icon;
  - "N selected" beside Submit;
  - the card's own flip and Submit kept in its footer while the Submit bar shows;
  - the maximized card as tall as the face shown.
- **Device fixes:**
  - the hidden face ignores taps, and each face is lifted 1px (iOS 17);
  - no regex lookbehind (iOS 16.3);
  - the title row without `1lh` / `:has()` (Opera 83);
  - one Copy function for all three Copy controls (iOS);
  - the Profile X's halo kept around the X.
- **Settings Summary:** the link-preview sentence in the sharing paragraph, with a rule below it.
- **Docs:** the Submit bar paragraph in `ARCHITECTURE.md`.

I checked that the temporary `tapDebug.js` isn't in the commit.

**Pushed:** `origin/main` moved `93126b4..b4b9887`. That also carries `6449ee8` (`choicesOrderLogic.md`), which was waiting. The working tree is clean.

**Still yours to do:** `npm run deploy` when you want these on the live site.

<!-- file-remote: end of entry -->

---

## 2026-11-18 15:19:58 -05:00 — user input (remote: fileRemote/IN-20261112-211318-PM.md)

```
I haven't changed these. Say if you want them converted the same way. It's worth it only if you expect real visitors on browsers that old.
```

Question: is there any downside to making these changes for older browsers?  
If it results in unnecessary code, then that is enough a reason to skip it.  

### Reply

**Yes, there's a real downside, and by your rule I'd skip them.**

**What converting a `:has()` rule costs:**
- **New script for every rule.** `:has()` reacts to the page by itself. Without it, a script has to set a class each time the condition changes, such as the Add Choice button showing or the maximized Back arrow appearing. That means a function like the new `syncTitleIcons()` for each rule, called from every place the condition can change.
- **A new way to break.** If a later change shows or hides the element somewhere and forgets to update the class, the layout goes wrong in **every** browser, not just old ones. With `:has()` that can't happen.
- **Some can't be done cleanly at all.** Several rules react to field states the browser tracks itself: `:disabled`, and `:user-valid` / `:user-invalid` (which is also Chrome 119+). Copying those would mean input and blur listeners on the forms, which is clearly unnecessary code.
- **More tests to keep** for each class, as with the title row.

**What old browsers lose without the conversion,** the two cases from my last reply:
- With **Add Choice** offered, the voting side's footer uses the plain row layout instead of the three-place one. Every button still shows and works.
- In the maximized view, the refresh icon shows beside the Back arrow instead of being hidden. Both still work.

Nothing is unusable and nothing overlaps; it's a slightly less tidy layout in browsers about four years old. The title row was different: the text ran **under** the icons, so it was worth fixing.

**My recommendation:** leave them, and keep using `:has()` in new work. If an old browser shows something actually broken, fix that case alone, as we did for the title.

No changes made.

<!-- file-remote: end of entry -->

---

## 2026-11-18 15:16:16 -05:00 — user input (remote: fileRemote/IN-20261112-211318-PM.md)

Here's a new one we haven't seen in all our testing.  

When the title is long and needs to wrap,  
it sometimes wraps incorrectly and overlaps the "Watch" and "Maximize" icons.  

Circled in red on the screenshot below:  
![alt text](image-57.png)

Testing on Opera 83 on MacOS Sierra   

![alt text](image-58.png)

### Reply

Found and fixed. **Opera 83 is built on Chromium 97 (early 2022), and the title row relied on two pieces of CSS that Chromium only gained later.** Modern browsers never showed the problem, which is why it didn't come up in earlier testing.

**How the title makes room for the icons:** the Watch and Maximize icons sit at the top right of the card. The title starts with an invisible box floated to the right, as wide as the icons and one line tall, so the first line wraps short of them (`.question::before` in `pollCard-m3.css`).

**What Chromium 97 did with it:**
1. The box's height was **`1lh`**, "one line". The `lh` unit arrived in **Chrome 109**. Chromium 97 drops the declaration, the box gets **zero height**, it makes no room, and the title runs under the icons. That's what your circles show.
2. Making the box wide enough for **two** icons when Watch shows used **`:has()`**, which arrived in **Chrome 105**, so that was dropped too.

**The fix:**
- **`src/public/pollCard-m3.css`:** the box gets `height:1.27em` first, then `height:1lh`. The card title's line height is 1.27, so both mean one line. Old browsers use the first and new ones the second.
- **`src/public/pollCard.js`:** a new `syncTitleIcons()` puts a `has-bookmark` class on the title row whenever the Watch button shows, and takes it off when the button is hidden. It's called everywhere the button is shown or hidden.
- **`pollCard-m3.css` and `phone-card-m3.css`:** the two-icon width now keys on `.question-row.has-bookmark` instead of `:has(…)`, so it works in every browser.

**Tests:**
- `tests/m3-assets.test.ts`: the title-row test now expects the `1.27em` fallback before `1lh`, and the class instead of `:has()`.
- New test in `tests/client-phone-card.test.ts`, "marks the title row while the Watch button shows…", checks that the class follows the Watch button.
- `client-phone-card`, `m3-assets`, `phone-sheets`, `client-wide-card` and `client-home` pass (286 tests), and `tsc` is clean.

**Other `:has()` rules, for your judgement.** About 20 other selectors use `:has()`, and Chromium before 105 (and Safari before 15.4) ignores them all. Most are polish, such as label colors in an error state or a disabled field's look. Two could show in Opera 83:
- `add-choice-m3.css`: the voting side's footer layout when **Add Choice** is offered. In old browsers the three buttons fall back to the plain row.
- `phone-m3.css` / `single-column-m3.css`: hiding the refresh icon while the maximized view's Back arrow shows. In old browsers both show.

I haven't changed these. Say if you want them converted the same way. It's worth it only if you expect real visitors on browsers that old.

Nothing is committed.

<!-- file-remote: end of entry -->

---

## 2026-11-18 14:54:01 -05:00 — user input (remote: fileRemote/IN-20261112-211318-PM.md)

When the viewport is at a width where the footer of the Maximized Vote view gains a "Flip" button and a "Submit vote" button,  
render a "
Flip button also in the footer of the Poll Card Voting face.  

![alt text](image-55.png)  

Also, move the Submit button to the right.


### Reply

Done. At the widths where the maximized voting view has the Submit bar (the phone layout, 640 px and below), the card's own footer now shows the **flip** button too, with **Submit vote on the right**.

**Why Submit had moved left:** while the Submit bar showed, a rule hid the card's own flip button. The card's footer spreads its buttons apart (`justify-content:space-between`), so with flip gone, Submit was the only button left and sat on the left.

**The change, `src/public/phone-card-m3.css`:** that hide rule now covers only the Back-to-top button. The card's footer is the same as at every other width:
- flip on the left;
- Submit vote on the right;
- Add Choice between them, when it's offered.

The Submit bar at the bottom of the screen is unchanged.

**Docs:** the Submit bar paragraph in `ARCHITECTURE.md` said the card's own Back and Submit were hidden while the bar shows. Submit had already been restored earlier, so it was out of date; it now describes the card's full footer.

**Test:** the existing test in `tests/phone-sheets.test.ts` is renamed "puts the count against Submit, and keeps the card's own flip button and Submit while the bar shows". It checks that neither button is hidden and that the footer still spreads them apart. `phone-sheets`, `client-phone-card` and `client-phone-view` pass (136 tests).

Nothing is committed.

<!-- file-remote: end of entry -->

---

## 2026-11-18 14:39:42 -05:00 — user input (remote: fileRemote/IN-20261112-211318-PM.md)

Back to local Windows with Chrome.  

1. Click "Vote" for a poll with over 30 choices.  
2. Scroll down to see all the choices.  
![alt text](image-53.png)   
  


3. Click the "Flip" icon to go back to front of Maximized card.  

![alt text](image-54.png)  

Please make the card only as tall as it needs to be so that the "Vote" button is directly below the bars shown.  
So, the Maximized card can grow and shrink dynamically based on the content inside it.  
Rather than have it match the right column height.  


### Reply

Done. The maximized card is now only as tall as the side being shown: it grows and shrinks with its content, and the **Vote** row sits right under the bars.

**Why it was tall:**
1. The maximized view's row stretched the card to the **right column's height**: notes plus line graph (`align-items:stretch` in `tabs.css`).
2. The card's two sides share one space, so the card was as tall as the **taller side**: the 32-choice ballot behind the 10 results bars.

The phone layout had already solved (2) for itself. The wide view hadn't.

**The change, `src/public/pollCard-m3.css`, at every width:**

```css
.maximized-card-viewport{ align-self:flex-start; }
.maximized-card-flip:not(.is-flipped) .card-back,
.maximized-card-flip.is-flipped .card-front{ position:absolute; inset:0 0 auto 0; height:auto; }
```

- The card no longer stretches to the right column. The column rule between them still runs the full height.
- The side turned away is taken out of the layout, so it no longer sets the card's height.
- The result: on the results side the card ends below **Show all 32 choices** and the Vote row. On the voting side it grows to fit every choice. **Show all / Show fewer** grow and shrink it too.

**One side effect to watch:** the hidden side still exists, turned away. If the ballot is taller than both the results card and the right column, the page can scroll a little further down than it seems to need, over blank space. In your screenshot the right column is longer, so it shouldn't show there. The phone layout has always worked this way.

**Test:** new test in `tests/phone-sheets.test.ts`, "is the face shown at every width, not the right column's or the taller face's". It checks both rules and that they're outside any media query. `phone-sheets`, `m3-assets`, `client-wide-card`, `client-phone-card` and `client-maximized` pass (257 tests). jsdom doesn't do layout, so the height itself needs your eye in Chrome.

Nothing is committed.

<!-- file-remote: end of entry -->

---

## 2026-11-18 13:59:26 -05:00 — user input (remote: fileRemote/IN-20261112-211318-PM.md)

Works!

### Reply

🎉 Good, the Profile fields work on the iPhone 18 Pro.

**Clean-up done:** I deleted `src/public/tapDebug.js` and removed its `<script>` lines from `index.html` and `profile.html`. Nothing in `src` or `tests` mentions it any more. `profile.html` is back to its committed state, and `index.html` keeps only the flip-icon change. `m3-assets` and `phone-sheets` pass (138 tests).

**All uncommitted changes, waiting for your word:**
- **Poll card:**
  - the Show-fewer scroll fix and the flip icon;
  - the Submit bar changes;
  - scroll to the card's top on flip, on Vote and after a vote.
- **Settings Summary:** the link-preview sentence in the sharing paragraph, and the rule under that paragraph.
- **Phone and iPhone fixes:**
  - the hidden face ignores taps;
  - the 1px lift of each face;
  - no regex lookbehind, for iOS 16.3;
  - one Copy function for all three Copy controls;
  - the Profile X's halo no longer covers the fields.

Each change has its own tests. `6449ee8` (`choicesOrderLogic.md`) is committed but not pushed. The full test suite hasn't run since `93126b4`. Say "commit", "commit and push", or "run the full suite first".

<!-- file-remote: end of entry -->

---

## 2026-11-18 13:55:59 -05:00 — user input (remote: fileRemote/IN-20261112-211318-PM.md)

![alt text](image-52.png)

### Reply

**The log found it, and it's fixed.** On the Profile page, your tap on the field (`pointerdown 129,408`) landed on **`a.icon-btn.card-shell-close[href=/]`**, the card's X link, and `elementFromPoint` showed the X link drawn at that spot. So the X's tap area was covering the fields.

**Why:**
- In the phone layout the X gets an invisible **tap halo**, 8px larger on every side, so it's easier to hit: `.card-shell-close::after{ position:absolute; inset:-8px }` in `phone-m3.css`.
- An absolutely placed halo measures itself from the **nearest positioned ancestor**. On the login cards the X is positioned itself (`position:absolute` in the top row), so its halo hugs the X.
- On the **Profile** card the X sits in the title row and wasn't positioned. Its halo measured itself from the whole card and covered the card plus 8px, **fields included**. Any tap in the card went to `/`.

This wasn't iOS 27-specific: the same page would do it on any phone-width browser, Android included. iOS just happened to be where you tested it.

**The fix, `src/public/phone-m3.css`:** one line, `.card-shell-title-row .card-shell-close{ position:relative; }`. The halo now stays around the X, the X keeps its larger tap area, and the fields get their own taps.

I also checked the other tap halos in the phone sheets: the cookie banner button, the tab scroll arrows, the Submit bar, the admin notes Edit button and the modal OK. They all sit on positioned elements, so only this X was affected.

**Test:** new test in `tests/phone-sheets.test.ts`, "keeps its halo around the link wherever the link sits". `phone-sheets` and `m3-assets` pass (138 tests).

**Please re-test** with `?tapdebug` still on, which carries over within the tab: on the iPhone 18 Pro, tap both fields on Edit Profile. The keyboard should come up, and the log should show `focus input#userName` / `input#newEmail`. Also check that **X** still goes Home.

`tapDebug.js` and its lines in `index.html` and `profile.html` are still there; don't commit them. Nothing is committed.

<!-- file-remote: end of entry -->

---

## 2026-11-18 13:48:27 -05:00 — user input (remote: fileRemote/IN-20261112-211318-PM.md)

On iPhone 18 Pro with iOS 27.2  
Navigate to "Edit Profile"  
![alt text](image-50.png)  

Click "enter new user anem" or "enter new email address"  
Expoected behavior: the keyboard appears and the user can type in the new user name or email address.

Actual: navigates back to Home Page.

![alt text](image-51.png)  



### Reply

I can't find the cause by reading the code, so I've set up the tap diagnostic again. This time its log **survives the jump to Home**.

**What I checked:** on the Profile page, the only things that go to Home are:
- the card's **close (X)** button, a plain link to `/`;
- Logout.

Tapping a field runs no code of ours apart from enabling the Save button as you type. Nothing on that page listens for a tap on the fields or for the keyboard, and the new-name and new-email fields are ordinary `<input>`s.

**My leading guess, not yet proven:** when you tap a field, iOS 27 starts moving the page to make room for the keyboard. The tap's **click** then lands where the **X** has moved to, rather than on the field. One way to check without the diagnostic: does the keyboard flash up briefly before the page leaves, or not appear at all?

**The diagnostic:** `src/public/tapDebug.js` is back, loaded by `index.html` and `profile.html`.
- It records each **tap** (where it landed and what was there), **click**, **focus**, **scroll**, **keyboard/viewport change** and **page leave**.
- It keeps the log for the rest of the tab's session, so when the page lands on Home, the box there shows the **last 14 events from the Profile page**.

**Please try this on the iPhone 18 Pro:**
1. Open your tunnel address with `?tapdebug`, e.g. `https://…trycloudflare.com/?tapdebug`.
2. Go to **Edit Profile** from the avatar menu. The box shows on that page too.
3. Tap **"enter new user name"**.
4. When it lands on Home, **screenshot the box**.

The line that matters is the `click … on …` just before `pagehide (leaving)`. If it names `a.icon-btn.card-shell-close[href=/]`, the guess is right and I'll fix the X. If it names something else, that tells us where to look.

As before, `tapDebug.js` and its `<script>` lines in `index.html` and `profile.html` are temporary; don't commit them.

<!-- file-remote: end of entry -->

---

## 2026-11-18 13:40:50 -05:00 — user input (remote: fileRemote/IN-20261112-211318-PM.md)

Copy works as expected now on iPhones


### Reply

👍 Good, all three Copy controls work on the iPhones now.

**Still uncommitted, waiting for your word:**
- **Poll card:**
  - the Show-fewer scroll fix and the flip icon;
  - the Submit bar changes;
  - scroll to the card's top on flip, on Vote and after a vote.
- **Settings Summary:** the link-preview sentence in the sharing paragraph, and the rule under that paragraph.
- **iPhone fixes:**
  - the hidden face ignores taps;
  - the 1px lift of each face;
  - no regex lookbehind, for iOS 16.3;
  - one Copy function for all three Copy controls.

Each change has its own tests.

`6449ee8` (`choicesOrderLogic.md`) is committed but not pushed. The full test suite hasn't run since `93126b4`. Say "commit", "commit and push", or "run the full suite first".

<!-- file-remote: end of entry -->

---

## 2026-11-18 13:24:12 -05:00 — user input (remote: fileRemote/IN-20261112-211318-PM.md)

```
The quick test (iPhone):

Tap the Copy poll link button in the Summary and watch the message at the bottom:
"Link copied": iOS accepted the write, so our code worked and the paste is coming from somewhere else, most likely BrowserStack's sync.
"Could not copy the link": iOS refused it. That would be our problem, and I'd fix it.
Then paste into a field on the page itself, e.g. the Search box on the admin page, rather than the address bar.
As a control, long-press any word on the page, choose Copy, and paste in the address bar. If you again get the old desktop text, BrowserStack's sync is overriding the iPhone's own clipboard, and no site's copy button would work in that test.
```

Clicking the "Copy Poll Link" button shows "Link copied".  And pasting into Search field shows it indeed was copied.  

Long pressing some text and clicking "Copy".  Pasting into the Search field shows it was copied correctly.

Clicking the icon and the menu item, does not show "Link copied". Pasting does not paste the link (but rather the text that was copied from long press).  

Do you think it is okay, and a by-product of BrowserStack clipboard handling?



### Reply

**No, it isn't BrowserStack. Your test proved it's ours, and it's fixed.** The Summary button copies on the same iPhone, so iOS and BrowserStack's clipboard are fine. The icon and the menu item were failing for a reason in our code.

**Why they failed:** they used a different code path from the Summary button. `actCopyLink` in `adminList.js`:
1. first **closed the menu and moved focus** back to the menu button;
2. only then asked for the copy;
3. ignored the result, so a refused copy showed nothing.

iOS allows a clipboard write only while it still counts as part of the tap, and it's strict about that. Doing the menu and focus work first is the likely reason iOS refused the copy. Android is more lenient, which is why the S23 worked.

**The fix:**
- `src/public/adminCard.js`: one function, `copyPollLink()`, now does the copying for **all three** controls (the Summary button, the link icon and the menu item). It's the Summary button's code, which you've proved works on iOS. The icon and menu item call it **first thing in the tap**, before anything else happens. All three show **"Link copied"**, or **"Could not copy the link"** if the browser refuses.
- `src/public/adminList.js`: `actCopyLink` no longer copies. It only closes the menu, after the copy has started.

**Tests (`tests/client-admin-wizard.test.ts`), two new:**
- "copies the link from the link icon and the menu item first thing in the tap, and says so". At the moment of the write, it checks that focus is still on the tapped control and that the menu is still open, then checks the link and the "Link copied" message.
- "says so when the link icon's copy is refused": a refused copy shows "Could not copy the link".

The admin test files pass (189 tests), and `tsc` is clean.

**Please re-test on the iPhones:** the link icon and the menu item should now show "Link copied", and the link should paste into Search and the address bar. If either shows "Could not copy the link", tell me which.

Nothing is committed.

<!-- file-remote: end of entry -->

---

## 2026-11-18 13:05:39 -05:00 — user input (remote: fileRemote/IN-20261112-211318-PM.md)

Testing on BrowserStack  

iPhone (latest iPhone 18 pro and iPhone 13) 

1. Login as Admin  
2. Navigate to the Poll Administration page  
3. Click "Copy Link" for a poll (tried the icon, the menu item, and the button in the Summary text)  
4. paste link in address bar

The link is what was previously on clipboard.  
--------------------------------
Android (Samsung Galaxy S23 ) 

1. Login as Admin  
2. Navigate to the Poll Administration page  
3. Click "Copy Link" for a poll (tried the icon, the menu item, and the button in the Summary text)  
4. paste link in address bar

The link navigates to correct poll.



### Reply

**Short answer: I think this is BrowserStack's clipboard handling on iPhones, not our code.** One quick test will tell, and I've made no change yet.

**What our code does:** all three Copy controls call the browser's standard `navigator.clipboard.writeText(…)` straight from the tap:
- the icon and the menu item: `actCopyLink` in `adminList.js`;
- the Summary button: `copyLinkButton` in `adminCard.js`.

Nothing waits before the call, and the site is served over https, which are the two things iOS requires. Safari has supported this since iOS 13.4, so an iPhone 18 Pro on a current iOS should accept it.

**Why I suspect BrowserStack:** on its real iPhones, BrowserStack Live **syncs the clipboard from your own computer to the device**. When you paste on the iPhone, you can get **your desktop's** clipboard rather than what the page put on the phone's. "The link is what was previously on clipboard" fits that exactly. The Android sessions work differently, which would explain the difference.

**The quick test (iPhone):**
1. Tap the **Copy poll link** button in the Summary and watch the message at the bottom:
   - **"Link copied"**: iOS accepted the write, so our code worked and the paste is coming from somewhere else, most likely BrowserStack's sync.
   - **"Could not copy the link"**: iOS refused it. That would be our problem, and I'd fix it.
2. Then **paste into a field on the page itself**, e.g. the Search box on the admin page, rather than the address bar.
3. As a control, **long-press any word on the page, choose Copy**, and paste in the address bar. If you again get the old desktop text, BrowserStack's sync is overriding the iPhone's own clipboard, and no site's copy button would work in that test.

If your own iPhone is handy, the most decisive test is to try it there.

**One real weakness, though:** the icon and the menu item give **no feedback** at all, and they ignore a failed copy without saying so. Only the Summary button shows "Link copied" or "Could not copy the link". I'd suggest giving all three the same message, so a failure is visible wherever it happens. Say if you want that.

<!-- file-remote: end of entry -->

---

## 2026-11-18 12:43:08 -05:00 — user input (remote: fileRemote/IN-20261112-211318-PM.md)


Cast your vote for a choice far down on the list, on Maximize view:  
![alt text](image-48.png)  

After vote, the Maximize view is in the notes section:  
![alt text](image-49.png)  

Should be back to top of Poll Card.

### Reply

Done. After a vote is recorded, the page now scrolls back to the **top of the Poll Card**.

**Why it happened:** after a vote the card turns from the long ballot (all 32 choices) back to its results side, which is much shorter. The page kept the scroll position from the bottom of the ballot, which on the results side is down in the notes.

**The change, `src/public/pollCard.js`, in the submit handler:** once the vote is recorded and the card has turned back, it calls `scrollToCardTop()`. That's the same helper that Vote, the flip button and Show fewer choices already use.
- It scrolls only when the card's top is above the window, so a short card that's already in view doesn't jump.
- It covers the maximized view and grid cards, and also removing a vote, which goes through the same handler.
- It does **not** scroll when the vote fails (the card stays on the ballot with its error) or when the poll went into editing.

**Test:** new test in `tests/client-phone-card.test.ts`, "goes back to the card's top once a vote is recorded". It votes for the last of 37 choices in the maximized view, scrolled far down, and checks the scroll back to the card's top. I checked that it **fails without the fix** and passes with it. `client-phone-card`, `client-wide-card`, `client-home` and `client-remove-vote` pass (152 tests), and `tsc` is clean.

Nothing is committed.

<!-- file-remote: end of entry -->

---

## 2026-11-18 12:19:52 -05:00 — user input (remote: fileRemote/IN-20261112-211318-PM.md)

```
Please re-test on the iPhone 13 (iOS 16.3): Home, Trending and Your Polls should show cards. Then check that voting on a grid card works there too, which is the same check as on the 12.  
```

Yay!  
All works on iPhone 12 and iPhone 13 in BrowserStack.

### Reply

🎉 Great. Both phones work now. That was three separate problems:

| Problem | Seen on | Fix |
|---|---|---|
| The hidden results face caught taps in the maximized view | iPhone 12, iOS 17.0 | `pointer-events:none` on the face turned away (`pollCard.css`) |
| Taps on a grid card's voting side went to the card frame | iPhone 12 and 13 | each face lifted 1px off the flip plane, `translateZ(1px)` (`pollCard.css`) |
| Every tab empty | iPhone 13, iOS 16.3 | regex lookbehind replaced in `pollCard.js` (Safari supports it only from 16.4) |

**Clean-up:** I deleted `src/public/tapDebug.js` and its `<script>` line in `index.html`. Nothing in `src` or `tests` mentions it any more. `m3-assets` and `phone-sheets` pass (137 tests).

**Still uncommitted, waiting for your word:**
- the Show-fewer scroll fix, the flip icon, the Submit bar changes and the scroll-to-top on flip and Vote;
- the summary changes: the link-preview sentence in the sharing paragraph, and the rule under that paragraph;
- these three iPhone fixes, each with a test.

`6449ee8` (`choicesOrderLogic.md`) is still committed but not pushed. The full test suite hasn't run since `93126b4`. Say if you want it run before committing.

<!-- file-remote: end of entry -->

---

## 2026-11-18 12:14:10 -05:00 — user input (remote: fileRemote/IN-20261112-211318-PM.md)


Empty Home tab  
![alt text](image-45.png)  


Your Polls  
![alt text](image-46.png)  


iPhone 13 with iOS 16.3  
![alt text](image-43.png)  

With tapdebug, tap where a card should be to see whether it is present but not drawn, or not present at all.  

![alt text](image-47.png)

### Reply

Found it, and it's fixed. **The iPhone 13 runs iOS 16.3, and `pollCard.js` used a regex feature that Safari supports only from iOS 16.4.** It has nothing to do with the tap fix.

**What happened:**
- The tap in image-47 landed on the page itself, and the Home and Your Polls tabs end straight at the footer, so **no card was ever created**. Something was failing before drawing started.
- `pollCard.js` lines 105–107 hold the three word lists that pick green, red or neutral bar colors ("yes", "agree", "no", "oppose", …). Each started with a **regex lookbehind**, `(?<![a-z])`, meaning "not preceded by a letter".
- Safari added lookbehind in **16.4**. On 16.3 it's a syntax error, and a syntax error stops the **whole file**. `window.PollCard` never existed, so every tab came out empty.
- That's why the iPhone 12 (iOS 17.0) and your desktop browser were fine, and also why the earlier iPhone 13 sessions may have looked fine: BrowserStack can give a different iOS version per session.

**The fix, `src/public/pollCard.js`:** each `(?<![a-z])` is now `(?:^|[^a-z])`, "the start of the text or a non-letter". The three patterns are only used with `.test()`, which answers yes or no, so this matches exactly the same text as before and runs on every iOS version.

**A guard against it coming back:** a new test in `tests/phone-sheets.test.ts`, "uses no regex lookbehind in a browser script", fails if any `src/public/*.js` file contains `(?<=` or `(?<!`. I searched the browser scripts for the other recent features that would break iOS 16.3 (`Object.groupBy`, `Promise.withResolvers`, the new Set methods, class `static {}` blocks, `Array.fromAsync` and others) and found none.

**Tests:** `phone-sheets`, `client-home`, `client-phone-card`, `client-wide-card`, `client-bar-colours` and `client-line-colors` all pass, 247 tests in total. The color tests cover these word lists. `tsc` is clean.

**Please re-test on the iPhone 13 (iOS 16.3):** Home, Trending and Your Polls should show cards. Then check that voting on a grid card works there too, which is the same check as on the 12.

Once both phones are confirmed, I'll remove `tapDebug.js` and its `<script>` line. Nothing is committed.

<!-- file-remote: end of entry -->

---

## 2026-11-18 12:00:27 -05:00 — user input (remote: fileRemote/IN-20261112-211318-PM.md)

On iPhone 12:  

Choice a  
![alt text](image-40.png)

Flip  
![alt text](image-41.png)

Maximize  
![alt text](image-42.png)

-------------------

On iPhone 13:  

Seems to be a different problem now.  
In BrowserStack for iPhone 13,  
the Trending and Home tab are empty.  

Yet, in local desktop browser
Trending and Home tabs show content correctly.  


### Reply

**The iPhone 12 is fixed.** In all three screenshots the tap reaches the right element on the grid card's voting side:
- **Choice (image-40):** reaches `span.vote-radio` in `li.vote-row`. The choice is selected and **Submit vote** turned on.
- **Flip (image-41):** reaches `button.icon-btn.back-btn`, and the card turned back to its results side.
- **Maximize (image-42):** reaches `button.maximize-btn`, and the maximized view opened.

So the fix was lifting each face 1px off the flip plane (`translateZ(1px)`), together with the rule that makes the hidden face ignore taps.

**The empty Home and Trending tabs on the iPhone 13** are a separate question, and I can't tell the cause without seeing it. I have one concern: the 1px lift is a 3D change, and older WebKit can fail to draw 3D faces in some layouts. If the iPhone 13 runs an **older iOS than the iPhone 12's 17.0** (BrowserStack often has it on iOS 15), my fix could be what blanks the cards there. The iPhone 12 shows Home with its cards, so the server and data are fine, at least for that session.

To tell the cases apart, please send:
1. **A screenshot of the empty Home tab** on the iPhone 13. "Empty" could mean no cards at all, blank white card frames, or a message such as "No polls".
2. **The iPhone 13's iOS version** (the info panel, as you showed for the 12).
3. Whether **Your Polls** or **Your Votes** show cards on the 13.
4. With `?tapdebug`, **tap where a card should be**. The box shows whether a card is there but not drawn (`div.card-flip`…) or not there at all (`main`/`section.tab-panel`).

If the cards are present but not drawn, I'll make the lift apply only where it's needed, or find another way to separate the faces, so both phones work.

`tapDebug.js` and its line in `index.html` are still in place; don't commit them. Nothing is committed.

<!-- file-remote: end of entry -->

---

## 2026-11-18 11:30:34 -05:00 — user input (remote: fileRemote/IN-20261112-211318-PM.md)

On iPhone 12:  

Choice a  
![alt text](image-34.png)  

Flip  
![alt text](image-35.png)  

Maximize  
![alt text](image-36.png)

-------------------

On iPhone 13:  

Choice a  
![alt text](image-37.png)  

Flip  
![alt text](image-38.png)  

Maximize  
![alt text](image-39.png)  





### Reply

The screenshots settle part of it. I've made a second fix, but I can't test it here: only your iPhones can show whether it works.

**What the screenshots show:**
- **The new CSS did arrive.** Every box shows `card-front pointer-events=none`, so caching isn't the problem.
- **Maximized view, iPhone 12 (image-36):** the choice tap reaches `li.vote-row`, as it should. **The original problem from image-30 looks fixed** by the first change.
- **Grid card on its voting side, on BOTH iPhones (images 34, 35, 37, 38):** taps on a choice and on the flip button reach **`div.card-flip`**, the card's frame, and not the voting face. The browser acts as if the voting face weren't there. **So the grid card is broken on the iPhone 13 too.** Please check whether a grid card's choices actually respond on the 13. If they don't, the earlier "13 is fine" applied to the maximized view only, or my first fix exposed the problem.
- **Maximize (image-39)** reaches `button.maximize-btn` on the voting face, as it should. I can't explain from these boxes why it works when the choices don't.

**Why this happens:** the two faces of a card lie in exactly the same 3D plane, one turned 180°. When the browser decides what a tap hits, coplanar 3D faces are a known WebKit weak spot. With the results face now ignoring taps, WebKit is skipping the voting face too and handing the tap to the frame behind it.

**The fix, `src/public/pollCard.css`:** the standard remedy for flip cards in Safari/WebKit is to lift each face 1px off the shared plane. The face you see is then always nearer the viewer than the one turned away:

```css
.card-front{ z-index:2; transform:translateZ(1px); }
.card-back { z-index:1; transform:rotateY(180deg) translateZ(1px); }
```

The difference is 1px of depth, so nothing visible changes, and the flip animation is the same. The `pointer-events` rule from the last fix stays.

**Tests:** new test in `tests/phone-sheets.test.ts`, "lifts each face off the flip plane, so the face shown is nearer the viewer". `phone-sheets`, `client-phone-card`, `client-wide-card` and `client-maximized` pass (193 tests). As before, jsdom can't show the iOS behaviour itself.

**Please re-test** with `?tapdebug`, on **both iPhones**, on the **grid** card (Jensen Huang: Vote, a choice, flip). Success looks like `event.target: li.vote-row…` for the choice and `…back-btn` for flip. Then check the **maximized** view again.

`tapDebug.js` and its line in `index.html` are still there. Don't commit them; I'll remove them once this is confirmed. Nothing is committed.

<!-- file-remote: end of entry -->

---

## 2026-11-18 11:07:58 -05:00 — user input (remote: fileRemote/IN-20261112-211318-PM.md)

The previous fix didn't resolve it.
Another clue.
When the poll has only 3 choices so that the Vote face doesn't go to the Maximized view,  
the "flip" icon doesn't work either.  
But the "Maximize" icon does work.  
Strange.  
The "Jensen Huang" poll deomontrates the problem clearly.

![alt text](image-32.png)



### Reply

That's a useful clue, and it doesn't fit my theory cleanly. **On the voting side of a grid card, Maximize (top right) works, but the choices and the flip button (lower down) don't.** If the hidden results face were catching taps, the rule I added should have stopped it, unless the iPhone never got the new stylesheet. Rather than guess a third time, I've added a temporary tool to find out what the tap actually hits.

**What it might be, given the new clue:**
1. **The new CSS never reached the iPhone.** The Cloudflare tunnel or Chrome may have served the old `pollCard.css`.
2. **iOS 17.0 maps taps on the rotated face wrongly.** The voting face is drawn rotated 180°, and a tap could land at a different point than the one touched. The top-right corner might happen to hit the results face's own Maximize, which would explain why only Maximize "works".
3. **Something transparent covers the lower part of the card** on that device.

**The diagnostic:** a new file, `src/public/tapDebug.js`, loaded by `index.html`. It does nothing unless the address contains `tapdebug`. When it's on, every tap shows a black box at the top of the screen with:
- where the tap landed;
- `event.target`: the element the browser sent the tap to;
- `elementFromPoint`: the element actually drawn at that point;
- `click target`, or no line at all if the browser never sent a click;
- whether the card is on its voting side, and whether each face reports `pointer-events=none`. If the results face doesn't say `none`, the new CSS didn't arrive (cause 1).

**Please try this on the iPhone 12:**
1. Open your tunnel address with `?tapdebug` added, e.g. `https://…trycloudflare.com/?tapdebug`.
2. On the Jensen Huang card, tap **Vote**, then tap **a choice**. Screenshot the box.
3. Tap the **flip** button. Screenshot.
4. Tap **Maximize**. Screenshot.
5. If you can, do steps 2–3 on an **iPhone 13** too, for comparison.

Put the screenshots in IN and I'll read off what's catching the taps.

**Important:** `tapDebug.js` and its `<script>` line in `index.html` are temporary. **Don't commit them.** I'll remove both once we know the cause. If you run the full test suite before then, the stylesheet/script list test in `m3-assets` may complain about the extra script.

<!-- file-remote: end of entry -->

---

## 2026-11-18 10:51:49 -05:00 — user input (typed)

go

### Reply

Done. The face of a card that's turned away now ignores taps outright.

**The change, `src/public/pollCard.css`:** right after the flip rule, with a comment explaining why (iOS 17.0):

```css
.card-flip.is-flipped .card-front,
.card-flip:not(.is-flipped) .card-back{ pointer-events:none; }
```

This applies to every card, in the grid and maximized, at every width. On the voting side the results face can no longer catch a tap meant for a choice, and the reverse holds on the results side. On browsers that already hit-test correctly, nothing changes.

**Tests:**
- New test in `tests/phone-sheets.test.ts`: "lets only the face shown take taps", which checks the rule is there.
- I ran 10 card, voting and stylesheet test files: everything passed except `phone-sheets` itself. My new test had a quoting slip, which I fixed, and the file then passed (75 tests). `tsc` is clean.
- jsdom doesn't do hit-testing, so these tests can't simulate the iOS bug itself. **The real check is your BrowserStack iPhone 12.**

**To re-test:** the change needs to reach the page BrowserStack loads. Restart your local server (and reload the tunnel page) so the new `pollCard.css` is served. If choices still don't respond, the three checks from my last reply (grid card or maximized only? single-choice poll? Safari?) will narrow it down.

Nothing is committed.

<!-- file-remote: end of entry -->

---

## 2026-11-18 10:46:08 -05:00 — user input (remote: fileRemote/IN-20261112-211318-PM.md)

Can't change the iOS version,  
but can determine that it is  IOS 17

![alt text](image-31.png)

### Reply

Thanks, that rules out my guess: it's **iOS 17.0** in **Chrome**, not iOS 14. My diagnosis needs revising.

**What this tells us:**
- **It isn't BrowserStack faking it.** BrowserStack's iPhones are real devices, and Chrome on iOS is Apple's WebKit underneath, like Safari.
- **It isn't the iPhone 12 hardware.** A WebKit page doesn't behave differently on an A14 chip than on an A15. Its viewport (390 × 664) is the same width as an iPhone 13's.
- **The likeliest difference left is still the software version.** iOS **17.0** is a first release with known WebKit bugs that later 17.x releases fixed. **Which iOS version does your iPhone 13 session run?** If it's 17.1 or later, or 18, that's the difference.

**What I'd still suspect in our code:** the symptom is unchanged and very specific. Taps on the choices inside the card fail, while everything outside it works. That still points at **tap targeting on the two-sided card**, where the turned-away results face sits over the voting face. Whether WebKit sends a tap to a face that's turned away has varied between releases, so iOS 17.0 doing it and later releases not is plausible. I can't confirm that from here, though.

Two other things specific to this setup, for completeness:
- At 390 px the page uses our fixed **480 px layout** (the viewport is zoomed to fit), but the iPhone 13 at 390 px gets the same thing.
- The ripple script's `pointerdown` listener can't block a click even if it failed.

**What I'd do next:** add the two-line rule anyway. It makes the hidden face ignore taps outright, it's harmless on every browser, and it removes the most likely cause:

```css
.card-flip.is-flipped .card-front,
.card-flip:not(.is-flipped) .card-back{ pointer-events:none; }
```

Then re-test the iPhone 12. If it still fails, these would narrow it down:
1. Do choices respond on a **card in the grid** (Vote without maximizing), or only in the maximized view?
2. Does a **single-choice** poll behave the same as this multiple-choice one?
3. If BrowserStack allows it, try **Safari** on the same iPhone 12 session.

Say "go" and I'll add the rule with a test.

<!-- file-remote: end of entry -->

---

## 2026-11-18 10:35:40 -05:00 — user input (remote: fileRemote/IN-20261112-211318-PM.md)

We are testing iPhone models in BropwserStack.

iPhone 13 and up are fine.  

However, iPhone 12 we wan't click on a choices to vote.  
Clicking on other button work fine.  
Is this likely a problem with BrowserStack?  
Or is it actually a problem with iPhone 12 specifically?

![alt text](image-30.png)

### Reply

**Most likely it's neither BrowserStack nor the iPhone 12 itself, but the iOS version BrowserStack runs on its iPhone 12.** I'd check that before blaming either. I can't see your BrowserStack session, so this is a well-founded diagnosis, not a confirmed one.

**Why the version matters:** every iPhone browser, Chrome included, uses Apple's WebKit engine, so what counts is the iOS version, not the phone. BrowserStack usually offers each iPhone on the iOS it shipped with: the **iPhone 12 on iOS 14**, the iPhone 13 on iOS 15. "13 and up are fine" points at a difference between **iOS 14 and iOS 15**. The device picker or the session details should show which version you got.

**What in our code iOS 14 likely gets wrong:**
- A poll card is two faces in the same spot, the voting face turned 180° behind the results face (`.card-flip` with `transform-style:preserve-3d`, each face `backface-visibility:hidden`, in `pollCard.css`).
- The results face sits **on top** (`z-index:2`). We rely on the browser to ignore the face that's turned away when deciding what a tap hits.
- Older WebKit didn't always do that: the hidden face could still **catch taps**. In the maximized phone view, the turned-away results face is laid over the top of the voting face (`phone-card-m3.css`, `.maximized-card-flip.is-flipped .card-front{ position:absolute; … }`).
- So a tap on a choice would land on the invisible results bar behind it, which does nothing in the maximized view.
- That matches what you see exactly: the choices don't respond, while everything **outside** the card works. The fixed Submit bar (flip button, Submit votes), the header and the tabs aren't covered by a hidden face.

I checked the other usual suspect, JavaScript too new for iOS 14 (such as `.at()` or `structuredClone`), in the card and tab scripts. The choice click handler uses nothing newer than iOS 14 supports, and a script error would break other buttons too.

**How to confirm:**
1. Check the iOS version of the iPhone 12 session. If BrowserStack offers the **iPhone 12 on iOS 15 or later**, try that: if it works, the phone isn't the problem.
2. Try another device on **iOS 14** (an iPhone 11, or an SE 2nd generation, on iOS 14). If it fails the same way, it's iOS 14.
3. Try a **card in the grid** (not maximized) on the iPhone 12. If choices fail there too, at least partly, that's the same cause.

**Does it matter for real users?** Not much. iOS 14 is from 2020, and an iPhone 12 can run iOS 17 and 18, so very few real visitors are still on it. Still, it's cheap to fix.

**The fix I'd suggest (not made yet):** make the turned-away face ignore taps outright, rather than relying on the browser:

```css
.card-flip.is-flipped .card-front,
.card-flip:not(.is-flipped) .card-back{ pointer-events:none; }
```

The hidden face should never take a tap anyway, so this changes nothing on current browsers. It's a two-line rule in `pollCard.css` plus a stylesheet test. Say if you want it, and you can then re-test the iPhone 12 in BrowserStack.

<!-- file-remote: end of entry -->

---

## 2026-11-18 09:49:05 -05:00 — user input (remote: fileRemote/IN-20261112-211318-PM.md)

In the "Summary Test"  ,
render a line under the "Public"/"Private" paragraph  
the same as there is a line above it.

### Reply

Done. The Settings Summary now has a rule **under** the Public/Private paragraph, drawn exactly like the one above it: a 1px `outline-variant` line, with 8px of space on each side.

**The change, `src/public/admin-card-m3.css`:** a new rule, right after the existing one above the paragraph, puts the same `margin-top` / `padding-top` / `border-top` on the line that follows the Public/Private paragraph.
- On an **invite-only** poll with a Custom Email Message, that sentence is still its own line after the paragraph. The rule goes **below** the email-message line, so the paragraph and its message stay together.
- On a **link** poll, the link-preview sentence and **Copy poll link** are inside the paragraph now, so the rule comes after them.
- It applies to the read-only card and to the wizard when creating a new poll. The editor of an existing poll no longer shows a summary.

**Test:** new test in `tests/m3-assets.test.ts`, "rules the Settings Summary under the Public/Private paragraph as it is ruled above it". `m3-assets` and `phone-sheets` pass (134 tests), and `tsc` is clean.

I haven't looked at it in a browser. Nothing is committed.

<!-- file-remote: end of entry -->

---

## 2026-11-18 09:47:35 -05:00 — user input (remote: fileRemote/IN-20261112-211318-PM.md)

![alt text](image-29.png)  


### Reply

Done. On a link poll, the summary now ends its "Private Poll" paragraph with the link-preview sentence, and **Copy poll link** sits below it:

> Your poll is a Private Poll. Users can see who voted for what. Anyone you send the link to can vote. A Link Preview Message has been entered.
>                                                                                  [Copy poll link]

**The change, `buildSummary` in `src/public/adminCard.js`:**
- The sentence is now a `span.wizard-summary-link-preview-message` at the end of the Who paragraph, just before the Copy poll link button. Before, it was a paragraph of its own.
- "A Link Preview Message" is still a link that opens Step 1 at the field.
- When a link poll has no message, the paragraph is as before.
- I removed `link-preview-message` from the list `refreshSummaryLine` uses to keep the summary's lines in order, since it's no longer a line of its own.

I left the **Custom Email Message** sentence (on invite-only polls) as its own paragraph. Say if you'd like it moved the same way.

**Tests (`tests/client-admin-wizard.test.ts`):** two tests had expected the sentence on its own line after the Who paragraph. They now check that it's inside the Who paragraph, with its full text. On the read-only card they also check that **Copy poll link** comes right after it. Both tests are renamed to match. The admin wizard, search and invitees test files pass (187 tests), and `tsc` is clean.

Nothing is committed.

<!-- file-remote: end of entry -->

---

## 2026-11-18 09:41:37 -05:00 — user input (remote: fileRemote/IN-20261112-211318-PM.md)

Any time the "Vote" button is clicked,  
ensure that the backside of the Poll Card (voting face) is scrolled to the top of the card.

### Reply

Done. Whenever **Vote** turns a card to its voting side, the page now scrolls so the card's top sits just under the fixed header. Then the ballot starts at its first choice. This happens in the grid and in the maximized view alike.

**The change, `src/public/pollCard.js`:** `showVoteFace()`, which every path to the voting side goes through, now ends with the same `scrollToCardTop()` as Show fewer choices and the flip button. The paths are:
- **Vote** on a card;
- **Vote** on a poll that opens maximized on its voting side, since `tabs.js` opens the view and then calls `showVoteFace()`;
- the Submit bar's flow on the phone.

It only scrolls when the card's top is out of sight above the header. When the top is already visible, as with most grid cards, nothing moves.

There's no scrolling *inside* the card to reset: since the 641px+ merge, a card's ballot scrolls with the page.

**Tests (`tests/client-phone-card.test.ts`):**
- The flip-button test is extended and renamed "opens the ballot at the card's top on Vote, and goes back to the maximized card's top when the flip button turns it back". Vote scrolls in the grid and when maximized; the flip button scrolls only when maximized.
- New test: "does not scroll on Vote when the card's top is already in view".
- I ran seven card and voting test files (`client-phone-card`, `client-phone-view`, `client-maximized`, `client-wide-card`, `client-home`, `client-remove-vote`, `client-add-choice`): 220 tests, all passed. `tsc` is clean.

Nothing is committed.

<!-- file-remote: end of entry -->

---

## 2026-11-18 09:20:29 -05:00 — user input (remote: fileRemote/IN-20261112-211318-PM.md)

From this Maximized view on the Voting face:  
![alt text](image-27.png)  

Click the new "Flip" icon renders this:  
![alt text](image-28.png)  

Please make it scroll back to the top of the Maximized Poll Card when the "Flip" icon is clicked.


### Reply

Done. In the maximized view, clicking the new **flip** icon now turns the card back to its results **and** scrolls up to the top of the card, just under the fixed header.

**Why it happened:** the same thing as with Show fewer choices. The long voting side made the page tall; flipping back to the shorter results made it short, and the browser kept the old scroll position, on the Read More tab.

**The change, `src/public/pollCard.js`:** the flip button's click handler now calls the same `scrollToCardTop()` that Show fewer choices uses, **only while the card is maximized**.
- It scrolls only when the card's top is out of sight above the header, and leaves it 16px below the header.
- A card in the grid flips back as before, without scrolling.
- The phone's Submit bar flip button works by clicking the card's own one, so it gets the same behavior.

**Test:** new test in `tests/client-phone-card.test.ts`: "goes back to the maximized card's top when the flip button turns the ballot back, and leaves a card in the grid alone". A grid card doesn't scroll; a maximized card, with its top 900px above the window, scrolls once to 16px below the header, and the card is no longer flipped. The four card test files pass (132 tests), and `tsc` is clean.

**A related case I left alone:** **submitting** a vote also flips the card back to its results. As far as I can see, that path doesn't scroll either. If you see the same problem after voting on a long maximized poll, I can apply the same fix there.

Nothing is committed.

<!-- file-remote: end of entry -->

---

## 2026-11-18 09:14:07 -05:00 — user input (remote: fileRemote/IN-20261112-211318-PM.md)

In views that render a "back" icon to flip- back to the front of a poll card from the Voting face:  
![alt text](image-24.png)

Change the icon to "up and back" like this, to make it clear that it flips back to the front of the poll card:  
![alt text](image-26.png)  
and make the fill dark green with white arrow color (same as the "Submit votes" button when enabled) 
This is done to distinguish it from the "Back arrow" that navigates back to the home page.  
If the icon needs to be larger than it is now to maintain legibility, increase its size accordingly.  

Also, a related change,  
move the "N selected" indicator closer to the left of the "Submit votes" button.  

And, also render a "Submit votes" button in the row where the "Add Choice" button is located,  
in addition to the footer where it is now at some widths.

### Reply

All three changes are done. The related tests pass, but I haven't looked at it in a browser, so please check the new icon on a real screen.

**1. The flip-back icon** (the card's voting side, and the phone's Submit bar):
- **Glyph:** a page with lines, with an arrow coming down from its right edge and curving **up and back** to its left, after your sketch. It's drawn as an SVG with lines only, no fill. The same drawing is used in `src/public/pollCard.js` (the card's `.back-btn`) and `src/public/index.html` (the Submit bar's `.vote-bar-back`).
- **Colors:** a **dark green fill with white glyph**, the primary colors of an enabled **Submit vote** (`--md-sys-color-primary` / `on-primary`).
- **Size:**
  - On the card above 640 px, it's now **40px with a 26px glyph**, up from 32px and 20px, so the page and its arrow stay legible.
  - On a phone, the card's button and the Submit bar's button stay 48px with a 28px glyph.
- The page's own Back arrow (top left, light green, ←) is unchanged, so the two now look clearly different.

**2. "N selected" next to Submit:** in the phone's Submit bar, the count is now right-aligned (`text-align:right`), so it sits just left of **Submit votes** instead of next to the back button.

**3. Submit votes beside Add Choice:**
- On the phone, while the Submit bar shows, the card used to hide both its own back button and its own **Submit vote**. Now it hides only the back button.
- So the row with **Add Choice** also has **Submit vote** (or **Remove vote**), in addition to the one in the bar at the bottom.
- Both buttons do the same thing, because the bar only clicks the card's own button.
- At wider widths there's no bar, and the card's row already had Add Choice and Submit.

**Tests:**
- Three new tests in `tests/phone-sheets.test.ts` check the new glyph in both places (and that the old ← paths are gone from the card), the fill and size, the count's alignment, and that the card's Submit no longer hides.
- On the first run, `phone-card-m3.css` failed its "tokens only, no comments" test because I'd added a comment. I removed it.
- Ten card, phone, stylesheet and add-choice test files pass. `tsc` is clean.

Nothing is committed: this change and the Show-fewer scroll fix are both uncommitted, and `6449ee8` (the notes file) is committed but not pushed.

<!-- file-remote: end of entry -->

---

## 2026-11-18 08:51:25 -05:00 — user input (remote: fileRemote/IN-20261112-211318-PM.md)

From this Maximized view:  
![alt text](image-21.png)

Click "Show fewer choices",  
renders this with no bars showing:  
![alt text](image-22.png) 

Update the code so that the view scrolls back to the top,  
as shown here:  
![alt text](image-23.png)

### Reply

Fixed. After **Show fewer choices**, the page scrolls back so the card's top sits just under the fixed header, as in your third screenshot. **Show all** still leaves the view where it is.

**Why it happened:** you had scrolled down the long list, and collapsing it from 18 choices to 10 made the page much shorter. The browser kept the same scroll position, which by then was below the card, on the Read More tab.

**The change, `src/public/pollCard.js`:**
- The Show-all row's click handler now keeps focus on the row **without scrolling to it**, both ways (`preventScroll: true`).
- When collapsing, it calls a new `scrollToCardTop()`. That function scrolls up only when the card's top is above the fixed header, and leaves the card top 16px below it (`CARD_TOP_GAP`).
- It uses the same `FixedChrome` height that `tabs.js` uses when it opens the maximized view.
- It runs at every width. In the wide two-column view it does the same thing whenever the card's top has scrolled out of sight.

**Test:** the earlier test in `tests/client-phone-card.test.ts` is extended and renamed "…and goes back to the card's top on Show fewer choices":
- Expanding: no scroll, and focus stays on the row.
- Collapsing, with the card's top 900px above the window: one `scrollTo`, to 16px below the top, and still no focus scroll.

The four card test files pass (131 tests), and `tsc` is clean. Nothing is committed. `6449ee8`, the notes file, is also still unpushed.

<!-- file-remote: end of entry -->

---

## 2026-11-18 08:45:11 -05:00 — user input (typed)

yes, please commit the choicesOrderLogic.md

### Reply

I committed `specs/20261117-131915-WIDE-MORE-CHOICES/choicesOrderLogic.md` as `6449ee8`, "WIDE-MORE-CHOICES: notes on how choices are ordered in each view". The working tree is clean.

It isn't pushed, since you said commit only. Say "push" when you want it on `origin/main`.

<!-- file-remote: end of entry -->

---

## 2026-11-18 08:36:12 -05:00 — user input (typed)

commit and push, do not run the full test suite yet

### Reply

I committed the changes as `93126b4` and pushed it: `origin/main` moved from `878786e` to `93126b4`. As you asked, I didn't run the full suite.

**"Choice order, admin editor and Show all tweaks"** (12 files, staged by name):
- `mergeChoices`: the textbox order is now saved as the choices' new order.
- Editing an existing poll shows no summary: the banner sits over the step circles.
- **Copy poll link**: outlined, on its own line at the right.
- Maximized from **More choices**: the last row reads **Show all N choices · p%**.

**Not committed:** `specs/20261117-131915-WIDE-MORE-CHOICES/choicesOrderLogic.md` is untracked. It looks like you saved my choice-order answer there; I didn't add it because you didn't create it through me. Say if you want it committed.

**Tests:** only the affected files were run for these changes, and all passed (wizard 127, card files 131, stylesheet 130, ever-voted edits 509). When you're ready, the full suite will confirm the lot, together with the 641px+ merge (which passed on its own).

Production still needs `npm run deploy`.

<!-- file-remote: end of entry -->

---

## 2026-11-18 08:32:13 -05:00 — user input (remote: fileRemote/IN-20261112-211318-PM.md)

A followup from the previous prompt...

From this:
![alt text](image-19.png)

Click "More choice - 19%"
renders this:

![alt text](image-20.png)  

which has the bar "Remaining choices - 0%"



### Reply

Thanks, the screenshots made it clear: it's the **Remaining choices · 0%** row you meant. It now reads **Show all N choices · p%**, so on your NFL poll it reads **Show all N choices · 0%**, where N is the poll's full number of choices.

**The change, `resultsView` in `src/public/pollCard.js`:** when the maximized view is opened from **More choices**, its last row now uses the same wording as the ordinary **Show all** row:
- **N** is the total number of choices.
- **p%** is the combined share of the choices left out. Those are always below 1%, so in practice it reads 0%.
- As with the other Show all row, the **% appears on single-choice polls only**. A multiple-choice poll reads "Show all N choices".
- Clicking it works as before: it lists every choice, then the row reads **Show fewer choices**.

**Tests:** I updated the two assertions, in `tests/client-phone-card.test.ts` and `tests/client-wide-card.test.ts`, to "Show all 37 choices · 0%". Their polls are single-choice. The four card test files (`client-wide-card`, `client-phone-card`, `client-maximized`, `client-phone-view`) pass, and `tsc` is clean.

**Docs:** `README.md` (the maximized-poll paragraph) and two places in `ARCHITECTURE.md` now use the new label. I left the WIDE-MORE-CHOICES spec files as the record of what was specified at the time.

Nothing is committed.

<!-- file-remote: end of entry -->

---

## 2026-11-18 08:26:34 -05:00 — user input (remote: fileRemote/IN-20261112-211318-PM.md)

Change the label on the Maximized view from:
from: 
"More choices - p%"
to
"Shown all N choices - p%"


### Reply

The current code already does this: the maximized view no longer shows a **More choices · p%** row, at any width. I haven't changed anything. What you saw is most likely the version from before the **641px+ merge**.

**What the code does now** (`resultsView` in `src/public/pollCard.js`, as of the 641px+ merge `878786e`):
- **Card, not maximized:** "More choices · p%" (`more-row`). Clicking it opens the maximized view.
- **Maximized view:** never "More choices". Its last row is one of these:
  - **Show all N choices · p%** (`show-all-row`), when some choices are hidden;
  - **Show fewer choices**, after expanding;
  - **Remaining choices · 0%**, when opened from the card's More choices row and some choices have no votes.

**Tests:** the branch's `tests/client-wide-card.test.ts` checks this at wide widths ("Show all 37 choices · 30%", "Show all 12 choices · 0%" and others). `client-maximized.test.ts` checks it as well ("Show all 50 choices · 0%"). Both passed in the full run after the merge.

**Why you might still see "More choices" on the maximized view:** before the merge, a maximized poll above 640 px used the card's "fit what you can" rule, which ends in "More choices". If your local server started before the merge, or the browser has the old `pollCard.js` cached, you'll still see that.
- **Restart the dev server** and **hard-refresh** (Ctrl+F5).
- Production has neither the merge nor this label yet. It needs `npm run deploy` once `main` is pushed.

**On the wording:** I've read "Shown all" as a typo for **Show all**, the existing label. If you really want "Shown all N choices", that's a one-word change in `pollCard.js` and its tests; just say so.

If you still see "More choices" on a maximized poll after restarting, send a screenshot with the window width, and I'll track it down.

<!-- file-remote: end of entry -->

---

## 2026-11-18 08:02:05 -05:00 — user input (remote: fileRemote/IN-20261112-211318-PM.md)

Render the "Copy poll link" button right justified,  
on the line under the "Anyone you send the link to can vote" text.

### Reply

Done. **Copy poll link** now sits on its own line, under "…Anyone you send the link to can vote.", **at the right edge** of the summary, at every width.

**Wide (`src/public/admin-card-m3.css`):** the button rule no longer sits inline (`margin-left:6px; vertical-align:middle`). Instead it is `display:block; width:fit-content; margin:4px 0 0 auto;`, which puts it on a new line and pushes it right, with a 4px gap below the sentence. Its size, font and outline are unchanged.

**Phone (`src/public/phone-admin-m3.css`):** the larger 48px button was already on its own line, at the left. Its margin is now `12px 0 8px auto`, which moves it to the right.

**Test:** `tests/m3-assets.test.ts` now checks for `display:block`, `width:fit-content` and the right-pushing margin, in place of the old `vertical-align:middle`. `m3-assets` and `phone-sheets` pass (130 tests).

The page's HTML is unchanged: the button is still the last thing in the Who line. Nothing is committed.

<!-- file-remote: end of entry -->

---

## 2026-11-18 07:57:38 -05:00 — user input (remote: fileRemote/IN-20261112-211318-PM.md)

![alt text](image-18.png)

### Reply

Done. **Copy poll link** now has the same 1px outline as **Open**, **Close** and **Archive**.

**`src/public/admin-card-m3.css`:**
- The `.wizard-summary-copy-link` rule gains `border:1px solid var(--md-sys-color-outline);`, the declaration the state buttons use, and its comment says so.
- That rule comes after the general tonal-button rule (which sets `border:0`) and is just as specific, so the border wins.
- The phone layout's larger version of the button (`phone-admin-m3.css`) doesn't set a border, so it picks up the outline too, at every width.

The button keeps its light-green fill and its size; only the outline is added. If you'd also like the fill removed, so it matches Close entirely (transparent, green text), say so.

**Test:** `tests/m3-assets.test.ts` now checks that the rule has that border. `m3-assets` and `phone-sheets` pass (130 tests).

Nothing is committed.

<!-- file-remote: end of entry -->

---

## 2026-11-18 07:53:21 -05:00 — user input (typed)

a

### Reply

Option A is done. When you edit an existing poll, the summary (title, notes and the settings sentences) no longer appears, at any width. The editing banner now sits right above the step circles, which stay as they were. All admin tests pass.

(About "is it stuck?": it wasn't. The admin wizard test file has 127 tests, and that one run took about 10 minutes.)

**The change, `src/public/adminCard.js`, `renderWizard`:**
- The wizard leaves out `buildSummary()` when `existing` is true, meaning an existing poll rather than a new draft.
- Creating a **new** poll still shows its summary.
- The **read-only card**, before you open the editor, still has the full summary, with its underlined parts that open the editor at a step.

**Tests (`tests/client-admin-wizard.test.ts`):** four tests had asserted on the editor's summary, so I updated them.
- Two are replaced by one test, run at both wide and phone widths: "shows no summary in an existing poll's wizard: the banner sits over the step circles". It checks there's no summary, that the banner and all 6 circles are there, and (when wide) that the circles come straight after the banner.
- "The line graph is shown" is now checked on the read-only card's summary.
- The "Copy poll link" test now checks that the editor shows no summary, and so no button.
- I removed one helper the changes left unused.

**Results:** the 7 admin and home test files gave 397 tests with 4 failing, all 4 of which were these assertions. After updating them, `client-admin-wizard.test.ts` passes (127 tests). `tsc` is clean.

**Docs:** `README.md`'s "Editing a poll" now says the editor opens under the banner and its circles, without repeating the summary.

I didn't run the full suite, and nothing is committed. `main` now holds three things not yet pushed: the 641px+ merge, the textbox-order change and this one.

<!-- file-remote: end of entry -->

---

## 2026-11-18 07:38:07 -05:00 — user input (remote: fileRemote/IN-20261112-211318-PM.md)

![alt text](image-17.png)

### Reply

Before I change anything, there's one question. Your circle takes in **two** things, and removing the second would leave the editor stuck.

**What's inside the circle** (shown while you edit an existing poll, from `renderWizard` in `adminCard.js`):
1. **The summary** (`buildSummary`): the title, the notes and the underlined settings sentences. Removing it is simple and safe.
2. **The step circles** (`buildCircles`): Who · Title · Choices · View · How · When. These are **the only way back to an earlier step.**
   - Each step has a **Next >>** button, but there's no Back button.
   - The underlined summary parts link to steps too, so they'd go along with the summary.
   - Without both, someone who reaches **When** (which has no Next) couldn't return to Choices to fix a typo, except by Cancel, which discards the edits.

**Which do you want?**

| Option | While editing an existing poll |
|---|---|
| **A** *(recommended)* | Remove the **summary only**; keep the step circles. The banner sits right above the circles, and every step stays one click away. Smallest change |
| **B** | Remove **both**, and add a **<< Back** button beside **Next >>** (and on When), so you can still move back one step at a time |
| **C** | Remove **both**, exactly as circled. You can only move forward, and getting back to an earlier step means Cancel |

All three apply at every viewport width, and only when **editing** an existing poll. Creating a new poll keeps its summary and circles. The removed parts are referenced by about 70 assertions across 7 test files, so I'll update whichever tests the chosen option affects.

Reply A, B or C.

<!-- file-remote: end of entry -->

---

## 2026-11-18 07:30:14 -05:00 — user input (remote: fileRemote/IN-20261112-211318-PM.md)


### Reply

I've made Option A, and the affected tests pass. On an ever-voted poll, the order of the lines in the Choices textbox is now saved as the new order.

**The change, in `src/polls/service.ts`, `mergeChoices`:**
- Each choice's `position` is now its line in the textbox, for kept and new choices alike. Before, kept choices held their old position and new ones went to the end.
- Ids are matched exactly as before, so votes, history, the line-graph tally and live counters (all keyed by id) are untouched.
- The doc comment now says this, and so does the paragraph about it in `ARCHITECTURE.md` (around line 1291).

**What it affects, as discussed:**
- the admin views (wizard, Cancel, voter-added choices);
- which choice comes first when shares are **tied**, on the card, ballot, Who Voted and line graph.

Results are still ranked by share. On a published poll, a reorder goes through `pending_update` and the approval sweep like any other choice edit, so voters see it once it's approved.

**Tests:**
- In `tests/polls-pending-update.test.ts`:
  - New test "takes the textbox order as the new positions, survivors keeping their ids": `Milk, Coffee, Tea` → positions 0, 1, 2, with Coffee and Tea keeping ids `b` and `a`.
  - The rename test now expects the new choice at its line (position 1, not 2), and the addition test is renamed to match.
- I ran those two files plus the 14 others that touch ever-voted edits: 16 files, 509 tests, all passed. `tsc` is clean.
- I didn't run the full suite, and nothing is committed. `main` also still holds the unpushed 641px+ merge.

<!-- file-remote: end of entry -->

---

## 2026-11-18 07:18:32 -05:00 — user input (remote: fileRemote/IN-20261112-211318-PM.md)

In light of this logic:  
```
  - On an ever-voted poll (`mergeChoices`, `service.ts:1124`),  
  a choice that is kept **keeps its old position**,  
  and a new choice goes after the last one.

  1. **Reordering an ever-voted poll's choices in the textbox doesn't stick.**  
  `mergeChoices` keeps each kept choice's old `position`,  
  and only new choices go to the end.  
  It only matters for ties and in the admin views,  
  because voters see share order anyway.
```

Is it possible to reorder an ever-voted poll's choices in the textbox and have that order stick for voters?  
### Reply

**Yes, it's possible, and making the reorder stick is a small, safe change. But it only changes what voters see where shares are tied**, because voter-facing lists are sorted by share. To have the creator's order show to voters in general, the display rule would have to change too. These are two separate decisions.

## 1. Making the textbox order stick: small and safe
- **The change:** in `mergeChoices` (`service.ts:1124`), set each choice's `position` from its line in the textbox, for kept choices as well as new ones. A new choice would then go where it was typed, not always at the end. Ids stay as they are.
- **Why it's safe:** nothing about votes depends on `position`.
  - Votes, `vote_history`, the line-graph tally (keyed on `choice_id`) and the live counters are all keyed by the choice **id**.
  - `position` is used only to sort: in `computeResults`, the store, the line graph, versions and the admin views.
  - There is no unique constraint on it, so reordering moves no votes.
- **What happens when a creator reorders a published, ever-voted poll:**
  - A reorder alone becomes a real choices change: the `byPosition` comparison in `pollsApi.ts:735` would see the difference.
  - It goes into `pending_update` and **waits for the approval sweep**, the same path as a choice rename or addition there. Until then the poll keeps showing the old order.
- **One existing behavior to keep in mind:** choices that **voters** add during an edit session are appended after the creator's lines (`service.ts:985`). They would still land at the end.

## 2. What voters would actually see
The card, ballot, maximized view, Who Voted and line graph all sort by **share, highest first**. `position` only breaks ties. So with item 1 alone, the creator's order shows to voters only:
- among **tied** choices, which are common because % is a whole number (every 0% choice, for example);
- before anyone votes, when every choice is tied at 0%;
- in the admin views (wizard, Cancel, voter-added choices), which use `position` everywhere.

**For the order to stick for voters in general,** pick one of these:

| Option | Effect | Cost |
|---|---|---|
| **A. Item 1 only** | The creator's order breaks ties and shows in the admin views; results stay ranked | About 1 line plus tests |
| **B. Item 1, and the voting face in creator order** | The **ballot** keeps a fixed, creator-chosen order (and stops re-sorting during refreshes), while the results stay ranked by share | Small: `renderVotingOptions` takes a position-ordered copy of `data` |
| **C. Item 1, and a per-poll "keep my order" setting** | Results and ballot both follow the creator's order on polls that ask for it | A new poll field, a migration, a wizard control and an `openapi.json` change. A feature, not a tweak |

**My recommendation is B:** fix `mergeChoices`, and give the ballot the creator's order.
- Results stay ranked, which is what the bar charts, **More choices**, **Show all** and the line graph's leading lines are all built around.
- The ballot is where a stable, deliberate order matters most. It also removes the other surprise from my last reply: rows moving under the voter when a refresh lands mid-vote.

I haven't changed anything. Say which option you'd like, and I'll make the change with tests.

<!-- file-remote: end of entry -->

---

## 2026-11-18 07:07:47 -05:00 — user input (remote: fileRemote/IN-20261112-211318-PM.md)

What is the logic in the current code base for determining the display order of choices in a poll card?  
This includes (but not limited to) the following contexts:  
- home page poll cards
- maximized view
- voting face of a poll
- line graph legend
- Poll Administration

Taking into account how user's vote affects the display order of choices.
### Reply

Everywhere voters see results, choices are listed by **current share, highest first**. Ties keep the creator's order. Admin pages instead show the creator's order. A voter's own vote **never moves a choice up or down**: it only decides whether a choice is **shown** when some are hidden, and its counts change the shares, which can change the order on the next refresh.

## The base order (server)
- Every choice has a stored `position`, which is the creator's order.
  - A never-voted poll takes it from the lines of the Choices textbox (`replaceChoices`).
  - On an ever-voted poll (`mergeChoices`, `service.ts:1124`), a choice that is kept **keeps its old position**, and a new choice goes after the last one.
- `computeResults` (`service.ts:314`) returns the choices **in position order**, each with a `pct` that is a **whole number** (`Math.round`). Single-choice polls divide by the number of voters; multiple-choice polls divide by the total number of selections.
- The card payload sends `poll.choices` in that same position order.

## Poll cards: Home and every other tab, both faces (`pollCard.js`)
- **`rebuildData` (line 927)** copies the choices and runs `data.sort((a, b) => b.pct - a.pct)`.
  - JavaScript's sort is stable, so choices with the **same rounded %** stay in position order. Because % is a whole number, ties are common: every 0% choice, for example, stays in creator order.
- This one sorted `data` drives **both faces**:
  - the results bars (`renderPollResults`);
  - the **voting face** (`renderVotingOptions`), whose rows are in the same share order, not the creator's.
- **Colors** follow that order too. A choice with a manual color or a yes/no meaning keeps its own color. Every other choice takes the next palette color in display order, starting at a point set by the poll's id (`assignResultColors`). So a change in rank can change the color of a choice without a set color.
- **When the order is recomputed:** on every `applyPoll` (each refresh the tab gives the card, including the response to your own vote) and when the voting face opens.
  - The voter's selection is carried through (`pendingSelection`), but **the rows are re-sorted** even while the voting face is open. A refresh in the middle of a vote can move the rows under the voter.

**Which choices are shown** (the order is always `data`'s):

| Where | Rule | What the voter's own choices do |
|---|---|---|
| Card above 640 px (`fitting`, line 894) | As many as fit; if not all fit, the space minus one row, then a **More choices** row | `fittingChoices` **reserves room for your own choices first**, then fills with the leaders. They're still drawn in share order, not pinned to the top |
| Card on a phone (640 px and below) | `essentialChoices` with `COMPACT_LIMITS`: the top 4, or all of them if there are 5 or fewer | Your choices are **added** to the leaders, in their share position |
| Maximized view | `MAXIMIZED_LIMITS`: of the top 10 (all, if 12 or fewer), those above 2% (above 0% if 12 or fewer), as long as at least one is; then **Show all N choices** or **Show fewer choices** | Added the same way, in share position |
| Maximized from **More choices** (`votedChoices`, line 888) | Every choice at 1% or more, then **Remaining choices · 0%** | Your choices are kept even when below 1% |
| Voting face | **Every** choice, in share order. When the card can't hold them all, **Vote** opens the maximized view on its voting side instead | Selected rows are only highlighted; they never move |

## Line graph legend (`lineGraph.js:476`)
- The server sends each scale's series in **position** order (`polls/lineGraph.ts:89`).
- The client sorts them by **current share**, which is the **last point on the graph's current scale**, not the live counters. The sort is stable, so ties keep position order.
- With more than 10 lines, only the leaders are drawn (`leadingCount`): those whose shares add up to 80% of the total, plus any tied with the last of them, and never more than 10. **Show all** draws the rest.
- The legend, lines, markers and Y axis all come from `drawnSeries()` in that order.
- **The voter's own vote plays no part**: a choice you voted for isn't added to the drawn set.

## Who Voted (`whoVoted.js:126`)
- `barOrder` sorts by `pct` descending, then by **position**. This tie-break is written out explicitly, but gives the same result as the card's stable sort.
- Grouped by voter: voters A–Z (then by the time they voted), and each voter's choices in that bar order.
- Grouped by choice: choices in bar order, with the voters A–Z under each.

## Poll Administration (`adminCard.js`)
- The wizard's Choices textbox, Cancel's restore (`sessionChoicesText`) and the list of choices added by voters all sort by **`position`**, ignoring votes.
- The admin search rows show no choice bars. The creator's own polls, under Your Polls, use the ordinary poll card, ordered as above.

## Two things you might not expect
1. **Reordering an ever-voted poll's choices in the textbox doesn't stick.** `mergeChoices` keeps each kept choice's old `position`, and only new choices go to the end. It only matters for ties and in the admin views, because voters see share order anyway.
2. **The voting face re-sorts on every refresh**, as described above. If you'd like the ballot to keep its order while it's open (or always to use the creator's order), that would be a small change.

<!-- file-remote: end of entry -->

---

## 2026-11-17 20:18:39 -05:00 — user input (typed)

merge the branch 641px+ into this branch main

### Reply

I merged `origin/641px+` into `main` as `878786e`, after resolving two conflicts. Nothing is pushed yet.

**What came in:** one commit, `a6fd420` "Wide More Choices: no scrolling inside a card above 640 px". It touches 30 files: the WIDE-MORE-CHOICES spec, plan and requirements, `pollCard.js`/`.css`/`-m3.css`, `tabs.js`, and a new `tests/client-wide-card.test.ts`.

**The two conflicts:**
- **`README.md`** (the "maximized poll on a phone" paragraph): I took the branch's version, which now refers to the rule under **Maximize**. That section already says **Show fewer choices**, so your rename survives.
- **`.specify/requirements.json`** (Spec Kit bookkeeping): I kept the hashes of both features. I left `requirements_directory` on the newer **sms-invitation-research** folder. If you'd rather it point at wide-more-choices, say so.

**Checks:**
- `pollCard.js` merged on its own and keeps the recent fixes: the "Private" mark, `preventScroll` on Show all, and "Show fewer choices".
- `tsc` is clean.
- This branch changes code, so I've started the **full test suite** in the background (about 22 minutes). I'll report when it finishes; I'd hold off pushing until then.

**Update: the full suite passed** on the merged `main` (`878786e`), in about 22 minutes:
- 213 test files passed and 2 were skipped.
- 3552 tests passed and 25 were skipped, with none failing. That includes the branch's new `client-wide-card.test.ts`.

The "Failed to get session" lines in the log come from tests that expect that error; nothing failed.

`main` is ready to push, but isn't pushed yet. Say "push" when you want it.

<!-- file-remote: end of entry -->

---

## 2026-11-17 19:46:46 -05:00 — user input (typed)

commit and push

### Reply

I committed the "Private" mark as `5d7519e` and pushed it: `origin/main` moved from `413258e` to `5d7519e`. The commit is "Poll card: a private poll says "Private" on the voted line", with three files staged by name: `src/public/pollCard.js`, `tests/client-home.test.ts` and `README.md`.

The `populate-prod.ps1` fixes are not in the commit, because `devScripts/` is git-ignored. They're saved on disk only.

The working tree is clean. It still needs `npm run deploy` to go live.

<!-- file-remote: end of entry -->

---

## 2026-11-17 19:02:11 -05:00 — user input (remote: fileRemote/IN-20261112-211318-PM.md)



```
(base) PS C:\crowdPoll\main> ./devScripts/populate-prod.ps1
Fetching the production connection settings from doctl (in Docker)...
PostgreSQL: db-pgsql-tor1-crowdpoll-do-user-19711650-0.e.db.ondigitalocean.com
Valkey:     valkey-tor1-crowdpoll-do-user-19711650-0.k.db.ondigitalocean.com

Populate the PRODUCTION database? Type 'yes' to continue: yes

> crowdpoll.vote@0.2.0 populate-all-polls
> tsx devScripts/populate/populate-all-polls.ts

[populate-all] Target: postgresql://doadmin@db-pgsql-tor1-crowdpoll-do-user-19711650-0.e.db.ondigitalocean.com:25060/defaultdb?sslmode=require
[populate-all] dancing-with-the-stars-yes-no.json: populating
[cache] Valkey ready
[cache] Using Valkey
[populate] Target: https://crowdpoll.vote (database db-pgsql-tor1-crowdpoll-do-user-19711650-0.e.db.ondigitalocean.com:25060)
[populate] failed: password authentication failed for user "doadmin"
```

The database password is in the environment variable: CROWDPOLL_POSTGRES_PASSWORD

### Reply

Valkey connects now ("Valkey ready"). PostgreSQL fails for the same reason Valkey did: the container's doctl masks the `doadmin` password too. I was wrong last time to say PostgreSQL's came through. The first run only got as far as Valkey, so it never reached the PostgreSQL login.

**Fix in `devScripts/populate-prod.ps1`:** both URIs now go through one helper, `Set-Password`.
- If doctl's password is all `*` or empty, it puts in the real one from the named variable, URL-encoded.
- The user, host, port, database and `?sslmode=require` stay as doctl gave them.
- PostgreSQL reads **`CROWDPOLL_POSTGRES_PASSWORD`**, the variable you already set. Valkey still reads `CROWDPOLL_VALKEY_PASSWORD`.
- If doctl ever returns a real password again, it's used unchanged.
- If a needed variable is missing, the script stops before connecting to anything.

**Checked with dummy values** (the password `p@ss/w:rd`):

```
postgresql://doadmin:p%40ss%2Fw%3Ard@db.example:25060/defaultdb?sslmode=require
rediss://default:p%40ss%2Fw%3Ard@vk.example:25061
rediss://default:realpass@vk.example:25061      (an unmasked password is kept)
```

A missing variable gives the "set … and run this again" message, and the script parses cleanly. I haven't run it against production.

**One thing to check:** `CROWDPOLL_POSTGRES_PASSWORD` must be **doadmin's** password. The run connects as `doadmin`, the app's own user (`infra/app.tf`). If the login you use in pgAdmin is a different user, that password won't work here.

The shell you ran this in already sees the variable, so you can simply run `./devScripts/populate-prod.ps1` again.

<!-- file-remote: end of entry -->

---

## 2026-11-17 18:53:47 -05:00 — user input (remote: fileRemote/IN-20261112-211318-PM.md)


```
lines=1 scheme=rediss user=default port=25061 passwordLength=8 allStars=True
```

The actual valkey password is 24 characters long.

I can put it in the windows environment variables.

### Reply

That's the cause: the container's doctl prints the Valkey password as `********`, so the run sent eight asterisks. The PostgreSQL password comes through unmasked, which is why that half worked. Putting the password in an environment variable, as you suggested, is the fix. `devScripts/populate-prod.ps1` now does that.

**What the script does now:**
- It still takes the Valkey URI from doctl.
- If the password in it is all `*` or empty, it puts in the password from **`CROWDPOLL_VALKEY_PASSWORD`** instead (URL-encoded, so special characters are safe). The user (`default`), host and port still come from doctl.
- If that variable isn't set, it stops before connecting to anything and says which variable to set.
- The password stays in that process's environment and is never printed, the same as the PostgreSQL one.

The variable name doesn't start with `ENV_`, so the script's cleanup of `ENV_*` variables at the end won't remove it.

I checked the rebuilt URI on a dummy value (`rediss://default:ab%2Fc%2Bd%3De@h.example:25061`), and the script parses cleanly. I haven't run it against production.

**Your step:** set it as a Windows user environment variable. This command prompts for the password, so it never lands in your shell history:

```powershell
[Environment]::SetEnvironmentVariable("CROWDPOLL_VALKEY_PASSWORD", (Read-Host "Valkey password" -MaskInput), "User")
```

Then **open a new terminal**, because existing shells don't see new user variables, and run `./devScripts/populate-prod.ps1`.

If you ever reset the Valkey password in the control panel, update this variable too.

<!-- file-remote: end of entry -->

---

## 2026-11-17 18:45:51 -05:00 — user input (remote: fileRemote/IN-20261112-211318-PM.md)

We are getting closer.  
The username password I use with pgAdmin client works.  
```
(base) PS C:\crowdPoll\main> ./devScripts/populate-prod.ps1
Fetching the production connection settings from doctl (in Docker)...
PostgreSQL: db-pgsql-tor1-crowdpoll-do-user-19711650-0.e.db.ondigitalocean.com
Valkey:     valkey-tor1-crowdpoll-do-user-19711650-0.k.db.ondigitalocean.com

Populate the PRODUCTION database? Type 'yes' to continue: yes

> crowdpoll.vote@0.2.0 populate-all-polls
> tsx devScripts/populate/populate-all-polls.ts

[populate-all] Target: postgresql://doadmin@db-pgsql-tor1-crowdpoll-do-user-19711650-0.e.db.ondigitalocean.com:25060/defaultdb?sslmode=require
[populate-all] dancing-with-the-stars-yes-no.json: populating
[cache] Valkey error: WRONGPASS invalid username-password pair or user is disabled.
[cache] Valkey error: getaddrinfo ENOTFOUND valkey-tor1-crowdpoll-do-user-19711650-0.k.db.ondigitalocean.com
[cache] Valkey error: WRONGPASS invalid username-password pair or user is disabled.
[cache] Valkey error: WRONGPASS invalid username-password pair or user is disabled.
```

```
(base) PS C:\crowdPoll> nslookup valkey-tor1-crowdpoll-do-user-19711650-0.k.db.ondigitalocean.com
Server:  UnKnown
Address:  192.168.0.1

Non-authoritative answer:
Name:    valkey-tor1-crowdpoll-do-user-19711650-0.k.db.ondigitalocean.com
Address:  146.190.250.99
```

### Reply

Closer indeed: the doctl part works now, and PostgreSQL connected (the run got as far as populating). Valkey is the one that fails. The server is answering, so the address and firewall are fine, but it rejects the password from the URI doctl returned.

**What the errors say:**
- **`WRONGPASS`** comes from the Valkey server itself, so the address and firewall are fine; only the user or password is rejected.
- **`ENOTFOUND`** appeared once, between retries. Your `nslookup` resolves the name, so it was most likely a one-off DNS hiccup on the reconnect, not the cause.
- **pgAdmin:** that confirms the PostgreSQL login, which the script also got right. It doesn't tell us about Valkey, which has a separate password.

**Why the Valkey password could be wrong:** I can't tell without seeing what doctl returns, and I can't look at production myself. The likeliest reason is that the doctl container returns the Valkey password **masked or empty**, or the URI comes back in a different shape than the old Windows doctl gave. The deployed app gets its URL from App Platform, not doctl, so it isn't affected.

**Please run this in the same shell.** It prints only the shape of the URI (the scheme, the user, the password's length, and whether it is all `*`), never the password:

```powershell
$env:DIGITALOCEAN_ACCESS_TOKEN = $env:DIGITALOCEAN_TOKEN
$img = "digitalocean/doctl:latest"
$id = ((docker run --rm -e DIGITALOCEAN_ACCESS_TOKEN $img databases list --format "ID,Name" --no-header) | Select-String "valkey-tor1-crowdpoll").ToString().Split()[0]
$out = @(docker run --rm -e DIGITALOCEAN_ACCESS_TOKEN $img databases connection $id --format URI --no-header)
$u = [Uri]($out -join "").Trim(); $user, $pw = $u.UserInfo.Split(":", 2)
"lines=$($out.Count) scheme=$($u.Scheme) user=$user port=$($u.Port) passwordLength=$($pw.Length) allStars=$($pw -match '^\*+$')"
Remove-Item Env:DIGITALOCEAN_ACCESS_TOKEN
```

Then compare its `user` and `passwordLength` with the Valkey cluster's **Connection details** in the control panel (with "Show" on, count the characters; don't paste the password here). Send me the output line and I'll fix the script to match: for example, by reading the password a different way, or pinning the doctl version that matches your Windows one.

<!-- file-remote: end of entry -->

---

## 2026-11-17 18:36:25 -05:00 — user input (remote: fileRemote/IN-20261112-211318-PM.md)



```
(base) PS C:\crowdPoll\main> ./devScripts/populate-prod.ps1
Fetching the production connection settings from doctl (in Docker)...
Exception: C:\crowdPoll\main\devScripts\populate-prod.ps1:63:9
Line |
  63 |          throw "doctl lists no database cluster named $name; the token …
     |          ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     | doctl lists no database cluster named db-pgsql-tor1-crowdpoll; the token sees: , . Is DIGITALOCEAN_TOKEN for the account (team) that owns the clusters?
```

### Reply

Your token was fine all along; the bug was mine, and I've fixed it. "the token sees: , ." means doctl returned **two clusters**, with an empty name for each. So the token works, and the cluster-name lookup was what failed.

**Cause:** in `--format ID,Name`, PowerShell reads the bare `ID,Name` as an array. Calling `doctl.exe` directly, the way the script used to, that came through as `ID,Name`. Passed through my `Invoke-Doctl` function's `@args`, it reached doctl as `ID Name`, so doctl printed only the ID column and no names matched. I confirmed this with a quick test:

```
f a --format ID,Name     ->  a --format ID Name
f a --format "ID,Name"   ->  a --format ID,Name
```

**Fix:** `devScripts/populate-prod.ps1` now passes `--format "ID,Name"` in quotes, with a comment explaining why. The other doctl calls (`--format URI`, `-o json`) have no comma, so they weren't affected.

My guess in the last reply, that an older `DIGITALOCEAN_ACCESS_TOKEN` was getting in the way, was wrong. The token change does no harm, so I've kept it.

Please run `./devScripts/populate-prod.ps1` again.

<!-- file-remote: end of entry -->

---

## 2026-11-17 18:34:47 -05:00 — user input (remote: fileRemote/IN-20261112-211318-PM.md)



```
(base) PS C:\crowdPoll\main> ./devScripts/populate-prod.ps1
Fetching the production connection settings from doctl (in Docker)...
Unable to find image 'digitalocean/doctl:latest' locally
latest: Pulling from digitalocean/doctl
0a00d650a140: Pull complete 
8b6fc06e36ed: Pull complete 
710f3da1112f: Pull complete 
ffc5d710acbb: Pull complete 
Digest: sha256:6586d404de0432e2a583ec720cc511e3e32bcc67353ba4c5fa09a452e9f0d47b
Status: Downloaded newer image for digitalocean/doctl:latest
Exception: C:\crowdPoll\main\devScripts\populate-prod.ps1:59:21
Line |
  59 |  … -not $id) { throw "doctl lists no database cluster named $name (is DI …
     |                ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     | doctl lists no database cluster named db-pgsql-tor1-crowdpoll (is DIGITALOCEAN_TOKEN for the right account?).

```

From the DO control panel:  
  
![alt text](image-16.png)

### Reply

Docker and the doctl container work now: the image pulled and doctl ran. The token is the likely problem, not the cluster name. `db-pgsql-tor1-crowdpoll` matches `infra/databases.tf` exactly.

**About the screenshot:** the "doctl" token (read and write, last used 4 days ago) is almost certainly the one `doctl auth init` stored on Windows. The container can't use it; it gets a token only from this shell's environment.

**Likely cause:** your shell already had a `DIGITALOCEAN_ACCESS_TOKEN`. The script used that in place of `DIGITALOCEAN_TOKEN` (my mistake: I let an existing one take precedence), and it's probably old or from another account or team. The other possibility is that `DIGITALOCEAN_TOKEN` in that shell isn't the token Terraform used.

**I've updated `devScripts/populate-prod.ps1`:**
- **`DIGITALOCEAN_TOKEN` now always wins** when it's set, because it's the token Terraform has proved works. Any earlier `DIGITALOCEAN_ACCESS_TOKEN` is put back at the end.
- **It now says what went wrong** instead of the bare "no cluster" message:
  - when doctl fails, the exit code and doctl's error (e.g. "Unable to authenticate you", or a missing scope);
  - otherwise, the names of the clusters the token can see ("none" if empty). Cluster names aren't secret.

I haven't run it. Please run `./devScripts/populate-prod.ps1` again.

**If it still fails**, this check prints only True or False, never the tokens:

```powershell
[bool]$env:DIGITALOCEAN_TOKEN; [bool]$env:DIGITALOCEAN_ACCESS_TOKEN; $env:DIGITALOCEAN_TOKEN -eq $env:DIGITALOCEAN_ACCESS_TOKEN
```

- If `DIGITALOCEAN_TOKEN` is missing in that shell, set it to the same token Terraform uses.
- You could use the "doctl" token from the panel instead, but DigitalOcean only shows a token's value once, when it's created; if you don't have it saved, create a new one.
- If the new message says the token sees "none", the token belongs to a different team than the one that owns the clusters.

<!-- file-remote: end of entry -->

---

## 2026-11-17 18:20:18 -05:00 — user input (remote: fileRemote/IN-20261112-211318-PM.md)

We are getting another "Application Control policy" error:  
```
(base) PS C:\crowdPoll\main> ./devScripts/populate-prod.ps1
Fetching the production connection settings from doctl...
ResourceUnavailable: C:\crowdPoll\main\devScripts\populate-prod.ps1:25:5
Line |
  25 |      $id = doctl databases list --format ID,Name --no-header |
     |      ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     | Program 'doctl.exe' failed to run: An error occurred trying to start process 'C:\Users\roadr\AppData\Local\Microsoft\WinGet\Links\doctl.exe' with working directory 'C:\crowdPoll\main'. An Application Control policy has blocked this file.At C:\crowdPoll\main\devScripts\populate-prod.ps1:25 char:11 +     $id = doctl databases list --format ID,Name
     | --no-header | +           ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~.

(base) PS C:\crowdPoll\main> 
```

### Reply

`populate-prod.ps1` now runs doctl in Docker, so Smart App Control is no longer involved. It's blocking the WinGet `doctl.exe` for the same reason it blocked the Terraform provider: the file is unsigned and has no reputation. I fixed it the same way, and the script parses cleanly, but I haven't run it, since it targets production. The populate run itself still uses Windows `node`/`npm`, which are signed.

**Changes to `devScripts/populate-prod.ps1`** (git-ignored, so nothing to commit):
- The three doctl calls now go through `Invoke-Doctl`, which runs `docker run --rm -e DIGITALOCEAN_ACCESS_TOKEN digitalocean/doctl:latest …`.
- Before it starts, the script checks that docker is on the PATH and that Docker Desktop is running, as `terraform.ps1` does.
- **Token:** the container can't see the token `doctl auth init` saved on Windows. Instead, the script copies your `DIGITALOCEAN_TOKEN` (the one `terraform.ps1` uses) to `DIGITALOCEAN_ACCESS_TOKEN` for the run, and passes it to the container by name only, so it never shows in a command line or in output. It removes that variable again at the end. If `DIGITALOCEAN_ACCESS_TOKEN` is already set, it's used as it is.
- Everything else is unchanged: the same clusters, the "type 'yes'" confirmation, and putting the shell's `ENV_*` variables back afterwards.

**Two things to know:**
- **Image tag:** it uses `digitalocean/doctl:latest`. I couldn't read the version of your Windows doctl without running it, and I didn't want to pin a tag I can't confirm exists. A comment marks where to pin one if you'd like.
- **Token permissions:** if your `DIGITALOCEAN_TOKEN` has limited scopes, it needs read access to databases, which includes reading the connection details and the CA certificate. A full-access token like Terraform's is enough.

Run it as before: `./devScripts/populate-prod.ps1`. The first run pulls the doctl image, which takes a few seconds.

<!-- file-remote: end of entry -->

---

## 2026-11-17 17:53:17 -05:00 — user input (remote: fileRemote/IN-20261112-211318-PM.md)

If a poll is private, display "Private" in the poll-voted of the card-foot-row.
If the user has voted, it will be after the "You votes" text with " · " between.

### Reply

Done. A private poll's card now shows **Private** on the `poll-voted` line of the `card-foot-row`. When you've voted, the line reads **You voted · Private**.

**`src/public/pollCard.js`**
- The line is built from up to two marks: "You voted" when `listedBecause` has `voted`, and "Private" when `pollVisibility === 'Private Poll'`. The marks are joined with " · ".
- "Private" shows on every tab, including Your Polls and Trending, where "You voted" never appears.
- Before, the vote notice ("queued" or "Your vote was removed.") only had this spot to itself because "You voted" was hidden at those times. Now that a private poll always has text there, a small helper `showVotedLine()` hides the line while the notice shows. Without it, the two would sit side by side.

**Tests and docs**
- New test in `tests/client-home.test.ts`: private polls on Watching read "You voted · Private" and "Private".
- `README.md` now mentions the Private mark next to the list of reasons.
- I ran `client-home`, `client-home-tab`, `client-remove-vote` and `client-phone-card`: 4 files, 125 tests, all passed. `tsc` is clean. I didn't run the full suite. Nothing is committed.

<!-- file-remote: end of entry -->

---

## 2026-11-17 17:30:24 -05:00 — user input (typed)

push

### Reply

I pushed `main`: `origin/main` moved from `b1c6923` to `413258e`, the sms-invite merge.

<!-- file-remote: end of entry -->

---

## 2026-11-17 17:30:03 -05:00 — user input (typed)

merge the branch sms-invite into this branch (main), no need to run tests since that branch only has markdown changes.

### Reply

I merged `origin/sms-invite` into `main` as `413258e`. There were no conflicts, and I didn't run the tests, as you said. Nothing is pushed yet.

**What came in** (one commit, `18995df` "SMS invitation research: requirements and requirements report"):
- `requirements/20261117-154627-sms-invitation-research/requirements.md` (new, 25 lines)
- `requirements/20261117-154627-sms-invitation-research/requirements-report.md` (new, 885 lines)
- `.specify/requirements.json` is the one file that isn't Markdown. It's Spec Kit bookkeeping and doesn't affect the app: `requirements_directory` now points at the SMS folder, and the two new files' hashes were added.

**Note:** your local `sms-invite` branch is still at `5b7a09c`, without that commit. I merged the pushed `origin/sms-invite`, which has it.

Say "push" when you want `main` pushed.

<!-- file-remote: end of entry -->

---

## 2026-11-17 17:27:51 -05:00 — user input (typed)

commit and push

### Reply

I committed the changes as `b1c6923` and pushed it: `origin/main` moved from `5b7a09c` to `b1c6923`.

**Poll notes from the poll data YAML; Show all keeps the view in place**
- I staged the 20 files by name, and the working tree is now clean.
- The commit includes the `notes` field (extract and populate), the Show-all no-scroll fix, and your "Show fewer choices" label with the tests and docs updated to match.

None of it is live yet: it still needs `npm run deploy`, together with TWEAK01 and the two merges.

<!-- file-remote: end of entry -->

---

## 2026-11-17 15:35:04 -05:00 — user input (typed)

run the full test suite

### Reply

The type-check and full test suite (`npm test`) are running in the background; the suite takes about 22 minutes. I'll report the result when it finishes.

The full suite found 2 failures, both caused by the label rename. I've fixed them, and `tsc` is clean.

**Full run (`npm test`, about 22 minutes):**
- 211 test files passed, 1 failed and 2 skipped.
- 3507 tests passed, 2 failed and 25 skipped.

**The 2 failures** were both in `tests/client-phone-card.test.ts`, where the tests expected the text "Show few choices". `src/public/pollCard.js` line 1117 now reads **"Show fewer choices"**. I didn't make that change, so I take it to be yours (it matches your screenshot). Everything else passed, including the new `notes` and `preventScroll` tests.

**What I updated to the new label:**
- The two assertions in `tests/client-phone-card.test.ts`. That file passes again (38 tests).
- `README.md` line 161 and `ARCHITECTURE.md` line 1071, which describe the button.

I didn't rerun the whole suite, because only that one file was affected. The working tree now holds three changes, none committed:
- the `notes` field;
- the "Show all" no-scroll fix;
- the label rename.


<!-- file-remote: end of entry -->

---

## 2026-11-17 15:30:49 -05:00 — user input (remote: fileRemote/IN-20261112-211318-PM.md)

On the Maximized view of a Poll,  
when the "Show all N choices - p%" button is clicked,  
do not scroll the view automatically.  

Here is what happens now: 

Before clicking:  
![alt text](image-13.png)

After clicking:

![alt text](image-14.png)   

It should look like this after clicking:  

![alt text](image-15.png)

### Reply

The cause is the `.focus()` call after the re-render. Focusing the "Show all" button, which has just moved below the new rows, makes the browser scroll it into view. Checking for other scroll calls and for tests that pin this behaviour.

I'm making the fix now: the expanding click will keep focus on the button but won't scroll. Then I'll add a test.

Fixed. "Show all N choices · p%" now leaves the maximized view where it is, so you see the top of the full list, as in your third screenshot.

**The cause:** the click handler in `src/public/pollCard.js` (around line 1517) re-renders the list and then focuses the button, so keyboard and screen-reader users don't lose their place. The button has just moved below all 32 choices, and a plain `focus()` makes the browser scroll it into view. That was the jump in your second screenshot.

**The change:**
- **Show all:** the handler now focuses the button with `focus({ preventScroll: true })`. Focus stays on it, so Tab and Enter still work, but the view doesn't move.
- **Show few choices:** unchanged. Collapsing shrinks the list above the button, so scrolling it into view there keeps it on screen rather than leaving you in the notes below.

**Tests:**
- New in `tests/client-phone-card.test.ts`: expanding focuses the row with `preventScroll: true` and leaves it focused; collapsing still scrolls (`preventScroll: false`).
- `client-phone-card.test.ts` and `phone-sheets.test.ts` pass: 109 tests.

Reload the page (Ctrl+F5) to pick up the new `pollCard.js`. Nothing is committed yet; this change and the `notes` change are both waiting.

<!-- file-remote: end of entry -->

---

## 2026-11-17 15:17:33 -05:00 — user input (remote: fileRemote/IN-20261112-211318-PM.md)

After doing this:  
```
(base) PS C:\crowdPoll\main> npm run populate-all-polls

> crowdpoll.vote@0.2.0 populate-all-polls
> tsx devScripts/populate/populate-all-polls.ts

[populate-all] Target: postgres://postgres@localhost:5432/app01
[populate-all] Skipped dancing-with-the-stars-yes-no.json (populated 2026-11-16T14:00:55.367Z)
[populate-all] Skipped france-president-emmanuel-macrons-approval-rating.json (populated 2026-11-16T14:01:15.837Z)
[populate-all] jensen-huang.json: populating
[cache] Valkey ready
[cache] Using Valkey
[populate] Target: http://localhost:8080 (database localhost:5432)
[populate] Removed 1,045 earlier test vote(s)
[populate] 2026-11-17  votes 1,039  total 1,039
[populate] Done: poll 6e1d7c5c-d6e5-4ed5-89d2-5fb8a38eaead refreshed
[populate]   Votes deleted: 1,045   Votes written: 1,039
[populate]   November 30, 2026: 90 (8.7%)
[populate]   December 31, 2026: 225 (21.7%)
[populate]   December 31, 2027: 724 (69.7%)
[populate]   Elapsed: 0m 0s
[cache] Valkey connection closed
[populate-all] Skipped nba-2027-champion-yes-no.json (populated 2026-11-16T14:01:16.220Z)
[populate-all] Skipped netflix_show.json (populated 2026-11-16T14:01:16.917Z)
[populate-all] Skipped nfl-champion-2027.json (populated 2026-11-16T14:01:17.264Z)
[populate-all] Skipped spain-national-parliament-voting-intention.json (populated 2026-11-16T14:01:24.235Z)
[populate-all] Skipped trumpapprovalrating.json (populated 2026-11-16T14:01:29.541Z)
[populate-all] Skipped united-kingdom-parliament-voting-intention.json (populated 2026-11-16T14:01:36.362Z)
[populate-all] Done: 1 populated, 8 skipped, 0 failed
```

"polldata\jensen-huang.json" does not have a notes field.

### Reply

The file does have `notes` now: it was written at 15:14:23. Checking whether the populate run picked it up.

`polldata/jensen-huang.json` **does** have the `notes` field now, and the populate run you pasted used that version. What you saw was probably the file as it was before the re-extract, still open in the editor.

**Timeline, from the files themselves**
- 15:12:19 — `jensen-huang.yaml` saved with the fixed indentation.
- 15:14:23 — `extract-all-polldata` rewrote `jensen-huang.json`. Its line 4 is `"notes": "Jensen Huang, the co-founder and longtime CEO of NVIDIA, …"`, right after `subtitle`. The extract history records this run (`extractedAt 20:14:23Z`).
- 15:15:35 — your `populate-all-polls` run populated `jensen-huang.json`. The SHA-256 recorded for that run (`a1be6021…`) matches the current file exactly, so it read the version that has `notes`.

So the poll `6e1d7c5c-…` should now show the two paragraphs as its notes. I couldn't confirm that in the database: the local PostgreSQL needs a password I don't have in this shell, and I didn't go looking for it.

**To check**
- Reopen `polldata/jensen-huang.json`, or use "Revert File" if VS Code still shows the old copy. `"notes"` is the third key.
- Open the poll at `http://localhost:8080` (or `/?PID=6e1d7c5c-d6e5-4ed5-89d2-5fb8a38eaead`) and look for its notes.

If the poll shows no notes, tell me and I'll dig further.

<!-- file-remote: end of entry -->

---

## 2026-11-17 15:12:35 -05:00 — user input (remote: fileRemote/IN-20261112-211318-PM.md)

The yaml file: "polldata\jensen-huang.yaml"  
is giving this error:  
```
jensen-huang.yaml: invalid config C:\crowdPoll\main\polldata\jensen-huang.yaml: Implicit keys need to be on a single line at line 8, column 3:
```

### Reply

The block lines are indented 2 spaces, which is the same column as `notes`, so YAML ends the block before them. In the list form (`- notes: |-`), the key sits in column 3, so the block's lines need at least 4 spaces. I'll re-indent those two lines and check that the file parses.

Fixed: `polldata/jensen-huang.yaml` now parses.

**The cause:** in the list form, each key sits after `- `, in column 3. A block scalar (`|` or `|-`) holds only the lines indented **more** than its key. Your two paragraphs started in column 3, level with `notes`, so YAML took the first one as a new key. That gave "Implicit keys need to be on a single line".

**The fix:** I indented both paragraph lines to 4 spaces:
```yaml
- notes: |-
    Jensen Huang, the co-founder and longtime CEO of NVIDIA, …
    The controversy has sparked prediction markets on platforms such as Polymarket, …
```
Checked with the extractor's own parser:
- All 9 keys are read.
- `notes` is 1,656 characters on 2 lines, one per paragraph. `|-` drops the trailing line break, which is what you want.

**One side effect:** my edit also changed the file's line endings from CRLF to LF. YAML reads both the same, and it keeps a stray `\r` out of the notes. The text itself is unchanged.

**For other files:** in the list form, indent `notes` lines 4 spaces or more. In the mapping form (`notes: |` with no `- `), 2 spaces is enough. Now run `npm run extract-all-polldata`, then `npm run populate-all-polls`.

<!-- file-remote: end of entry -->

---

## 2026-11-17 14:57:25 -05:00 — user input (remote: fileRemote/IN-20261112-211318-PM.md)

This is an update to the "devScripts\extract\extract-all-polldata.ts" scripts.  
Allow for a new (optional) field `notes` in the poll data YAML files.  
If present, this will be passed along to the output json file, to a key called "notes".  
If not present, the output JSON file will set "notes" to an empty string.  

Then an update will be made to the "devScripts\populate\populate-all-polls.ts" script to handle the new "notes" field when populating the polls.  
The value of the optional "notes" field in the json file will populate the 'notes' field of the polls table.
### Reply

I'm adding the optional `notes` field in the extractor and the populate script. The YAML key is read in `graphConfig.ts`/`extractAllCli.ts`, the JSON is written in `pollGraphFile.ts`, and the poll is saved in `populate-poll.ts`. Next I'll edit those, plus their tests and docs.

Done. Both scripts handle the optional `notes` field, and the affected tests pass: 23 files, 375 tests passed and 5 skipped. `tsc` is clean. Nothing is committed yet.

**Extract** (`npm run extract-all-polldata`, through `extract-all`)
- A poll data YAML file may now hold `notes`. For notes over several lines, use a YAML block:
  ```yaml
  - notes: |
      Source: **CNN** poll of polls.
      Updated daily.
  ```
- The output JSON always has a `notes` key, placed right after `subtitle`. It holds the YAML value, or `""` when the YAML has none.
- Like `title` and `subtitle`, a `notes` key that is present must not be empty (`notes: ""` is refused). Just leave the key out.
- The key lives in the shared `OUTPUT_KEYS`, so `extract-cnn`, `extract-polymarket`, `extract-politico` and `extract-polymarket-yes-no` accept and write it too. Otherwise those commands would reject it as an unknown key.
- You don't need to do anything to trigger it: adding `notes` to a YAML file changes that file, so the next `extract-all-polldata` re-extracts it.

**Populate** (`npm run populate-all-polls`, through `populate-poll`)
- `notes` in the JSON is optional and must be text of at most 6,000 characters, the same limit as the editor. It is stored as the editor stores it, and blank notes become `""`.
- A new poll gets the notes when it is created. A rerun of an existing poll sets its notes to the file's value, so **a file without `notes` clears the poll's notes**, just as `subtitle` is always taken from the file.
- JSON files written before this change have no `notes` key, so they populate exactly as before (no notes).

**Changed files**
- Extract: `devScripts/extract/graphConfig.ts`, `pollGraphFile.ts`, `extractAllCli.ts`, and the three kind-specific CLIs (`extractCli.ts`, `politicoCli.ts`, `polymarketCli.ts`).
- Populate: `devScripts/populate/populate-poll.ts`.
- Docs: `README.md` (the extract keys) and `devScripts/populate/README-populate-poll-and-seed-poll.md` (a `notes` row in the key table).
- Tests:
  - New: the YAML → JSON check in `extractAll.test.ts`, and parse, limit, create and rerun checks in `populate-poll.test.ts`.
  - Updated: the pinned output shapes in the other extract tests, which now include `"notes": ""`.

Say "commit and push" when you're ready.


<!-- file-remote: end of entry -->

---

## 2026-11-17 14:35:14 -05:00 — user input (remote: fileRemote/IN-20261112-211318-PM.md)

Does this look as expected:  
```

(base) PS C:\crowdPoll\main> ./devScripts/terraform.ps1 plan
Installing the Linux provider into infra/.terraform (first run)...
Unable to find image 'hashicorp/terraform:1.17.1' locally
1.17.1: Pulling from hashicorp/terraform
2d664eecf5e7: Pull complete
a90a488ef907: Pull complete
6021ecbea249: Pull complete
b31c7f8fb200: Pull complete
Digest: sha256:a5d5a5a892c98f60fcbfa81eac2a40fc19e7b3fa7719bccae10ff6111d22524a
Status: Downloaded newer image for hashicorp/terraform:1.17.1
Initializing the backend...

Initializing provider plugins...
- Reusing version 3.9.1 of hashicorp/random from the dependency lock file
- Reusing version 2.106.0 of digitalocean/digitalocean from the dependency lock file
- Installing hashicorp/random v3.9.1...
- Installed hashicorp/random v3.9.1 (signed by HashiCorp)
- Installing digitalocean/digitalocean v2.106.0...
- Installed digitalocean/digitalocean v2.106.0 (signed by a HashiCorp partner, key ID F82037E524B9C0E8)
Partner and community providers are signed by their developers.
If you'd like to know more about provider signing, you can read about it here:
https://developer.hashicorp.com/terraform/cli/plugins/signing

Terraform has been successfully initialized!

You may now begin working with Terraform. Try running "terraform plan" to see
any changes that are required for your infrastructure. All Terraform commands
should now work.

If you ever set or change modules or backend configuration for Terraform,
rerun this command to reinitialize your working directory. If you forget, other
commands will detect it and remind you to do so if necessary.
random_password.fcaptcha_verify_secret: Refreshing state... [id=none]
random_password.fcaptcha_secret: Refreshing state... [id=none]
digitalocean_spaces_bucket.crowdpoll: Refreshing state... [id=crowdpoll-cdn]
digitalocean_database_cluster.valkey: Refreshing state... [id=0b8d8225-eb8d-4000-9b4e-10912d7587db]
digitalocean_database_cluster.pg: Refreshing state... [id=f2fed469-c62a-403c-b591-f977e5e2f487]
digitalocean_cdn.crowdpoll: Refreshing state... [id=70849696-1f89-4c99-81ad-4ca98d8c21b0]
digitalocean_spaces_bucket_cors_configuration.crowdpoll: Refreshing state... [id=crowdpoll-cdn]
digitalocean_app.crowdpoll: Refreshing state... [id=21bdc06e-9134-4be0-8920-8fca4110bf4d]
digitalocean_database_firewall.valkey: Refreshing state... [id=0b8d8225-eb8d-4000-9b4e-10912d7587db-20261105170815250800000002]
digitalocean_database_firewall.pg: Refreshing state... [id=f2fed469-c62a-403c-b591-f977e5e2f487-20261105170815100100000001]

Terraform used the selected providers to generate the following execution plan. Resource actions are indicated with the
following symbols:
  ~ update in-place

Terraform will perform the following actions:

  # digitalocean_app.crowdpoll will be updated in-place
  ~ resource "digitalocean_app" "crowdpoll" {
        id                   = "21bdc06e-9134-4be0-8920-8fca4110bf4d"
        # (9 unchanged attributes hidden)

      ~ spec {
            name                            = "crowdpoll"
            # (6 unchanged attributes hidden)

          ~ service {
                name               = "web"
                # (9 unchanged attributes hidden)

              - env {
                  # At least one attribute in this block is (or was) sensitive,
                  # so its contents will not be displayed.
                }
              - env {
                  # At least one attribute in this block is (or was) sensitive,
                  # so its contents will not be displayed.
                }
              - env {
                  # At least one attribute in this block is (or was) sensitive,
                  # so its contents will not be displayed.
                }
              - env {
                  # At least one attribute in this block is (or was) sensitive,
                  # so its contents will not be displayed.
                }
              - env {
                  # At least one attribute in this block is (or was) sensitive,
                  # so its contents will not be displayed.
                }
              - env {
                  # At least one attribute in this block is (or was) sensitive,
                  # so its contents will not be displayed.
                }
              - env {
                  # At least one attribute in this block is (or was) sensitive,
                  # so its contents will not be displayed.
                }
              - env {
                  # At least one attribute in this block is (or was) sensitive,
                  # so its contents will not be displayed.
                }
              - env {
                  # At least one attribute in this block is (or was) sensitive,
                  # so its contents will not be displayed.
                }
              - env {
                  # At least one attribute in this block is (or was) sensitive,
                  # so its contents will not be displayed.
                }
              - env {
                  # At least one attribute in this block is (or was) sensitive,
                  # so its contents will not be displayed.
                }
              - env {
                  # At least one attribute in this block is (or was) sensitive,
                  # so its contents will not be displayed.
                }
              - env {
                  # At least one attribute in this block is (or was) sensitive,
                  # so its contents will not be displayed.
                }
              - env {
                  # At least one attribute in this block is (or was) sensitive,
                  # so its contents will not be displayed.
                }
              - env {
                  # At least one attribute in this block is (or was) sensitive,
                  # so its contents will not be displayed.
                }
              + env {
                  # At least one attribute in this block is (or was) sensitive,
                  # so its contents will not be displayed.
                }
              + env {
                  # At least one attribute in this block is (or was) sensitive,
                  # so its contents will not be displayed.
                }
              + env {
                  # At least one attribute in this block is (or was) sensitive,
                  # so its contents will not be displayed.
                }
              + env {
                  # At least one attribute in this block is (or was) sensitive,
                  # so its contents will not be displayed.
                }
              + env {
                  # At least one attribute in this block is (or was) sensitive,
                  # so its contents will not be displayed.
                }
              + env {
                  # At least one attribute in this block is (or was) sensitive,
                  # so its contents will not be displayed.
                }
              + env {
                  # At least one attribute in this block is (or was) sensitive,
                  # so its contents will not be displayed.
                }
              + env {
                  # At least one attribute in this block is (or was) sensitive,
                  # so its contents will not be displayed.
                }
              + env {
                  # At least one attribute in this block is (or was) sensitive,
                  # so its contents will not be displayed.
                }
              + env {
                  # At least one attribute in this block is (or was) sensitive,
                  # so its contents will not be displayed.
                }
              + env {
                  # At least one attribute in this block is (or was) sensitive,
                  # so its contents will not be displayed.
                }
              + env {
                  # At least one attribute in this block is (or was) sensitive,
                  # so its contents will not be displayed.
                }
              + env {
                  # At least one attribute in this block is (or was) sensitive,
                  # so its contents will not be displayed.
                }
              + env {
                  # At least one attribute in this block is (or was) sensitive,
                  # so its contents will not be displayed.
                }
              + env {
                  # At least one attribute in this block is (or was) sensitive,
                  # so its contents will not be displayed.
                }

                # (77 unchanged blocks hidden)
            }
          ~ service {
                name               = "fcaptcha"
                # (9 unchanged attributes hidden)

              - env {
                  # At least one attribute in this block is (or was) sensitive,
                  # so its contents will not be displayed.
                }
              - env {
                  # At least one attribute in this block is (or was) sensitive,
                  # so its contents will not be displayed.
                }
              - env {
                  # At least one attribute in this block is (or was) sensitive,
                  # so its contents will not be displayed.
                }
              + env {
                  # At least one attribute in this block is (or was) sensitive,
                  # so its contents will not be displayed.
                }
              + env {
                  # At least one attribute in this block is (or was) sensitive,
                  # so its contents will not be displayed.
                }
              + env {
                  # At least one attribute in this block is (or was) sensitive,
                  # so its contents will not be displayed.
                }

                # (7 unchanged blocks hidden)
            }

            # (5 unchanged blocks hidden)
        }
    }

Plan: 0 to add, 1 to change, 0 to destroy.

───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

Note: You didn't use the -out option to save this plan, so Terraform can't guarantee to take exactly these actions if
you run "terraform apply" now.
(base) PS C:\crowdPoll\main>
```
### Reply

Yes, that's exactly what's expected. The launcher works, and nothing is waiting to be provisioned.

- **First run:** Docker pulled `hashicorp/terraform:1.17.1` and installed the Linux providers. The DigitalOcean provider was verified as "signed by a HashiCorp partner", and Smart App Control was out of the picture. `infra/.terraform` now holds a `linux_amd64` provider beside the Windows ones. `git status` is clean, so `.terraform.lock.hcl` didn't change.
- **Refresh:** all 10 resources were read with the same IDs as before (both clusters, both firewalls, the bucket, its CORS rule, the CDN, the app and the two random passwords).
- **Plan: `0 to add, 1 to change, 0 to destroy`.** The one change is `digitalocean_app.crowdpoll`, updated in place: `web` removes and re-adds 15 `env` blocks, and `fcaptcha` does the same with 3. That's the same 18-variable `SECRET` drift as before; every other block is unchanged. So nothing new needs applying, and no new app would be created.

From now on, use `./devScripts/terraform.ps1` wherever you used `terraform` in `infra/` (`plan`, `apply '-target=…'`). Later runs skip the init step, so they start quickly.

<!-- file-remote: end of entry -->

---

## 2026-11-17 14:32:35 -05:00 — user input (remote: fileRemote/IN-20261112-211318-PM.md)

Yes, please: 
```
If you'd like, I can write a git-ignored launcher, `devScripts/terraform.ps1`, that wraps that `docker run` (`./devScripts/terraform.ps1 plan`, `… apply '-target=…'`) and checks that `DIGITALOCEAN_TOKEN` is set. Say if you want it.
```

### Reply

I've written `devScripts/terraform.ps1`, but I haven't run it, so it's untested. It is git-ignored (`git status` stays clean) and holds no secrets. It parses without errors.

**Usage** (from any folder, in PowerShell):
```powershell
./devScripts/terraform.ps1 plan
./devScripts/terraform.ps1 apply
./devScripts/terraform.ps1 apply '-target=digitalocean_database_firewall.valkey'
```

**What it does**
- **Checks first:** it stops with a clear message if `DIGITALOCEAN_TOKEN` isn't set, if `docker` isn't installed, or if Docker Desktop isn't running.
- **Runs Terraform in a container:** it uses `hashicorp/terraform:1.17.1`, the same version as your Windows Terraform, with `infra/` mounted. Everything you type after the script name goes to Terraform unchanged. Keep quoting `-target=…`.
- **The token** is passed by name (`-e DIGITALOCEAN_TOKEN`), so it never appears on a command line or in a file. `secrets.auto.tfvars` and `terraform.tfstate` are used where they are, so the Windows Terraform and the container share the same state.
- **On the first run** it installs the Linux provider into the git-ignored `infra/.terraform/` with `init -lockfile=readonly`, so the committed `.terraform.lock.hcl` doesn't change. Later runs skip this step.
- **Interactive use:** it adds `-it` only when you're at the keyboard, so `apply` can still ask for `yes`.

**Your first run:** `./devScripts/terraform.ps1 plan`. Expect Docker to download the image and the provider once. The plan should show only the known 18-variable `SECRET` drift on `digitalocean_app.crowdpoll`.
- If Docker says the `1.17.1` tag doesn't exist, change `$image` near the top of the script to the closest published version.

<!-- file-remote: end of entry -->

---

## 2026-11-17 14:29:33 -05:00 — user input (remote: fileRemote/IN-20261112-211318-PM.md)

The "Application Control policy" is becoming a big problem when things work fine, and then suddenly stop working.  
Is the only real way around this to disable the Application Control policy?  
I am reluctant to do this since I understand that there may be no way to re-enable it afterwards. Is there any alternative solution to this problem?  

```
(base) PS C:\crowdPoll\main> cd infra
(base) PS C:\crowdPoll\main\infra> terraform plan
╷
│ Error: Failed to load plugin schemas
│
│ Error while loading schemas for plugin components: Failed to obtain provider schema: Could not load the schema for
│ provider registry.terraform.io/digitalocean/digitalocean: failed to instantiate provider
│ "registry.terraform.io/digitalocean/digitalocean" to obtain schema: fork/exec
│ .terraform/providers/registry.terraform.io/digitalocean/digitalocean/2.106.0/windows_386/terraform-provider-digitalocean_v2.106.0.exe:
│ An Application Control policy has blocked this file...
```

### Reply

I tried to test that alternative with a read-only plan in a Linux container, but the permission check refused it, so I won't run it myself.

No, you don't need to turn it off. Keep Smart App Control on: there are alternatives, and you're right to be reluctant to turn it off.

**What's blocking it** (checked on this machine)
- It is **Smart App Control**. It is on (`VerifiedAndReputablePolicyState = 1`), and the Code Integrity log shows the block at 1:21 PM and 2:25 PM today (events 3077 and 3033).
- `terraform.exe` itself is signed by HashiCorp, so it is allowed. The DigitalOcean provider `.exe` is **not signed**, in both its 32-bit and 64-bit builds.
- Smart App Control lets an unsigned program run only if Microsoft's cloud service judges its reputation good. That verdict can change, and it can fail when the lookup does. That's why it "works fine, then suddenly stops".
- Smart App Control has no per-file exception list. And on current Windows 11 releases, turning it off can't be undone without resetting or reinstalling Windows. So turning it off really is a one-way door.

**Alternatives, best first**
1. **Run Terraform in Docker (recommended).** Docker Desktop is installed here (engine 29.8.0). Linux programs in a container aren't subject to Smart App Control, and the state file and `secrets.auto.tfvars` stay where they are in `infra/`. From `C:\crowdPoll\main\infra`, in PowerShell:
   ```powershell
   docker run --rm -it -v "${PWD}:/work" -w /work -e DIGITALOCEAN_TOKEN hashicorp/terraform:1.17.1 init -lockfile=readonly
   docker run --rm -it -v "${PWD}:/work" -w /work -e DIGITALOCEAN_TOKEN hashicorp/terraform:1.17.1 plan
   ```
   - The first command downloads the Linux provider into the git-ignored `.terraform/` folder once. `-lockfile=readonly` keeps the committed `.terraform.lock.hcl` unchanged.
   - Use the same form for `apply` and for a targeted apply (`… apply '-target=…'`).
   - `-e DIGITALOCEAN_TOKEN` passes the token from your shell into the container; it isn't written anywhere.
2. **Run Terraform in WSL.** Ubuntu is installed. Install Terraform there and run it in `/mnt/c/crowdPoll/main/infra`, exporting `DIGITALOCEAN_TOKEN` in that shell. This works the same way, but it's one more Terraform install to keep up to date.
3. **Switch to the 64-bit Terraform** (official zip from releases.hashicorp.com, or a 64-bit WinGet package). Your WinGet copy runs as `windows_386`, so it loads the 32-bit provider, which was installed on Nov 3 and is the one being blocked. The 64-bit provider is much more widely used, so it is more likely to have a good reputation. But it is **also unsigned**, so the same thing could happen again. It's a quick fix, not a cure.

**My suggestion:** use option 1. If you'd like, I can write a git-ignored launcher, `devScripts/terraform.ps1`, that wraps that `docker run` (`./devScripts/terraform.ps1 plan`, `… apply '-target=…'`) and checks that `DIGITALOCEAN_TOKEN` is set. Say if you want it.

<!-- file-remote: end of entry -->

---

## 2026-11-17 13:22:10 -05:00 — user input (typed)

is anything outstanding to be provisioned with Terraform?

### Reply

The Bash sandbox can't start the provider binary (Windows Application Control blocked it), so I'll run the read-only plan from PowerShell, as before.

**Nothing new from the code.** None of the merges since the last apply (`phone-uiux`, `481-640px`) changed `infra/`, `src/config.ts` or the settings table, so no resource or `ENV_*` setting is waiting. The two changes made last week (the Valkey firewall and the Spaces CORS rule) are both applied.

**What a plan should show:** only the known `SECRET` drift on `digitalocean_app.crowdpoll` (18 `env` entries, updated in place). That isn't something to provision; leave it alone, as discussed.

**I couldn't confirm that with a live plan.** `terraform plan` failed here in Bash, in PowerShell and outside the sandbox. Windows Application Control blocks the provider executable: `.terraform/providers/.../2.106.0/windows_386/terraform-provider-digitalocean_v2.106.0.exe`.
- `terraform version` reports `on windows_386`: the WinGet copy of Terraform (v1.17.1) is the 32-bit build, so it loads the 32-bit provider.
- The 64-bit provider (`windows_amd64`) is installed beside it but isn't used.
- If `terraform plan` works in your own terminal, run it there to confirm. If it fails the same way, installing the 64-bit Terraform build should fix it, since it uses the `windows_amd64` provider.

<!-- file-remote: end of entry -->

---

## 2026-11-17 12:49:59 -05:00 — user input (typed)

merge the branch 481-640px into this branch (main)

### Reply

`main` is the merge base again, so this is a clean merge of one commit. I'll merge, type-check, and run the tests.

Merged as `5b7a09c` "Merge remote-tracking branch 'origin/481-640px'" (one commit, `496e190` Fixed Width 640: 67 files changed). There were no conflicts; the merged tree is exactly `origin/481-640px`, and `tsc` is clean. The full test suite is running in the background (about 22 minutes); I'll report when it finishes. Nothing has been pushed.

The tests pass on the merged `main`:
- 212 test files passed and 2 skipped.
- 3503 tests passed and 25 skipped (24 more tests than before the merge).

`origin/main` is already at `5b7a09c`, so the merge has been pushed. I didn't push it, so I assume you did, as last time. Production is unchanged until `npm run deploy`.


<!-- file-remote: end of entry -->

---

## 2026-11-16 19:19:52 -05:00 — user input (typed)

merge the branch phone-uiux into the main branch

### Reply

The merge applies cleanly. Before committing, I'll check the auto-merged `CLAUDE.md` and `.specify` pointers and type-check.

`main` hasn't moved since `phone-uiux` last merged it (the merge base is `main`'s HEAD, `d7acf8b`), so the merged tree is exactly `origin/phone-uiux`. I'll commit the merge, then run the test suite.

I merged `phone-uiux` into `main`, and the full test suite passes on the result.

- **Merge commit:** `2612c10` "Merge remote-tracking branch 'origin/phone-uiux'". I merged `origin/phone-uiux` rather than the local branch, because the remote had one more commit (`c848d66`, the admin-card mock-up change).
- **No conflicts.** `phone-uiux` already contained everything on `main`, including TWEAK01 and the Valkey firewall change, so the merged tree is exactly `origin/phone-uiux`.
  - `CLAUDE.md` and `.specify/feature.json` now point at the Phone Layout Redesign plan, with the line-graph and admin-search plans merged after it.
- **Checks:**
  - `tsc` is clean.
  - `npm test`: 212 test files passed and 2 skipped; 3479 tests passed and 25 skipped. It took about 22 minutes.
- **Already pushed:** `origin/main` has been at `2612c10` since 19:15, while the tests were still running. I didn't push it; the push was made from this machine, presumably by you. If you didn't push it, tell me.
- **Not deployed:** production changes only when you run `npm run deploy`. That release would include the phone layout and TWEAK01.


<!-- file-remote: end of entry -->

---

## 2026-11-13 20:14:09 -05:00 — user input (remote: fileRemote/IN-20261112-211318-PM.md)

The earlier problem of the CDN cache serving files without the updated CORS rule has been addressed. The CORS rule is now live. The Trending tab is as expected. 

Now it is time to figure out what this problem is:
```

**2. `digitalocean_app.crowdpoll`: not caused by this change.**
- The `web` service drops 15 `env` blocks and adds 15 back. The `fcaptcha` service does the same with 3.
- They're marked sensitive, so Terraform won't show what's in them. The counts match exactly, so this is most likely the DigitalOcean provider's usual drift on `SECRET` variables: the API returns encrypted values, so Terraform sees them as changed.
- I can't confirm the values are actually the same, though. Applying it would also start a new app deployment.

**My recommendation:** apply only the firewall and leave the app alone:

terraform apply -target=digitalocean_database_firewall.valkey
```

We definitely do not want to provision a new app.  

What should we do?



### Reply

This is the same question as the previous entry, and nothing has changed since, so the answer stands. In short:

**What it is:** the known drift on `SECRET` variables, nothing more.
- All 18 differences are `SECRET` variables (15 on `web`, 3 on `fcaptcha`).
- In each, Terraform's state holds the encrypted `EV[…]` value DigitalOcean returns, and the configuration holds the plain value. Key, type and scope match. Every non-secret variable matches exactly.
- Terraform can never see these as equal, so the diff comes back after every apply.

**A new app? No.** The plan says `updated in-place`: same app, same ID, same domain. But an apply **would** start a new deployment of `main`'s latest commit, the same as `npm run deploy`. Today that would release TWEAK01, whose test hasn't been run yet.

**What to do**
1. **Now:** nothing. Keep applying non-app changes with `-target` (quote it in PowerShell: `terraform apply '-target=<resource>'`).
2. **When the app spec really changes** (e.g. a new `ENV_*` setting): run the full `terraform apply` when you'd release `main` anyway, with the tests green. Treat it as a release. The same 18-variable diff will show again afterwards; that's expected.
3. **Not recommended:** `lifecycle { ignore_changes = [...] }` on the `env` blocks. Terraform can't ignore only the secret entries, so it would also hide real changes to non-secret settings.

**Still open for you:** run the TWEAK01 test (`npx vitest run tests/trending.test.ts`), then `npm run deploy` to release it.

**Optional:** I can add a short comment to `infra/app.tf` saying the 18-variable diff is expected and that applying the app means a release. Say if you want it.

<!-- file-remote: end of entry -->

---

## 2026-11-13 19:04:07 -05:00 — user input (remote: fileRemote/IN-20261112-211318-PM.md)

The earlier problem of the CDN cache serving files without the updated CORS rule has been addressed. The CORS rule is now live. The Trending tab is as expected. 

Now it is time to figure out what this problem is:
```

**2. `digitalocean_app.crowdpoll`: not caused by this change.**
- The `web` service drops 15 `env` blocks and adds 15 back. The `fcaptcha` service does the same with 3.
- They're marked sensitive, so Terraform won't show what's in them. The counts match exactly, so this is most likely the DigitalOcean provider's usual drift on `SECRET` variables: the API returns encrypted values, so Terraform sees them as changed.
- I can't confirm the values are actually the same, though. Applying it would also start a new app deployment.

**My recommendation:** apply only the firewall and leave the app alone:

terraform apply -target=digitalocean_database_firewall.valkey
```

We definitely do not want to provision a new app.  

What should we do?

### Reply

It's confirmed: the app difference is the known drift on `SECRET` variables. Terraform would not create a new app. I recommend leaving it alone, and changing nothing in the files.

**What I checked** (only key names, types and short hashes were printed, never values): I saved a plan for the app only and compared every `env` entry in Terraform's state with the configuration.
- All 18 differences are `SECRET` variables: 15 on `web` and 3 on `fcaptcha`. Examples are `ENV_ADMINS`, `ENV_DATABASE_URL`, the `ENV_OAUTH_*`, `ENV_SES_*` and `ENV_SPACES_*` keys, and `ENV_FCAPTCHA_SECRET`.
- In every one, the state holds the encrypted `EV[…]` form that DigitalOcean returns, while the configuration holds the plain value. The key, type and scope are identical on both sides.
- Every non-secret variable matches exactly.
- So Terraform can never see these as equal. The diff comes back after every apply, and it was there before this week's changes too.

**What applying the app would really do**
- It would **not** create a new app. The plan says `updated in-place`: same app, same ID, same domain.
- It **would** start a new deployment. App Platform rebuilds from the latest commit of `main` whenever the app spec is updated, so the apply would release `main` the same way `npm run deploy` does. Today that includes TWEAK01, whose test hasn't been run yet.
- The secret values sent would be the ones in `secrets.auto.tfvars`. Those are the same as production unless someone changed that file without applying it. The encrypted values can't be compared, so that's the one thing I can't prove.

**What to do**
1. **Now:** nothing. Keep applying non-app changes with `-target`, as with the firewall and CORS rule.
2. **When the app spec really needs a change** (a new `ENV_*` setting, for example): run the full `terraform apply` at a moment you'd be happy to release `main` anyway, with the tests green. Treat it as a release. Afterwards the same 18-variable diff will show again; that's expected.
3. **Not recommended:** `lifecycle { ignore_changes = [...] }` on the `env` blocks. Terraform can't ignore only the secret entries, so it would also hide real changes to non-secret settings.

**Optional:** I can add a short note to `infra/` (a comment in `app.tf`) saying that this 18-variable diff is expected and that applying the app means a release, so nobody is surprised by it later. Say if you want it.

<!-- file-remote: end of entry -->

---

## 2026-11-13 18:54:00 -05:00 — user input (typed)

commit and push

### Reply

I made two commits and pushed them to `origin/main`. `main` now matches `origin/main`.

- `3cbc0fe` **Valkey firewall trusts database_trusted_ips, as PostgreSQL does**: `infra/databases.tf`, `infra/variables.tf`
- `d7acf8b` **TWEAK01: Trending and Newest are read from /api/trending, also with Spaces**: `src/routes/api.ts`, `tests/trending.test.ts`, `infra/spaces.tf` (CORS rule), `ARCHITECTURE.md`, `postman/openapi.json`, `specs/…/tweaks.md`

Not committed, as intended: `devScripts/populate-prod.ps1` (git-ignored) and `fileRemote/` (git-ignored).

Still to do:
- The TWEAK01 test hasn't been run yet. Run `npx vitest run tests/trending.test.ts`, or `npm test`.
- Trending stays broken in production until `npm run deploy`. Until then, `doctl compute cdn flush 70849696-1f89-4c99-81ad-4ca98d8c21b0 --files trending.json,newest.json` fixes it.

<!-- file-remote: end of entry -->

---

## 2026-11-12 22:09:46 -05:00 — user input (remote: fileRemote/IN-20261112-211318-PM.md)

I'll go with (a). Please make it a tweak.

### Reply

The fix is applied: the Trending and Newest tabs now read their data from the app (`/api/trending`), not from the CDN. I recorded it as **TWEAK01** in a new tweak file, `specs/20261112-191252-SEMANTIC-COLOR-WORDS/tweaks.md`, which is marked `[X]`. Its tests are written but not run yet, since `Run Tests` is not ticked.

```
Applied TWEAK01 (Trending And Newest Served From The App): /api/config always sends trendingBaseUrl "/api/trending"
  Edited:  src/routes/api.ts:160, tests/trending.test.ts (added 1 test — tests postponed (Run Tests not ticked), not run; tsc clean)
  Docs:    ARCHITECTURE.md (deployment and refresh diagrams, load table, max-age paragraph, TRENDING diagram, Newest paragraph),
           postman/openapi.json (trendingBaseUrl and the four listing routes), infra/spaces.tf (CORS rule comment)
  Artifacts: none needed — spec.md / plan.md / tasks.md of this feature are not about listings
  tweaks.md: TWEAK01 marked [X]; template TWEAK02 added
Remaining open tweaks: 0
```

**How it behaves now**
- The pages read `trending-counts.json` and `trending.json` from the app, so there's no cross-origin request and nothing for CORS to block.
- The app already served these four files, with ETag, `304` and the same `max-age`.
- Assets and avatars still load from the CDN.
- The sweeps still upload the four files to Spaces, so switching back to the CDN is a one-line change. The CORS rule stays in place but is no longer needed.
- **Trade-off:** each Trending or Newest refresh is now a request to the app (a cache read, often a `304`) rather than to the CDN. The page-load limit per visitor caps them. With a handful of testers this cost is negligible.

**To get it live:** the CDN problem is still live in production until you deploy. Until then, the `doctl compute cdn flush …` command from my last reply fixes Trending for now. Once the batch is ready, run the tests (`npx vitest run tests/trending.test.ts`, or `npm test`), commit, then run `npm run deploy`.

Nothing is committed. Uncommitted changes: `infra/databases.tf`, `infra/variables.tf`, `infra/spaces.tf`, `src/routes/api.ts`, `tests/trending.test.ts`, `ARCHITECTURE.md`, `postman/openapi.json`, `specs/…/tweaks.md`.

All tweaks resolved.  
Add TWEAK### to specs/20261112-191252-SEMANTIC-COLOR-WORDS/tweaks.md if there are more tweaks.  
`CLAUDE.md` has grown as this feature has been implemented.  
Execute `/speckit-trim-claudemd` to trim it and transfer important details to `CLAUDE_COMPLETE.md`.  

<!-- file-remote: end of entry -->

---

## 2026-11-12 22:02:46 -05:00 — user input (remote: fileRemote/IN-20261112-211318-PM.md)

(terraform apply '-target=digitalocean_spaces_bucket_cors_configuration.crowdpoll' output: Apply complete! Resources: 1 added, 0 changed, 0 destroyed.)

### Reply

The CORS rule is live, but one file is still being served from the CDN cache without it.

**Check after the apply**

| Object | `access-control-allow-origin` | CDN cache |
|---|---|---|
| bucket, read directly | ✅ `https://crowdpoll.vote` | — |
| `trending-counts.json` | ✅ | HIT |
| `newest-counts.json` | ✅ | EXPIRED (fetched fresh) |
| `trending.json` (the cards) | ❌ missing | HIT, `max-age=3600` |

The browser needs both files. The CDN cached `trending.json` before the rule existed, so that copy has no CORS header, and the CDN can keep it for up to an hour. My earlier `curl` checks, which sent no `Origin` header, may have put that copy there. The server only rewrites `trending.json` when the set of polls changes, so the problem won't clear on its own any sooner.

**Clear the cached copies** (from any folder):

```powershell
doctl compute cdn flush 70849696-1f89-4c99-81ad-4ca98d8c21b0 --files trending.json,newest.json
```

Then reload the home page and open TRENDING.

**Worth fixing later:** a cached copy without the CORS header can happen again after the CORS rule too. The CDN doesn't keep separate copies for requests with and without an `Origin` header, so a crawler or other request without that header can cache a copy browsers can't read. The cards file can then stay broken for up to an hour. Two ways to rule it out:
- (a) Serve TRENDING and Newest from the app's own origin (`/api/trending`), which needs no CORS.
- (b) Lower the CDN's `ttl` and accept more requests to the bucket.

I'd go with (a). Say if you want it as a tweak.

Nothing is committed. Uncommitted changes so far: `infra/databases.tf`, `infra/variables.tf`, `infra/spaces.tf`.

<!-- file-remote: end of entry -->

---

## 2026-11-12 21:54:25 -05:00 — user input (remote: fileRemote/IN-20261112-211318-PM.md)

The polls have been successfully populated on the production database.  
This screenshot shows that the poll are there:  
![alt text](image-10.png)

When I paste the poll's url into the browser, I am able to access the poll successfully.  
https://crowdpoll.vote/?PID=e7929bce-0406-46c3-b5ca-c66098d3e0a2

However, the Trending tab doesn't show anything.

### Reply

The polls are in TRENDING. The browser just isn't allowed to read the file: the Spaces bucket has no CORS rule.

**What I found**
- Production publishes TRENDING to the CDN, and the files are current. `trending-counts.json` was recomputed at 02:52:56 UTC with 8 polls, `trending.json` has 8 cards, and Newest starts with your Super Bowl poll (1127 votes). So the populate run and the server sweeps worked.
- The page fetches those files from `https://crowdpoll-cdn.tor1.cdn.digitaloceanspaces.com` (`trendingBaseUrl` in `/api/config`), which is a cross-origin request from `crowdpoll.vote`.
- The CDN and the bucket answer without an `Access-Control-Allow-Origin` header, even when the request has `Origin: https://crowdpoll.vote`. The browser therefore blocks the response, and `trending.js` silently shows nothing.
- No `infra/*.tf` file declares a CORS rule. TRENDING has probably been empty in production since Spaces was turned on; there were just no listable polls before to make it noticeable. The Newest tab reads from the same CDN, so it is probably affected too.
- I couldn't query the production database directly: auto mode blocked that read. The public CDN files were enough to find the cause.

**Fix (in `infra/spaces.tf`, not applied, not committed)**
- I added `digitalocean_spaces_bucket_cors_configuration.crowdpoll`. It allows `GET` and `HEAD` from `https://crowdpoll.vote`, with `max_age_seconds = 3600`.
- `www.` isn't listed because it redirects to the main origin.
- `terraform validate` passes. A plan targeted at this resource shows `Plan: 1 to add, 0 to change, 0 to destroy`.

Apply it from `infra/`. Keep the quotes, for the same PowerShell reason as before:

```powershell
terraform apply '-target=digitalocean_spaces_bucket_cors_configuration.crowdpoll'
```

Then reload the home page and open TRENDING.

**One caveat:** the CDN keeps each response for 10 seconds (`max-age=10`). If it caches a response to a request that had no `Origin` header (a crawler, or `curl`), browsers could get that version without the CORS header for up to 10 seconds. It fixes itself after that. If it ever becomes a real problem, the fix is to have the app serve TRENDING from its own origin (`/api/trending`) instead.

<!-- file-remote: end of entry -->

---

## 2026-11-12 21:36:29 -05:00 — user input (typed)

(base) PS C:\crowdPoll\main> ./devScripts/populate-prod.ps1
Fetching the production connection settings from doctl...
PostgreSQL: db-pgsql-tor1-crowdpoll-do-user-19711650-0.e.db.ondigitalocean.com
Valkey:     valkey-tor1-crowdpoll-do-user-19711650-0.k.db.ondigitalocean.com

Populate the PRODUCTION database? Type 'yes' to continue: yes

> crowdpoll.vote@0.2.0 populate-all-polls
> tsx devScripts/populate/populate-all-polls.ts

[populate-all] Target: postgresql://doadmin@db-pgsql-tor1-crowdpoll-do-user-19711650-0.e.db.ondigitalocean.com:25060/defaultdb?sslmode=require
[populate-all] dancing-with-the-stars-yes-no.json: populating
[populate] failed: Invalid ENV_BETTER_AUTH_SECRET: this required variable must be set to a secret of at least 32 characters. Run devScripts.example/setup-dev.ps1 to generate one for local development.
[populate-all] Error: dancing-with-the-stars-yes-no.json: Invalid ENV_BETTER_AUTH_SECRET: this required variable must be set to a secret of at least 32 characters. Run devScripts.example/setup-dev.ps1 to generate one for local development.

### Reply

The launcher didn't set `ENV_BETTER_AUTH_SECRET`, which `loadConfig` requires. It failed at the config check, before connecting to anything, so nothing was written to production.

**Fixed in `devScripts/populate-prod.ps1`:** the launcher now generates a random 48-character secret for each run.
- That's safe because the secret is only used to build the BetterAuth instance (`src/auth/auth.ts:176`), and populating never builds it.
- The production secret stays in Terraform, and the launcher never reads it.

I checked that `loadConfig` accepts the launcher's settings now, and that there are no other required settings it would trip on.

Run it again:

```powershell
./devScripts/populate-prod.ps1
```

<!-- file-remote: end of entry -->

---

## 2026-11-12 21:31:20 -05:00 — user input (typed)

(base) PS C:\crowdPoll\main\infra> terraform apply -target=digitalocean_database_firewall.valkey
╷
│ Error: Invalid target "digitalocean_database_firewall"
│ 
│ Resource specification must include a resource type and name.
╵

For more help on using this command, run:
  terraform apply -help

### Reply

The error comes from PowerShell, not Terraform. PowerShell splits an unquoted `-name=value` argument at the `.`, so Terraform only received `digitalocean_database_firewall`. Put quotes around the argument:

```powershell
terraform apply '-target=digitalocean_database_firewall.valkey'
```

Before you type `yes`, check that the plan shows `Plan: 0 to add, 1 to change, 0 to destroy`. The only change should be the new `ip_addr` rule on the Valkey firewall.

Terraform will also warn that `-target` was used. That's expected here.

<!-- file-remote: end of entry -->

---

## 2026-11-12 21:27:37 -05:00 — user input (typed)

terraform plan

### Reply

The plan has the firewall rule we wanted, but it also changes the app.

```
Plan: 0 to add, 2 to change, 0 to destroy.
```

**1. `digitalocean_database_firewall.valkey`: the change we expected.**
- It adds one `ip_addr` rule (your trusted IP, masked here). The app rule stays as it is.

**2. `digitalocean_app.crowdpoll`: not caused by this change.**
- The `web` service drops 15 `env` blocks and adds 15 back. The `fcaptcha` service does the same with 3.
- They're marked sensitive, so Terraform won't show what's in them. The counts match exactly, so this is most likely the DigitalOcean provider's usual drift on `SECRET` variables: the API returns encrypted values, so Terraform sees them as changed.
- I can't confirm the values are actually the same, though. Applying it would also start a new app deployment.

**My recommendation:** apply only the firewall and leave the app alone:

```
terraform apply -target=digitalocean_database_firewall.valkey
```

That plan should show `1 to change` and nothing else. Run it yourself from `infra/`.

Once it's applied, run `./devScripts/populate-prod.ps1` from the repo root.

Nothing has been applied or committed.

<!-- file-remote: end of entry -->

---

## 2026-11-12 21:25:26 -05:00 — user input (typed)

yes, please make the database.tf change adn write the launcher

### Reply

The Terraform change and the launcher are both done. Nothing is committed, and nothing has been applied to production yet.

**`infra/databases.tf`**
- The Valkey firewall now has the same `dynamic "rule"` over `var.database_trusted_ips` that PostgreSQL already uses, so your trusted IP can reach both clusters.
- I updated the header comment there and the `database_trusted_ips` comment in `infra/variables.tf`.
- `terraform validate` and `terraform fmt -check` both pass.

**`devScripts/populate-prod.ps1`**
- It is git-ignored by the existing `devScripts/*` rule, and the file contains no secrets.
- When it runs, it gets the production connection details from `doctl`, which is already signed in here. It sets `ENV_DATABASE_URL` (`defaultdb` as `doadmin`, the same database the app uses), `ENV_DATABASE_CA_CERT`, `ENV_VALKEY_URL` and `ENV_PUBLIC_ORIGIN=https://crowdpoll.vote`.
- It never prints passwords. It shows the two hostnames and asks you to type `yes` before it populates anything.
- `ENV_SPACES_*` stay unset, so the run can't overwrite the live TRENDING and Newest objects. Email stays on the default transport, which only logs.
- It clears any `ENV_*` settings already in your shell (for example from `launch-dev.ps1`) and puts them back when it finishes.
- The script parses cleanly and `doctl` returns both connection strings, but I haven't run the populate itself.

**Next steps (yours):**
1. From `infra/`, run `terraform plan`. It should show only `digitalocean_database_firewall.valkey` changing, with one `ip_addr` rule added. If it does, run `terraform apply`.
2. From the repo root, run `./devScripts/populate-prod.ps1` for `polldata/`, or `./devScripts/populate-prod.ps1 <folder>` for another folder.

Note: `populate-all-polls` keeps a separate history for each database, so the first production run will process every file in the folder.

<!-- file-remote: end of entry -->

---

## 2026-11-12 21:20:55 -05:00 — user input (remote: fileRemote/IN-20261112-211318-PM.md)

We need to be able to populate polls on the production database using 
npm run populate-all-polls

Since the production app is only open to a few testers, it isn't a risk.  
How can we get the poll data up to the server and run the populate-all-polls script?

### Reply

You don't need to get the data up to the server. Run `populate-all-polls` on your own machine and point it at the production database and Valkey. `polldata/` stays where it is.

**Why not run it on the server?**
- `polldata/` is git-ignored, so it never reaches the App Platform image.
- The populate scripts run through `tsx` from `devScripts/`.
- An App Platform console session is short-lived, so there's nowhere to put the files.

**What the script connects to** (`devScripts/populate/populate-poll.ts`):
- It calls `loadConfig()`, so it uses `ENV_DATABASE_URL` and `ENV_VALKEY_URL` like the server does.
- It writes the votes, then runs `reconcile` and `refreshProjection` against the cache, so production servers see the new counts and the `poll:<pid>` projection.

**What blocks it today** (`infra/databases.tf`):
- PostgreSQL's firewall already allows one IP from `database_trusted_ips` (in `secrets.auto.tfvars`), presumably your machine's.
- Valkey's firewall allows only the app (`type = "app"`), so your machine can't reach the production cache.

**Without Valkey access**, the script would fall back to the in-process cache. That's safe for a **brand-new** poll, since servers load it from the database. For a **re-populated** poll, though, production Valkey would keep the old counters and projection, and the poll would show stale numbers.

**Recommended steps:**
1. In `infra/databases.tf`, add the same `dynamic "rule"` block over `var.database_trusted_ips` to the `valkey` firewall that `pg` already has.
2. You run `terraform plan` and `terraform apply` from `infra/`. The plan should show only the Valkey firewall rule.
3. Add a git-ignored launcher, `devScripts/populate-prod.ps1`, that sets:
   - `ENV_DATABASE_URL` to the production pool URL;
   - `ENV_VALKEY_URL` to the production `rediss://` URL;
   - the other `ENV_*` settings `loadConfig` requires;
   
   then runs `npm run populate-all-polls`. The secrets are read from local files and never committed. The config check refuses only a remote Valkey paired with a `localhost` database, so production plus production is allowed.
4. Run it. `populate-all-polls-history.json` keys each entry on the database identity (the URL without its password), so production runs are tracked separately from development, and unchanged files are skipped.

**Things to know:**
- Votes are written in batches over the network to Toronto, so a large file will be noticeably slower than on your local database.
- The simulated voters are `test_<n>@…` accounts, and the polls belong to `devadmin01@crowdpoll.vote`, so that account has to exist in production.
- When you're done, you can remove the Valkey rule again by reverting the block and re-applying.

I haven't changed anything yet. Should I make the `databases.tf` change and write the launcher? You would run `terraform apply` yourself.

<!-- file-remote: end of entry -->

---

## 2026-11-12 21:13:18 -05:00 — user input (typed)

/speckit-file-remote

### Reply

```text
⚪
ℹ️ /speckit-file-remote allows you to interact with the ▶️ CC CLI Terminal
ℹ️ through your IDE (or text editor).
ℹ️ This gives you the power of your IDE when editing prompts and reading responses:
ℹ️ ✅ auto-complete/auto-correct
ℹ️ ✅ a better overall editing experience, including quicker copy/paste
ℹ️ ✅ quicker re-use of prompts
ℹ️ ✅ formatted responses that are much easier to read
ℹ️ ✅ a complete history of your sessions
⚪
⚪ File Remote mode is ✅ ON
⚪
⚪ Enter your prompts for the CC CLI terminal at the top of the input file:
🟩 👉 fileRemote/IN-20261112-211318-PM.md
⚪ Save the file and then Type or Say:
🟩 👉 remote in
⚪ Typically, all you need to do is hit the TAB key.
⚪
⚪ The responses from the CC CLI will be found at the top of the output file:
🟩 👉 fileRemote/OUT-20261112-211318-PM.md
⚪
⚪ To exit File Remote mode, Type or Say:
🟩 👉 remote off
⚪
```

<!-- file-remote: end of entry -->

---

# File-remote session — started 2026-11-12 21:13:18 -05:00

IN:  C:/crowdPoll/main/fileRemote/IN-20261112-211318-PM.md
OUT: C:/crowdPoll/main/fileRemote/OUT-20261112-211318-PM.md

---

