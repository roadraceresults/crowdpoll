# Specification Analysis Report — specs/20261019-153514-PRODUCTION-EMAIL

## Record

| Record | Value |
|---|---|
| Feature directory | specs/20261019-153514-PRODUCTION-EMAIL |
| Report created | 2026-10-20 041620 PM |
| Analysis captured | 2026-10-20 041620 PM |
| Last updated | 2026-10-20 042220 PM |

A finding is open until this skill marks it ✅ Resolved. To accept a recommendation, mark its box `[X] Accepted`, save
the file, and Type or Say "Next" — or Type or Say "Accept". Do not mark findings resolved yourself.
Findings are listed CRITICAL → HIGH → MEDIUM → LOW; within a severity, in the order the report gave them.
"Next" always returns the first open finding below.

## Findings

### **I1** · Inconsistency · MEDIUM · spec.md Edge Cases ("A link is opened after its 15 minutes…"), FR-018; contracts/api.md A4; tasks.md T035  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ contracts/api.md research.md tasks.md Updated: 2026-10-20 4:22 PM  
  **Notes**: Recommendation accepted in file 2026-10-20: Recommendation A, check the token before redirecting;  
  contracts/api.md A4 splits the mismatch row (valid → `/confirm-signin`, unknown or expired → today's `/login?error=invalid-link`), research.md R9 says so, tasks.md T035 does the lookup and T031 tests the expired case. spec.md already said this and is unchanged.  

  The spec says the confirmation page is never shown for an expired link. A4 and T035 redirect every mismatched link to `/confirm-signin` without checking it, so an expired link opened in another browser reaches that page (which then shows "invalid or expired") instead of today's `/login?error=invalid-link`.  

  - **Recommendation A** _(recommended)_: In the mismatch branch of verify, look the token up (as `link-info` does) and redirect an unknown or expired token to `/login?error=invalid-link[&PID=…]` as today; only a valid one goes to `/confirm-signin`. Update A4, R9 and T035, and add the case to T031.  

    ➡️ [X] **Accepted**  
    - <u>Pros</u>: matches the spec and today's behaviour; a dead link never shows a page that looks like it might work.  
    - <u>Cons</u>: one extra lookup on the mismatch path, the same one `link-info` already does.  

  - **Recommendation B**: Keep the design, and change the spec's edge case to say that an expired link opened in another browser shows the confirmation page's "invalid or expired" state.  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: no code change to the design.  
    - <u>Cons</u>: two different refusal screens for the same expired link, depending on the browser.  

  - **Developer Resolution C**:  

    ➡️ [ ] **Accepted**  

### **C1** · Coverage (test order) · MEDIUM · tasks.md T005, T006 (Phase 2) vs T042 (Phase 7)  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-10-20 4:22 PM  
  **Notes**: Recommendation accepted in file 2026-10-20: Recommendation A, move the mailer tests into Phase 2;  
  tasks.md: new T051 in Phase 2, before T005, creates `tests/mailer.test.ts` with the mask, log-line and timeout tests; T042 now re-runs them; T007 adds to the file T051 creates.  

  The masked log line, `maskAddress` and the timeout race are built in Phase 2 but first tested in US5, so they're implemented without failing tests first.  

  - **Recommendation A** _(recommended)_: Move T042's mask, log-line and timeout tests into Phase 2, before T005, as a test task in `tests/mailer.test.ts`.  

    ➡️ [x] **Accepted**  
    - <u>Pros</u>: tests come first for every code change, as the tasks file promises; it also creates `tests/mailer.test.ts` early, which settles D1.  
    - <u>Cons</u>: US5's phase keeps only the `[auth]` log test and the start-up check.  

  - **Recommendation B**: Leave the order as it is.  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: no change.  
    - <u>Cons</u>: the foundational mailer code goes untested until the last story.  

  - **Developer Resolution C**:  

    ➡️ [ ] **Accepted**  

### **I2** · Inconsistency · MEDIUM · tasks.md T012; `.do/app.yaml`  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-10-20 4:22 PM  
  **Notes**: Recommendation accepted in file 2026-10-20 (the box read `[x`, taken as marked): Recommendation A, remove the Mailtrap entries from production;  
  tasks.md T012 now also removes `ENV_SMTP_HOST`, `ENV_SMTP_PORT`, `ENV_SMTP_USER` and `ENV_SMTP_PASS` from `.do/app.yaml`.  

  Production keeps the Mailtrap `ENV_SMTP_HOST`/`PORT`/`USER`/`PASS` entries beside `ENV_EMAIL_TRANSPORT=ses`. They're harmless but misleading, and the empty SMTP secrets suggest something is unset.  

  - **Recommendation A** _(recommended)_: In T012, remove the four `ENV_SMTP_*` entries from `.do/app.yaml` (they apply only to `smtp`).  

    ➡️ [X] **Accepted**  
    - <u>Pros</u>: the production spec lists only what production uses.  
    - <u>Cons</u>: switching production back to SMTP would mean adding them again.  

  - **Recommendation B**: Keep them, and note in T012 why they stay.  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: a fallback to SMTP needs only a change of `ENV_EMAIL_TRANSPORT`.  
    - <u>Cons</u>: the empty SMTP secrets stay in the spec, looking unset.  

  - **Developer Resolution C**:  

    ➡️ [ ] **Accepted**  

### **D1** · Dependency · LOW · tasks.md T013, T042 → T007  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ Files Unchanged (no edit needed): 2026-10-20 4:22 PM  
  **Notes**: Recommendation accepted in file 2026-10-20: Recommendation A, note "create if absent" in T013 and T042;  
  no edit needed: with C1 resolved, T051 creates `tests/mailer.test.ts` in Phase 2, before any story, so T013 and T042 always find it (as Recommendation A's own Cons said).  

  US2 and US5 add to `tests/mailer.test.ts`, which US1's T007 creates, so those stories aren't fully independent of US1.  

  - **Recommendation A** _(recommended)_: Note "create `tests/mailer.test.ts` if absent" in T013 and T042.  

    ➡️ [x] **Accepted**  
    - <u>Pros</u>: a two-word change; each story stays independent.  
    - <u>Cons</u>: none, unless C1 A is accepted, which makes this unnecessary.  

  - **Recommendation B**: Move the file's creation to Phase 2 (fits with C1).  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: the file exists before any story, as C1 A would have it.  
    - <u>Cons</u>: depends on C1's resolution.  

  - **Developer Resolution C**:  

    ➡️ [ ] **Accepted**  

### **C2** · Coverage · LOW · spec.md FR-006  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-10-20 4:22 PM  
  **Notes**: Recommendation accepted in file 2026-10-20: Recommendation, a note that FR-006 needs no code;  
  tasks.md Notes gains that line, citing RS16.  

  No task, by design: SES's account-level suppression list does it, and it was confirmed on 2026-10-20 (RS16).  

  - **Recommendation**: Add one line under tasks.md Notes saying FR-006 needs no code.  

    ➡️ [x] **Accepted**  
    - It tells the implementer the gap is deliberate.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **C3** · Coverage · LOW · spec.md FR-023  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-10-20 4:22 PM  
  **Notes**: Recommendation accepted in file 2026-10-20: Recommendation A, mention FR-023 in T049;  
  tasks.md T049 now says the quickstart carries FR-023's setup procedures.  

  No explicit task: `quickstart.md` already links the RS8, RS10 and RS17 procedures, and T049 walks it.  

  - **Recommendation A** _(recommended)_: Mention FR-023 in T049.  

    ➡️ [x] **Accepted**  
    - <u>Pros</u>: the coverage becomes traceable by ID.  
    - <u>Cons</u>: none.  

  - **Recommendation B**: None needed; leave it as it is.  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: no change.  
    - <u>Cons</u>: a later analysis flags it again.  

  - **Developer Resolution C**:  

    ➡️ [ ] **Accepted**  

### **U1** · Underspecification · LOW · tasks.md T045  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-10-20 4:22 PM  
  **Notes**: Recommendation accepted by "Accept all" 2026-10-20: Recommendation, PowerShell syntax in T045;  
  tasks.md T045 now reads `$env:ENV_EMAIL_TRANSPORT="ses"; npm run dev`.  

  `ENV_EMAIL_TRANSPORT=ses npm run dev` is POSIX syntax; the dev environment is PowerShell.  

  - **Recommendation**: Write it as `$env:ENV_EMAIL_TRANSPORT="ses"; npm run dev`.  

    ➡️ [X] **Accepted**  
    - The command then runs as written in the developer's shell.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **T1** · Terminology · LOW · spec.md ("hidden field") vs plan/tasks ("honeypot", `homepage`)  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ plan.md Updated: 2026-10-20 4:22 PM  
  **Notes**: Recommendation accepted by "Accept all" 2026-10-20: Recommendation, tie the three names together;  
  the sentence went in plan.md's Summary (the Abuse bullet), "the spec's hidden field (FR-013) is a `homepage` honeypot field", since R8 is in research.md, which already uses all three names.  

  Same concept, three names.  

  - **Recommendation**: Say once in plan R8 that the spec's "hidden field" is the `homepage` honeypot (it nearly does).  

    ➡️ [X] **Accepted**  
    - One sentence ties the three names together.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **S1** · Stale note · LOW · checklists/requirements.md Notes  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ checklists/requirements.md Updated: 2026-10-20 4:22 PM  
  **Notes**: Recommendation accepted by "Accept all" 2026-10-20: Recommendation, update the note line;  
  checklists/requirements.md line 36 now says clarify Q1 brought address normalization in (FR-024–FR-028) and only disposable-domain blocking stays deferred; edited on the developer's acceptance, since the checklist is outside this skill's usual files.  

  Still says single-user integrity is wholly deferred; clarify Q1 brought normalization in.  

  - **Recommendation**: Update that note line (outside the three core files).  

    ➡️ [X] **Accepted**  
    - This skill edits only `spec.md`, `plan.md`, `tasks.md` and the related artifacts, so the checklist note is changed by hand, or by your explicit go-ahead when this is accepted.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

## Coverage Summary

| Requirement Key | Has Task? | Task IDs | Notes |
|-----------------|-----------|----------|-------|
| FR-001 deliver via SES | Yes | T009, T012, T049 | |
| FR-002 unblocked channel | Yes | T009 | HTTPS API |
| FR-003 dev/test unchanged | Yes | T009, T011 | |
| FR-004 failure replies, timeout | Yes | T006, T042 | |
| FR-005 log id, masked | Yes | T005, T042–T044 | |
| FR-006 suppression list | No | — | By design (C2) |
| FR-007 refuse to start | Yes | T003, T004, T045 | |
| FR-008 sender, no Reply-To | Yes | T004, T010, T012 | |
| FR-009 branded layout | Yes | T013, T015–T018 | |
| FR-010 reviewed wording | Yes | T002, T017 | |
| FR-011 escaping | Yes | T013, T016 | |
| FR-012 no tracking | Yes | T010 | |
| FR-013–FR-015 hidden field, limits | Yes | T020, T022–T025 | |
| FR-016–FR-019 binding, confirm | Yes | T029–T039 | see I1 |
| FR-020 cookie policy, banner | Yes | T032, T040, T041 | |
| FR-021 API description | Yes | T046 | |
| FR-022 env docs, dev templates | Yes | T011, T012, T047 | |
| FR-023 quickstart procedures | Partly | T049 | C3 |
| FR-024–FR-028 one mailbox, one account | Yes | T021, T026–T028 | |
| SC-001, SC-002 inbox, headers | Yes | T049 | Manual, in production |
| SC-003 hidden field | Yes | T020 | |
| SC-004 binding | Yes | T031 | |
| SC-005 refuse to start | Yes | T003, T045 | |
| SC-006 trace by id | Yes | T042, T049 | |
| SC-007 tests pass | Yes | T048 | |
| SC-008 no second account | Yes | T021 | |

## Constitution Alignment Issues

None.
- No explanatory comments are planned.
- Server logs are informative but masked (V).
- The only comment edit is in a file whose code changes anyway (T041 with T033, III and VI).
- README/ARCHITECTURE are regenerated after implementation (T050).

## Unmapped Tasks

None. T001 (dependency) and T010 (a check) are setup and verification for FR-001/FR-008/FR-012.

## Metrics

- Total requirements: 36 (28 FR, 8 SC)
- Total tasks: 50
- Coverage: 34/36 with at least one task (94%); FR-006 and FR-023 are covered without code by design
- Ambiguity count: 0
- Duplication count: 0
- Critical issues: 0

## Next Actions (as reported)

- No CRITICAL or HIGH issues: you may proceed to `/speckit-implement`.
- I recommend fixing **I1** (expired links should keep today's redirect, as the spec says) and **C1** (test-first for the mailer changes) first, as small edits to `contracts/api.md`, `research.md` R9 and `tasks.md`. I2 is a one-line choice in T012.
- The LOW items can be fixed in passing, or captured with `/speckit-analyze-findings` and resolved there.
