We need to emphasize to the users of the CrowdPoll webapp that the most important part of the site is the private polls that they create and that they have received links to from friends and family.  
The first thing I want to research and get your opinion on is, to create separate tabs for what are essentially "Private Polls":
1. poll the user has created  
2. polls the user has been invited to  
3. polls the user has had a link shared with them to a Private Poll a friend/collegue/family member has created.  

We are thinking that 1. should be named "My Polls", and it should be the first tab on the tab bar.  
What are your suggestions for the names of 2. and 3.?  
The tab names of all 3 should be something that is as self-explanatory as possible.  
Ideally, names that are common on othewr sites, so that users will immediately understand what they mean.

RESPONSE >>>>>>>>>>>>>>>>>>>>>>>>>>>>>
 Today these three kinds of poll all live in one tab, My Private Polls (src/public/index.html:38-41). Here's what I'd
  call them once they're split:

  ┌─────┬───────────────────────────────────────┬────────────────┬──────────────────────────────────────────────────┐
  │  #  │             What it holds             │  Recommended   │             Where users have seen it             │
  │     │                                       │      name      │                                                  │
  ├─────┼───────────────────────────────────────┼────────────────┼──────────────────────────────────────────────────┤
  │ 1   │ Polls I created                       │ My Polls       │ SurveyMonkey "My Surveys", Doodle "My polls",    │
  │     │                                       │                │ YouTube "Your videos"                            │
  ├─────┼───────────────────────────────────────┼────────────────┼──────────────────────────────────────────────────┤
  │ 2   │ Invitation Only polls whose invite    │ Invited        │ Google Calendar, Eventbrite, Meetup, Facebook    │
  │     │ list includes me                      │                │ Events                                           │
  ├─────┼───────────────────────────────────────┼────────────────┼──────────────────────────────────────────────────┤
  │ 3   │ Anyone With The Link polls someone    │ Shared With Me │ Google Drive, Dropbox, OneDrive, iCloud          │
  │     │ sent me                               │                │                                                  │
  └─────┴───────────────────────────────────────┴────────────────┴──────────────────────────────────────────────────┘

  Why these:

  - Shared With Me is the easy one. It's probably the most familiar label on the web for "things other people gave me
    access to," so people won't need to think about it.
  - Invited is better than Invitations. "Invitations" sounds like an inbox of things to accept or decline, and people
    expect items to leave it once handled. A poll you've already voted in is still one you were invited to, and
    "Invited" describes that without suggesting there's anything to act on. I'd also skip "Invited to Me" and "Invites":
    the first is clumsy and the second is too casual next to your other labels.
  - All three are short. Right now the bar has six tabs, and splitting one into three makes eight. "My Private Polls" is
    currently the longest label, so this change makes the bar tighter on phones, not wider.
  - They follow the Title Case rule from 018 ("Live Results", "Anyone With The Link"). That's why it's "Shared With Me",
    even though Google writes "Shared with me".

  Two things to think about before settling on names:

  1. Do users see 2 and 3 as different? You know one poll is Invitation Only and the other is Anyone With The Link, but
     a voter just thinks "a friend sent me a poll." Google Drive shows both kinds under one "Shared with me." If you
     merged 2 and 3 into a single Shared With Me tab, the bar would get My Polls · Shared With Me. That's the plainest
     version of "your private polls come first," and you could show a small "Invited" badge on the cards that need it.
     I'd keep them separate only if the difference changes what a user does, for example if invited polls need an answer     
     and shared ones don't.                                                                                               
     2. How does a poll get into tab 3? An Anyone With The Link poll isn't tied to the user until they do something with
     it: open it, vote, or favorite it. For research, we need to decide what that trigger is and whether anything gets
     stored. The answer determines whether "Shared With Me" is even the right promise to make, since we can't show a
     poll the user hasn't opened yet.                                                                                   
  Ordering: put the three private tabs together at the front, My Polls · Invited · Shared With Me · Trending · Newest ·   …. Keeping them grouped makes the point you're after, that these are the part of the site that matters most.

PROMPT ??????????????????????????

  We are going with "My Polls" and "Shared With Me".
  "Shared With Me" will include both polls that the user has been invited to and polls that the user has had a link shared with them.  

  Some sites refer to the person as "You" and some "My".  
  Give me you opinion on which these, as well as the Pros and Cons.

