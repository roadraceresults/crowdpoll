# Implementation Plan: Multiple Account Prevention

**Branch**: `multiple-account-prevention` | **Date**: 2026-11-05 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/20261105-162941-MULTIPLE-ACCOUNT-PREVENTION/spec.md`

## Summary

Start collecting evidence for the later detection of one person voting from several accounts, without changing anything a voter sees.

- A new table, `device_events`, holds one row per accepted vote and one per session: account, event, poll, time, two keyed hashes and a version.
- `deviceEvidence.js` computes a browser value and a hardware value with a vendored FingerprintJS 5.3.0, with its usage statistics off (R2), and they travel in one request header (R4).
- Vote events ride the vote stream into `writeBatch`, so the path keeps its no-write-per-vote design (R6); sign-in events use one new route, called once per session (R7).
- Rows go with their account and poll, and whole months are dropped once 3 months past (R9, R10).
- The Privacy Policy and Terms are corrected and take a new version; collection is off until one setting is turned on (R11).

## Technical Context

**Language/Version**: TypeScript on Node ≥ 22 (ESM); plain browser JavaScript (IIFE, no bundler).

**Primary Dependencies**: no npm dependency added. One vendored browser file, `@fingerprintjs/fingerprintjs` 5.3.0 (MIT).

**Storage**: PostgreSQL, one new partitioned table (migration `019-device-events`); one Valkey key per session; nothing in the browser.

**Testing**: Vitest on embedded PostgreSQL with supertest; jsdom client tests through `tests/helpers/browser.ts`, with `FingerprintJS` stubbed; `m3-assets.test.ts` for the pages' scripts; `legal-pages.test.ts` for the wording. Real-browser checks are in `quickstart.md`.

**Target Platform**: DigitalOcean App Platform (`web`), current desktop and mobile browsers.

**Project Type**: web application (Express server, static pages under `src/public/`).

**Performance Goals**: time to see a vote's result grows by no more than 5% (SC-004): one HMAC pair and three more stream fields per vote; a fingerprint is computed at idle and never awaited; no extra request per page once a session has reported.

**Constraints**: no third-party request; no cookie or storage key kept; no database write per vote; raw values never queued, stored or logged; the terms gate before any collection.

**Scale/Scope**: one row per accepted vote, kept about 4 months; 1 new route, 2 settings, 1 secret, 1 script, 1 vendored file, 1 table.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Check | Status |
|---|---|---|
| I. Think Before Coding | 16 requirements findings and 2 clarifications settled; R1–R12 record each choice and its alternative; R2 and R3 surface what reading the package revealed. | Pass |
| II. Simplicity First | No screen, export or analysis; no new sweep (the retention sweep logs the count); a code constant instead of a third setting; the existing partition pattern. | Pass |
| III. Surgical Changes | The vote path gains one optional field; the partition helper takes a table name; other pages and the session snapshot are untouched. | Pass |
| IV. Goal-Driven Execution | Each FR maps to a test or a quickstart scenario; a pinned test guards `monitoring: false`. | Pass |
| V. Code Quality | Small single-purpose units: parse the header, hash, record. Every browser failure is swallowed and leaves voting intact; nothing sensitive reaches the browser console or the server log; the server logs counts. | Pass |
| VI. Self-Documenting Code | No comments citing specs or tasks; a comment only links the library's API docs. | Pass |
| Security, privacy | Keyed hashes under a deployment secret; the key is never logged or sent; no new access path; disclosure and acceptance precede collection. | Pass |
| Third-party libraries | The constitution allows a mature library; it is pinned, MIT and served by us. | Pass |
| Documentation deliverables | README (the policy's new section, the setting) and ARCHITECTURE (the path, the table) updated after implementation. | Planned |

Post-design re-check (after Phase 1): unchanged, all pass.

## Project Structure

### Documentation (this feature)

```text
specs/20261105-162941-MULTIPLE-ACCOUNT-PREVENTION/
├── plan.md
├── research.md            # R1–R12
├── data-model.md          # device_events, stream fields, cache key, settings
├── quickstart.md          # Q1–Q17, turning it on, privacy requests
├── contracts/
│   ├── api.md             # A1–A5
│   └── ui-contracts.md    # C1–C6
├── checklists/requirements.md
└── tasks.md               # /speckit-tasks
```

### Source Code (repository root)

```text
src/
├── db/
│   ├── migrations/019-device-events.ts     # new; registered in index.ts
│   ├── partitions.ts                       # generalised to a named table
│   └── schema.ts                           # DeviceEventsTable
├── votes/
│   ├── deviceEvents.ts                     # new: parse the header, keyed hash, sign-in record, row builder
│   ├── votePath.ts                         # optional device field; three stream fields
│   └── consumer.ts                         # parseEntry; rows inserted in writeBatch
├── routes/
│   ├── pollsApi.ts                         # the vote route reads the header
│   └── api.ts                              # /api/me header, POST /api/me/device-login, /api/config flag
├── polls/
│   ├── store.ts                            # deletePoll deletes its events
│   └── sweeps.ts                           # partitions, retention, the coverage line
├── legal/
│   ├── deleteAccount.ts                    # by account and by own polls
│   └── version.ts                          # new TERMS_VERSION
├── config.ts                               # two settings
└── public/
    ├── vendor/fingerprintjs-5.3.0.min.js   # new, vendored
    ├── deviceEvidence.js                   # new
    ├── voteClient.js, app.js               # the header; the due flag
    ├── index, profile, settings, admin, admin-results .html   # one script tag
    └── privacy.html, terms.html            # C4–C6

.gitignore                                                  # an exception for the vendored file
infra/app.tf, variables.tf, secrets.auto.tfvars.example     # the setting and the secret
.claude/rules/environment.md, launch.json.example, devScripts.example/launch-dev.ps1
postman/openapi.json
tests/device-events.test.ts                 # new: server behaviour
tests/client-device-evidence.test.ts        # new: browser behaviour
tests/m3-assets.test.ts, legal-pages.test.ts, account-deletion.test.ts, privacy-minimization.test.ts   # extended
```

**Structure Decision**: the existing single-project layout; server code for this feature stays in `src/votes/deviceEvents.ts`, since its main path is the vote path.

## Complexity Tracking

No constitution violation to justify.
