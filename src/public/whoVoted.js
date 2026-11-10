(function () {
  const SHOWN_STATES = ["OPEN", "CLOSED"];
  const SORT_BY_VOTER = "voter";
  const SORT_BY_CHOICE = "choice";
  const FRESH = 0;
  const RETRY = 1;
  const RESCHEDULED_RETRY = 2;
  const SVG_NS = "http://www.w3.org/2000/svg";

  const states = new WeakMap();
  let headingCount = 0;

  const nameCollator = new Intl.Collator(undefined, { sensitivity: "base", numeric: true });
  const dayFormat = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" });
  const momentFormat = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });

  function stateOf(section) {
    let state = states.get(section);
    if (!state) {
      headingCount += 1;
      state = {
        headingId: "maximizedVotersHeading-" + headingCount,
        pid: null,
        detail: null,
        sort: SORT_BY_VOTER,
        report: null,
        request: 0,
        retryTimer: null,
        refused: null
      };
      states.set(section, state);
    }
    return state;
  }

  function qualifies(detail) {
    return Boolean(detail) && detail.pollVisibility === "Private Poll" && SHOWN_STATES.includes(detail.pollState);
  }

  function isRefused(state, pid, detail) {
    return Boolean(state.refused) && state.refused.pid === pid && state.refused.contentVersion === detail.contentVersion;
  }

  function clearRetry(state) {
    if (state.retryTimer !== null) window.clearTimeout(state.retryTimer);
    state.retryTimer = null;
  }

  function show(section, pid, detail) {
    if (!section) return;
    const state = stateOf(section);
    if (!qualifies(detail)) {
      hide(section);
      return;
    }
    if (isRefused(state, pid, detail)) return;
    if (state.pid !== pid) {
      clearSection(section, state);
      state.pid = pid;
      state.sort = SORT_BY_VOTER;
    }
    state.detail = detail;
    clearRetry(state);
    fetchReport(section, state, FRESH);
  }

  function hide(section) {
    if (!section) return;
    const state = stateOf(section);
    clearSection(section, state);
    state.refused = null;
  }

  function clearSection(section, state) {
    clearRetry(state);
    state.request += 1;
    state.pid = null;
    state.detail = null;
    state.report = null;
    state.sort = SORT_BY_VOTER;
    section.replaceChildren();
    section.hidden = true;
  }

  function scheduleRetry(section, state, delayMs, attempt) {
    clearRetry(state);
    state.retryTimer = window.setTimeout(() => {
      state.retryTimer = null;
      fetchReport(section, state, attempt);
    }, Math.max(0, Number(delayMs) || 0));
  }

  function fetchReport(section, state, attempt) {
    const pid = state.pid;
    state.request += 1;
    const ticket = state.request;
    fetch("/api/me/polls/" + encodeURIComponent(pid) + "/voters")
      .then((res) => res.json().catch(() => null).then((body) => ({ status: res.status, body: body })))
      .then((answer) => {
        if (ticket !== state.request || state.pid !== pid) return;
        receive(section, state, attempt, answer);
      })
      .catch(() => {});
  }

  function receive(section, state, attempt, answer) {
    const body = answer.body || {};
    if (answer.status === 404) {
      const contentVersion = state.detail ? state.detail.contentVersion : null;
      const pid = state.pid;
      clearSection(section, state);
      state.refused = { pid: pid, contentVersion: contentVersion };
      return;
    }
    if (answer.status === 429) {
      if (attempt === FRESH) scheduleRetry(section, state, body.retryAfterMs, RETRY);
      else if (attempt === RETRY) scheduleRetry(section, state, body.retryAfterMs, RESCHEDULED_RETRY);
      return;
    }
    if (answer.status !== 200 || !Array.isArray(body.voters)) return;
    state.report = body;
    render(section, state);
    if (attempt === FRESH && body.settleMs !== undefined) scheduleRetry(section, state, body.settleMs, RETRY);
  }

  function barOrder(detail) {
    return (detail.choices || []).slice().sort((a, b) => (b.pct || 0) - (a.pct || 0) || a.position - b.position);
  }

  function byName(a, b) {
    return nameCollator.compare(a.name, b.name) || String(a.votedAt).localeCompare(String(b.votedAt));
  }

  function voterGroups(report, choices) {
    const rank = new Map(choices.map((choice, index) => [choice.id, index]));
    return report.voters
      .slice()
      .sort(byName)
      .map((voter) => ({
        title: voter.name,
        lines: voter.choiceIds
          .filter((id) => rank.has(id))
          .sort((a, b) => rank.get(a) - rank.get(b))
          .map((id) => ({ text: choices[rank.get(id)].label, votedAt: voter.votedAt }))
      }))
      .filter((group) => group.lines.length > 0);
  }

  function choiceGroups(report, choices) {
    const voters = report.voters.slice().sort(byName);
    return choices
      .map((choice) => ({
        title: choice.label,
        lines: voters
          .filter((voter) => voter.choiceIds.includes(choice.id))
          .map((voter) => ({ text: voter.name, votedAt: voter.votedAt }))
      }))
      .filter((group) => group.lines.length > 0);
  }

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function checkIcon() {
    const svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("class", "who-voted-check");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("aria-hidden", "true");
    const path = document.createElementNS(SVG_NS, "path");
    path.setAttribute("d", "M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z");
    svg.append(path);
    return svg;
  }

  function sortControl(section, state) {
    const group = element("div", "who-voted-sort");
    group.setAttribute("role", "group");
    group.setAttribute("aria-label", "Sort");
    [
      [SORT_BY_VOTER, "Sort by Voter"],
      [SORT_BY_CHOICE, "Sort by Choice"]
    ].forEach(([sort, label]) => {
      const button = element("button", "who-voted-segment");
      button.type = "button";
      const selected = state.sort === sort;
      button.setAttribute("aria-pressed", String(selected));
      if (selected) button.append(checkIcon());
      button.append(element("span", "who-voted-segment-label", label));
      button.addEventListener("click", () => {
        if (state.sort === sort) return;
        state.sort = sort;
        render(section, state);
      });
      group.append(button);
    });
    return group;
  }

  function dateCell(votedAt) {
    const cell = element("td", "who-voted-date");
    const moment = new Date(votedAt);
    const time = element("time", null, dayFormat.format(moment));
    time.dateTime = votedAt;
    time.title = momentFormat.format(moment);
    cell.append(time);
    return cell;
  }

  function table(state) {
    const byVoter = state.sort === SORT_BY_VOTER;
    const choices = barOrder(state.detail);
    const groups = byVoter ? voterGroups(state.report, choices) : choiceGroups(state.report, choices);
    const headings = byVoter ? ["Voter", "Choice", "Date"] : ["Choice", "Voter", "Date"];
    const node = element("table", "who-voted-table");
    const head = element("thead");
    const headRow = element("tr");
    headings.forEach((heading) => {
      const cell = element("th", null, heading);
      cell.scope = "col";
      headRow.append(cell);
    });
    head.append(headRow);
    node.append(head);
    groups.forEach((group) => {
      const body = element("tbody");
      group.lines.forEach((line, index) => {
        const row = element("tr");
        if (index === 0) {
          const title = element("th", "who-voted-group", group.title);
          title.scope = "rowgroup";
          title.rowSpan = group.lines.length;
          row.append(title);
        }
        row.append(element("td", null, line.text), dateCell(line.votedAt));
        body.append(row);
      });
      node.append(body);
    });
    return node;
  }

  function render(section, state) {
    if (!state.report || !state.detail) return;
    const heading = element("h2", "who-voted-heading", "Who voted");
    heading.id = state.headingId;
    section.setAttribute("aria-labelledby", state.headingId);
    if (state.report.voters.length === 0) {
      section.replaceChildren(heading, element("p", "who-voted-empty", "No votes yet."));
    } else {
      section.replaceChildren(heading, sortControl(section, state), table(state));
    }
    section.hidden = false;
  }

  window.WhoVoted = { show: show, hide: hide };
})();