RESPONSE >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

  My recommendation is to keep My / Me, so the tabs are My Polls and Shared With Me.

  "My" (My Polls, Shared With Me)

  Pros
  - It's the pair people already know. Google Drive has used "My Drive" and "Shared with me" together for over a decade,    and Dropbox and OneDrive follow it. Your two labels match that almost exactly.
  - It fits how a label works. When someone taps a tab, it's as if they're saying "show me my polls," so the label is in
    their own voice.
  - It fits how the app already talks. Messages from the app say "your": "Your vote is…", "Your email address", "check
    your inbox". The one label that uses a pronoun says "My" (the current My Private Polls tab). That's the common
    convention: "My" on things the user taps, "Your" in sentences the app says to them. Keeping "My" leaves everything
    else as it is.
  - It's shorter. "My" is two letters and "Your" is four, which helps on phones now that the bar has several tabs.

  Cons
  - "My" and "Your" can end up on the same screen. You'd get something like "My Polls" above an empty-state message
    saying "You haven't created any polls yet." Most people don't notice, but a picky reader might.
  - "My" can sound a bit dated. "My Account" and "My Documents" feel like older web design. Some big companies (YouTube,
    Amazon, Microsoft) have moved to "Your".
  - It gets awkward if a user can view someone else's list. If an admin could ever look at another user's polls, a tab
    called "My Polls" would be showing polls that aren't theirs. Nothing like that exists today.

  "Your" (Your Polls, Shared With You)

  Pros
  - One voice everywhere. Labels and messages would both use "your", so the app always speaks to the user the same way.
  - Current big-platform style. YouTube ("Your videos"), Amazon ("Your Orders") and Google Account screens all use it.
  - Friendly tone. It reads like the app addressing the user directly.

  Cons
  - "Shared With You" is less familiar. The phrase people recognize is "Shared with me", and recognition was your main
    goal.
  - It means reworking a label that already follows the convention. The one pronoun label, today's My Private Polls tab,    already uses "My", so "Your" would have to replace it.                                                                - It's longer. "Shared With You" is one character longer than "Shared With Me", and every "Your" label costs two more
    characters than "My".

  Verdict

  My Polls and Shared With Me are the most recognizable pair available, because they match Google Drive's "My Drive" and  "Shared with me" so closely. They also fit the "My" for tabs and "your" for messages pattern the app already follows.

  Whichever you pick, use the same one for both tabs. "My Polls" next to "Shared With You" would read as a mistake.

PROMPT ???????????????????????

  One thing that may change your opinion is that this webapp is still in development. Nothing has been launched to the public yet.  
  So that "Con" about replacing "My" with "Your" is not really a Con.  It is just a matter of changing the label in the code before launch.
  And the "Con" about 2 characters isn't really a concern because some research will be done on how to make the tabs fit on a mobile phone.  There will definitely be more tabs.

  The compelling reason to use "Your Polls" and "Shared With You" is that it is the current trend on the web.   
  That is important.  
  Keeping everything as "Your" in message such as "Check your Inbox", "Your vote is counted", "Your email address", etc. and also in the tab names, is a more consistent approach.

  Based on the above, does the recommendation change?

RESPONSE >>>>>>>>>>>>>>>>>>>>>>>>>>>

Yes, I'd now go with Your Polls and Shared With You.

  With nothing launched yet, relabeling is just a code change, and you're planning tab-fit research anyway, so two of my  cons no longer apply. What's left is a straight choice between the more familiar phrase and the current trend plus      one consistent voice. On that choice, your reasoning holds up:
                                                                                                                          - One voice everywhere. The app would address the user as "you" in every place: tabs, messages, empty states and
    buttons. There's also no risk of "My Polls" appearing above "You haven't created any polls yet."
  - It follows the current trend. YouTube, Amazon, Microsoft and Google Account have all moved to "Your".
  - "Shared With You" is well known too. Apple built a feature called "Shared with You" into iOS, macOS, Messages,
    Photos and Safari, so hundreds of millions of people have seen that exact phrase. That largely answers my
    recognition concern. Google Drive's "Shared with me" is still the best-known file-sharing label, but "Shared With       You" won't confuse anyone.                                                                                          
  To keep that consistency once it's chosen:

  - Rule for the spec: no first-person labels anywhere in the UI. Use "Your" and "You", never "My" and "Me", including
    in future tabs, menus and headings.
  - Current code: the only "My" label today is the My Private Polls tab (src/public/index.html:40), and this feature
    replaces it. Code comments in tabs.js, pollCard.js and deltaClient.js still say "My PRIVATE POLLS" and should be
    updated at the same time.

??????????????????????????????????

As a result of the above, the "Favorites" tab will not include polls that the user has been invited to or polls that the user has had a link shared with them.
I will also not include polls the user has voted on.
What is your recommendation for polls that the user has voted on?

RESPONSE >>>>>>>>>>>>>>>>>>>>>>>>>>>

I'd add a separate tab, Your Votes, that lists every poll the user has voted in, public or private.

  How the current code handles it. Voting is one of the ways a poll gets into a personal tab today
  (src/polls/userPolls.ts:74-79):

  - My Private Polls = private polls the user created, was invited to, voted in or bookmarked
  - Favorites = public polls the user created, voted in or bookmarked

  Why voted polls need their own tab. Once Favorites is only bookmarks and Shared With You covers invited and shared
  private polls, a public poll the user voted in has no tab. The only way back to it would be through Trending, Newest
  or Search. That's a real gap: people often come back to a poll they voted in to check the results, and their vote is
  exactly the thing they'll remember about it.

  Why "Your Votes":

  - It follows the "Your" rule you just settled on.
  - It says what the list is. A card already highlights the choice the user made, so the tab really does show their
    votes.
  - It's short and plain. "Voted On" sounds like a status, "History" or "Activity" are vague and suggest more than
    votes, and "Participated" is clumsy.

  Why every voted poll, not just public ones: I'd define each tab by one relation and let a poll appear in more than one
  tab, the way a Google Drive file can be both Starred and in Shared with me.

  - Your Polls = polls you created
  - Shared With You = private polls you were invited to or opened from a link
  - Your Votes = polls you voted in
  - Favorites = polls you bookmarked

  Every tab is then explained by its name alone. If Your Votes held only public polls, it would need a footnote
  ("…except private ones, which are under Shared With You"), and a user who voted in a friend's poll would find it
  missing from Your Votes.

  One thing research needs to settle: a private poll someone reached by link only belongs to them once they do something
  with it. Today that something is voting or bookmarking, and there's no other stored relation. Research needs to
  decide whether just opening such a poll adds it to Shared With You, which would mean storing a new "viewed" relation,
  or whether it only appears there after the user votes.  
  Cost is low. personalTabQuery already handles a "voted" relation, so a Your Votes tab would mostly reuse existing code  and the existing result cap (ENV_MAX_POLLS_SEARCH_RESULTS).

  What I'd avoid: automatically favoriting a poll when someone votes in it. It fills Favorites with polls the user never  chose to save, which undoes the reason you're making Favorites bookmarks-only.

