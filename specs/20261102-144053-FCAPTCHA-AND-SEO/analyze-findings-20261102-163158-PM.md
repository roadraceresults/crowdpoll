# Specification Analysis Report — specs/20261102-144053-FCAPTCHA-AND-SEO

## Record

| Record | Value |
|---|---|
| Feature directory | specs/20261102-144053-FCAPTCHA-AND-SEO |
| Report created | 2026-11-02 042611 PM |
| Analysis captured | 2026-11-02 042611 PM |
| Last updated | 2026-11-02 043043 PM |

A finding is open until this skill marks it ✅ Resolved. To accept a recommendation, mark its box `[X] Accepted`, save
the file, and Type or Say "Next" — or Type or Say "Accept". Do not mark findings resolved yourself.
Findings are listed CRITICAL → HIGH → MEDIUM → LOW; within a severity, in the order the report gave them.
"Next" always returns the first open finding below.

## Findings

### **I1** · Inconsistency · HIGH · spec.md FR-011; research.md R6; tasks.md T002, T043  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ spec.md tasks.md Updated: 2026-11-02 4:30 PM  
  **Notes**: Recommendation accepted in file 2026-11-02: Recommendation A, FR-011 now binds a pass to the client address once a deployment check confirms the header, with binding off until then (spec.md); T043 no longer turns binding on, and new task T046 (after T043) sets the trusted header, turns binding on in `.do/app.yaml` and repeats scenarios 1, 4 and 5 (tasks.md).  

  FR-011 says each pass MUST be "bound to the client's real address", but research R6 keeps FCaptcha's IP binding off until deployment check D3 confirms the header. No task turns binding on except as part of T043's walk-through. The security requirement and the plan disagree on when it holds.  

  - **Recommendation A** _(recommended)_: Amend FR-011 so binding is turned on once D3 confirms the platform's client-address header, and stays off until then. In tasks.md, make "turn on IP binding" its own task after T043.  

    ➡️ [X] **Accepted**  
    - <u>Pros</u>: the spec states when binding holds, and a separate task makes sure it is switched on and checked, with no risk of binding to a forged or wrong address.  
    - <u>Cons</u>: the first staging deploy runs without IP binding until D3 is done.  

  - **Recommendation B**: Keep FR-011 as written and turn binding on from the first deploy, with `TRUSTED_PROXIES` set to App Platform's documented header; drop R6's "off until confirmed".  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: binding holds from the start; the spec is unchanged.  
    - <u>Cons</u>: if the header is wrong, every pass is refused (or bound to a proxy address) until it is fixed, which blocks sign-in on staging.  

  - **Developer Resolution C**:  

    ➡️ [ ] **Accepted**  

### **I2** · Inconsistency · MEDIUM · plan.md R10/R11; tasks.md T024, T026, T031; CLAUDE.md invariant "Poll access is decided by src/polls/access.ts"  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md plan.md research.md data-model.md Updated: 2026-11-02 4:30 PM  
  **Notes**: Recommendation accepted in file 2026-11-02: Recommendation A, `isIndexable` and `indexablePolls` move to `src/polls/access.ts` beside `mayViewResults`; T024 now edits access.ts, and T026 (`/poll/:pid`) and T031 (`/api/polls/:pid/card`) require `mayViewResults` for a guest and `isIndexable` (tasks.md); plan.md source tree, research.md R10 and data-model.md name the new place.  

  The poll page, guest card route and sitemap decide visibility with a new `isIndexable` in `src/seo/indexable.ts`, outside `access.ts`. That breaks the project invariant that access is decided in one place.  

  - **Recommendation A** _(recommended)_: Define `isIndexable` (and its SQL twin) in `src/polls/access.ts` beside `mayViewResults`. Have `/poll/:pid` and `/api/polls/:pid/card` require `mayViewResults(guest) && isIndexable`. Update T024 and T031.  

    ➡️ [X] **Accepted**  
    - <u>Pros</u>: keeps the invariant; a future change to who may see a poll reaches the SEO surfaces automatically.  
    - <u>Cons</u>: one extra row read per poll page (`mayViewResults` reads the row again), negligible.  

  - **Recommendation B**: Keep `src/seo/indexable.ts` as planned.  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: SEO code stays together in `src/seo/`.  
    - <u>Cons</u>: a second place that decides poll visibility, contrary to the CLAUDE.md invariant.  

  - **Developer Resolution C**:  

    ➡️ [ ] **Accepted**  

