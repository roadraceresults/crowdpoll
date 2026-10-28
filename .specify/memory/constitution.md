<!--
Sync Impact Report
==================
Version change: 1.0.1 → 1.1.0 (MINOR)
Bump rationale: designDocs/constitution-prompt.md gained a Documentation section
  that the constitution did not cover at all. This adds one new principle
  (VI. Self-Documenting Code) and one new top-level section (Documentation
  Deliverables), and materially expands Principle V by splitting logging
  discipline into server-side and client-side rules. New principle + new section
  + materially expanded guidance = MINOR.

Modified principles:
  - I. Think Before Coding ............................ unchanged
  - II. Simplicity First .............................. unchanged
  - III. Surgical Changes ............................. unchanged
  - IV. Goal-Driven Execution ......................... unchanged
  - V. Code Quality & Maintainability ................. EXPANDED (logging split
      into server-side informative / client-side minimal-and-never-sensitive)
  - VI. Self-Documenting Code ......................... ADDED (NON-NEGOTIABLE)

Added sections:
  - Core Principles → VI. Self-Documenting Code
  - Documentation Deliverables (README.md, ARCHITECTURE.md)
  - Governance → "Scope of the comment policy" clause

Removed sections: none

Templates requiring updates:
  - .specify/templates/plan-template.md ................ ✅ compatible, no change needed
      (Constitution Check gate is filled per-feature; no principle names hard-coded)
  - .specify/templates/spec-template.md ................. ✅ compatible, no change needed
  - .specify/templates/tasks-template.md ................ ✅ UPDATED
      (Polish phase said "Documentation updates in docs/"; documentation is now a
      post-implementation phase producing root-level README.md and ARCHITECTURE.md)
  - .specify/templates/checklist-template.md ............ ✅ compatible, no change needed
  - CLAUDE.md ........................................... ✅ compatible, no change needed
  - .specify/extensions/agent-context/* ................. ✅ no principle references found

Follow-up TODOs:
  - ARCHITECTURE.md does not exist at the project root. Principle-mandated, and due
    after the next feature's implementation phase.
  - README.md:117-119 carries a "Project docs" section pointing at specs/001-user-auth/
    and designDocs/, which Documentation Deliverables now forbids. Remove it when
    README.md is next regenerated; not swept here, per Principle III.
  - The existing codebase carries extensive explanatory and requirement-referencing
    comments that predate Principle VI. Per the Governance scope clause they are NOT
    to be mass-removed; they are corrected only where the surrounding code is already
    being changed for another reason.
-->

# NativeAuthOAuth Constitution

**Applicability & Tradeoff**: These principles bias toward caution and rigor over raw speed.
For genuinely trivial tasks (e.g. a one-line typo fix, a config value tweak), engineers and
agents MAY use judgment to move faster — but the default for all other work is to follow
every principle below.

## Core Principles

### I. Think Before Coding

Don't assume. Don't hide confusion. Surface tradeoffs. Before implementing: state assumptions
explicitly, and ask when uncertain. If multiple interpretations of a request exist, present
them rather than silently picking one. If a simpler approach exists, say so and push back when
warranted. If something is unclear, stop, name what's confusing, and ask — do not guess and
proceed.

**Rationale**: Silent assumptions and unstated interpretations are the most common source of
wasted implementation work; surfacing them early is cheaper than reworking code later.

### II. Simplicity First

Write the minimum code that solves the problem — nothing speculative. No features beyond what
was asked. No abstractions for single-use code. No "flexibility" or "configurability" that
wasn't requested. No error handling for impossible scenarios. If a change could be 50 lines but
became 200, it MUST be rewritten smaller before being considered done.

**Rationale**: Speculative generality and unused flexibility add maintenance cost and review
burden without delivering value; YAGNI ("You Aren't Gonna Need It") keeps the codebase legible.

### III. Surgical Changes

Touch only what the task requires; clean up only your own mess. When editing existing code: do
not "improve" adjacent code, comments, or formatting; do not refactor things that aren't broken;
match existing style even when a different style would be preferred. When a change creates
orphaned imports, variables, or functions, remove them — but do not remove pre-existing dead
code unless asked; instead, mention it. Every changed line MUST trace directly to the request
that motivated it.

**Rationale**: Bundling unrelated cleanup into a change inflates diffs, obscures the actual
intent of a commit, and increases the risk of unreviewed regressions.

### IV. Goal-Driven Execution

Every task MUST be transformed into a verifiable success criterion before work begins (e.g.
"Add validation" → "write tests for invalid inputs, then make them pass"; "Fix the bug" → "write
a test that reproduces it, then make it pass"; "Refactor X" → "ensure tests pass before and
after"). For multi-step tasks, state a brief plan of steps paired with how each will be
verified. Strong, explicit success criteria enable independent iteration; weak criteria such as
"make it work" require constant clarification and MUST be tightened before proceeding.

**Rationale**: A concrete, checkable definition of "done" is what allows work to be verified
and looped on without repeated back-and-forth with the requester.

### V. Code Quality & Maintainability (NON-NEGOTIABLE)

All code MUST be minimal, readable, and simple, with single-purpose functions. Code MUST be
maintainable — clean, and following best practices so other developers can understand and
extend it. The system MUST be designed with modularity in mind so new features can be added
without restructuring existing code. Errors MUST be handled gracefully: the program logs an
appropriate error message and continues or fails safely rather than crashing uncontrolled.

Logging discipline differs by side of the wire:

- **Server-side**: the program MUST log informatively to the console about what it is doing,
  so its behavior is observable to the operator.
- **Client-side (browser)**: the program MUST log minimally to the browser console, and MUST
  NOT log sensitive information there under any circumstances.

**Rationale**: These are non-negotiable because they compound: unreadable, tightly-coupled, or
silently-failing code becomes exponentially harder to fix the longer it survives. The logging
split exists because the two consoles have different audiences and different exposure — the
server console is an operator's tool, while the browser console is readable by anyone holding
the page.

### VI. Self-Documenting Code (NON-NEGOTIABLE)

Code MUST explain itself through clear, descriptive names for variables and functions. Comments
are reserved for one purpose only: pointing to **external** documentation — a third-party
library's docs, a web resource explaining a concept or technique used in the code, or a design
document explaining the reasoning behind an implementation.

Comments MUST NOT be used to:

- explain what the code is doing — that MUST be evident from the code itself;
- record change history, or what a previous implementation looked like;
- reference the requirements, specs, feature numbers, or task IDs that motivated the code.

The unit test suite is treated as documentation as well as verification: a comprehensive suite
demonstrates intended behavior more reliably than prose about it.

**Rationale**: Comments describing behavior are unverified copies of the code that drift the
moment the code changes, and comments citing requirement or task identifiers bind source files
to a planning history that a future reader has no way to resolve. Names and tests are checked
by the compiler and the test runner; comments are checked by nobody.

## Security, Privacy & Reliability Standards

- The system MUST validate inputs and handle edge cases and unexpected inputs without crashing
  or producing incorrect output.
- The system MUST be secure: it MUST NOT expose vulnerabilities that allow arbitrary code
  execution or unauthorized access to sensitive data on the user's system.
- The system MUST respect user privacy in what it collects, stores, and logs.
- Third-party libraries MAY be used when they prevent re-implementing functionality already
  provided by a mature, popular library, reducing the system's own attack surface and
  maintenance burden.

## Performance & Operational Efficiency

- The system MUST be designed to be efficient and as lightweight as possible, minimizing CPU
  and memory usage, particularly for any component running continuously in the background.
- Logging exists to make behavior observable to users and operators, and MUST stay informative
  without becoming noise that obscures real problems.

## Documentation Deliverables

Two documentation files are project deliverables. Both MUST be generated **after** the
implementation phase of each feature or requirement — never before, and never in place of it.

Rules governing both files:

- Written in Markdown, with embedded Mermaid diagrams where a diagram carries the meaning
  better than prose.
- Stored in the **root directory** of the project.
- Free of sensitive information such as passwords or API keys, so that either file is safe to
  share publicly.
- Created if absent. If present, updated in place, preserving existing content that is still
  accurate — but when the existing content is considerably outdated, complete regeneration is
  acceptable and MAY be necessary.

### README.md

- Provides an overview of the program, its purpose, and how to use it.
- Its primary consumers are **devops**, who need to know how to deploy the program, and the
  **end user**, who needs to know how to use it.
- MUST include installation and run instructions, along with any dependencies or prerequisites.
- MUST NOT reference other project documents — requirements, specifications, architecture
  documents, or design docs.

**Rationale for the last rule**: those documents are not needed to run the program, and
pointers to them go stale faster than the README itself. The README MUST be self-contained and
give a reader everything needed to get started.

### ARCHITECTURE.md

Provides a high-level overview of the program's architecture, including but not limited to:

- deployment components and modules, and their interactions;
- runtime components and modules, and their interactions;
- standard software development diagrams;
- standard software development patterns (e.g. MVC, MVVM, microservices) and how they are
  realized in this program;
- prose, where an aspect of the architecture is not captured well by a diagram or a pattern
  name.

Its primary consumers are **developers**, who need to understand how the program is structured
and how its components interact; **devops**, who need to understand how to deploy it; and
**technical stakeholders**, who need to review the architecture and its design decisions.

## Governance

This constitution supersedes ad hoc conventions and prior informal practice for this project.
The Applicability & Tradeoff clause above governs how strictly these principles apply to a
given task; absent an explicit trivial-task exception, all principles apply.

**Scope of the comment policy**: Principle VI governs code that is being written or modified.
It is NOT a mandate to sweep pre-existing comments out of the codebase — Principle III forbids
exactly that kind of unrelated edit. A file's existing comments are brought into line with
Principle VI only when that file is already being changed for another reason, and only in the
region being changed.

**Amendment procedure**: Amendments are proposed by updating the source guidance (e.g.
`designDocs/constitution-prompt.md`) or by direct edit of this file, then re-running the
constitution workflow so dependent templates are re-validated for consistency. Each amendment
MUST update the Sync Impact Report at the top of this file and the version/date footer below.

**Versioning policy** (semantic versioning applied to governance):
- MAJOR: Backward-incompatible principle removals or redefinitions.
- MINOR: A new principle or section is added, or existing guidance is materially expanded.
- PATCH: Clarifications, wording, typo fixes, and other non-semantic refinements.

**Compliance review**: Any `/speckit-plan` output MUST include a Constitution Check gate
evaluated against the principles above; any violation MUST be justified in that plan's
Complexity Tracking table or the simpler alternative MUST be adopted instead. Reviews of pull
requests and agent-produced changes MUST verify adherence to these principles before merge.
Every feature's task list MUST carry a post-implementation documentation phase covering the
two Documentation Deliverables.

**Version**: 1.1.0 | **Ratified**: 2026-07-29 | **Last Amended**: 2026-09-10