PROMPT ????????????????????????????

Next question for you: is "Favorites" the best name for that tab?  
The current naming of the icon and the tool tips is not a consideration since that can easily change.  
Our thinking is that Polls aren't actually "Favorites" but rather they are something the user wants to keep their eye on.
A future feature might even be to receive emails periodically with the results of the polls that the user wants to keep an eye on.. 

RESPONSE >>>>>>>>>>>>>>>>>>>>>>>

I'd rename it Saved.

  I read your note as saying the polls people keep in this tab really are their favorites. That's the part I'd question.
  Favorite is about liking something, but people come back to a poll to follow it: to see how the results change, to
  check whether a friend has voted, or to vote again in a dynamic poll. Those aren't the same thing, and the difference
  shows most in exactly the polls you now say matter most:                                                              
  - Someone might want to keep an eye on a family poll about Grandma's care arrangements. Tapping a star labelled
    "Favorite" on it feels wrong.
  - They might follow a poll they strongly disagree with, just to watch the count. It isn't a favorite either.
  - Users who think Favorites means "polls I liked" may not use it for the "come back to this later" job it actually
    does.
                                                                                                                          Why "Saved":

  - It's the current trend, which you've said matters. Instagram, Facebook, Reddit, LinkedIn, TikTok and Google Maps all    call this list "Saved". X calls it "Bookmarks", and "Favorites" now mostly survives in browsers and older apps.
  - It's neutral. Saving something says nothing about whether you like it.
  - It needs no explanation. Everyone knows "save this for later".
  - It's the shortest option (5 characters, against 9 for "Favorites").
  - It fits the "Your" rule. Like "Trending" or "Newest", it needs no pronoun, and "Your Saved Polls" would be longer
    without being any clearer.
                                                                                                                          Other options I considered:

  ┌──────────────────────┬────────────────────────────────────────────────────────────────┐
  │         Name         │                            Why not                             │
  ├──────────────────────┼────────────────────────────────────────────────────────────────┤
  │ Favorites            │ Says "I like this", which doesn't match why people save a poll │
  ├──────────────────────┼────────────────────────────────────────────────────────────────┤
  │ Bookmarks            │ Clear, but less common than "Saved" in apps                    │
  ├──────────────────────┼────────────────────────────────────────────────────────────────┤
  │ Following / Watching │ Suggests you'll get notifications, which this tab doesn't send │
  ├──────────────────────┼────────────────────────────────────────────────────────────────┤
  │ Your Saved Polls     │ Just a longer "Saved"                                          │
  └──────────────────────┴────────────────────────────────────────────────────────────────┘

  What goes with it: swap the star icon for a bookmark ribbon, the universal symbol for "Saved", and label the card
  button Save / Saved. Behind the scenes nothing changes: routes, tables and identifiers keep the word bookmark, the
  same UI-only arrangement FIX026 made for Favorites.

  When Favorites would be the better name: if the tab is really meant as a list of polls someone enjoys, favorites to
  show off rather than polls to track, keep "Favorites" and the star. For polls, I don't think that's what people will
  use it for.

PROMPT ????????????????????????

I had a typo in the previous prompt.  
I typed "are actually" when I intended to type "aren't actually".
Here's the prompt again with the correction:
Next question for you: is "Favorites" the best name for that tab?  
The current naming of the icon and the tool tips is not a consideration since that can easily change.  
Our thinking is that Polls aren't actually "Favorites" but rather they are something the user wants to keep their eye on.
A future feature might even be to receive emails periodically with the results of the polls that the user wants to keep an eye on.. 

RESPONSE >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

