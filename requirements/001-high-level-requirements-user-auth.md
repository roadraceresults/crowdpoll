# OVERVIEW
We are creating a user authentication system that can be used by any web app.  
The system will be built using TypeScript.   
All account data will be stored in a MongoDB database.  
The name of the mongoDB database will be specified in the environment variable `APP_MONGODB_NAME` (default "app01").  
The connection string for the mongoDB database will be specified in the environment variable `APP_MONGODB_URI`.  
The npm BetterAuth Typescript library will be used for user authentication and identification.  

Initially, the system will implement a Native Auth solution that will allow users to:
- create an account  
- login using their email address  

OR using an OAuth social provider, the system will allow users to:
- login using an OAuth social provider

The system will also allow users to edit their profile.

The system can then be used by a web app that needs to present different content to users based on whether they are logged in or not.  
The web app can then access their profile information which may also be used to personalize the user experience.

# USER AUTHENTICATION
Since almost every webapp needs to identify the current user and have access to a User Profile, the system will utilize the BetterAuth Typescript library for user authentication and identification.  
Initially, the BetterAuth native email authentication with sessions, stored in a local database will be used until the app is approved of by Google, Facebook, GitHub etc. at which time the system will then switch to use OAuth "social provider" plugins for the approved providers exclusively.

A User Account `Profile` consists of:  
- `clientId`: 
	- for `Native Auth`, system assigned GUID
	- for `OAuth`, assigned by the `OAuth` provider
- `clientSecret`: system assigned GUID for `Native Auth`, or the `OAuth` provider assigned unique secret
- `userName`  (limited to 200 characters for the purposes of the UI/UX text field)
	- for `Native Auth`, the `userName` will be defaulted to the part of the email address before the '@' symbol, but can be changed by the user on the `Display/Edit Profile` page. If the default userName is already in use by another account, the system will append a number to the end of the default userName until a unique userName is found.
	- for `OAuth`, the `userName` will be the user name provided by the `OAuth` provider. If the `OAuth` userName is already in use by another account, the system will append a number to the end of the `OAuth` userName until a unique userName is found. 
- `emailAddress` 
    - for `Native Auth`, the `emailAddress` will be the email address provided by the user when creating an account, and can be changed by the user on the `Display/Edit Profile` page.  
    The system will verify that the new email address is not already in use by another account before allowing the change. 
    The system will also verify that the email address is actually correctly formed email address before allowing the change and before even attempting to send the verification email.  
    For `Native Auth`, the `emailAddress` is limited to 200 characters for the purposes of the UI/UX text field.
    - for `OAuth`, the `emailAddress` will be the email address provided by the `OAuth` provider. The system will not allow the user to change their email address when using `OAuth`.
- `profileAvatar`:
	- for `Native Auth`, the `profileAvatar` will be a default avatar image provided by the system  
	- for `OAuth`, the `profileAvatar` will be the avatar image provided by the `OAuth` provider  


After the `native → OAuth` switch is made, there will be no account migration/linking — old profiles simply stop being used for auth.

The cookie settings will be:  
```
res.cookie("session_token", token, {
  httpOnly: true,   // JS can't read it → mitigates XSS token theft
  secure: true,     // only sent over HTTPS → mitigates network sniffing
  sameSite: "lax",  // not sent on cross-site background requests → mitigates CSRF
  maxAge: APP_SIGNIN_COOKIE_DURATION_MAX, // from environment variable
});
```
A cookie notification banner will be implemented to inform users about the use of the `session_token` cookie.
Only the `session_token` cookie will be set, and no other cookies will be set by the system. This is considered a "strictly necessary" cookie, and therefore does not require user consent. The cookie notification banner will be displayed to the user for informational purposes only, and will only have an "I Understand" button.
Cookie-banner acknowledgement is remembered via browser storage, not a second cookie, to honor the single-cookie rule.

# EMAIL ADDRESS VALIDATION

