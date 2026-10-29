# Contract: Start-up Default Lines

The operator-facing interface of this feature is the web server's start-up log.  

## L1. The line

```
[config] <NAME> was not found, using default value: <VALUE>.
```

- `<NAME>`: the setting, or a group with `*` (`ENV_SPACES_*`, `ENV_OAUTH_GOOGLE_*`, `ENV_OAUTH_APPLE_*`, `ENV_OAUTH_MICROSOFT_*`, `ENV_OAUTH_AMAZON_*`).  
- `<VALUE>`: the default as the server holds it, unquoted, without separators; `ENV_ADMINS` masked per address (`r•••@gmail.com`); for a setting with no value, the FR-004 wording of the spec (e.g. `none (PostgreSQL full-text search)`).  
- Followed by a period, written to standard output (`console.log`).  

Examples:  

```
[config] ENV_ADMINS was not found, using default value: r•••@gmail.com.
[config] ENV_MAX_SIGNIN_COOKIE_DURATION was not found, using default value: 2592000000.
[config] ENV_OAUTH_APPLE_* was not found, using default value: none (Apple sign-in off).
[config] ENV_SPACES_* was not found, using default value: none (TRENDING objects and assets served from the instance).
[config] ENV_VALKEY_URL was not found, using default value: none (in-process cache, queue and registry).
```

## L2. When and in what order

1. `loadConfig` succeeds.  
2. One L1 line per `defaultsUsed` entry, sorted by name.  
3. `[server] Starting in <method> sign-in mode` and every later line, unchanged.  

When `loadConfig` throws, only the existing `[config] Invalid …` line is printed (stderr) and the process exits with code 1.  

## L3. What is never printed

- A setting given a value; an empty text setting read with `??` (`ENV_ADMINS=""` and the like).  
- `ENV_SMTP_*` unless `ENV_EMAIL_TRANSPORT` is `smtp`; `ENV_OAUTH_*` unless `ENV_SIGNIN_METHOD` is `oauth` or `both`.  
- Required settings; a full email address.  
- Anything from the developer scripts or the tests.  
- Existing lines, such as `[mailer] ENV_SMTP_USER/ENV_SMTP_PASS not set …` and `[db] ENV_DATABASE_CA_CERT is not set …`, stay as they are.  