With that correction, my recommendation changes to Following.

  In my last answer I ruled out "Following" and "Watching" because they suggest the user will get updates. Now that
  you're planning periodic result emails, that becomes a reason to choose them: the name would promise what the feature
  is heading toward.

  Why "Following":

  - It says "keep an eye on". Following something means you want to hear how it develops, and that's exactly how you
    described these polls.
  - Everyone knows it. Follow / Following buttons are everywhere, and Google News and Apple News both have a "Following"
    tab for topics a reader tracks. The pattern is the same here: tap Follow on a poll and it appears under Following.
  - The email feature slots straight in. "Email me results for polls I follow" makes sense without explanation, and the
    tab won't need renaming when that feature arrives.
  - It needs no pronoun. Like "Trending" and "Newest", it reads naturally as it is, so the "Your" rule still holds.

  Other options:

  ┌───────────┬──────────────────────────────────────────────────────────────────────────────────────────────────────┐
  │   Name    │                                               Why not                                                │
  ├───────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ Favorites │ Means "I like this", which is the idea you want to move away from                                    │
  ├───────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ Saved     │ Passive storage: "put away for later", with no hint of updates. It would feel wrong once the emails  │
  │           │ arrive                                                                                               │
  ├───────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ Watching  │ eBay and GitHub use it, so it's a close second, but it's a bit less familiar and can sound like      │
  │           │ surveillance                                                                                         │
  ├───────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ Watchlist │ Prime Video and Netflix have taught people it means "things to watch later"                          │
  ├───────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ Tracking  │ Easy to confuse with ad tracking and privacy settings                                                │
  └───────────┴──────────────────────────────────────────────────────────────────────────────────────────────────────┘

  One thing to check. On social sites, "Following" usually means people you follow. Here it would mean polls. I don't
  think that will confuse anyone, since the tab sits among poll tabs and shows poll cards. If later research finds users  expect to follow a poll's creator, "Watching" would be the fallback.

  What goes with it:

  - The card button reads Follow, then Following once pressed (tapping it again unfollows), and the tooltips match.
  - For the icon, avoid a bell, because that will mean "email me" once the emails exist. A simple outline eye works, or
    a plus that turns into a check.
  - Nothing changes behind the scenes: routes, tables and identifiers keep the word bookmark, as FIX026 did for             Favorites.

PROMPT ????????????????????????????

One reason we are prefering "Watching" over "Following" is because "Following" doesn't have a natural icon, the way and "Eye" icon does for "Watching".  
Do you have a suggestion for an icon for "Following" that is as natural as the "Eye" icon is for "Watching"?

RESPONSE >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

● No. I don't know of an icon that says "Following" as clearly as an eye says "Watching", and that's a good reason to
  choose Watching.

  The icons usually used for Follow all miss:

  ┌──────────────────────────────┬───────────────────────────────────────────────────────────────────────────────┐
  │             Icon             │                            Why it fails for polls                             │
  ├──────────────────────────────┼───────────────────────────────────────────────────────────────────────────────┤
  │ Person with a plus or check  │ Means following a person, which suggests you're following the poll's creator  │
  ├──────────────────────────────┼───────────────────────────────────────────────────────────────────────────────┤
  │ Plus that turns into a check │ Generic "add". It could mean add to a list, a calendar, a cart and so on      │
  ├──────────────────────────────┼───────────────────────────────────────────────────────────────────────────────┤
  │ Bell                         │ Means notifications. It should stay free for the future results-email setting │
  ├──────────────────────────────┼───────────────────────────────────────────────────────────────────────────────┤
  │ Star, heart                  │ Mean "favorite" and "like", the idea you're moving away from                  │
  ├──────────────────────────────┼───────────────────────────────────────────────────────────────────────────────┤
  │ Bookmark ribbon              │ Means "Saved", which is passive, with no sense of updates                     │
  ├──────────────────────────────┼───────────────────────────────────────────────────────────────────────────────┤
  │ RSS / broadcast waves        │ Too technical; most users don't know them                                     │
  └──────────────────────────────┴───────────────────────────────────────────────────────────────────────────────┘

  An eye beside "Watching" needs no explanation, and eBay and GitHub already use the Watch/Watching wording. Since the
  word and the icon each make the other clearer, I'd switch my recommendation to Watching with an eye icon.

  Some details to get right:

  - Show state by fill, not by a slash. An outline eye means not watching, and a filled eye means watching. An eye with
    a slash through it means "hidden" or "hide password", so it shouldn't be used for "not watching".
  - Keep numbers away from the eye. A number next to an eye is widely read as a view count (YouTube, Medium, many
    dashboards). If a card ever shows how many people are watching, it needs a word ("12 watching"), not just a number.
  - Label the button with the word as well as the icon: Watch, which becomes Watching once pressed, like GitHub's
    button. Tapping it again stops watching, and the tooltip can say "Stop watching this poll".
  - The eye is free here. Nothing in src/public uses an eye icon today, including the sign-in page, which has no
    show/hide password toggle, so it won't clash with anything.
  - The future email feature fits. "Email me results for polls I'm watching" reads naturally, and the bell stays
    available for that setting.

  That gives a tab bar of Your Polls · Shared With You · Your Votes · Watching · …

  PROMPT ????????????????????????????

  Please generate an SVG for the "Watching" icon and put it in:
  "research/UI-UX-FOR-PRIVATE-POLLS/watching-icon.svg"

