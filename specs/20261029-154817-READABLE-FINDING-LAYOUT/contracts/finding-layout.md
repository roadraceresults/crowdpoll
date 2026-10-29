# Contract: Finding Layout

The exact text `/speckit-requirements` writes for a finding, and what it recognizes when it reads one.
`AM2`, the titles, summaries and dates are examples; `␣␣` marks the two trailing spaces of a Markdown line break and is not written literally.
A blank line is empty: no spaces (FR-005).

## L1. Open finding, new form

```markdown
**AM2. Short title of the finding**␣␣

> First sentence of the explanation.␣␣
> Second sentence, with a [link](https://example.com) and `code`.␣␣

❌ NOT Resolved

  - **Recommendation A** _(recommended)_: **short summary of A**␣␣

    [ ] ➡️ **Accept** (To Accept, you may: mark <b>[X]</b> on this line, save the file, then Type/Say "<b>next</b>" in the CC CLI terminal, OR Type/Say "<b>Accept AM2, A</b>" in CC CLI)

    Details, when there are any.␣␣
    - <u>Pros</u>: pros.␣␣
    - <u>Cons</u>: cons.␣␣


  - **Recommendation B**: **short summary of B**␣␣

    [ ] ➡️ **Accept** (To Accept, you may: mark <b>[X]</b> on this line, save the file, then Type/Say "<b>next</b>" in the CC CLI terminal, OR Type/Say "<b>Accept AM2, B</b>" in CC CLI)

    - <u>Pros</u>: pros.␣␣
    - <u>Cons</u>: cons.␣␣


  - **Developer Resolution C**:␣␣

    [ ] ➡️ **Accept** (To Accept, you may: mark <b>[X]</b> on this line, save the file, then Type/Say "<b>next</b>" in the CC CLI terminal, OR Type/Say "<b>Accept AM2, C</b>" in CC CLI)

    - you may enter your own resolution here␣␣
```

Rules:
- **L1.1** Order: title; blank; explanation (every line starts `> `); blank; `❌ NOT Resolved`; blank; options (FR-001).
- **L1.2** Each option: label; blank; Accept line; blank; details. Two blank lines between options (FR-002, FR-005).
- **L1.3** A single recommendation is labelled `**Recommendation**` (no letter); its Accept line ends `Type/Say "<b>Accept AM2</b>" in CC CLI)`, and the Developer Resolution is `B` (FR-003, UA3).
- **L1.4** Only the recommended option of several carries `_(recommended)_`.
- **L1.5** Research results (`RS`) use the same layout; their explanation names the sources as Markdown links (FR-019).
- **L1.6** The Developer Resolution has exactly one instruction line (FR-004).

## L2. Resolved finding, new form

```markdown
**AM2. Short title of the finding**␣␣
<span style="font-size:large" ><b>
✅ Resolved</b></span>␣␣
✅ Requirements File Updated: 2026-10-29 3:05 PM␣␣
**Notes**: Recommendation accepted by "Accept AM2, B" 2026-10-29: Recommendation B, short summary of B;␣␣
the requirements now say so under Decisions.␣␣

> First sentence of the explanation.␣␣
> Second sentence, with a [link](https://example.com) and `code`.␣␣

  - **Recommendation A** _(recommended)_: **short summary of A**␣␣

    [ ] ➡️ **Not Accepted**

    Details, when there are any.␣␣
    - <u>Pros</u>: pros.␣␣
    - <u>Cons</u>: cons.␣␣


  - **Recommendation B**: **short summary of B**␣␣

    [X] ➡️ **Accepted**

    - <u>Pros</u>: pros.␣␣
    - <u>Cons</u>: cons.␣␣


  - **Developer Resolution C**:␣␣

    [ ] ➡️ **Not Accepted**
```

Rules:
- **L2.1** The `❌ NOT Resolved` line and the blank line after it are removed (FR-006).
- **L2.2** Under the title: the two-line `✅ Resolved` span, the requirements line, the `**Notes**:` line(s); then a blank line (FR-006).
- **L2.3** The requirements line is `✅ Requirements File Updated: <date time>`, or `✅ Requirements File Unchanged (no edit needed): <date time>`; the time comes from the shell (`date '+%Y-%m-%d %-I:%M %p'`).
- **L2.4** The Notes line names the route — `accepted in file`, `accepted by "Accept"`, `accepted by "Accept <ID>, <LETTER>"` (as typed, normalized to that spelling) or `accepted by "Accept all"` — the date, the option's label and summary, and what changed in the requirements document.
- **L2.5** The chosen option's Accept line is exactly `[X] ➡️ **Accepted**`; every other option's, the Developer Resolution included, is exactly `[ ] ➡️ **Not Accepted**` (FR-007).
- **L2.6** The Developer Resolution's instruction line is removed; text the developer wrote under it stays (FR-008).

## L3. Reading a report

- **L3.1 Ticked box** — `\[\s*[xX]\s*\]`; unticked — `\[\s*\]` (FR-009). On a new-form line the box starts the line (after indentation), followed by ` ➡️ **Accept`.
- **L3.2 Resolved** — the finding contains `✅ Resolved` between its title and its explanation; nothing else decides it (FR-010).
- **L3.3 Hand-marked** — `✅ Resolved` present but the requirements line or the `**Notes**:` line missing: open, repaired by "Next" as today.
- **L3.4 Marker upkeep** — "Next" adds `❌ NOT Resolved` (after the explanation) to an open new-form finding that lacks it and removes it from a resolved one (FR-011).
- **L3.5 Report form** — old when any Accept line matches `➡️ \[\s*[xX]?\s*\] \*\*Accepted\*\*` (arrow before box); new otherwise, including a report with no findings (FR-018).

## L4. Old form (reports created before this feature)

The layout the skill wrote until 2026-10-29, kept for old-form reports only (FR-017, FR-018):

- the explanation is plain lines, not a block quote, and there is no `❌` line;
- each Accept line is `➡️ [ ] **Accepted** <span style="font-size:smaller ;padding-left:50px"><i>(you may mark <b>[X] Accepted</b> here, or Type/Say "<b>Accept</b>" in the CC CLI terminal)</i></span>␣␣` with the details directly under it, and the Developer Resolution's line has no `<span>` and two instruction lines;
- resolving: `<span style="font-size:large">✅ Resolved</span>␣␣`, the requirements line and the Notes line under the title; the chosen line becomes `➡️ [X] **Accepted**`, the others keep `➡️ [ ] **Accepted**`; every hint `<span>` and the Developer Resolution's two instruction lines are removed.
