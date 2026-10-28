# Specification Analysis Report — specs/20261022-131728-SOCIAL-OAUTH-PROVIDERS

## Record

| Record | Value |
|---|---|
| Feature directory | specs/20261022-131728-SOCIAL-OAUTH-PROVIDERS |
| Report created | 2026-10-22 021138 PM |
| Analysis captured | 2026-10-22 021138 PM |
| Last updated | 2026-10-22 021536 PM |

A finding is open until this skill marks it ✅ Resolved. To accept a recommendation, mark its box `[X] Accepted`, save
the file, and Type or Say "Next" — or Type or Say "Accept". Do not mark findings resolved yourself.
Findings are listed CRITICAL → HIGH → MEDIUM → LOW; within a severity, in the order the report gave them.
"Next" always returns the first open finding below.

## Findings

### **I1** · Inconsistency · HIGH · plan.md Constraints; tasks.md T024; CLAUDE.md "Cookie banner"; privacy.html "In short"  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ plan.md research.md tasks.md Updated: 2026-10-22 2:15 PM  
  **Notes**: Recommendation accepted in file 2026-10-22: Recommendation, the `state` cookie is accepted as strictly necessary and named `oauth_state`: plan.md Constraints and research.md R11 state it; T024 now adds it unconditionally to Cookie Use, the "In short" line and CLAUDE.md and sets its name in `auth.ts`.  

  BetterAuth sets a signed `state` cookie for 5 minutes on every OAuth sign-in, even with database state storage (`better-auth/dist/state.mjs` lines 61–62). The plan and T024 treat it as "if"; the project rule says no other cookies may be added, and the published policy says "Nothing else".  

  - **Recommendation**: Make it certain: accept it as a strictly necessary security cookie (like `signin_binding`), name it `oauth_state` (BetterAuth's `cookieName` setting), and in T024 add it unconditionally to the Cookie Use table, the "In short" line and CLAUDE.md's cookie policy.  

    ➡️ [x] **Accepted**  
    It exists only during the round trip to the provider, protects the sign-in against forgery, and is set only in `oauth` and `both` modes; no consent is needed for a strictly necessary cookie.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **C1** · Coverage · HIGH · tasks.md T009; tests/helpers/setup.ts  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-10-22 2:15 PM  
  **Notes**: Recommendation accepted in file 2026-10-22: Recommendation, T009 clears the harness's `terms_version` default before asserting the redirect to `/accept-terms`.  

  The test harness defaults `terms_version` to `TERMS_VERSION` for every user, so a new provider account in T009 counts as accepted and "the next page load redirects to /accept-terms" cannot pass.  

  - **Recommendation**: In T009, clear the default for the new user (or the column default in that suite) before asserting the redirect, and say so in the task.  

    ➡️ [x] **Accepted**  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **C2** · Coverage · MEDIUM · tasks.md T003, T005; tests/signin-mode, allowlist, client-login-pid, client-not-launched, client-terms-box  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-10-22 2:15 PM  
  **Notes**: Recommendation accepted in file 2026-10-22: Recommendation, T005 gives the five `oauth`-mode suites a Google client id and secret.  

  R4 makes `oauth`/`both` with no provider a start-up error; five existing suites start `ENV_SIGNIN_METHOD: "oauth"` with no provider, and no task updates them.  

  - **Recommendation**: Add to T005: give those suites a Google client id and secret in their `startTestContext` overrides.  

    ➡️ [x] **Accepted**  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **U1** · Underspecification · MEDIUM · spec.md Edge Cases ("unverified email"), FR-013; tasks.md T013  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-10-22 2:15 PM  
  **Notes**: Recommendation accepted in file 2026-10-22: Recommendation, T013 asserts that a Microsoft profile with `email_verified: false` is refused and not linked.  

  No test covers a provider that reports the email as *unverified*; T013 covers an unverified *local* account only.  

  - **Recommendation**: Add to T013: a stubbed Microsoft profile with `email_verified: false` matching an existing account → refused, no link.  

    ➡️ [x] **Accepted**  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **U2** · Underspecification · MEDIUM · spec.md FR-007; data-model.md  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ spec.md data-model.md tasks.md Updated: 2026-10-22 2:15 PM  
  **Notes**: Recommendation accepted in file 2026-10-22: Recommendation, FR-007 and data-model.md state that an email change keeps the provider link and is not overwritten by the next provider sign-in; T013 asserts it.  

  In `both`, a user signed in through Google can still use email change on the Profile page. The spec does not say what happens to the Google link, and the account's address then differs from Google's.  

  - **Recommendation**: State it: the link stays (it is keyed by the provider's user id); the next Google sign-in still opens the account, and the address is not overwritten; assert it in T013.  

    ➡️ [x] **Accepted**  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **C3** · Coverage · LOW · spec.md Edge Cases  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-10-22 2:15 PM  
  **Notes**: Recommendation accepted in file 2026-10-22: Recommendation A, T009 adds the no-email and revoked-credentials cases, T013 the no-overwrite case, T018 Apple's name-only-once case.  

  The edge cases "no email returned", "credentials revoked", "Apple's name only on first sign-in" and "address changed at the provider" have no task.  

  - **Recommendation A** _(recommended)_: Add one assertion each to T009/T018 (stubs make them cheap).  

    ➡️ [x] **Accepted**  
    - <u>Pros</u>: every listed edge case is proven by a test.  
    - <u>Cons</u>: four more stubbed scenarios to write.  

  - **Recommendation B**: Leave them to the manual check in T029.  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: smaller test work now.  
    - <u>Cons</u>: some (revoked credentials) are hard to reproduce by hand.  

  - **Developer Resolution C**:  

    ➡️ [ ] **Accepted**  

### **I2** · Inconsistency · LOW · spec.md US1 ("Sign in with Amazon") vs FR-008, contracts/ui-contracts.md C1 ("Login with Amazon")  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ spec.md Updated: 2026-10-22 2:15 PM  
  **Notes**: Recommendation accepted in file 2026-10-22: Recommendation, US1 now says "Login with Amazon".  

  The Amazon button wording differs between the story and the contract; Amazon's own guidelines use "Login with Amazon".  

  - **Recommendation**: Use "Login with Amazon" in US1.  

    ➡️ [x] **Accepted**  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **A1** · Ambiguity · LOW · spec.md SC-001  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-10-22 2:15 PM  
  **Notes**: Recommendation accepted in file 2026-10-22: Recommendation A, T029 times a provider sign-in against SC-001.  

  "Under 30 seconds and two clicks" is not measured by any task.  

  - **Recommendation A** _(recommended)_: Leave it to the manual check in T029.  

    ➡️ [x] **Accepted**  
    - <u>Pros</u>: keeps a user-facing target.  
    - <u>Cons</u>: not automated.  

  - **Recommendation B**: Drop the time from SC-001.  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: every criterion is checked automatically.  
    - <u>Cons</u>: loses the usability target.  

  - **Developer Resolution C**:  

    ➡️ [ ] **Accepted**  

## Coverage Summary

| Requirement Key | Has Task? | Task IDs | Notes |
|-----------------|-----------|----------|-------|
| FR-001 four providers | Yes | T003, T005, T006, T020 | |
| FR-002 identity scopes only | Yes | T006, T009, T020 | |
| FR-003 settings rule | Yes | T003, T005, T007 | existing suites (C2) |
| FR-004 origin, redirect URIs | Yes | T003, T005, T006, T009, T018 | |
| FR-005 Apple secret | Yes | T017, T019, T021 | |
| FR-006 – FR-007 modes | Yes | T004, T008, T015, T016 | email change while linked (U2) |
| FR-008 – FR-010 buttons | Yes | T001, T010, T011, T012 | |
| FR-011 refusals | Yes | T009, T010, T011 | some edge cases (C3) |
| FR-012 – FR-014 linking, relay | Yes | T013, T014, T020 | provider-unverified case (U1) |
| FR-015 same account rules | Yes | T009 | test design (C1) |
| FR-016 deletion removes links | Yes | T013 | |
| FR-017 domain file | Yes | T022, T023 | |
| FR-018 Privacy Policy | Yes | T024 | state cookie (I1) |
| FR-019 procedures | Yes | contracts/provider-setup.md, T029 | already written in the plan |
| SC-001 – SC-005 | Yes | T009, T013, T015, T003, T029 | SC-001 manual (A1) |

## Constitution Alignment Issues

None. The documentation phase is T027 and the plan carries the Constitution Check.

## Unmapped Tasks

None.

## Metrics

- Total requirements: 24 (19 FR, 5 SC)
- Total tasks: 29
- Coverage: 100% have at least one task (3 partial: FR-007, FR-013, FR-018)
- Ambiguity count: 1
- Duplication count: 0
- Critical issues: 0 (2 HIGH, 3 MEDIUM, 3 LOW)

## Next Actions (as reported)

- No CRITICAL issues, but fix the two HIGH findings before `/speckit-implement`: I1 would ship a cookie the published policy says does not exist, and C1 would make T009's Terms assertion impossible to pass.
- C2 would turn five existing suites red the moment T005 lands; it is one line per suite.
- Suggested: `/speckit-analyze-findings` to capture and resolve these eight.
