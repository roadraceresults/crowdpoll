Start a new spec for these requirements called `20261029-150117-LOG-ENV-DEFAULTS`  
!! THIS FILE IS GENERATED USING THE SKILL `/speckit-requirements`. DO NOT EDIT OR DELETE THIS FILE !!  

# Initial High-Level Requirements

When the webapp server launches,  
Print a console log line if an environment variable is not found and the proram uses the default.  

The message should be:
ENV_NAME was not found, using default value: <default value>.



## Decisions

- **Log level (AM4)**: each line is written with `console.log` (stdout), like the other start-up lines; configuration errors stay on `console.error`.  
- **Where defaults are recorded (UA1)**: `loadConfig` records each default it uses in `AppConfig.defaultsUsed` (`{ name, value }`) and prints nothing;  
  only the web server's `startServer` prints the lines, so the developer scripts and the tests print nothing new.  
- **When and in what order (UA3)**: the lines are printed after the configuration loads and before `[server] Starting in …`, sorted by setting name;  
  when a setting is invalid, none are printed and the app stops with its one `[config]` error line, as today.  
- **Verification (UA4)**: unit tests on `loadConfig`: with only the required settings, every setting with a default is listed with its default;  
  a setting given a value is not listed;  
  an empty setting is listed exactly when the code uses its default (see AM2);  
  and one test checks the formatted line's exact text.  
- **Which settings are reported (AM1)**: both kinds.  
  A setting the code fills with a concrete value is reported with that value (e.g. `ENV_PORT` → `8080`).  
  A setting with no value, whose absence switches something off or picks a fallback, is reported as `none` followed by the behaviour in brackets:  
  - `ENV_VALKEY_URL`: `none (in-process cache, queue and registry)`  
  - `ENV_OPENSEARCH_URL`: `none (PostgreSQL full-text search)`  
  - `ENV_SPACES_*` (all five unset, as one line): `none (TRENDING objects and assets served from the instance)`  
  - `ENV_DATABASE_CA_CERT`: `none (system certificate roots)`  
  - `ENV_ALLOWED_EMAILS`: `none (allowlist off: everyone may sign in)`  
  - `ENV_EMAIL_ASSET_ORIGIN`: `none (each link's own origin)`  
  - `ENV_PROTOTYPES`: `none (no prototypes served)`  
  - `ENV_STAY_SIGNED_IN`: `0 (the Stay signed in box starts clear)`  
  - `ENV_SMTP_USER` / `ENV_SMTP_PASS`, only with `smtp`: `none (emails logged to the console, not sent)`  
  - each sign-in provider's `ENV_OAUTH_<PROVIDER>_*` (all unset, as one line), only with `oauth` or `both`: `none (<Provider> sign-in off)`  
  Required settings (`ENV_BETTER_AUTH_SECRET`, `ENV_PUBLIC_ORIGIN`, `ENV_SES_*` with `ses`) have no default and still stop the app when absent.  
- **Empty values (AM2)**: a setting is reported exactly when the code uses its default, as it does today;  
  for numbers and the settings read as optional, an empty value counts as absent;  
  for the six text settings read with `??`, an empty value is used as it is and is not reported.  
  No behaviour changes.  
- **The line (AM3)**: `[config] ENV_PORT was not found, using default value: 8080.`;  
  the `[config]` prefix, the value written as the code holds it, unquoted and without separators, then a period.  
- **Settings not in effect (UA2)**: a default is reported only while its setting is in effect;  
  `ENV_SMTP_HOST`, `ENV_SMTP_PORT`, `ENV_SMTP_USER` and `ENV_SMTP_PASS` only with `ENV_EMAIL_TRANSPORT=smtp`, and the `ENV_OAUTH_*` settings only with `ENV_SIGNIN_METHOD` `oauth` or `both`.  
- **Addresses (NC1)**: the `ENV_ADMINS` default is masked with `maskAddress` (`r•••@gmail.com`), so no full address reaches the logs.  
- **Volume (NC2)**: one line per setting, as requested, however many are missing.  
