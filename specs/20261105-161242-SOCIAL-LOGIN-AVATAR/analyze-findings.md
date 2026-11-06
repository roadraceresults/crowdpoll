# Specification Analysis Report — specs/20261105-161242-SOCIAL-LOGIN-AVATAR

## Record

| Record | Value |
|---|---|
| Feature directory | specs/20261105-161242-SOCIAL-LOGIN-AVATAR |
| Report created | 2026-11-05 081611 PM |
| Analysis captured | 2026-11-05 081611 PM |
| Last updated | 2026-11-05 083511 PM |

A finding is open until this skill marks it ✅ Resolved. To accept a recommendation, mark its box `[X] Accepted`, save
the file, and Type or Say "Next" — or Type or Say "Accept". Do not mark findings resolved yourself.
Findings are listed CRITICAL → HIGH → MEDIUM → LOW; within a severity, in the order the report gave them.
"Next" always returns the first open finding below.

## Findings

### **C4** · Coverage gap · HIGH · spec.md FR-020, FR-022, SC-004, SC-005; contracts C2 and A3; research R7; tasks T015, T020; `src/public/inviteCard.js:57,78,207`  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ contracts/ui-contracts.md contracts/api.md research.md plan.md quickstart.md tasks.md Updated: 2026-11-05 8:35 PM  
  **Notes**: Recommendation accepted in file 2026-11-05: Recommendation A. C2 (contracts/ui-contracts.md), A3 (contracts/api.md) and R7 (research.md) now cover `inviteCard.js`; the sentence is built once in `CardShell.addOauthSharing`, which both pages already load, so no new script is needed; plan.md and quickstart Q7 follow; tasks.md gains T036–T039, and T015 is reworded.  

  `/invite` has its own provider buttons and its own `startSignin`, but no artifact mentions it. Someone invited to a poll wouldn't see what is shared, and without `signedIn=1` wouldn't get the snackbar. That breaks "wherever provider buttons appear" and "100% of provider logins".  

  - **Recommendation A** _(recommended)_: Extend C2, A3 and R7 to `inviteCard.js`, and add test and implementation tasks. Share the sentence-building code between the two cards rather than copying it.  

    ➡️ [X] **Accepted**  
    - <u>Pros</u>: every provider button on the site tells the same story, and FR-020 and SC-005 hold as written; `invite.html` already links `card-shell-m3.css`, so the style needs nothing new.  
    - <u>Cons</u>: a small shared script, a new `<script>` line on two pages, and more tests in `tests/client-invite-card.test.ts`.  

  - **Recommendation B**: Leave `/invite` out of this feature, and narrow FR-020, FR-022, SC-004 and SC-005 to the Login page.  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: the fewest changes.  
    - <u>Cons</u>: an invited person is the likeliest to be new, and would log in without being told what is shared or which account is in use.  

  - **Developer Resolution C**:  

    ➡️ [ ] **Accepted**  

### **C5** · Coverage gap · MEDIUM · research R3; contract C6; spec SC-006; quickstart Q4, Q9  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ quickstart.md research.md tasks.md Updated: 2026-11-05 8:35 PM  
  **Notes**: Recommendation accepted in file 2026-11-05: Recommendation A. Quickstart Q9 now records `Cache-Control` and `Age` and re-requests the address after a day; research R3 points to it; T035 records Q9 and says what to change if it fails.  

  The Privacy Policy will say a cached copy "can last up to a day", but R3 calls one day an assumed upper bound, because the CDN's handling of `Cache-Control` is unconfirmed. No check tests it.  

  - **Recommendation A** _(recommended)_: Add to Q9: read the object's `Cache-Control` and `Age` through the CDN, and request the address again after a day to confirm it has stopped working. Do this before the wording ships.  

    ➡️ [X] **Accepted**  
    - <u>Pros</u>: the policy's number is checked against the real CDN before each account accepts it.  
    - <u>Cons</u>: the release has to allow a day for the check, and a failed check means changing the wording or the lifetime.  

  - **Recommendation B**: Keep the check out, and drop the number from the policy: "a cached copy can last for a short time".  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: no day's wait, and the sentence stays true whatever the CDN does within reason.  
    - <u>Cons</u>: vaguer legal text, a change to FR-024 and C6, and how long a deleted photograph lasts stays unknown.  

  - **Developer Resolution C**:  

    ➡️ [ ] **Accepted**  

