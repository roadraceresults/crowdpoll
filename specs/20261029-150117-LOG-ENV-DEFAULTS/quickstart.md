# Quickstart: Log Settings Left at Their Defaults

## Prerequisites

- A local PostgreSQL, as for `npm run dev`.  
- `devScripts/launch-dev.ps1` (your git-ignored copy of `devScripts.example/launch-dev.ps1`).  

## 1. Tests

```
npx tsc --noEmit
npx vitest run tests/config.test.ts
npm test
```

Expected: no type error; the `defaultsUsed` and `defaultsUsedLines` tests pass; the whole suite passes and prints no `was not found` line (SC-005).  

## 2. A bare start (SC-001, SC-004)

In a new PowerShell window with no `ENV_*` set but the two required ones:  

```
$env:ENV_BETTER_AUTH_SECRET = "<32+ characters>"
$env:ENV_PUBLIC_ORIGIN = "http://localhost:8080"
npm run dev
```

Expected, before `[server] Starting in native sign-in mode`: one `[config] … was not found, using default value: ….` line per setting with a default, sorted by name, including  
`[config] ENV_PORT was not found, using default value: 8080.`,  
`[config] ENV_ADMINS was not found, using default value: r•••@gmail.com.` and  
`[config] ENV_VALKEY_URL was not found, using default value: none (in-process cache, queue and registry).`  
No `ENV_OAUTH_*` line (native mode); `ENV_SMTP_HOST`, `ENV_SMTP_PORT`, `ENV_SMTP_USER`, `ENV_SMTP_PASS` lines present (transport `smtp`); the `[mailer]` and `[db]` lines still follow.  
Search the window for `was not found, using default value` to list them all.  

## 3. A given value is not reported (SC-002)

Stop, set `$env:ENV_PORT = "9090"`, start again.  
Expected: no line names `ENV_PORT`; the server listens on 9090.  

## 4. Production-like settings (SC-003)

Run `devScripts/launch-dev.ps1` (it sets `ENV_EMAIL_TRANSPORT=ses`).  
Expected: no `ENV_SMTP_*` line, no full email address in any `[config]` line, and only the settings the script leaves out are reported; settings the script sets to `""` count as left out (PowerShell removes them).  

## 5. An invalid setting

Set `$env:ENV_PORT = "abc"` and start.  
Expected: only `[config] Invalid ENV_PORT: "abc" — expected a positive integer.`, then exit; no default line.  

## 6. Scripts stay quiet

```
npm run reconcile
```

Expected: no `was not found` line.  
