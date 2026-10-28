Start a new spec for these requirements called `20261021-204537-PRIVACY-AND-TERMS`  
!! THIS FILE IS GENERATED USING THE SKILL `/speckit-requirements`. DO NOT EDIT OR DELETE THIS FILE !!  

# Initial High-Level Requirements

Please draft a privacy policy that reflects the following: 
- the one cookie policy 
- the use of emails only to verify the users identity and manage authentication sessions
- no tracking of users
- no sharing of user data with third parties

Also recommend how to implement these principles in the webapp's design to make available to users clear information about privacy practices and control over their data.

We probably also need to provide a user with the ability to delete their account and all associated data.  
Additionally, we should ensure that any data retention policies are clearly communicated to users, specifying how long their data will be kept and under what circumstances it will be deleted.  

It should mention that, in the future, there may be Poll update notification emails that they can opt-in to.

Somewhat related to this, there should be a contact method for users to reach out with privacy concerns or questions, such as a dedicated email address or a contact form on the website. 
The address for privacy concerns should be clearly provided, such as `privacy@crowdpoll.vote`.
Other questions should be directed to `support@crowdpoll.vote` or a contact form on the website.

We also need a "Terms of Service" that the users must agree to before creating an account, outlining the rules, responsibilities, and limitations of both the users and the service provider.

The Privacy Policy link and Terms of Service link should be available on the Create Account page.

The footer of the website should also include links to the Privacy Policy and Terms of Service and Cookie Use, ensuring that users can access this information from any page.

## Decisions

- **Decision (RS1), presenting privacy information**: a layered approach in five places.  
  - The Privacy Policy page opens with a short "In short" list, then the full sections, each with an anchor (`#cookies`, `#retention`, `#rights`, `#contact`).  
  - The Create Account card carries the Terms box and both links; the Login card carries a one-line "By signing in you agree to the Terms and Privacy Policy" link line.  
  - The cookie banner keeps its sentence and adds a "Cookie Use" link.  
  - The Profile page gains a "Your Data" section: Delete Account, how to ask for a copy, and a link to the policy.  
  - The footer on every page links the three documents and the two addresses.  
- **Decision (RS2), the policy's sections**, covering PIPEDA and GDPR Article 13:  
  1. who we are and how to reach us;  
  2. what we collect and why;  
  3. the legal basis (providing the service asked for; keeping it secure);  
  4. cookies and browser storage;  
  5. who processes data for us, and where (DigitalOcean, Canada; Amazon SES, Canada; ImprovMX and Google, USA, for mail sent to us); no selling, no advertising;  
  6. how long we keep it;  
  7. your rights and how to use them (access, correction, deletion, complaint to the Office of the Privacy Commissioner of Canada or a local authority);  
  8. children;  
  9. future poll update emails;  
  10. changes to the policy and its "Last updated" date.  
- **Decision (IN1), third parties**: the policy says "we never sell your data or share it for anyone else's purposes", and names the service providers that process it for CrowdPoll (DigitalOcean, Amazon SES, ImprovMX, Google for Gmail), each with what it receives and where; no advertiser, data broker or analytics company receives anything.  
  In the OAuth phase the sign-in providers are added.  
- **Decision (IN3), cookies**: "the one cookie policy" means "only strictly necessary cookies, no consent needed".  
  The Cookie Use section names both cookies (`session_token`, `signin_binding`) and every `localStorage` / `sessionStorage` item, with purpose and lifetime.  
  A test checks that the list on the page matches the cookies the server sets.  
- **Decision (AM1), what the email address is for**: signing you in, sending the emails you ask for, and identifying you on the polls you create, are invited to or vote in; never marketing, and never shown to other users.  
  A poll's creator may enter your address to invite you; only the creator and site admins see it, and you can ask for it to be removed.  
- **Decision (AM3), the footer**: one small static footer, rendered by `app.js` at the end of `<body>` on every page, below the content and never fixed.  
  It holds Privacy Policy · Terms of Service · Cookie Use · `privacy@crowdpoll.vote` · `support@crowdpoll.vote` · © year CrowdPoll, uses the Material 3 tokens in a new layer sheet, rides above the cookie banner's offset, and wraps on a phone.  
- **Decision (UA2), deleting an account**: a Delete Account action in a "Your Data" section of the Profile page.  
  A dialog states what is deleted and what is kept; the button is enabled only once DELETE is typed.  
  `DELETE /api/me` removes the data in one transaction, ends every session (the session cache included), clears the cookie and sends a "your account was deleted" email; the person lands on the home page as a guest.  
  Signing up again later with the same address creates a new, empty account.  
- **Decision (UA3), retention**, published as a table in the policy, with a daily sweep that makes it true:  
  - account and profile: until deleted;  
  - sessions: until signed out or expired (30 days at most), expired rows removed daily;  
  - sign-in and email-change links: 15 minutes, removed daily;  
  - rate-limit records: 15 minutes, removed daily;  
  - polls and votes: as long as the poll exists, deleted with the poll or the account;  
  - vote history: 12 months, then the monthly partition is dropped;  
  - bookmarks: 6 months after the poll closes;  
  - server logs: as kept by DigitalOcean App Platform (to be confirmed and stated);  
  - database backups: the managed PostgreSQL backup window (7 days documented; to be confirmed);  
  - mail sent to us: until the matter is closed, at most 2 years.  