RESPONSE >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

 I've created the icon at research/UI-UX-FOR-PRIVATE-POLLS/watching-icon.svg: an outline eye with a ring for the iris
  and a small dot for the pupil. I rendered it to an image to check it, and it reads clearly as an eye.

  It's drawn to match the Favorites star it would replace: the same 24×24 size, the same 1.8 line width and the same
  grey (#9AA197), so it should sit evenly in the tab bar.

  To put it in the tab bar, paste its three shapes into an <svg class="tab-icon" viewBox="0 0 24 24"> element, the same
  way the star is included in index.html today.

  This file is only the "not watching" look. For the card button's "watching" look, I'd make a second version with the
  iris filled in, matching the outline-to-filled idea from earlier. I can add that as watching-icon-active.svg if you
  want it.

PROMPT ????????????????????????????

yes, add the watching-icon-active.svg too

RESPONSE >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

 The pressed bookmark changes from the light grey outline to ink (#1E2422), so I'll do the same for the eye and fill in  the iris. I won't use the star's red, because a red eye reads as an alarm.

I've added research/UI-UX-FOR-PRIVATE-POLLS/watching-icon-active.svg. I rendered it next to the existing icon to
  compare them: the outline grey eye on the left and the new dark filled eye on the right are easy to tell apart at a
  glance.

  - Same shape, darker colour. The eye outline is identical, drawn in the app's dark ink colour (#1E2422). This follows
    how the Favorites button already behaves: its tag goes from light grey to ink when pressed.
  - Filled iris. The iris is solid, with a small highlight cut out so it looks like a pupil catching light. Because the
    highlight is a transparent hole rather than a white dot, it will look right on any card background, including dark
    mode.
  - No red. The pressed Favorites star turns red, but I left red off here because a red eye looks like an alarm.

  When this goes into the card button, you won't need two separate icons. The button can switch between the two looks
  with the aria-pressed="true" state, the same way .bookmark-btn does today.

  The cut-out highlight relies on a named element (watching-catchlight) inside the file. If the icon is pasted into the
  page more than once, the copies share that name. Browsers usually still draw it correctly, but it's cleaner to use the
  file once as a shared symbol, or to give each copy its own name.

PROMPT ????????????????????????????
  
  There have been many recommendation that we have accepted so far in this session.  
  So that we can write requirements for the UI/UX of the private polls, please summarize all of the recommendations that have been accepted so far in this session,  
  and write them to the following file:
  "research/UI-UX-FOR-PRIVATE-POLLS/accepted-recommendations.md"

RESPONSE >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

I've written the summary to research/UI-UX-FOR-PRIVATE-POLLS/accepted-recommendations.md. Not everything I recommended  in this session was explicitly accepted, so I split the file into three parts to keep the requirements from carrying
  decisions you never made.

  1. Accepted (7 items)
  - Goal: make it clear that private polls are the most important part of the site.
  - Your Polls: the first tab on the bar.
  - Shared With You: one tab for both invited polls and polls reached through a shared link.
  - Pronouns: the UI always says "Your" and "You", never "My" and "Me".
  - Favorites narrows: it no longer lists shared or voted polls.
  - Watching: Favorites is renamed Watching, not Following, because it needs a natural icon.
  - Eye icons: the two SVGs and how they're drawn.

  2. Recommended, not yet confirmed (7 items). You should confirm or reject each of these:
  - the Your Votes tab
  - each tab defined by one rule, with a poll allowed in more than one tab
  - tab order
  - the Watch / Watching button details
  - voting doesn't automatically add a poll to Watching
  - the rename is UI-only, so code keeps the word bookmark
  - Title Case for labels

  3. Open questions (5 items)
  - When does a poll shared by link appear in Shared With You? Just opening the link, or only after the user votes in it
    or watches it?
  - Does Your Polls include the user's public polls?
  - Can a poll in Shared With You be watched?
  - How the tabs fit on a phone (separate research).
  - The future results-email feature (out of scope, but it shaped the Watching name).

  If you confirm any of the part 2 items, I can move them up into Accepted.

PROMPT ????????????????????????????

  We added all "Recommended, not yet accepted" items to the list of accepted recommendations, and wrote them to research/UI-UX-FOR-PRIVATE-POLLS/accepted-recommendations.md.
  Now, we will address the "Open question" items in the accepted-recommendations.md file, and append the answers to the "Accepted" section of the file.

  First one:
```
  - **Q1. When does a link-shared poll appear in Shared With You?** An Anyone With The
  Link poll only belongs to a user once they do something with it. Today that means
  voting or bookmarking, and no other relation is stored. Should simply **opening** the
  link add it to the tab? That would need a new stored "viewed" relation. The
  alternative is that it appears only after the user votes in it or watches it.
```
When the user opens a link-shared poll, it should appear in the "Shared With You" tab.  
A user may want to keep track of a poll that they have been sent a link to, even if they haven't voted in it yet.  
This will increase the likelihood that the user will vote in the poll.  
This means that simply opening the poll will add it to the tab, and a new stored "viewed" relation will be created to track this action.
Please append the requirements to the "Accepted" section of the file.  
Include the requirements for views and any new database fields that would be needed.

RESPONSE >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

I've added the answer to Q1 as a new accepted item, A15, in accepted-recommendations.md.

  Something you should know first. Opening a shared poll link doesn't work today. The admin Copy Poll Link button
  produces /?PID=<pid>, but the home page redirects that to / and drops the poll id (src/routes/pages.ts:56-60). So
  anyone who opens the link lands on Trending and never sees the poll. I wrote fixing this in as a prerequisite (A15.1),  because the new feature depends on it.

  What A15 says:
  - When a view is recorded: a signed-in user arrives through the link to a Private, Anyone With The Link poll they
    didn't create, and the poll is actually shown to them. Opening the same link again moves the poll to the top of
    Shared With You.
  - What doesn't count:
    - Opening a poll from a tab or a search result.
    - Public polls.
    - Invitation Only polls, which don't need a view because the existing invited record already lists them.
  - When the poll isn't shown and nothing is recorded: an unknown poll, a poll that isn't open to voters, a user who
    isn't on an Invitation Only poll's list, or a user banned from the poll.
  - Guests: the view is recorded once they sign in. This means the poll id has to survive the sign-in round trip.
  - Where the view is recorded: by the server while it serves the poll, so a view can't be lost or faked.
  - What Shared With You lists: private polls the user is invited to or has viewed, excluding polls they created.

  Database: no new table, column, index or migration. A view is just a new viewed value in the existing
  user_polls.relation column. That column is plain text with no restriction on its values, and each user and poll pair
  already gets one row that is updated rather than duplicated. Its updated_at holds the latest open, which is what
  orders the tab, and deleting a poll already removes its rows. What's needed is code: add "viewed" to the
  UserPollRelation type, build the new tab query, record the view in the link route, and describe that route in
  postman/openapi.json.
                                                                                                                          Changes to the Open questions section:
  - Q1 is marked resolved.                                                                                                - Q5 pointed to "R4", which no longer exists after your renumbering, so it now points to A8.
  - A15 raises three new questions:
    - Q6: can a user remove a poll from Shared With You?
    - Q7: should views expire the way bookmarks do?
    - Q8: does a guest see the poll before signing in, or go straight to sign-in?

PROMPT ????????????????????????????

I added a new requirement to the prompt.
  Next question:
```
  - **Q2. Does Your Polls include the user's public polls?** The current code includes public polls in My Private Polls, but the new Your Polls tab is meant to be private polls only. Should Your Polls include public polls, or should it be private polls only?
```

"Your Polls" should include private polls and public polls the user created.  
After all, the user created both types of polls, and they are both "yours."  

A requirement that will be included in the next spec is that every user (by default) will be allowed to create polls, public and private.  
Likely, the public polls will need to be moderated, but that is a separate issue.  

Please append the requirements to the "Accepted" section of the file.  
Include all implementation requirements.

RESPONSE >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

I've added A16 to the Accepted section of accepted-recommendations.md and removed Q2 from the open questions, the same  way you removed Q1. It now takes into account that every user will be able to create polls.

  What A16 says:
  - Background: the next spec lets every user create public and private polls. Moderating public polls is kept as a
    separate issue. Until that spec lands, Your Polls is empty for everyone except admins, who see their own polls.
  - What's listed: every poll the user created, private or public, and nothing else. A poll stays listed whatever its
    visibility, sharing mode or state, and leaves only when it's deleted. An admin's Your Polls shows only the polls
    that admin created.
  - Unlaunched polls are listed too. Once users create their own polls, Your Polls is the only place they can see one
    before it launches:
    - Initialized, Editing, Awaiting Approval and Rejected polls show their state, plus the reason for a rejection, with      no voting. Editing and resubmitting belong to the poll-creation spec.
    - Waiting To Open, Open and Closed polls get the normal card.
    - Archived polls show their results, read-only.
    - Other users never see unlaunched polls; the existing public-state rule still applies to every other tab.
  - Order and size: newest created first, capped at ENV_MAX_POLLS_SEARCH_RESULTS. Paging is left to the poll-creation
    spec.
  - Presentation:
    - The tab comes first and reuses the person icon from My Private Polls.
    - Guests are asked to sign in.
    - When empty it says "You haven't created any polls yet." and offers the way to create one.
    - The "listed because" line on cards (FIX020) is hidden in this tab, since every card would say the same thing.
  - Database: no schema change. The created record already exists. One requirement for the next spec: the user
    poll-creation route must record who created the poll, the way the admin route does. Otherwise new polls won't appear    in Your Polls.
  - Server and client changes and tests: listed in A16.7. They cover:
    - an optional visibility filter in personalTabQuery;
    - a new yourPollsTab query and POST /api/tabs/your-polls/refresh route;
    - postman/openapi.json;
    - the new first tab in index.html and tabs.js;
    - Watching no longer depends on whether a poll is private or public;
    - cards that show the poll's state.                                                                                                                                                                                                           The server already sends each poll's state to the card, so the only new data needed is the rejection reason, and it's
  sent only to the poll's creator.

PROMPT ????????????????????????????
Next question: 
```
- **Q3. Can a poll in Shared With You be watched?** Today the My Private Polls tab
  hides the bookmark control (`showBookmark: false` in `tabs.js`).

```
Yes, a poll in Shared With You can be watched.  
A future requirement will likely be that "Watched" polls can be emailed to the user periodically,  
so it is important that a user can watch a poll that they have been invited to or that they have opened from a link.

Please append the requirements to the "Accepted" section of the file.  
Include all implementation requirements.

RESPONSE >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

I've added your answer to Q3 as A17 in the Accepted section of accepted-recommendations.md, and removed Q3 from the
  open questions.

  A gap you should know about: anyone signed in can watch any poll. The watch route (POST /api/polls/:pid/bookmark)
  accepts any existing poll id from any signed-in user and never checks whether they may see the poll. That's been
  harmless because Favorites only lists public polls. Once Watching can list private polls, anyone who learned an
  Invitation Only poll's id could watch it and see its contents. So A17 adds an access rule, and it will also cover the
  future results email.

  What A17 says:
  - The Watch control appears in every tab, including Shared With You. It was hidden there by 017 FIX024, whose reason
    no longer applies.
    - Watching a poll adds it to Watching and leaves it in Shared With You.
    - Stopping watching removes it from Watching only.
    - The control is hidden, not greyed out, where the user may not watch the poll.
  - Who may watch. The poll must be in a state voters can see, and the user must not be banned from it. Then either:
    - it's a public poll;
    - it's Invitation Only and the user is invited or created it; or
    - it's Anyone With The Link and the user created it, or has already reached it by an invitation, a view or a vote.

    Anything else gets 404 Not found, so a refusal doesn't reveal that a private poll exists.
  - Losing access. If a watcher is uninvited or banned, or the poll switches to Invitation Only without them:
    - Watching stops showing the poll, and its card isn't sent.
    - The watch record is kept, so the poll comes back if access returns.
    - The future email will use the same check.
  - Limits and expiry are unchanged. Private polls count toward ENV_MAX_BOOKMARKS_PER_USER and expire under the same
    daily rule.
  - Database: no schema change. The access check only reads tables that already exist. The existing bookmarks.created_at    can serve as the "watching since" date for the future email.
  - Implementation (A17.6):
    - A new mayWatch check, placed with the existing vote-block rules.
    - The watch route calls mayWatch; stopping watching stays unchecked, so it always succeeds.
    - The Watching tab only shows polls the user may still watch.
    - The server tells each card whether the user may watch its poll.
    - Shared With You stops hiding the control.                                                                             - The pollCard.js comment that cites FIX024 is updated.                                                                 - Server and browser tests are listed. 

PROMPT ????????????????????????????

Next question: 
```
- **Q4. Fitting the tabs on a phone.** Separate research, already planned. More tabs
  are coming.

```

Please append the resolution to the "Accepted" section of the file.  

RESPONSE >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

 I've added your answer to Q4 as A18 in the Accepted section of accepted-recommendations.md, and removed Q4 from the
  open questions. Since you said this is separate research, A18 records it as out of scope for this work, plus the
  decisions that research needs to keep.

  What this work does:
  - Layout: stays as it is today. The tab bar is one row that scrolls sideways on narrow screens, with the scrollbar
    hidden (src/public/tabs.css). No "More" menu or icon-only mode is added.
  - Tab count and order: eight tabs, Your Polls · Shared With You · Your Votes · Trending · Newest · Watching · Live
    Results · Search. The private tabs come first, so on a phone they're the ones visible without scrolling.

  Where Watching goes (please check): your edit to A10 fixes only the first three tabs, and it no longer mentions
  Watching. So I kept the other tabs in today's order and put Watching where Favorites is now, after Newest. If you
  meant Watching to sit with the private tabs, change it in A10 and I'll update A18 to match.

  Decisions the layout research must keep:
  - Labels: the tab names stay as chosen. Shortening one to make it fit (for example "Shared") isn't allowed.
  - Order: the first three tabs stay first.
  - Icons: Your Polls uses the person icon and Watching uses the eye. Shared With You and Your Votes have no icon yet,
    so they'd need designing if the research wants icon-only or icon-first tabs.
  - The bell: stays unused, reserved for the future results email.

  PROMPT ????????????????????????????
Next question:  
```
- **Q5. Periodic results emails for watched polls.** This is a future feature, not
  part of this work. It is recorded here because it shaped the "Watching" name (A6)
  and keeping the bell icon free (A8).
```


Please append the requirements to the "Accepted" section of the file.  
Include all implementation requirements.


RESPONSE >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

I've added your answer to Q4 as A18 in the Accepted section of accepted-recommendations.md, and removed Q4 from the
  open questions. Since you said this is separate research, A18 records it as out of scope for this work, plus the
  decisions that research needs to keep.

  What this work does:
  - Layout: stays as it is today. The tab bar is one row that scrolls sideways on narrow screens, with the scrollbar
    hidden (src/public/tabs.css). No "More" menu or icon-only mode is added.
  - Tab count and order: eight tabs, Your Polls · Shared With You · Your Votes · Trending · Newest · Watching · Live
    Results · Search. The private tabs come first, so on a phone they're the ones visible without scrolling.

  Where Watching goes (please check): your edit to A10 fixes only the first three tabs, and it no longer mentions
  Watching. So I kept the other tabs in today's order and put Watching where Favorites is now, after Newest. If you
  meant Watching to sit with the private tabs, change it in A10 and I'll update A18 to match.

  Decisions the layout research must keep:
  - Labels: the tab names stay as chosen. Shortening one to make it fit (for example "Shared") isn't allowed.
  - Order: the first three tabs stay first.
  - Icons: Your Polls uses the person icon and Watching uses the eye. Shared With You and Your Votes have no icon yet,
    so they'd need designing if the research wants icon-only or icon-first tabs.
  - The bell: stays unused, reserved for the future results email.

  PROMPT ????????????????????????????

  Next question:
  ```
  - **Q6. Can a user remove a poll from Shared With You?** Raised by A15. A link opened by
  mistake, or a poll the user no longer cares about, would otherwise stay listed.
  Removing the `viewed` row is enough for a link-shared poll. An invited poll would
  need a separate "hidden" marker, because the invitation itself must stay.

  ```

  For now, there will be no way for a user to remove a poll from Shared With You.
Please append the resolution to the "Accepted" section of the file.  

RESPONSE >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

I've added your answer to Q6 as A19 in the Accepted section of accepted-recommendations.md, and removed Q6 from the
  open questions.

  No removal, for now. Shared With You cards get no remove, hide or dismiss control, and no new route or "hidden" record  is added. The Live Results remove control stays on the Live Results tab only, and stopping watching a poll doesn't
  take it out of Shared With You. If you revisit this later, the approach from Q6 is kept in the file.

  When a poll still leaves Shared With You:
  - the poll is deleted;
  - the user is removed from an Invitation Only poll's invite list;
  - the poll switches to Invitation Only and the user isn't invited;
  - the user's view expires, but only if Q7 decides that views expire.

  A ban doesn't remove the poll. The card stays listed with today's "You have been removed from this poll" message, and
  the Watch control is hidden.

  A current gap you should know about. Removing someone from a poll's invite list today doesn't delete their invited
  record. updatePoll only ever adds these records. The poll already lingers today with a "You are not invited to this
  poll" message. With no way for users to remove polls, it would sit in Shared With You forever.

  A19 prefers fixing this where invites are edited: when the invite list changes, updatePoll deletes the invited records
  of anyone taken off it. The fallback is to check the invite list whenever Shared With You is served. With the
  preferred fix, a user who is invited again comes back at the top of the tab.

  An added rule for your review. A19 also says an Invitation Only poll is listed only through an invitation, never
  through an old view. That covers a link poll that later switches to Invitation Only.

  A19.4 lists the tests.

  PROMPT ????????????????????????????

  Next question:
  ```
  - **Q5. Periodic results emails for watched polls.** This is a future feature, not
  part of this work. It is recorded here because it shaped the "Watching" name (A6)
  and keeping the bell icon free (A8).
```    

Please append the resolution to the "Accepted" section of the file.  

RESPONSE >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

I've added your answer to Q5 as A20 in the Accepted section of accepted-recommendations.md. You had already removed Q5  from the open questions, so I left that list as it is.

  A20 records emails for watched polls as a future feature, out of scope for this work. It has three parts:

  - Decisions the feature already shaped:
    - The tab is named Watching.
    - The bell icon is kept free.
    - Polls in Shared With You can be watched, so polls sent by friends and family can be emailed too.
    - The watch access check (A17) is the one the future email must use, so a poll the user can no longer reach is never
      emailed.
  - What this work adds and doesn't add:
    - Nothing for email: no emails, settings, schedule, unsubscribe, environment variables or database changes.
    - It keeps what the feature will need: the stored watch, the "watching since" time in bookmarks.created_at, and the
      single mayWatch check the email job can call.
    - One wording rule: the Watch control, its tooltip, the Watching tab and its empty state must not mention email or
      notifications until the feature exists.
  - Notes for the future spec, not decided here:
    - how often emails are sent, and whether the user chooses;
    - whether it's opt-in per poll (the bell) or for all watched polls;
    - what one email contains;
    - unsubscribing;
    - sending through the existing mail code in src/email/;
    - how the watch cap and expiry affect who gets emailed.

  Q7 (do views expire?) and Q8 (what a guest sees on opening a link) are still open.

PROMPT ????????????????????????????

Next question:
```
- **Q7. Do views expire?** Raised by A15. Bookmarks are removed after
  `ENV_BOOKMARK_EXPIRY_MONTHS` of inactivity or closure (`removeExpiredBookmarks`,
  `src/polls/bookmarks.ts`). Should `viewed` rows follow the same rule, so Shared With
  You does not fill up with long-finished polls?
```

No, views do not expire.

Please append the resolution to the "Accepted" section of the file.  

RESPONSE >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

I've added your answer to Q7 as A21 in the Accepted section of accepted-recommendations.md. You had already removed Q7  from the open questions.

  What A21 says:
  - The rule: a view is never removed because time has passed. There's no sweep and no new setting. The daily bookmark
    expiry keeps deleting only watch records and must not be extended to views or invitations.
  - What that means for Shared With You:
    - Nothing is removed by time. Invitations don't expire either.
    - Closed or long-inactive polls stay listed. With no removal control (A19), a poll leaves only when it's deleted,
      the user is uninvited, or the poll switches to Invitation Only without them.
    - A watched poll can expire out of Watching while staying in Shared With You.
  - The display cap still applies. Only the most recent ENV_MAX_POLLS_SEARCH_RESULTS polls are shown. Older records stay
    stored, and opening an old link again brings that poll back to the top.
  - Database: no change and no expiry code. Storage grows by at most one row per user per link-shared poll they open.
  - Tests: the expiry leaves views and invitations untouched, a long-closed shared poll is still listed, and it drops
    out of Watching but not Shared With You.

  Two small edits to keep the file consistent:
  - A19.2: I removed the row that said a poll leaves when its view expires.
  - Invitation Only switch: when a link poll switches to Invitation Only, the view record is hidden from the listing but
    not deleted, so the poll comes back if it switches back.

  That leaves Q8 (what a guest sees on opening a link) as the only open question.

PROMPT ????????????????????????????

Next Question:
```
- **Q8. What does a guest see on opening a link?** A15.3 records the view at sign-in.
  Still to decide: is the poll shown to a guest before sign-in, with results and a
  "Sign in to vote" prompt, or does the link go straight to sign-in?
```

The link goes straight to sign-in.

Please append the requirements to the "Accepted" section of the file.  
Include all implementation requirements.

RESPONSE >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>



