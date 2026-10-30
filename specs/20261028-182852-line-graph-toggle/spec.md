# Feature Specification: Per-Poll Line Graph Toggle

**Feature Branch**: `line-graph-toggle`

**Created**: 2026-10-28

**Status**: Draft

**Input**: Source requirements: `requirements/20261028-114023-line-graph-toggle/requirements.md` (with its report, `requirements-report.md`, all findings resolved)

## Overview

The line graph shows each choice's share of the votes over time, beside a maximized poll. Not every poll suits a line graph, so this feature makes the graph a per-poll setting. It is off for every poll by default, and only an Administrator can switch it on. The Administrator does this on the "View" step of the poll card, which is the renamed "Colors" step. The graph's drawing rules (data, scales, colors, threshold and refresh) are those of the existing line graph feature, `specs/20261027-151601-POLL-LINE-GRAPH/spec.md`, which is on this branch; this feature does not restate them.

## Clarifications

### Session 2026-10-28

- Q: Who may switch the line graph on or off? → A: Any Administrator (an address in the administrator list). Poll creators who are not Administrators never see or change it.
- Q: What does a creator who is not an Administrator see on the "View" step? → A: The checkbox is absent. The step shows only the color pickers, as today.
- Q: Is the step renamed? → A: Yes. "Colors" becomes "View" in its circle and its heading, and it keeps its number. The color picker keeps its own accessible name, "Colors".
- Q: May the setting change once a poll has votes, or while it is open? → A: Yes, in every poll state except awaiting approval, with or without votes. While a poll is awaiting approval, a change is refused, as for any other field. Changing it never sends the poll for review and never pauses voting beyond an open edit session.
- Q: Can a creator's save switch an Administrator's choice off by accident? → A: No. A save that does not carry the setting leaves it as it is, and a save that carries it from anyone other than an Administrator is refused.
- Q: What do existing polls get? → A: Every existing poll starts with the graph off.
- Q: What happens to a graph already on screen when an Administrator switches it off? → A: The graph stays until the maximized view is closed. Its next refresh finds no graph and shows the graph's existing "Results are not available yet" note.
- Q: When two Administrators save the setting for the same poll at nearly the same time, which save takes effect? → A: The later save. It replaces the earlier one, and no conflict message is shown.
- Q: When an address is removed from the administrator list, what happens to polls that address switched on? → A: The setting stays as it is. Only current Administrators can change it afterwards.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Administrator turns the line graph on for a poll (Priority: P1)

An Administrator opens a poll on the card, goes to the "View" step, ticks "Show the line graph" and saves. From then on the maximized poll shows the graph for everyone who may view its results.

**Why this priority**: This is the feature's purpose. Without it no poll can show a graph.

**Independent Test**: Open a poll as an Administrator, turn the setting on, save, then maximize the poll as a viewer. The graph appears beside the card.

**Acceptance Scenarios**:

1. **Given** a poll with the graph off and no votes, **When** an Administrator ticks "Show the line graph" on the "View" step and saves, **Then** the poll's setting is on and the maximized view shows the graph.
2. **Given** a poll with votes, **When** an Administrator changes only the setting and saves, **Then** the poll's state does not change, it is not sent for review, and voting is not paused.
3. **Given** a poll with the graph on, **When** an Administrator unticks the checkbox and saves, **Then** the poll shows no graph from the next maximize onward.

---

### User Story 2 - Viewers see the graph only where it is on (Priority: P1)

A viewer maximizes a poll. If the poll's graph is on, the graph is drawn beside the card. If it is off, no graph is drawn and no graph data is requested; the right-hand space beside the card may stay empty.

**Why this priority**: Off is the default for every poll, so most maximized views depend on this behavior being exact.

**Independent Test**: Maximize one poll with the setting on and one with it off, and compare the layouts and the requests made.

**Acceptance Scenarios**:

1. **Given** a poll with the graph off, **When** a viewer maximizes it, **Then** no graph area is shown and no graph data is requested.
2. **Given** a poll with the graph off, **When** anyone asks for its graph data directly, **Then** the answer is "not found".
3. **Given** a poll with the graph on, **When** a viewer maximizes it, **Then** the graph is drawn and refreshed as the existing line graph feature specifies.

---

### User Story 3 - Creators see the setting's effect but not the control (Priority: P2)

A poll creator who is not an Administrator opens the "View" step and sees only the color pickers, as before. The poll's Settings Summary tells them when the graph is shown.

**Why this priority**: Creators must not be given a control they cannot use, but they still need to know what their poll shows.

**Independent Test**: Sign in as a creator who is not an Administrator, open a poll whose graph is on, and check the "View" step and its summary.

**Acceptance Scenarios**:

1. **Given** a creator who is not an Administrator, **When** they open the "View" step, **Then** no checkbox is shown and only the color pickers appear.
2. **Given** a poll whose graph is on, **When** any creator who can see its card reads the Settings Summary, **Then** the "View" line says "The line graph is shown."
3. **Given** a poll whose graph is off, **When** anyone reads the Settings Summary, **Then** the "View" line adds nothing about the graph.

---

### User Story 4 - An Administrator switches a graph off while it is on screen (Priority: P2)

A viewer has a graph open. An Administrator switches it off. The viewer keeps the graph until closing the maximized view, and the next refresh shows the graph's existing note instead of failing silently.

**Why this priority**: It is the one case where the change reaches a viewer who has not reopened the card.

**Independent Test**: Open a maximized poll with the graph on, switch the setting off as an Administrator, and wait for the next refresh.

**Acceptance Scenarios**:

1. **Given** a maximized poll with the graph drawn, **When** the setting is switched off, **Then** the graph remains until the viewer closes the maximized view.
2. **Given** the same view, **When** its next refresh asks for graph data, **Then** the graph's existing note is shown.

---

### Edge Cases

- A poll has no choices yet: the checkbox is still shown first for an Administrator, and the "Add your choices first" note takes the place of the color pickers below it.
- A creator who is not an Administrator saves colors only on a poll with votes: the save carries no setting and the stored value stays as it is.
- Two Administrators save the setting for the same poll at nearly the same time: the later save takes effect, replacing the earlier one, with no conflict message.
- A request from someone who is not an Administrator carries the setting: the request is refused, and nothing changes.
- A request without the setting from an Administrator: the stored value stays as it is.
- A poll is closed: the setting can still be changed, with the same rules as any other field. A poll awaiting approval refuses the change, as for any other field.
- An open home-page card: the change reaches it on the viewer's next Refresh of the tab, not instantly.
- The "View" step's number and position in the wizard do not change, so the Settings Summary's link to it still works.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Each poll MUST have a line graph setting, off by default. Every existing poll MUST start with the setting off.
- **FR-002**: The setting MUST be changeable only by an Administrator, meaning an address in the administrator list. Poll creators who are not Administrators MUST NOT see or change it.
- **FR-003**: A request that carries the setting from anyone other than an Administrator MUST be refused. A request without the setting MUST leave the stored value as it is.
- **FR-004**: The admin card's fourth step MUST be titled "View" in its circle and its heading, keep its number, and keep its existing link from the Settings Summary. The color picker MUST keep the accessible name "Colors".
- **FR-005**: For an Administrator, the "View" step MUST show a checkbox labelled "Show the line graph" above the color pickers, in every case, including before the poll has choices.
- **FR-006**: When the poll has no choices, the "Add your choices first" note MUST take the place of the color pickers below the checkbox.
- **FR-007**: The setting MUST be changeable in every poll state except awaiting approval, with or without votes. While a poll is awaiting approval, a change is refused, as for any other field. Changing it MUST NOT send the poll for review and MUST NOT pause voting beyond an open edit session.
- **FR-008**: Saving a change to only the setting on a poll with votes MUST use the existing colors-only save path, which accepts the setting as well as colors.
- **FR-009**: The Settings Summary's "View" line MUST add "The line graph is shown." when the setting is on, for everyone who can see the card. When it is off, it MUST add nothing about the graph.
- **FR-010**: The maximized view MUST draw the graph only when the setting is on. When it is off, the view MUST show no graph and make no graph data request. The right-hand space beside the card MAY stay reserved and empty.
- **FR-011**: Asking for the graph data of a poll whose setting is off MUST be answered as "not found".
- **FR-012**: Each home-page poll's card data MUST carry the setting, so an open card shows a change on the viewer's next Refresh of the tab.
- **FR-013**: The admin list and admin search results MUST carry the setting for every poll, for every caller who may see the row. The checkbox MUST start from the stored value, and the Settings Summary line MUST read it.
- **FR-014**: When an Administrator switches the setting off while the poll's graph is on screen, the graph MUST remain until the maximized view is closed. The next refresh that finds no graph MUST show the graph's existing "Results are not available yet" note.
- **FR-015**: The graph's drawing rules, data, scales, colors, threshold and refresh interval MUST stay as the existing line graph feature specifies, `specs/20261027-151601-POLL-LINE-GRAPH/spec.md`.
- **FR-016**: The setting MUST be stored with the poll and written through the existing poll save paths, without a new configuration value, a new browser storage key or a new cookie.

### Key Entities

- **Poll**: gains one attribute, whether it shows the line graph. Off by default. Changed by an Administrator only.
- **Administrator**: an address in the administrator list. The only account that can see or change the setting.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An Administrator can turn the line graph on for a poll, and a viewer sees it when maximizing that poll, within one Refresh of the tab. A viewer can refresh at most once every 5 seconds by default (`ENV_MIN_MANUAL_REFRESH_INTERVAL`), and under load that floor can stretch up to `ENV_MAX_STRETCH` times.
- **SC-002**: A user who is not an Administrator never sees the checkbox, and a request from such a user that carries the setting is refused in 100% of attempts.
- **SC-003**: After the change is deployed, no existing poll shows a graph until an Administrator switches it on.
- **SC-004**: Switching the setting never changes a poll's state, sends it for review, or pauses voting, in 100% of cases tested with and without votes.
- **SC-005**: A maximized poll with the setting off shows no graph area and makes no graph request, in 100% of cases tested.
- **SC-006**: Every poll creator sees the "View" step's summary tell them correctly whether their poll's graph is shown.

## Assumptions

- The checkbox's label is "Show the line graph", in the wizard's checkbox style. Its wording may change in a later step.
- Administrators are the addresses in the existing administrator list; no separate setting picks one person. Removing an address from that list does not change the settings it switched on.
- "Administrator" in this feature means the `isAdminEmail` rule only (an address in the administrator list). It does not mean the `Administrator` permission string that the server also grants to such users, and the setting's checks never read that string.
- The graph itself is unchanged; its data, scales, colors, threshold and refresh interval stay as the existing line graph feature specifies.
- The setting is one additional stored attribute per poll, added by one additive schema change, and existing polls take the default.
- The graph's code and its specification are already on this branch (commit `3f4b6de`); this feature only adds the setting and its controls.
- The setting is merged with the graph's code, so no deployment ever shows a graph on every poll.
- Turning the graph on is a presentation choice: it does not change votes, results, or the poll's state.