### **U1** · Underspecification · MEDIUM · spec.md FR-006; contracts/api.md A1; tasks.md T018  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ spec.md Updated: 2026-11-02 4:27 PM  
  **Notes**: Recommendation accepted by "Accept all" 2026-11-02: Recommendation, added "accepts an invitation (redeem)" to FR-006 (and its per-page rule) and to US2 scenario 1 in spec.md.  

  FR-006 lists the requests that need a pass as "sends a sign-in email, creates an account, or starts a provider sign-in". The plan and tasks also gate `POST /api/invitations/redeem`, which the spec never names, so its acceptance criteria are implicit.  

  - **Recommendation**: Add "accepts an invitation (redeem)" to FR-006's list and to US2 scenario 1.  

    ➡️ [X] **Accepted**  
    - The spec then names every route the contract gates; redeem signs the invitee in, so it is a sign-in start like the others.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **C1** · Coverage · MEDIUM · spec.md SC-008, US1 scenario 6; tasks.md T009, T011  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-11-02 4:27 PM  
  **Notes**: Recommendation accepted by "Accept all" 2026-11-02: Recommendation, added T045 [US1] (focus order, keyboard operation, status announcements in tests/client-human-check.test.ts) and a light/dark contrast and focus step to T043 in tasks.md.  

  SC-008 requires the check view to pass keyboard, focus, contrast and screen-reader checks in light and dark. No task verifies focus order, contrast or both themes; T009 checks only `role="status"` and the attributes.  

  - **Recommendation**: Add to US1 a test in `tests/client-human-check.test.ts`: the widget is the first focusable element and the status is announced. Add a T043 step: check contrast in light and dark on staging.  

    ➡️ [X] **Accepted**  
    - Focus and announcement are testable in jsdom; contrast needs a real browser, so it belongs to the staging walk-through.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **C2** · Coverage · MEDIUM · spec.md Edge Cases ("A visitor with scripts turned off…")  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-11-02 4:30 PM  
  **Notes**: Recommendation accepted in file 2026-11-02: Recommendation A, new task T047 [US1] puts a `<noscript>` "Signing in needs JavaScript." line in `#card-root` of login.html, create-account.html and invite.html, asserted in tests/seo.test.ts (tasks.md).  

  The edge case requires the page to say scripts are needed to sign in. No task adds that, and `login.html`, `create-account.html` and `invite.html` have no `<noscript>`.  

  - **Recommendation A** _(recommended)_: Add a task: a `<noscript>` line, "Signing in needs JavaScript.", in the three pages' `#card-root`, asserted in `tests/seo.test.ts` (page HTML).  

    ➡️ [X] **Accepted**  
    - <u>Pros</u>: the edge case is met with three lines of markup and one assertion.  
    - <u>Cons</u>: one more small task.  

  - **Recommendation B**: Drop the edge case from spec.md.  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: no new work; the sign-in pages already need scripts today.  
    - <u>Cons</u>: a visitor without scripts sees an empty card with no explanation.  

  - **Developer Resolution C**:  

    ➡️ [ ] **Accepted**  

### **A1** · Ambiguity · LOW · spec.md FR-024 ("at most a few minutes stale"); SC-005 (5 minutes); research.md R12  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ spec.md Updated: 2026-11-02 4:27 PM  
  **Notes**: Recommendation accepted by "Accept all" 2026-11-02: Recommendation, FR-024 now reads "at most 5 minutes stale" in spec.md.  

  FR-024 uses a vague bound where SC-005 and the plan say 5 minutes.  

  - **Recommendation**: Change FR-024 to "at most 5 minutes stale".  

    ➡️ [X] **Accepted**  
    - Makes FR-024 testable and consistent with SC-005 and R12.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **C3** · Coverage · LOW · spec.md FR-014, US7 scenario 6; tasks.md T038, T043  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ quickstart.md tasks.md Updated: 2026-11-02 4:27 PM  
  **Notes**: Recommendation accepted by "Accept all" 2026-11-02: Recommendation, added deployment check D5 (two instances, a replayed pass is refused) to quickstart.md and D1–D5 to T043 in tasks.md.  

  No test or deployment check shows that a pass used on one FCaptcha instance is refused by another (shared Valkey state).  

  - **Recommendation**: Add a D-check to quickstart.md and T043: with 2 instances, replay a used pass and expect it refused.  

    ➡️ [X] **Accepted**  
    - The shared state is FCaptcha's own behaviour, so a deployment check (not a unit test) is the right place to confirm it.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **C4** · Coverage · LOW · spec.md FR-016 ("deployed together when either changes")  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ Files Unchanged (no edit needed): 2026-11-02 4:30 PM  
  **Notes**: Recommendation accepted in file 2026-11-02: Recommendation A, FR-016's "deployed together" stays an operational rule documented by T044 (README.md, ARCHITECTURE.md); no file changed.  

  It is only covered by README and ARCHITECTURE wording (T044) and the staging walk-through.  

  - **Recommendation A** _(recommended)_: Accept it as an operational rule documented in T044; leaving it as is is reasonable.  

    ➡️ [X] **Accepted**  
    - <u>Pros</u>: no change; one App Platform app deploys both services together whenever it is deployed.  
    - <u>Cons</u>: the rule lives only in documentation.  

  - **Recommendation B**: Add a line to `.do/app.yaml` comments (in T002) stating that both services are deployed together.  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: the rule sits beside the deployment description.  
    - <u>Cons</u>: a comment the platform does not enforce.  

  - **Developer Resolution C**:  

    ➡️ [ ] **Accepted**  

