Start a new spec for these requirements called `20261021-143942-PRELAUNCH-SIGNUP-ALLOWLIST`  
!! THIS FILE IS GENERATED USING THE SKILL `/speckit-requirements`. DO NOT EDIT OR DELETE THIS FILE !!  

# Initial High-Level Requirements

The CrowdPoll webapp has been deployed to Production on DigitalOcean.  
However, it hasn't been launched to the public yet.  
We want to enable only specified email addresses to create an account and subsequently to login.  
This will be specified in an environment variable.  
If the variable exists, only the email addresses listed in it will be allowed to create an account and login.  
If the variable does not exist, any email address will be allowed.  
The environment variable will contain a comma-separated list of allowed email addresses. 

If anybody else clicks the Create Account button, they should be shown a message indicating that the web site has not been launched yet.
## Decisions

- **The variable (UA1)**: `ENV_ALLOWED_EMAILS`, a comma-separated list;  
  each entry is trimmed and lower-cased, and an entry that is not a valid address stops the app at startup;  
  the startup log gives the number of addresses, never the addresses;  
  it is documented in `CLAUDE.md`, `README.md` and the launch templates (left unset there).  
- **Enforcement (UA3)**: on the server, in one function (`isAllowed`) called by create-account, request-login-link, email-change and BetterAuth's `session.create.before` hook;  
  the routes check first, so a refusal sends no email and creates no pending account;  
  the browser only shows the message the API returns.  
- **Email change (UA5)**: an unlisted new address gets the same "not launched" refusal, and no verification email is sent;  
  the Profile card shows it where it shows other email-change errors.  
- **OAuth phase (UA7)**: the list applies in both sign-in modes;  
  the session hook refuses a new session for an unlisted address, and the login page shows BetterAuth's error redirect as the "not launched" message.  
- **The message (UA8)**: `403 { "error": "not-launched", "message": "CrowdPoll hasn't launched yet. For now, accounts are open to invited testers only." }`, shown in the card's status area;  
  `postman/openapi.json` gains the response on the three endpoints;  
  the wording is a draft for the developer to approve or replace.  
- **Keeping the list private (NC2)**: in production the list is an encrypted App Platform variable (`type: SECRET`), set in the DigitalOcean console;  
  the repository holds only the key, as for the SES access key.  
- **Which button (AM1)**: the message is shown by the Create Account card's button: it replaces "Check your inbox" after an unlisted address is submitted;  
  the guest header's Create Account To Vote button still just opens the page.  
- **Matching (AM2)**: an address is compared with the list by email key, as for one-person-one-account:  
  case, a `+tag`, and Gmail dots and `googlemail.com` are ignored.  
- **Empty value (AM3)**: a variable that is set but empty counts as unset, so everyone is allowed;  
  the startup log says which applies (`[auth] Sign-up allowlist off`, or `on, <n> addresses`).  
- **Login page (UA2)**: an unlisted address on the Login card gets the same "not launched" message, and no email (sign-in link or invitation) is sent.  
- **Existing accounts and sessions (UA4)**: new sign-ins of unlisted addresses are refused;  
  a session that already exists runs until it ends or the user signs out;  
  the accounts are kept, so they work again at launch.  
- **Administrators (UA6)**: an address in `ENV_ADMINS` is always allowed, listed or not.  
- **Guests (NC1)**: the allowlist limits accounts and sign-ins only;  
  what a guest can see without an account is unchanged.  