### **C6** · Coverage gap · MEDIUM · contract C5; tasks T023, T024  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-11-05 8:35 PM  
  **Notes**: Recommendation accepted in file 2026-11-05: Recommendation. T024 (tasks.md) now asserts the sheet's cookie banner offset.  

  **Left over from U3**: its recommendation said "and test it", but only the offset was applied. T024 only updates `LAYER_ORDER`, so nothing checks `--cookie-banner-offset`.  

  - **Recommendation**: Add the assertion to T024, as `tests/back-to-top-sheet.test.ts:15` does.  

    ➡️ [X] **Accepted**  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **I2** · Inconsistency · LOW · plan.md:98; tasks T009  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ plan.md Updated: 2026-11-05 8:35 PM  
  **Notes**: Recommendation accepted in file 2026-11-05: Recommendation. The comment at plan.md's `oauth-providers.test.ts` line now matches T009.  

  The plan says `oauth-providers.test.ts` "no longer pins the default avatar after Google". T009 keeps that check and runs the suite without a store.  

  - **Recommendation**: Reword the plan's comment to match T009.  

    ➡️ [X] **Accepted**  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **I3** · Inconsistency · LOW · spec.md:195, 197; research R2, R3  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ spec.md Updated: 2026-11-05 8:35 PM  
  **Notes**: Recommendation accepted in file 2026-11-05: Recommendation. The two Assumptions in spec.md now say one day is the chosen limit, checked before release, and that Google's host is checked against a real login; how an existing account's login exposes the picture stays recorded as confirmed at plan time, per research R1.  

  The spec's Assumptions say the cache lifetime and Google's host are "confirmed at plan time", but the research says neither could be confirmed.  

  - **Recommendation**: Reword them: one day is the chosen limit, and the host is checked in Q3.  

    ➡️ [X] **Accepted**  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **I4** · Inconsistency · LOW · tasks T017, T018  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-11-05 8:35 PM  
  **Notes**: Recommendation accepted in file 2026-11-05: Recommendation. `[P]` removed from T018, and the Parallel Opportunities line reworded (tasks.md).  

  Both are marked `[P]` but write the same new file, which the `[P]` definition rules out.  

  - **Recommendation**: Remove `[P]` from T018.  

    ➡️ [X] **Accepted**  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

## Coverage Summary

| Requirement Key | Has Task? | Task IDs | Notes |
|-----------------|-----------|----------|-------|
| FR-001, FR-002 | Yes | T007, T010, T011 | |
| FR-003, FR-004 | Yes | T008, T012 | |
| FR-005, FR-006 | Yes | T007, T008, T010 | |
| FR-007 | Yes | T012, T035 | Manual, Q1 |
| FR-008, FR-009, FR-010 | Yes | T006, T010 | |
| FR-011, FR-012 | Yes | T007, T011 | |
| FR-013 | Yes | T004, T005, T010 | |
| FR-014 | Yes | T010, T035 | Listing check is manual, Q1 |
| FR-015 | Yes | T007, T008, T010 | |
| FR-016 | Yes | T008, T012, T013 | |
| FR-017 | Yes | T007, T011 | |
| FR-018 | Yes | T007, T010, T028, T029 | |
| FR-019 | Yes | T028, T030 | |
| FR-020 | **Partial** | T014, T015, T016 | Login only; see C4 |
| FR-021 | Yes | T018, T021 | |
| FR-022 | **Partial** | T017, T019, T020, T022, T023 | Not from `/invite`; see C4. Offset untested; see C6 |
| FR-023 | Yes | T017, T019 | |
| FR-024, FR-025, FR-026 | Yes | T025, T026 | "Up to a day" unverified; see C5 |
| FR-027 | Yes | T027 | |
| FR-028 | Yes | T035 | Q8 |
| SC-001, SC-002 | Yes | T007, T011, T035 | |
| SC-003 | Yes | T035 | Manual |
| SC-004 | **Partial** | T014 | See C4 |
| SC-005 | **Partial** | T017, T018 | See C4 |
| SC-006 | Yes | T028, T035 | See C5 |
| SC-007 | Yes | T027 | Existing Terms gate |

## Constitution Alignment Issues

None. The documentation phase is there (T033), and the plan's only addition to Complexity Tracking is justified.

## Unmapped Tasks

None. T001 and T032–T034 are setup and project chores.

## Metrics

- Total Requirements: 35 (28 FR, 7 SC)
- Total Tasks: 34
- Coverage: 100% have at least one task; 4 are only partly covered, all because of C4
- Ambiguity Count: 0
- Duplication Count: 0
- Critical Issues Count: 0

## Next Actions (as reported)

There are no critical issues, but don't start `/speckit-implement` until C4 is resolved. It adds tasks and changes contracts, and it would be easy to miss once the work is underway. C5 and C6 are small additions worth making at the same time, because C5 affects legal wording. The three LOW findings are one-line edits.

Run `/speckit-analyze` once more after resolving them, since C4 changes the contracts.