### **T1** · Terminology · LOW · spec.md ("pass"); plan.md, contracts, tasks.md ("token", "pass")  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ data-model.md Updated: 2026-11-02 4:27 PM  
  **Notes**: Recommendation accepted by "Accept all" 2026-11-02: Recommendation, data-model.md now states that a pass is carried on the wire as FCaptcha's token.  

  The spec says "pass" throughout. The plan, contracts and tasks mix "pass" and "token" (FCaptcha's term).  

  - **Recommendation**: Keep "token" for FCaptcha's wire value and "pass" for the concept. Add one line to data-model.md stating that a pass is carried as FCaptcha's token.  

    ➡️ [X] **Accepted**  
    - One sentence settles the two words without rewriting the artifacts.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

## Coverage Summary

| Requirement Key | Has Task? | Task IDs | Notes |
|-----------------|-----------|----------|-------|
| FR-001 check first on 3 pages | Yes | T009, T010, T012–T015 | |
| FR-002 same page switches | Yes | T009, T010 | |
| FR-003 checkbox, a11y, theme | Partial | T009, T010 | a11y unverified (C1) |
| FR-004 own domain only | Yes | T002, T010, T043 | |
| FR-005 pass in memory | Yes | T009, T010 | |
| FR-006 refuse bad pass | Yes | T016–T019 | redeem not in spec (U1) |
| FR-007 challenge-required → check again | Yes | T017, T020 | |
| FR-008 finishing routes exempt | Yes | T016, T018 | |
| FR-009 failure message, 3 failures | Yes | T021, T022 | |
| FR-010 masked logs | Yes | T016, T036 | |
| FR-011 strictness settings | Partial | T002, T006, T043 | IP binding deferred (I1) |
| FR-012 fail open, counted | Yes | T036, T039 | |
| FR-012a 10 s fallback | Yes | T037, T040 | |
| FR-013 separate service, private verify | Yes | T001, T002 | |
| FR-014 shared state, 1–3 instances | Partial | T002 | not verified (C3) |
| FR-015 settings, ConfigError | Yes | T003–T005 | |
| FR-016 pinned, deployed together | Partial | T001, T044 | C4 |
| FR-017 Privacy "Bot check" | Yes | T034, T035 | |
| FR-018 OpenAPI | Yes | T041 | |
| FR-019 poll page content | Yes | T023, T025, T026, T033 | |
| FR-020 404 rules | Yes | T023, T026 | |
| FR-021 no creator/voters | Yes | T023 | |
| FR-022 guest `/?PID=` redirect | Yes | T029, T032 | |
| FR-023 robots.txt | Yes | T023, T026 | |
| FR-024 sitemap | Yes | T023, T026 | A1 |
| FR-025 title, description, canonical | Yes | T027, T028 | |
| FR-026 og, JSON-LD | Yes | T023, T025 | |
| FR-027 noindex | Yes | T028 | |
| FR-028 escaping | Yes | T023, T025 | |
| FR-029 crawlers never see check | Yes | T023, T026 | |
| SC-001 refusals 100% | Yes | T016 | |
| SC-002 under 10 s | Yes | T043 | |
| SC-003 no third-party request | Yes | T043 (D2) | |
| SC-004 readable without scripts | Yes | T023 | |
| SC-005 sitemap within 5 min | Yes | T023, T026 | |
| SC-007 fail-open visible | Yes | T036 | |
| SC-008 accessibility | Partial | T009 | C1 |

SC-006 (indexed count in the search engines' consoles) is a post-launch KPI and is excluded.

## Constitution Alignment Issues

None. Documentation Deliverables are covered by T044. The only comments planned link external docs (FCaptcha, schema.org, sitemaps.org), which Principle VI allows. Server logging is covered (T016, T036), and browser logging is limited to one warning (T040).

## Unmapped Tasks

None. T001–T008 are setup and foundation shared by US1, US2 and US7; T041–T044 are polish.

## Metrics

- Total Requirements: 37 (30 FR including FR-012a, plus 7 buildable SC)
- Total Tasks: 44
- Coverage: 100% have at least one task (5 partial)
- Ambiguity Count: 1
- Duplication Count: 0
- Critical Issues Count: 0

## Next Actions (as reported)

- There are no CRITICAL issues, so implementation may proceed. Resolve I1 (HIGH) first, because it is a security requirement whose timing the spec and plan disagree on.
- Resolve I2, U1, C1 and C2 (MEDIUM) through `/speckit-analyze-findings`. Each is a small edit to spec.md, tasks.md or the plan's R10/R11.
- The LOW items (A1, C3, C4, T1) can be accepted as written or applied in one "Accept all" pass.
