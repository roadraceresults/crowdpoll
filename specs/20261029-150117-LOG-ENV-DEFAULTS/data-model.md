# Data Model: Log Settings Left at Their Defaults

In memory only: no table, column, cache key, cookie, storage key or migration.  

## DefaultUsed

One setting that was not found and was filled in by `loadConfig`.  

| Field | Type | Rule |
|---|---|---|
| `name` | `string` | The setting's name (`ENV_PORT`), or a group's name with `*` (`ENV_SPACES_*`, `ENV_OAUTH_GOOGLE_*`) |
| `value` | `string` | The default as the code holds it (`String(fallback)`: `8080`, `2592000000`, `CrowdPoll <no-reply@mail.crowdpoll.vote>`), or `none (<behaviour>)` / `0 (<behaviour>)` from the spec's FR-004 table; never masked here |

## AppConfig.defaultsUsed

`readonly DefaultUsed[]`, on the existing `AppConfig`.  

- Sorted by `name`; each name at most once.  
- Built by every `loadConfig` call; never printed by it.  
- Holds an `ENV_SMTP_*` entry only when `emailTransport` is `smtp`, and `ENV_OAUTH_*` entries only when `oauthSignin` is true.  
- Never holds a required setting (`ENV_BETTER_AUTH_SECRET`, `ENV_PUBLIC_ORIGIN`, `ENV_SES_*`), a setting given a value, or an empty text setting read with `??`.  
- Read only by `startServer` (through `defaultsUsedLines`) and the tests.  
