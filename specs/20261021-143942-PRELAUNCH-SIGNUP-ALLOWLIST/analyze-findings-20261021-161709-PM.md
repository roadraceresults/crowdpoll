# Specification Analysis Report — specs/20261021-143942-PRELAUNCH-SIGNUP-ALLOWLIST

## Record

| Record | Value |
|---|---|
| Feature directory | specs/20261021-143942-PRELAUNCH-SIGNUP-ALLOWLIST |
| Report created | 2026-10-21 035556 PM |
| Analysis captured | 2026-10-21 035556 PM |
| Last updated | 2026-10-21 040116 PM |

A finding is open until this skill marks it ✅ Resolved. To accept a recommendation, mark its box `[X] Accepted`, save
the file, and Type or Say "Next" — or Type or Say "Accept". Do not mark findings resolved yourself.
Findings are listed CRITICAL → HIGH → MEDIUM → LOW; within a severity, in the order the report gave them.
"Next" always returns the first open finding below.

## Findings

### **U1** · Underspecification · MEDIUM · tasks.md T012, T013, T014  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-10-21 4:01 PM  
  **Notes**: Recommendation accepted by "Accept all" 2026-10-21: Recommendation, T012 now issues the earlier link with `auth.api.signInMagicLink` directly, T013 reuses that token, and T014 makes the earlier session with `forgeSession`; all in one context with the list on.  

  The tests need a sign-in link and a session for an unlisted address that existed "before the list applied", but each test context reads the list once at startup. T012 says "start a second context, or rebuild config"; T014 doesn't say how.  

  - **Recommendation**: Spell it out. In one context with the list on, create the earlier link by calling `auth.api.signInMagicLink` directly (it bypasses the route's check), and the earlier session with the existing `forgeSession` helper (`tests/helpers/setup.ts`).  

    ➡️ [X] **Accepted**  
    - T012, T013 and T014 then name exactly how their "before the list" state is made, with no second context to start.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **C1** · Coverage Gap · MEDIUM · spec.md Edge Cases (social sign-in); research.md R3; tasks.md T019, T020  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md research.md contracts/ui-contracts.md Updated: 2026-10-21 4:01 PM  
  **Notes**: Recommendation accepted in file 2026-10-21: Recommendation B, new task T033 in Phase 4 (US2): the social sign-in gets `/login` as its error callback, a stubbed-provider test pins the error value BetterAuth passes for the hook's refusal, and the login card shows the message for it; research.md R3 and contracts/ui-contracts.md C2 say so. The spec's edge case stands as written.  

  The spec says that in the social sign-in mode "the login page shows the 'not launched' message". The tasks only refuse the session (T019). BetterAuth's OAuth error redirect doesn't produce `?error=not-launched`, and research R3 defers the mapping until OAuth is switched on.  

  - **Recommendation A** _(recommended)_: Reword the spec's edge case: the session is refused in the social mode, and showing the message there is deferred until that mode is enabled (R3).  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: matches what can be built and tested today; social sign-in is not enabled (providers not approved).  
    - <u>Cons</u>: a later feature must add the message when OAuth is switched on.  

  - **Recommendation B**: Add a task to map BetterAuth's OAuth error redirect to `/login?error=not-launched` now.  

    ➡️ [X] **Accepted**  
    - <u>Pros</u>: the spec's edge case holds as written.  
    - <u>Cons</u>: built and tested against a sign-in mode no one can use yet, with no real provider to confirm BetterAuth's redirect.  

  - **Developer Resolution C**:  

    ➡️ [ ] **Accepted**  

### **A1** · Ambiguity · MEDIUM · tasks.md T020, T027; contracts/ui-contracts.md  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-10-21 4:01 PM  
  **Notes**: Recommendation accepted by "Accept all" 2026-10-21: Recommendation, T015 and T024 now assert the card text equals `NOT_LAUNCHED_MESSAGE` imported from `src/auth/allowlist.ts`.  

  The Login and Profile cards must show the server's message text, which they can't import, so the string will be copied into two browser files and could drift from `NOT_LAUNCHED_MESSAGE`.  

  - **Recommendation**: In T015 and T024, assert that the card's text equals `NOT_LAUNCHED_MESSAGE` imported from `src/auth/allowlist.ts`, so any drift fails a test.  

    ➡️ [X] **Accepted**  
    - The copies stay, but a test pins them to the server's constant.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **I1** · Inconsistency · LOW · spec.md FR-015; contracts/api.md  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ spec.md Updated: 2026-10-21 4:01 PM  
  **Notes**: Recommendation accepted by "Accept all" 2026-10-21: Recommendation, FR-015 now says "the endpoints and redirects that can return it (contracts A1–A6)".  

  FR-015 says the refusal is documented on "the three endpoints that can return it". The contracts and T028 document four `403`s (create-account, request-login-link, email-change, confirm-signin) plus two redirects.  

  - **Recommendation**: Amend FR-015 to "the endpoints and redirects that can return it (contracts A1–A6)".  

    ➡️ [X] **Accepted**  
    - One phrase in FR-015; the contracts and T028 are already right.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **I2** · Inconsistency · LOW · spec.md FR-015 ("unset in the templates"); research.md R7; tasks.md T022  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ spec.md Updated: 2026-10-21 4:01 PM  
  **Notes**: Recommendation accepted by "Accept all" 2026-10-21: Recommendation, FR-015 now says the templates list the setting "with an empty value (off)".  

  The spec says the templates leave the setting unset; the tasks add it with an empty value. Both mean off (FR-002), but the words differ.  

  - **Recommendation**: Amend FR-015 to "listed with an empty value (off)".  

    ➡️ [X] **Accepted**  
    - One phrase in FR-015; R7 and T022 are already right.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **E1** · Efficiency · LOW · tasks.md T017  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-10-21 4:01 PM  
  **Notes**: Recommendation accepted by "Accept all" 2026-10-21: Recommendation, T017 reads `pendingLink(token)` only when `config.allowedEmailKeys` is set.  

  T017 reads `pendingLink(token)` on every verify, adding a query to the fast path even when the list is off.  

  - **Recommendation**: Read it only when `config.allowedEmailKeys` is set, as T019 does for the session hook.  

    ➡️ [X] **Accepted**  
    - With the list off, verify makes exactly today's queries.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **L1** · Layering · LOW · tasks.md T006  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md research.md data-model.md Updated: 2026-10-21 4:01 PM  
  **Notes**: Recommendation accepted by "Accept all" 2026-10-21: Recommendation, T006, research.md R2 and data-model.md's rule now compare against `config.admins` directly; `src/auth/` imports nothing from `src/polls/`.  

  `src/auth/allowlist.ts` would import `isAdminEmail` from `src/polls/service.ts`, so an auth module would depend on the polls service.  

  - **Recommendation**: Compare against `config.admins` directly (already trimmed and lower-cased), as `isAdminEmail` does, and keep `src/auth/` independent of `src/polls/`.  

    ➡️ [X] **Accepted**  
    - Changes T006, `research.md` R2 and `data-model.md`'s rule to name `config.admins`.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **G1** · Coverage Gap · LOW · spec.md FR-014, SC-004  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ Files Unchanged (no edit needed): 2026-10-21 4:01 PM  
  **Notes**: Recommendation accepted in file 2026-10-21: Recommendation A, accepted as covered: the unchanged suite (T031) and the in-memory check; no file changed.  

  No task explicitly tests that guests are unaffected (FR-014) or that a refusal adds no wait (SC-004).  

  - **Recommendation A** _(recommended)_: Accept as covered: with the list off the existing suite is unchanged (T031); with it on, guests take no route that calls `isAllowed`, and the check is an in-memory set lookup.  

    ➡️ [x] **Accepted**  
    - <u>Pros</u>: no extra test for behaviour no code path changes.  
    - <u>Cons</u>: FR-014 stays implicitly covered.  

  - **Recommendation B**: Optionally add one guest page load with the list on to T021.  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: FR-014 gets an explicit test.  
    - <u>Cons</u>: one more test, checking a path the feature does not touch.  

  - **Developer Resolution C**:  

    ➡️ [ ] **Accepted**  

## Coverage Summary

| Requirement Key | Has Task? | Task IDs | Notes |
|-----------------|-----------|----------|-------|
| FR-001 setting read | ✅ | T001, T005 | |
| FR-002 off = today | ✅ | T001, T009, T031 | |
| FR-003 invalid entry stops | ✅ | T001, T005 | |
| FR-004 startup log | ✅ | T007, T021 | |
| FR-004a refusal log | ✅ | T006, T008, T011, T013, T023 | |
| FR-005 same-mailbox match | ✅ | T002, T003, T004 | |
| FR-006 admins | ✅ | T003, T021 | L1 |
| FR-007 create-account | ✅ | T008, T010 | |
| FR-008 login request | ✅ | T011, T016 | |
| FR-009 any sign-in path | ✅ | T012, T013, T017–T019 | U1, C1 |
| FR-010 email change | ✅ | T023, T025, T026 | |
| FR-011 message shown | ✅ | T006, T015, T020, T024, T027 | A1 |
| FR-012 existing checks first | ✅ | T008 (honeypot), T010, T016, T025 | |
| FR-013 sessions untouched | ✅ | T014 | U1 |
| FR-014 guests unchanged | ⚠️ implicit | T031 | G1 |
| FR-015 docs and templates | ✅ | T022, T028, T029, T030 | I1, I2 |
| FR-016 list kept private | ✅ | quickstart §2, T032 | no code by design (R7) |
| SC-001 refusals | ✅ | T008, T011–T013, T023 | |
| SC-002 listed unaffected | ✅ | T008, T011, T021, T023 | |
| SC-003 suite unchanged | ✅ | T031 | |
| SC-004 no added wait | ⚠️ implicit | | G1 |
| SC-005 no address in repo or log | ✅ | T021, R7 | |

## Constitution Alignment Issues

None. Principles I–VI pass; the Documentation Deliverables are covered by T030; no new code comments are planned.

## Unmapped Tasks

None. T032 (quickstart) maps to every story.

## Metrics

- Total Requirements: 22 (17 FR, counting FR-004a, plus 5 SC)
- Total Tasks: 32
- Coverage: 100% with at least one task (FR-014 and SC-004 implicitly)
- Ambiguity Count: 1
- Duplication Count: 0
- Critical Issues Count: 0

## Next Actions (as reported)

- There are no CRITICAL or HIGH findings, so you can go ahead with `/speckit-implement`.
- Resolving the three MEDIUM findings (U1, A1, C1) first would make the tests and the spec say exactly what will be built. They're edits to `tasks.md` (U1, A1) and to `spec.md`'s social-mode edge case (C1).
- The LOW findings (I1, I2, E1, L1, G1) are one-line edits to FR-015, T017 and T006.
- To capture this report and work through it: `/speckit-analyze-findings`.