Before the switch is made, the validation emails will be sent using `mailtrap.io` with nodemailer.    
The native authentication uses no password, but rather sends an email every time the user needs to login.   
The email contains a one-time login link. Login links expire after ~15 minutes, and a new request supersedes unused links.  
Email Rate Limiting: There will be a limit of 2 link requests as implemented by BetterAuth's built-in rate limiting. Further requests politely refused with a message that includes the time that the next request can be made.
The user authentication system will verify the link and sign the user in.  
If a login link is requested for an email address with no account: the on-screen response is identical to the registered-address case (never confirming whether an address is registered); the address instead receives an email inviting the recipient to create an account, and no session is possible.

When a visitor submits `Create Account` with their email address, the account is created immediately in a pending/unverified state; the first successful login-link click activates it. 
Unactivated accounts can be cleaned up later, by a scheduled job, but the cleanup requirement is out of scope for this spec.  

When a visitor submits Create Account, the first login (activation) link is emailed automatically.  
Submit creates the pending account AND sends the first login link in one step; the user just checks their inbox. Counts toward the 2-per-15-min limit.

The system must also provide a way for a user to change their email address, which will require verification of the new email address.  
Of course, the user must be logged in to change their email address.  
This functionality will be provided on the `Display/Edit Profile` page, and will require the user to click a link in a validation email sent to the new email address before the change is made.  
The email address change will not be allowed if the new email address is already in use by another account, or if it is the account's own current address.

The email address change request will be limited to 2 requests per 15-minute window as implemented by BetterAuth's built-in rate limiting.  
Further requests are politely refused with a message that includes the time that the next request can be made.  

When an email address change completes, the system MUST send an informational notification (containing no action links) to the previous address stating that the account's email address was changed.

The verification emails link must be self-contained. The link alone completes the change, from any device or browser, signed in or not. Works with the single-session rule when the new inbox is on another device.
  
# SIMPLE WEB APP CLIENT
The minimum web app client will:  
- Render links in the header, when the user is not logged in, for:
    - Login
    - Create Account (for Native Auth)
- Render the `profileAvatar` in the header when the user is logged in.
- Render the `userName` in the header when the user is logged in.
- Provide a Login page that allows the user to login when using `Native Auth`.
    - the login page will have a field for the user to enter their email address
    - a checkbox for the user to select `"Stay signed in on this device"`
    - a button to submit the login request  
    (if the user somehow navigates to the Login page when already logged in, check the session in the Express route handler and redirect before sending login.html, the login.html should not even flash momentarily in the browser)
- Render a menu when the `profileAvatar` is clicked (only when logged in):
    - the profile menu will have an item to `Edit Profile`.  
    - the profile menu will have an item to `Logout`.  
    (the header will not have a `Login` or `Create Account` link when the user is logged in and  
    the header will not have a `Edit Profile` or `Logout` link when the user is logged in,  
    the `Edit Profile` and `Logout` links will only be available in the profile menu when the user is logged in)
- Provide a page to display and edit the user profile.

- Provide content that is only visible to logged in users (initially, just a simple message that says "You are logged in as <userName>")
- Provide content that is only visible to logged out users (initially, just a simple message that says "Guest-mode: You are not logged in")

Single session only Login: When a user does a `Login` that invalidates any existing session on other devices; at most one active session per user.

The `Display/Edit/ Profile` page will allow the user to edit their `userName`.   
The system will enforce uniqueness of the `userName` across all accounts. The `userName` becomes a unique handle; profile edits must check availability and reject duplicates with a clear message.  

The `Display/Edit Profile` page will also allow the user to change their email address, which will require re-verification of the new email address. The details of this requirement are described in the `EMAIL ADDRESS VALIDATION` section above. 

The `Display/Edit Profile` page will not need to be able to change the Avatar since the Avatar is provided by the `OAuth` provider, or is a default Avatar when `Native Auth` is used.  

# OTHER REQUIREMENTS

Provide startup instructions for installing and launching a development database on Windows 11 for development.

The app will be deployed with the following custom environment variables: 

