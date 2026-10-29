Start a new spec for these requirements called `20261029-171759-PLAN-ANALYZE-CHAIN`  
!! THIS FILE IS GENERATED USING THE SKILL `/speckit-requirements`. DO NOT EDIT OR DELETE THIS FILE !!  

# Initial High-Level Requirements

Create a skill called /speckit-plan-thru-analyze

The first thing it will do is check if /speckit-clarify was the most recent skill executed, 
and only proceed if all clarifications have been resolved.  

If that check passes, 
it will then execute the sequence of skills: /speckit-plan, /speckit-tasks, /speckit-analyze, and /speckit-analyze-findings
These are run synchronoulsy, i.e. start one when the previous one finishes

## Decisions (from requirements-report.md, 2026-10-29)

- IN1: the skill is named `/speckit-plan-thru-analyze`, since its first step is `/speckit-plan` (it was first written as `/speckit-tasks-thru-analyze`).  
- AM1: the skill tells that clarification was the last step from the feature's files, not from a run history:  
  `spec.md` has a `## Clarifications` section with at least one `### Session` heading, and `plan.md` does not exist yet;  
  `/speckit-clarify-findings` may run between `/speckit-clarify` and this skill.  
- AM2: "all clarifications have been resolved" means `spec.md` holds no `[NEEDS CLARIFICATION` marker and, when `clarify-findings.md` exists for the feature, it has no open finding.  
- UA1: when the check fails, the skill stops before any step runs, changes no file, and shows which condition failed, what is open (the markers or finding ids) and the command to run next (`/speckit-clarify` or `/speckit-clarify-findings`).  
- UA2: the chain runs straight through: optional hooks are listed but not run;  
  the remediation question of `/speckit-analyze` is not asked, since `/speckit-analyze-findings` replaces it;  
  the chain ends at the first prompt of `/speckit-analyze-findings`.  
- UA3: a step that fails stops the chain; no later step runs;  
  the skill reports the step, its error and the steps already finished.  
- UA4: any text after the command is passed to `/speckit-plan` as its guidance; nothing is passed to the other three skills.  
- UA5: the skill is one `SKILL.md` in `.claude/skills/speckit-plan-thru-analyze/`, user-invocable, with the `Skill` tool allowed;  
  it invokes each skill with the `Skill` tool, one at a time, and prints `Step <n> of 4: /<skill>` before each and a one-line result after it.  
- NC1: the skill is listed, as an alternative to running the four skills one by one, in the journey message of `/speckit-requirements NEW` and in the Spec Kit Workflow block of `CLAUDE.md`.  
- AM1 (amended): superseded by spec clarification Q2 (2026-10-29): no clarification session is required; the check is that no `[NEEDS CLARIFICATION` marker or open clarification finding remains and no plan exists.  
