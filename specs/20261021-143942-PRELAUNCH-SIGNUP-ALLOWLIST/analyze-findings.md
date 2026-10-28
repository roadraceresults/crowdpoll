# Specification Analysis Report — specs/20261021-143942-PRELAUNCH-SIGNUP-ALLOWLIST

## Record

| Record | Value |
|---|---|
| Feature directory | specs/20261021-143942-PRELAUNCH-SIGNUP-ALLOWLIST |
| Report created | 2026-10-21 041713 PM |
| Analysis captured | 2026-10-21 041713 PM |
| Last updated | 2026-10-21 042138 PM |

A finding is open until this skill marks it ✅ Resolved. To accept a recommendation, mark its box `[X] Accepted`, save
the file, and Type or Say "Next" — or Type or Say "Accept". Do not mark findings resolved yourself.
Findings are listed CRITICAL → HIGH → MEDIUM → LOW; within a severity, in the order the report gave them.
"Next" always returns the first open finding below.

## Findings

### **C2** · Coverage Gap · MEDIUM · spec.md SC-001; tasks.md T019, T033; src/auth/auth.ts `user.create.before`  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md research.md contracts/api.md plan.md Updated: 2026-10-21 4:21 PM  
  **Notes**: Recommendation accepted by "Accept all" 2026-10-21: Recommendation, T019 now also guards `user.create.before`, so a refused social sign-in creates no `"user"` row; T033's test asserts it; research.md R3 (a table row) and contracts/api.md (Session hook) name the second hook.  

  In the social mode BetterAuth creates the user before the session, so an unlisted provider sign-in is refused at the session step but still leaves a new `"user"` row. SC-001 says "no account created" for unlisted attempts, and only `session.create.before` gets the check.  

  - **Recommendation**: Extend T019: `user.create.before` also refuses an unlisted address while the list is on (the same `isAllowed` check and log path `session`), and T033's test asserts no `"user"` row remains.  

    ➡️ [X] **Accepted**  
    - The native Create Account route refuses before `createUser` (T010), so the new hook check only ever fires on the social path; research.md R3 and contracts/api.md name the second hook.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **U2** · Underspecification · MEDIUM · tasks.md T033  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-10-21 4:21 PM  
  **Notes**: Recommendation accepted by "Accept all" 2026-10-21: Recommendation, T033 now starts the context with `ENV_SIGNIN_METHOD=oauth` and one provider's fake client id and secret, and stubs its token and user-info requests with `vi.spyOn(globalThis, "fetch")`.  

  "Drives the OAuth callback with a stubbed provider" doesn't say how. Social providers exist only with `ENV_SIGNIN_METHOD=oauth` and `ENV_OAUTH_<NAME>_CLIENT_ID`/`_SECRET`, and the callback calls the provider's token and user-info endpoints.  

  - **Recommendation**: Name it in T033: start the context with `ENV_SIGNIN_METHOD=oauth` and one provider's fake client id and secret, and stub that provider's token and user-info requests (`vi.spyOn(globalThis, "fetch")`) so the callback receives an unlisted email.  

    ➡️ [X] **Accepted**  
    - T033 then says exactly how its test reaches the callback with no real provider.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **I3** · Inconsistency · LOW · plan.md Scale/Scope, Source Code tree  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ plan.md Updated: 2026-10-21 4:21 PM  
  **Notes**: Recommendation accepted by "Accept all" 2026-10-21: Recommendation, plan.md's Scale/Scope and Source Code tree now name both hooks, the social error callback (T033) and the login card's OAuth error mapping.  

  The plan lists `src/auth/auth.ts` only for "the session hook" and `loginCard.js` only for `?error=not-launched`. T033 adds the social sign-in's error callback and a second mapping in the login card.  

  - **Recommendation**: Add "the social sign-in's error callback (T033)" beside the `auth.ts` entries, and "the OAuth error value" beside `loginCard.js`.  

    ➡️ [X] **Accepted**  
    - Two phrases in plan.md; with C2 accepted, the `auth.ts` entries also name `user.create.before`.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **I4** · Inconsistency · LOW · tasks.md line 95; Parallel Example (line 176); Dependencies  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-10-21 4:21 PM  
  **Notes**: Recommendation accepted by "Accept all" 2026-10-21: Recommendation, the US2 parallel example now reads `T019 (auth.ts), T033 (auth.ts, loginCard.js), T020 (loginCard.js)`; T033 keeps its id.  

  T033 sits between T019 and T020, out of numeric order, and the US2 parallel example and the dependency notes don't mention it.  

  - **Recommendation**: Leave its id (ids must stay stable) and add T033 after T019 in the US2 parallel example: `T019 (auth.ts), T033 (auth.ts, loginCard.js), T020 (loginCard.js)`.  

    ➡️ [X] **Accepted**  
    - One line in the parallel example.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

## Coverage Summary

| Requirement Key | Has Task? | Task IDs | Notes |
|-----------------|-----------|----------|-------|
| FR-001–FR-004, FR-004a | ✅ | T001, T005–T007, T021 | |
| FR-005, FR-006 | ✅ | T002–T004, T006, T021 | L1 resolved |
| FR-007 | ✅ | T008, T010 | |
| FR-008 | ✅ | T011, T016 | |
| FR-009 | ✅ | T012, T013, T017–T019, T033 | C2, U2 |
| FR-010 | ✅ | T023, T025, T026 | |
| FR-011 | ✅ | T006, T015, T020, T024, T027, T033 | A1 resolved |
| FR-012 | ✅ | T008, T010, T016, T025 | |
| FR-013 | ✅ | T014 | U1 resolved |
| FR-014 | ⚪ accepted implicit | T031 | G1 (Recommendation A) |
| FR-015 | ✅ | T022, T028–T030 | I1, I2 resolved |
| FR-016 | ✅ | quickstart §2, T032 | |
| SC-001 | ⚠️ partial | T008, T011–T013, T023, T033 | C2 (social mode creates a user row) |
| SC-002, SC-003, SC-005 | ✅ | T008, T011, T021, T023, T031 | |
| SC-004 | ⚪ accepted implicit | | G1 |

## Constitution Alignment Issues

None.

## Unmapped Tasks

None.

## Metrics

- Total Requirements: 22 (17 FR, 5 SC)
- Total Tasks: 33
- Coverage: 100% (FR-014 and SC-004 implicitly, by decision G1)
- Ambiguity Count: 0
- Duplication Count: 0
- Critical Issues Count: 0

## Next Actions (as reported)

- There are no CRITICAL or HIGH findings, so `/speckit-implement` can proceed.
- C2 and U2 (MEDIUM) affect what T019 and T033 build and test. Resolve them first, with `/speckit-analyze-findings`, so the social-mode work is complete and testable.
- I3 and I4 (LOW) are one-line edits to `plan.md` and the US2 parallel example in `tasks.md`.
