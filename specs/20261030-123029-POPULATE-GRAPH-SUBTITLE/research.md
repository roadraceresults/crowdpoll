# Research: Populate Script Graph Subtitle

## R1. Where the subtitle shows — no display change is needed

**Decision**: write the value to the existing `polls.subtitle` and change nothing in the browser.

**Rationale**: the poll card already renders the subtitle under the title (`pollCard.js` fills every
`.subtitle` element from `poll.subtitle`), and the maximized view's line graph already renders
`el('p', 'line-graph-subtitle', ctx.subtitle || '')` (`src/public/lineGraph.js` line 458) — blank today for
populated polls only because the script hard-codes `subtitle: ""`. The value flows to the browser through the
existing projection (`refreshProjection` / `projectPoll`), which the script already refreshes.

**Alternatives considered**: a new poll attribute or a graph-only subtitle — rejected; it would duplicate an
existing field and need UI work for no benefit (requirements AM1, Recommendation A).

## R2. How the key is parsed

**Decision**: `parsePollData` reads `subtitle` with a new small helper beside `requiredText`:

- key absent → `InputError`: `"subtitle" is missing` (TWEAK01: the key is `subtitle`, required; it was
  the optional `graph_subtitle`, UA1);
- value `""` → `subtitle` is `""`;
- value a string of 1 to `SUBTITLE_MAX` characters → used as-is, untrimmed;
- value a non-string (number, null, object, …) → `InputError`: `"subtitle" must be text`;
- value a string over `SUBTITLE_MAX` → `InputError`: `"subtitle" is longer than 30 characters`
  (the title's existing wording, `"title" is longer than ${TITLE_MAX} characters`, with the field name and
  limit swapped in).

**Rationale**: the two error messages mirror the script's existing style exactly; not trimming matches
`validateFieldLength` (`src/polls/service.ts`), which accepts any string up to the limit without trimming, so
a subtitle entered through the admin card and one populated from a file behave identically. A whitespace-only
value is therefore stored as given, same as the admin card would.

**Alternatives considered**: treating `null` as absent — rejected, speculative leniency (Constitution II);
no documented file uses `null`. Trimming — rejected, it would diverge from the admin card's behaviour.

## R3. The two write paths

**Decision**: both existing writes of `subtitle: ""` become `subtitle: data.subtitle`:

- **create**: the `Object.assign(poll, { title: …, subtitle: "", … })` on the new-poll path;
- **refresh**: the `updatePoll({ db, cache }, pid, { …, subtitle: "", … })` call on the rerun path.

Because the refresh path always sends the file's value, a file without the key (parsed to `""`) clears an
earlier subtitle — the file is the source of truth on every run (UA2), exactly as for title and choices.

**Rationale**: no new write, no conditional: the two literals are the only places the script sets a subtitle,
confirmed by reading `devScripts/populate/populate-poll.ts` (lines 231 and 253). `updatePoll` already
persists `subtitle` like `title`, and the script already refreshes the projection and reconciles counters
afterwards, so nothing else must change for the value to reach the tabs and the graph.

**Alternatives considered**: only setting the subtitle when the key is present — rejected; it would make
reruns non-convergent (a removed key would leave a stale subtitle), contradicting UA2.

## R4. Where the limit comes from

**Decision**: import `SUBTITLE_MAX` from `../../src/polls/service.js`, extending the script's existing import
of `CHOICE_LABEL_MAX, createDefaultPoll, TITLE_MAX` from the same module.

**Rationale**: `SUBTITLE_MAX = 30` is defined once there (`src/polls/service.ts` line 32) and enforced by
`validateFieldLength` on every admin-card save; importing it keeps one source of truth (NC1), so a future
limit change needs no script edit.

**Alternatives considered**: a local constant `30` — rejected, it would drift.

## R5. Tests and fixture

**Decision**:

- `tests/fixtures/populate-poll.json` gains `"subtitle": "Fixture subtitle"` (16 characters), so the
  main create/rerun suites exercise the stored value for free;
- `parsePollData` unit tests: the fixture's value lands on `PollData.subtitle`; `""` parses to `""` and an absent key is refused (TWEAK01);
- `parsePollData — input errors` table gains two rows: a non-string value and a 31-character value, each
  refused with the R2 message;
- `populatePoll — create`: the created poll row's `subtitle` equals the fixture's value;
- `populatePoll — rerun`: a rerun with a changed value updates `polls.subtitle`, and a rerun whose data has
  `"subtitle": ""` clears it to `""`.

**Rationale**: `tests/populate-poll.test.ts` already has the exact suites to extend (`parsePollData`,
`parsePollData — input errors`, `populatePoll — create`, `populatePoll — rerun`), so every FR gets a test
without a new file.

**Alternatives considered**: a separate fixture with the key — rejected; the single fixture keeps the suites
and the documentation telling one story (UA3).

## R6. The two local data files

**Decision**: the git-ignored files under `polldata/` are corrected by hand, outside the commit: keys brought
back to the documented format (`poll_creator_email`, `title`, `choice_a`/`choice_b`, choice-keyed
`data_points`, `vote_count`), keeping `subtitle` with a value within the limit
(e.g. "For Demonstration Purposes", 26 characters). The quickstart documents the expected shape.

**Rationale**: NC2 Recommendation A — the script accepts only the documented format; the files currently use
`graph_title`, `label_a`/`label_b` and bare `a`/`b` point keys and lack the two required keys, so they fail
today before the subtitle key is reached. Their current value, "Poll for Demonstration Purposes", is 31
characters and must shrink (NC1).

**Alternatives considered**: teaching the script the second shape — rejected by NC2 (two formats to document,
validate and test for one developer tool).
