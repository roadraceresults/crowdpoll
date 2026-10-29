# Research: Log Settings Left at Their Defaults

Feature: `specs/20261029-150117-LOG-ENV-DEFAULTS/spec.md`  
Requirements: `requirements/20261029-150117-log-env-defaults/requirements.md` (Decisions section)  

The Technical Context has no unknowns: the stack is the existing one, and every behaviour is fixed by the spec.  
The research below settles how the change is made in the code that exists.  

## R1. How `loadConfig` records the defaults it uses

- **Decision**: `loadConfig` builds one list, `defaultsUsed`, through a reader made at its start: `const read = settingsReader(env)`, whose `int`, `nonNegativeInt` and `text` methods are today's `intVar`, `nonNegativeIntVar` and the six `env.X ?? fallback` reads, each pushing `{ name, value: String(fallback) }` when it returns the fallback.  
  Call sites change from `intVar(env, "ENV_PORT", 8080)` to `read.int("ENV_PORT", 8080)`; the parsing and error messages are unchanged.  
  The list is returned on `AppConfig` as `defaultsUsed`, sorted by name.  
- **Rationale**: the default is known only where it is substituted, so recording it there is the one place that cannot drift from the value in force (TD1).  
  A reader keeps the list local to one call: no module state, `loadConfig` still prints nothing (FR-011).  
- **Alternatives considered**:  
  - a fourth `defaults` argument on every helper call — the same 60 edits, each call one argument longer;  
  - a module-level list reset by `loadConfig` — shared mutable state across the tests' many calls;  
  - computing the list afterwards from a separate table of defaults — a fifth copy of every default (TD1).  

## R2. The settings with no value ("none")

- **Decision**: recorded explicitly in `loadConfig` beside the code that already decides each fallback, with the wording of the spec's FR-004 table:  
  `ENV_VALKEY_URL`, `ENV_OPENSEARCH_URL`, `ENV_DATABASE_CA_CERT`, `ENV_EMAIL_ASSET_ORIGIN` when `optionalVar` returns `undefined` (absent or empty);  
  `ENV_ALLOWED_EMAILS` and `ENV_PROTOTYPES` when the parsed list is empty (both split on commas and drop blank entries, so absent, `""` and `" , "` all leave the default in force);  
  `ENV_STAY_SIGNED_IN` when absent or empty;  
  `ENV_SPACES_*` in `spacesConfig` when all five are unset;  
  `ENV_OAUTH_<PROVIDER>_*` in `oauthProvidersOf` when all of a provider's values are unset;  
  `ENV_SMTP_USER` and `ENV_SMTP_PASS`, each when absent or empty (the mailer's `config.smtp.user && config.smtp.pass` treats an empty credential as not set).  
- **Rationale**: each of these already has one line that decides "unset"; recording there keeps "not found" exactly the code's own test (FR-007).  
- **Alternatives considered**: a generic `optionalVar` that records — it cannot know the behaviour text, and `ENV_SES_*` and the provider values use it too.  

## R3. Settings not in effect

- **Decision**: after the reads, entries whose name starts with `ENV_SMTP_` are dropped unless the transport is `smtp`; the `ENV_OAUTH_*` entries need no filter, because `oauthProvidersOf` is only called for `oauth` and `both`.  
- **Rationale**: one condition, at one place, covering the four SMTP settings (FR-006).  
- **Alternatives considered**: skipping the SMTP reads under `ses` — would change `AppConfig.smtp`, which the mailer and tests read.  

## R4. Formatting and masking

- **Decision**: `startServer` prints the lines through a new exported `defaultsUsedLines(config): string[]` in `src/server.ts`, beside `providerList`; it writes `[config] <name> was not found, using default value: <value>.` and passes `ENV_ADMINS`' value, split on commas, through the existing `maskAddress` (`src/email/mailer.ts`).  
  The lines are printed with `console.log` right after `loadConfig` succeeds and before `[server] Starting in …`.  
- **Rationale**: `server.ts` already imports the mailer, so the mask is reused without `config.ts` importing nodemailer at run time (the scripts load `config.ts`).  
  Masking by name keeps `ENV_EMAIL_FROM` (the service's own sender) in full, as the spec's Assumptions say.  
- **Alternatives considered**: masking every value that looks like an address — `ENV_EMAIL_FROM`'s display form would need a parser, and no other default holds an address.  

## R5. Empty values

- **Decision**: unchanged parsing decides it: `int`/`nonNegativeInt` and `optionalVar` treat `""` as absent and record; `text` (the six `??` reads) records only on `undefined`.  
- **Rationale**: the spec's FR-007 and the AM2 decision: report exactly when the default is used, change no behaviour.  

## R6. Tests and documentation

- **Decision**: `tests/config.test.ts` gains a `defaultsUsed` block (every default with only the required settings; a given value not listed; empty number vs empty text; SMTP only with `smtp`; OAuth groups only with `oauth`/`both`; Spaces as one line; sorted) and a `defaultsUsedLines` test (exact text, masked `ENV_ADMINS`).  
  `README.md` (Configuration) and `ARCHITECTURE.md` (start-up sequence) each gain one line; `CLAUDE.md`'s plan block points to this plan.  
- **Rationale**: Constitution IV and the Documentation Deliverables; no server start is needed to test.  