- `APP_PORT`: HTTP port to access the webapp
- `APP_MONGODB_NAME`: name of the MongoDB database to use
- `APP_MONGODB_URI`: connection string for the MongoDB instance
- `APP_ADMINS`: a comma-separated list of a unique client identifier (email addresses) that are allowed to access any Administration Pages that may be created in the future.
- `APP_POLLING_INTERVAL`: the interval in milliseconds to poll the server when live real-time updated results are required
- `APP_SIGNIN_COOKIE_DURATION_MAX`: the duration in milliseconds that a user can stay signed in on a device before they need to sign in again
- `APP_SIGNIN_METHOD`: the method of signing in, either `native` or `oauth`
- `APP_BETTER_AUTH_SECRET`: the secret used by BetterAuth to sign the session cookies
- `APP_SMTP_HOST`: SMT host 
- `APP_SMTP_PORT`: "2525"
- `APP_SMTP_USER`: # <- your Mailtrap SMTP username
- `APP_SMTP_PASS`: # <- your Mailtrap SMTP password
- `APP_SMTP_FROM`: NativeAuthOAuth <no-reply@nativeauth.local>

Generate a `launch.json` file for the VSCode IDE that will launch the server and the database in debug mode.  
The `launch.json` file will set the following environment variables and default values:  
- `APP_PORT`: 9999
- `APP_MONGODB_NAME`: `app01`
- `APP_MONGODB_URI`: `mongodb://localhost:27017/app01`
- `APP_ADMINS`: `roadraceresults@gmail.com`
- `APP_POLLING_INTERVAL`: 5000
- `APP_SIGNIN_COOKIE_DURATION_MAX`: 2592000000 (30 days in milliseconds)
- `APP_SIGNIN_METHOD`: `native`
- `APP_BETTER_AUTH_SECRET`: "BetterAuth secret"
- `APP_SMTP_HOST`: "sandbox.smtp.mailtrap.io"
- `APP_SMTP_PORT`: "2525"
- `APP_SMTP_USER`: "Mailtrap SMTP username"
- `APP_SMTP_PASS`: "Mailtrap SMTP password"
- `APP_SMTP_FROM`: "NativeAuthOAuth <no-reply@nativeauth.local>"


  
These are set in the `launch.json` file so that they do not need to be set in the Windows environment variables.  
Automatically generate `APP_BETTER_AUTH_SECRET` as a random string of at least 32 characters.
Add an entry to `launch.json` to debug all the typescript files under the `.\tests` directory, with each entry setting the environment variables above.  
The `launch.json` file will be `.gitignored` so that it is not checked into source control.  
If there is a `launch.json.example` file it will also be `.gitignored`.

Create a powershell script that will set the environment variables listed above and launch the server on localhost.  
Also, the script will check if the MongoDB service is running, and if not, it will start the local MongoDB service before launching the server.  
The powershell script will be named `launch-dev.ps1`, will be placed in a directory `./devScripts`. 
Set the `APP_BETTER_AUTH_SECRET` environment variable to the same random string that was generated for the `launch.json` file.
Ensure that the `APP_BETTER_AUTH_SECRET` is the same in the `launch.json`, `launch-dev.ps1`.
`./devScripts` will be `.gitignored` so that it is not checked into source control.

If the `APP_BETTER_AUTH_SECRET` environment variable is not set, or is not 32 characters long, the system will not start and will throw an error. This requirements is for every environment, including development, staging, and production. The `APP_BETTER_AUTH_SECRET` is required for the BetterAuth library to sign the session cookies.

Generate an `openapi.json` file that describes the API endpoints for the system, including the request and response formats, and any required parameters.  
The `openapi.json` file will be used to generate API documentation and client SDKs.   
Place the `openapi.json` file in the directory `./postman`.

# ASSUMPTIONS

The app will be optimized to be deployed on DigitalOcean in the App Platform as a `Web Service` with a `Managed Database` for MongoDB.  
The app will be deployed in a single region, and the database will be deployed in the same region as the app.  
The app will be deployed with a custom domain name, and the database will be deployed with a custom subdomain name.  
The app will be deployed with `HTTPS` enabled, and the database will be deployed with `SSL` enabled.  

The Component Settings for the Web Service will be configured to Autodeploy from the dev branch of the repo `https://github.com/roadraceresults/nativeAuthOAuth`  

Standard semantic HTML is used, but no formal accessibility (WCAG/screen-reader/keyboard-nav) compliance is targeted.


# EXCLUSIONS