- **Decision (UA5), changes**: each document shows a version and a "Last updated" date; a material change is emailed to every account 30 days ahead, and a new Terms version is accepted again.  
  The version is a constant in the code (e.g. `2026-11-01`), the same one the Create Account request carries; sending the notice is an operator task.  
- **Decision (UA6), the pages**: two static pages, `/privacy` and `/terms`, open to guests and users, in the site's style with the header and footer.  
  Plain HTML in `src/public/`, served by `pages.ts` without a session check, indexable, readable without JavaScript, fingerprinted like other assets; the email footer links them too.  
- **Decision (UA9), future poll update emails**: one paragraph saying CrowdPoll may later offer emails when a poll you follow changes; they will be off unless you turn them on, each will carry a one-click way to stop them, and the policy will be updated before they start.  
  Nothing is built for them now.  
- **Decision (UA10), the Terms' sections**:  
  1. who may use CrowdPoll (age) and one account per person;  
  2. your content: you own your polls and let CrowdPoll show them; no unlawful, hateful, harassing, sexual, spam or impersonating polls;  
  3. votes and invitations: invite only people who would expect it; no manipulating results;  
  4. what CrowdPoll may do: review, reject, close or remove polls, ban voters, suspend accounts;  
  5. the service "as is", limitation of liability;  
  6. ending: delete your account at any time; CrowdPoll may end the service with notice;  
  7. changes, governing law and contact.  
- **Decision (NC4), the drafts**: written during `/speckit-plan` as `contracts/privacy-policy.md` and `contracts/terms-of-service.md`, reviewed by the developer, and by a lawyer before public launch; the pages are built from them.  
  Placeholders (`[OPERATOR NAME]`, `[PROVINCE]`) stay visible until answered; the allowlist keeps the site closed until the review is done.  
- **Decision (RS3), fonts**: the three font families (Fraunces, Inter, Roboto) are served from CrowdPoll itself, not Google Fonts.  
  The `woff2` files for the weights in use (Latin subset) and an `@font-face` sheet go through the existing fingerprinting and Spaces publishing; the eight page heads drop the Google Fonts links, so no third party sees a visitor.  
- **Decision (IN2), IP addresses**: kept only where security needs them.  
  Sessions no longer store IP address or user agent (emptied in `session.create.before`; existing rows cleared by the migration); the two rate-limit log lines mask the IP; rate-limit keys keep it for their 15-minute window only.  
  The policy defines "no tracking" as no analytics, no advertising, no profiling and nothing that follows you to other sites, and says IP addresses are used briefly to stop abuse.  
- **Decision (AM2), Cookie Use**: a section of the Privacy Policy, linked as `/privacy#cookies`; no separate page.  
- **Decision (AM4), agreeing to the Terms**: an unticked "I agree to the Terms of Service and have read the Privacy Policy" box on the Create Account card; Create Account stays disabled until it is ticked, and the server refuses a request without it.  
  In OAuth mode the Login card shows the same box above the provider buttons.  
- **Decision (UA1), what deleting an account removes**: everything that is theirs is deleted; what belongs to others is anonymized.  
  - Deleted: the user row, sessions, links, bookmarks, `user_polls`, the polls they created (with their votes and search entries), and invitations naming their address.  
  - Anonymized: their votes on other people's polls (address and name replaced by a random placeholder, shown as "Deleted user"), so counts and closed results stay as they were.  
  - Kept: bans naming their address, so deleting an account is not a way around a ban; the policy says so.  
- **Decision (UA4), recording agreement**: `terms_version` and `terms_accepted_at` on the user; an account without the current version, including the existing testers' accounts, is asked to accept on its next visit, before any signed-in page.  
- **Decision (UA7), contact**: email addresses only, `privacy@crowdpoll.vote` for privacy and `support@crowdpoll.vote` for everything else; `privacy@` is added as an ImprovMX alias (a manual step, listed in the quickstart); no contact form now.  
- **Decision (UA8), a copy of your data**: on request to `privacy@crowdpoll.vote`, answered within 30 days; the Profile page's "Your Data" section says how; no download button now.  
- **Decision (NC1), the operator**: the developer's business name, with `privacy@crowdpoll.vote` as the contact and the business's mailing address; until supplied, the drafts carry the placeholders `[OPERATOR NAME]` and `[MAILING ADDRESS]`.  
- **Decision (NC2), minimum age**: 16 or older, stated in the Terms and agreed to by the Create Account box; not verified.  
- **Decision (NC3), governing law**: the laws of the developer's province and of Canada, with its courts; the drafts carry `[PROVINCE]` (Ontario assumed) until named.  
