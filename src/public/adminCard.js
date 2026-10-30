/**
 * Poll administration card: the read-only face and the six-step wizard that
 * sets up a new poll and edits an existing one. Its look is admin-card-m3.css.
 * Choices box behaviour ported from designDocs/smart-textbox.html
 */
(function () {
  "use strict";

  const DEFAULT_CHOICE_LABELS = ["Choice 1", "Choice 2"];
  const CHOICE_LABEL_MAX = 100;
  const HEARTBEAT_INTERVAL_MS = 10000;
  const DISCARD_HEADLINE = "Discard changes?";
  const DISCARD_TEXT = "Your edits will be lost.";

  window.M3Ripple?.add(".modal .modal-action");
  for (const selector of [
    ".poll-admin-card .m3-filled-btn",
    ".poll-admin-card .m3-tonal-btn",
    ".poll-admin-card .btn-header-primary",
    ".poll-admin-card .btn-header-ghost",
    ".poll-admin-card .admin-state-btn",
    ".poll-admin-card .admin-rescreen-btn",
    ".poll-admin-card .admin-icon-btn",
    ".poll-admin-card .actions-menu-trigger",
    ".poll-admin-card .m3-radio-item",
    ".poll-admin-card .m3-switch-row",
    ".poll-admin-card .wizard-color-btn",
    ".poll-admin-card .wizard-swatch",
    ".poll-admin-card .invitees-invite-btn",
    ".poll-admin-card .invitees-page-btn",
    ".actions-menu a",
    ".actions-menu button"
  ]) {
    window.M3Ripple?.add(selector);
  }

  // 014: minChoices / maxChoices are ENV_MIN_CHOICES / ENV_MAX_CHOICES, told to the
  // page by /api/config like the voter limit; the values here are only the fallback
  // until it answers.
  const runtime = { privateVoterLimit: 100, participantsViewportSize: 10, maxInvitationsPerDay: 200, minChoices: 2, maxChoices: 50, barPalette: [] };

  function setRuntimeConfig(cfg) {
    if (Number.isInteger(cfg.maxPrivatePollVoters)) runtime.privateVoterLimit = cfg.maxPrivatePollVoters;
    if (Number.isInteger(cfg.participantsViewportSize)) runtime.participantsViewportSize = cfg.participantsViewportSize;
    if (Number.isInteger(cfg.maxInvitationsPerDay)) runtime.maxInvitationsPerDay = cfg.maxInvitationsPerDay;
    if (Number.isInteger(cfg.minChoices)) runtime.minChoices = cfg.minChoices;
    if (Number.isInteger(cfg.maxChoices)) runtime.maxChoices = cfg.maxChoices;
    if (Array.isArray(cfg.barPalette)) runtime.barPalette = cfg.barPalette;
  }

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  // The Not Saved page dialog. It reuses Tabs.modal's markup, so tabs-modal-m3.css
  // and discard-dialog-m3.css dress it. Keep editing, Escape and the scrim answer
  // false; focus starts on Keep editing, Tab stays on the two actions, and focus
  // returns to the opener.
  let pendingDiscardAnswer = null;

  function askToDiscard() {
    if (pendingDiscardAnswer) return pendingDiscardAnswer;
    pendingDiscardAnswer = new Promise((resolve) => {
      const backdrop = el("div", "modal-backdrop");
      const box = el("div", "modal");
      box.setAttribute("role", "alertdialog");
      box.setAttribute("aria-modal", "true");
      box.setAttribute("aria-labelledby", "discard-headline");
      box.setAttribute("aria-describedby", "discard-text");
      const headline = el("h2", "modal-headline", DISCARD_HEADLINE);
      headline.id = "discard-headline";
      const text = el("p", "modal-text", DISCARD_TEXT);
      text.id = "discard-text";
      const keep = el("button", "tab-refresh modal-action modal-keep", "Keep editing");
      const discard = el("button", "tab-refresh modal-action modal-discard", "Discard");
      keep.type = discard.type = "button";
      const actions = el("div", "modal-actions");
      actions.append(keep, discard);
      box.append(headline, text, actions);
      backdrop.appendChild(box);
      const opener = document.activeElement;

      function close(answer) {
        document.removeEventListener("keydown", onKey);
        backdrop.remove();
        pendingDiscardAnswer = null;
        if (opener && opener !== document.body && opener.isConnected && opener.focus) opener.focus();
        resolve(answer);
      }
      function onKey(event) {
        if (event.key === "Escape") close(false);
        if (event.key === "Tab") {
          event.preventDefault();
          (document.activeElement === keep ? discard : keep).focus();
        }
      }
      keep.addEventListener("click", () => close(false));
      discard.addEventListener("click", () => close(true));
      backdrop.addEventListener("click", (event) => { if (event.target === backdrop) close(false); });
      document.addEventListener("keydown", onKey);
      document.body.appendChild(backdrop);
      keep.focus();
    });
    return pendingDiscardAnswer;
  }

  function formatTimestamp(value) {
    return value ? new Date(value).toLocaleString() : "—";
  }

  /** "<username> (<email>)", the email alone when there is no username, and nothing for a poll with no recorded creator. */
  function createdByText(poll) {
    const name = poll.createdByName || "";
    const email = poll.createdByEmail || "";
    if (name && email) return name + " (" + email + ")";
    return name || email;
  }

  function formatLaunched(value) {
    return value ? new Date(value).toLocaleString() : "not launched";
  }

  function toLocalInputValue(isoString) {
    if (!isoString) return "";
    const d = new Date(isoString);
    const pad = (n) => String(n).padStart(2, "0");
    return (
      d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) +
      "T" + pad(d.getHours()) + ":" + pad(d.getMinutes())
    );
  }

  function elapsedSinceApproval(poll, now) {
    if (!poll.pollApprovalTimestamp) return "queued";
    const seconds = Math.max(0, Math.round((now - new Date(poll.pollApprovalTimestamp)) / 1000));
    if (seconds < 60) return seconds + "s";
    return Math.floor(seconds / 60) + "m " + (seconds % 60) + "s";
  }

  function stateDetailText(poll, now) {
    if (poll.pollState === "AWAITING APPROVAL") return elapsedSinceApproval(poll, now);
    if (poll.pollState === "REJECTED") return poll.pollRejectionReason || "no reason given";
    return "";
  }

  const isBlank = (s) => s.trim() === "";

  // The emoji shortcut for a computer's keyboard, from the user agent. null on
  // phones and tablets (their keyboards have emoji) and on systems with no single
  // shortcut (Linux).
  function emojiShortcut() {
    const uad = navigator.userAgentData;
    const ua = navigator.userAgent || "";
    if ((uad && uad.mobile) || /Android|iPhone|iPad|iPod|Mobile/i.test(ua)) return null;
    const platform = (uad && uad.platform) || navigator.platform || "";
    if (/CrOS|Chrome OS/i.test(platform + " " + ua)) return "Search + Shift + Space";
    if (/Win/i.test(platform)) return "Win + .";
    if (/Mac/i.test(platform)) return navigator.maxTouchPoints > 1 ? null : "Ctrl + Cmd + Space";
    return null;
  }

  function emojiHint(lead) {
    const shortcut = emojiShortcut();
    return lead + (shortcut ? " For emoji press " + shortcut : " Emoji are welcome.");
  }

  function lineStartAt(value, pos) {
    return value.lastIndexOf("\n", pos - 1) + 1;
  }

  function sanitizeChoicesText(text, caret, { keepCaretLine = true, maxLabel = CHOICE_LABEL_MAX } = {}) {
    text = text.replace(/\r\n?/g, "\n");
    if (caret > text.length) caret = text.length;

    const head = text.slice(0, caret);
    let caretLine = head.split("\n").length - 1;
    let caretCol = caret - (head.lastIndexOf("\n") + 1);

    let lines = text.split("\n");
    let truncated = false;
    let droppedBlank = false;
    let droppedOverflow = false;

    lines = lines.map((line, i) => {
      if (line.length <= maxLabel) return line;
      truncated = true;
      if (i === caretLine) caretCol = Math.min(caretCol, maxLabel);
      return line.slice(0, maxLabel);
    });

    const kept = [];
    let newCaretLine = 0;
    lines.forEach((line, i) => {
      const exempt = keepCaretLine && i === caretLine;
      if (!isBlank(line) || exempt) {
        if (i === caretLine) newCaretLine = kept.length;
        kept.push(line);
      } else {
        droppedBlank = true;
      }
    });
    if (kept.length === 0) kept.push("");

    if (kept.length > runtime.maxChoices) {
      kept.length = runtime.maxChoices;
      droppedOverflow = true;
      if (newCaretLine >= runtime.maxChoices) {
        newCaretLine = runtime.maxChoices - 1;
        caretCol = kept[newCaretLine].length;
      }
    }

    let newCaret = 0;
    for (let i = 0; i < newCaretLine; i++) newCaret += kept[i].length + 1;
    newCaret += Math.min(caretCol, kept[newCaretLine].length);

    return { text: kept.join("\n"), caret: newCaret, truncated, droppedBlank, droppedOverflow };
  }

  function holdsOnlyDefaultChoices(text) {
    const lines = text.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);
    return lines.length === DEFAULT_CHOICE_LABELS.length &&
      lines.every((l, i) => l === DEFAULT_CHOICE_LABELS[i]);
  }

  // Two choices are the same when they differ only in capitals or spaces
  // ("Taco Town", "taco  town ").
  function choiceKey(line) {
    return line.trim().replace(/\s+/g, " ").toLowerCase();
  }

  // The first line that repeats an earlier one, trimmed, or null.
  function firstDuplicateChoice(text) {
    const seen = new Set();
    for (const line of text.split("\n")) {
      if (isBlank(line)) continue;
      const key = choiceKey(line);
      if (seen.has(key)) return line.trim();
      seen.add(key);
    }
    return null;
  }

  // Drops repeated choices, keeping the first of each; blank lines are left for
  // sanitizeChoicesText. Returns the text and how many were dropped.
  function withoutDuplicateChoices(text) {
    const seen = new Set();
    let removed = 0;
    const kept = text.split("\n").filter((line) => {
      if (isBlank(line)) return true;
      const key = choiceKey(line);
      if (seen.has(key)) { removed++; return false; }
      seen.add(key);
      return true;
    });
    return { text: kept.join("\n"), removed };
  }

  function svgIcon(symbol) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");
    const use = document.createElementNS("http://www.w3.org/2000/svg", "use");
    use.setAttribute("href", "#" + symbol);
    svg.appendChild(use);
    return svg;
  }

  function iconButton(symbol, label, enabled, onClick) {
    const btn = el("button", "admin-icon-btn");
    btn.type = "button";
    btn.disabled = !enabled;
    btn.title = label;
    btn.setAttribute("aria-label", label);
    btn.appendChild(svgIcon(symbol));
    if (enabled && onClick) btn.addEventListener("click", onClick);
    return btn;
  }

  function iconLink(symbol, label, href, enabled) {
    if (!enabled) return iconButton(symbol, label, false, null);
    const a = el("a", "admin-icon-btn");
    a.href = href;
    a.title = label;
    a.setAttribute("aria-label", label);
    a.appendChild(svgIcon(symbol));
    return a;
  }

  function menuItem(text, label, onSelect) {
    const btn = el("button", null, text);
    btn.type = "button";
    btn.setAttribute("role", "menuitem");
    btn.setAttribute("aria-label", label);
    btn.addEventListener("click", onSelect);
    return btn;
  }

  function menuLink(text, label, href) {
    const a = el("a", null, text);
    a.href = href;
    a.setAttribute("role", "menuitem");
    a.setAttribute("aria-label", label);
    return a;
  }

  function readOnlyField(labelText, value, extraClass) {
    const wrap = el("div", "card-field" + (extraClass ? " " + extraClass : ""));
    wrap.appendChild(el("span", "card-field-label", labelText));
    wrap.appendChild(el("span", "card-field-value", value));
    return wrap;
  }

  function create(poll, deps) {
    const card = el("article", "poll-admin-card");
    card.dataset.pid = poll.pid;
    card.setAttribute("aria-label", "Poll: " + poll.title);

    let mode = "READ_ONLY";
    let current = poll;
    let session = null;
    let dirty = false;
    let heartbeatTimer = null;
    let sessionLost = false;
    let exitGuardsArmed = false;

    const status = el("p", "card-status-line");
    status.hidden = true;
    status.setAttribute("role", "status");

    function showStatus(message) {
      status.textContent = message || "";
      status.hidden = !message;
    }

    function pollUrl(suffix) {
      return "/api/admin/polls/" + encodeURIComponent(current.pid) + (suffix || "");
    }

    // ── new-poll wizard ───────────────────────────────────────────────────────
    // A poll that has not been published (worded state INITIALIZED) is set up
    // through a six-step wizard inside the card. Top to bottom: the Settings
    // Summary, the Named Circles, the current step's panel, and the Cancel / Save /
    // Publish footer. The wizard holds an edit session, so the one-card-at-a-time
    // rule applies.

    const WIZARD_STEPS = [
      { n: 1, name: "Who can vote", short: "Who" },
      { n: 2, name: "Title & Tags", short: "Title" },
      { n: 3, name: "Choices", short: "Choices" },
      { n: 4, name: "View", short: "View" },
      { n: 5, name: "How to vote", short: "How" },
      { n: 6, name: "When to vote", short: "When" }
    ];

    // Only an Administrator sees the line graph switch. Read once from GET /api/me, the
    // same field adminList.js reads; null until the answer arrives, and false on failure.
    let viewerIsAdmin = null;
    let viewerLookup = null;
    function lookupViewer() {
      if (!viewerLookup) {
        viewerLookup = fetch("/api/me")
          .then((res) => (res.ok ? res.json() : {}))
          .then((body) => { viewerIsAdmin = body.isAdmin === true; })
          .catch(() => { viewerIsAdmin = false; });
      }
      return viewerLookup;
    }

    // Step 1's three answers and the values they store, verbatim.
    const WHO_OPTIONS = [
      {
        key: "link", label: "Anyone you send the link to",
        support: "Private. Only people with the link can find and vote in your poll.",
        help: "Your poll is private: it is listed only in the \"Shared With You\" tab for the people " +
              "you share it with, and is not listed in Trending, Newest or Search. " +
              "Anyone who has the link can open it and vote.",
        pollVisibility: "Private Poll", pollSharingMode: "Anyone With The Link"
      },
      {
        key: "invite", label: "Only people you invite",
        support: "Private. You'll add their email addresses after the poll is created.",
        help: "Your poll is private: it is listed only in the \"Shared With You\" tab for the people " +
              "you share it with, and is not listed in Trending, Newest or Search. " +
              "Only the people whose email addresses you invite can vote. " +
              "You add them after the poll is created.",
        pollVisibility: "Private Poll", pollSharingMode: "Invitation Only"
      },
      {
        key: "public", label: "Everyone on CrowdPoll",
        support: "Public. Anyone can find it in Trending, Newest and Search. " +
                 "Public polls are reviewed before they appear.",
        help: "Your poll is public: anyone on CrowdPoll can find it and vote. " +
              "Public polls appear after they are reviewed and approved.",
        pollVisibility: "Public Poll", pollSharingMode: null
      }
    ];

    let wizard = null;       // the open wizard: answers, current step, visited/answered
    let wizardSaved = null;  // what the last Save kept, reopened from the Summary Text
    // The wizard is also open on a poll that is not in its new-poll wizard (anything
    // published). It then starts from the poll, with every step answered, and its
    // footer is Cancel / Save changes.
    let existing = false;

    function isWizardPoll() {
      return wordedState() === "INITIALIZED";
    }

    function whoFromPoll(p) {
      if (p.pollVisibility === "Public Poll") return "public";
      return p.pollSharingMode === "Invitation Only" ? "invite" : "link";
    }

    function whoOption(key) {
      return WHO_OPTIONS.find((o) => o.key === key);
    }

    // What the poll's state lets change, field by field. The mode is the server's
    // (editModeFor): EDIT with no votes, UPDATE with votes, none while AWAITING
    // APPROVAL, ARCHIVED or edited elsewhere. With votes only the title, subtitle
    // and dates can change (UPDATE_FIELDS). The dates are tighter than the server:
    // the start only before the poll opens, the end only until it closes.
    const START_STATES = ["INITIALIZED", "REJECTED", "WAITING TO OPEN"];

    function editMode() {
      if (session) return session.mode;
      return current.canEdit ? "EDIT" : current.canUpdate ? "UPDATE" : null;
    }

    function canChange(field) {
      const mode = editMode();
      if (!mode) return false;
      const state = wordedState();
      if (field === "startAt") return START_STATES.includes(state);
      if (field === "endAt") return state !== "CLOSED" && state !== "ARCHIVED";
      if (field === "title" || field === "subtitle" || field === "colors" || field === "lineGraphEnabled") return true;
      return mode === "EDIT";   // pollVisibility, keywords, labels, choiceMode, voteMutability
    }

    // The field each stored value belongs to, for canChange.
    const FIELD_OF = {
      pollSharingMode: "pollVisibility",
      voteAnonymity: "pollVisibility",
      voteMutability: "choiceMode"
    };

    // Step 2's limits. Lengths count UTF-16 units, as the server does.
    const TITLE_MAX = 50;
    const SUBTITLE_MAX = 30;
    const WIZARD_CHOICE_MAX = 40;     // an existing poll keeps CHOICE_LABEL_MAX (100)
    const KEYWORDS_TOTAL_MAX = 200;   // every keyword plus one comma between each pair
    const DEFAULT_TITLE = /^New Poll \d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/;

    function keywordsFromPoll(p) {
      return p.keywords ? p.keywords.split(",").filter(Boolean) : [];
    }

    // A new poll is stored with the sample "Choice 1 / Choice 2"; the wizard shows
    // them as no choices, so Step 3 starts empty.
    function storedChoicesText() {
      const text = [...(current.choices || [])].sort((a, b) => a.position - b.position)
        .map((c) => c.label).join("\n");
      return holdsOnlyDefaultChoices(text) ? "" : text;
    }

    // Step 5. "More than one" is Multiple-Choice Poll, 1 to every choice: the
    // server has no range or exact count yet, so the range's state stays at its
    // defaults.
    function storedHow() {
      return {
        multi: current.choiceMode === "Multiple-Choice Poll",
        rangeKind: "range",
        from: 1,
        to: null,
        exact: 2,
        mutable: current.voteMutability === "Dynamic-Vote Poll"
      };
    }

    // Step 6: "now" / "none" are no date (startAt / endAt null);
    // the dates are kept as datetime-local strings, in the browser's time zone.
    function storedWhen() {
      return {
        startMode: current.startAt ? "on" : "now",
        startLocal: toLocalInputValue(current.startAt),
        endMode: current.endAt ? "on" : "none",
        endLocal: toLocalInputValue(current.endAt)
      };
    }

    // An existing poll's answers, in the wizard's shape: every step answered, and
    // every choice it has.
    function pollAnswers() {
      return {
        who: whoFromPoll(current), step: 1, visited: [1, 2, 3, 4, 5, 6], answered: [1, 2, 3, 4, 5, 6],
        title: current.title,
        subtitle: current.subtitle || "",
        keywords: keywordsFromPoll(current),
        choicesText: [...(current.choices || [])].sort((a, b) => a.position - b.position)
          .map((c) => c.label).join("\n"),
        colors: storedColors(),
        lineGraph: current.lineGraphEnabled === true,
        ...storedHow(),
        ...storedWhen(),
        showVoters: current.voteAnonymity === "No"
      };
    }

    function wizardBase() {
      if (existing) return pollAnswers();
      return wizardSaved || {
        who: whoFromPoll(current), step: 1, visited: [1], answered: [],
        title: current.title, subtitle: current.subtitle || "", keywords: keywordsFromPoll(current),
        choicesText: storedChoicesText(),
        colors: storedColors(),
        lineGraph: current.lineGraphEnabled === true,
        ...storedHow(),
        ...storedWhen(),
        showVoters: current.voteAnonymity === "No"
      };
    }

    function openWizardState() {
      const from = wizardBase();
      wizard = {
        who: from.who,
        step: from.step,
        visited: new Set(from.visited),
        answered: new Set(from.answered),
        title: from.title,
        subtitle: from.subtitle,
        keywords: [...from.keywords],
        choicesText: from.choicesText,
        colors: { ...from.colors },
        lineGraph: from.lineGraph,
        multi: from.multi,
        rangeKind: from.rangeKind,
        from: from.from,
        to: from.to,
        exact: from.exact,
        mutable: from.mutable,
        showVoters: from.showVoters,
        startMode: from.startMode,
        startLocal: from.startLocal,
        endMode: from.endMode,
        endLocal: from.endLocal,
        titleTouched: false,
        choicesTouched: false
      };
    }

    function wizardDirty() {
      const base = wizardBase();
      return wizard.who !== base.who || wizard.title !== base.title ||
        wizard.subtitle !== base.subtitle || wizard.keywords.join(",") !== base.keywords.join(",") ||
        wizard.choicesText !== base.choicesText ||
        JSON.stringify(colorsOfLines(wizard)) !== JSON.stringify(colorsOfLines(base)) ||
        ["multi", "rangeKind", "from", "to", "exact", "mutable",
          "startMode", "startLocal", "endMode", "endLocal", "showVoters", "lineGraph"].some((k) => wizard[k] !== base[k]);
    }

    // Step 3: the choices are the box's non-blank lines. These helpers read the open
    // wizard, or the read-only card's answers.
    function choiceLines(s = wizard) {
      return s.choicesText.split("\n").filter((l) => !isBlank(l));
    }

    function colorsOfLines(s = wizard) {
      return choiceLines(s).map((line) => s.colors[line.trim()] ?? null);
    }

    function storedColors() {
      const colors = {};
      for (const choice of current.choices || []) if (choice.color) colors[choice.label] = choice.color;
      return colors;
    }

    function pruneColors() {
      const labels = new Set(choiceLines().map((line) => line.trim()));
      for (const label of Object.keys(wizard.colors)) if (!labels.has(label)) delete wizard.colors[label];
    }

    // Why the choices cannot be published yet, or "" when they can.
    function choicesProblem() {
      if (choiceLines().length < runtime.minChoices) return `Add at least ${runtime.minChoices} choices.`;
      return "";
    }

    // What Step 5's answers mean for the current number of choices: always 1 to
    // every choice. "More than one" needs 2 choices. It never makes the poll
    // unpublishable.
    function howPlan(s = wizard) {
      const n = choiceLines(s).length;
      if (!s.multi || n < 2) return { multi: false, kind: "one", min: 1, max: 1, n };
      return { multi: true, kind: "range", min: 1, max: n, n };
    }

    function howPhrase(plan) {
      if (plan.kind === "one") return "one choice";
      if (plan.kind === "exact") return "exactly " + plan.min + " choices";
      return "from " + plan.min + " to " + plan.max + " choices";
    }

    // Step 6's dates as Date objects, or null for "immediately" / "no end date".
    function startDate(s = wizard) {
      return s.startMode === "on" && s.startLocal ? new Date(s.startLocal) : null;
    }
    function endDate(s = wizard) {
      return s.endMode === "on" && s.endLocal ? new Date(s.endLocal) : null;
    }

    // Why the schedule cannot be published, or "": Start before End, plus, in the
    // wizard, an end that is already past.
    function scheduleProblem() {
      // On an existing poll, only a date that was changed is checked, so a CLOSED
      // poll's past end does not block saving its title.
      if (existing) {
        const base = wizardBase();
        const changed = ["startMode", "startLocal", "endMode", "endLocal"].some((k) => wizard[k] !== base[k]);
        if (!changed) return "";
      }
      const start = startDate();
      const end = endDate();
      if (start && end && start >= end) return "Start must be before End.";
      if (end && end <= new Date()) return "The end must be in the future.";
      return "";
    }

    // "on Sat, Oct 3 at 9:00 AM", with the year when it is not this year.
    function whenText(date) {
      const day = { weekday: "short", month: "short", day: "numeric" };
      if (date.getFullYear() !== new Date().getFullYear()) day.year = "numeric";
      return "on " + date.toLocaleDateString(undefined, day) + " at " +
        date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
    }

    // The Summary Text's when-line as [lead, part] pairs, decided by the poll state
    // first and the dates second: "opened" only once the poll has opened, "closed"
    // only once it is CLOSED or ARCHIVED, whatever the clock says. An unpublished
    // poll (the wizard) words its dates as plans.
    function whenPhrases(state, start, end) {
      const closed = state === "CLOSED" || state === "ARCHIVED";
      let opening;
      if (state === "OPEN" || closed) {
        if (start) opening = ["Voting opened ", whenText(start)];
        else opening = state === "OPEN" ? ["Voting ", "is open now"] : ["Voting opened ", "when your poll was published"];
      } else if (state === "INITIALIZED") {
        opening = ["Voting opens ", start ? whenText(start) : "as soon as your poll is published"];
      } else if (state === "WAITING TO OPEN" || (start && start > new Date())) {
        opening = ["Voting opens ", start ? whenText(start) : "as soon as your poll is approved"];
      } else {
        opening = ["Voting opens ", "as soon as your poll is approved"];   // AWAITING APPROVAL, REJECTED
      }
      let closing;
      if (closed) closing = end ? [" and closed ", whenText(end)] : [" and ", "has closed"];
      else closing = end ? [" and closes ", whenText(end)] : [" and ", "stays open until you close it"];
      return [opening, closing];
    }

    // A repeated choice blocks leaving Step 3, Save and Publish.
    function duplicateMessage() {
      const dup = firstDuplicateChoice(wizard.choicesText);
      return dup ? "\u201C" + dup + "\u201D is already a choice." : "";
    }

    function titleIsSet() {
      return wizard.title.trim() !== "" && !DEFAULT_TITLE.test(wizard.title);
    }

    function keywordsTotal(list) {
      return list.join(",").length;
    }

    function syncWizardDirty() {
      dirty = wizardDirty();
      if (dirty) armExitGuards();
      else disarmExitGuards();
    }

    function goToStep(n) {
      if (wizard.step === 3 && n !== 3 && duplicateMessage()) {
        const box = card.querySelector('[id^="pollChoices-"]');
        if (box) box.focus();
        return;
      }
      wizard.step = n;
      wizard.visited.add(n);
      renderWizard();
    }

    function allStepsVisited() {
      return WIZARD_STEPS.every((st) => wizard.visited.has(st.n));
    }

    // The snackbar: one per page, at the bottom of the screen (Material 3).
    function snackbar(message) {
      let bar = document.querySelector(".m3-snackbar");
      if (!bar) {
        bar = el("div", "m3-snackbar");
        bar.setAttribute("role", "status");
        document.body.appendChild(bar);
      }
      bar.textContent = message;
      bar.classList.add("is-shown");
      clearTimeout(bar._hideTimer);
      bar._hideTimer = setTimeout(() => bar.classList.remove("is-shown"), 3000);
    }

    function pollLink() {
      const origin = deps.origin ? deps.origin() : location.origin;
      return origin + "/?PID=" + encodeURIComponent(current.pid);
    }

    // ── Settings Summary ──
    // A part is tappable only once its step has been answered (Next pressed on it).
    // A tappable part is inline text with a button's role: a real <button> is an
    // inline block, so a long part could not wrap with the sentence.
    function summaryPart(text, step) {
      if (!wizard.answered.has(step)) return el("span", "wizard-summary-part", text);
      return tappablePart(text, text + ": change in Step " + step, () => goToStep(step));
    }

    function tappablePart(text, label, onActivate) {
      const link = el("span", "wizard-summary-part wizard-summary-link", text);
      link.setAttribute("role", "button");
      link.tabIndex = 0;
      link.setAttribute("aria-label", label);
      link.addEventListener("click", onActivate);
      link.addEventListener("keydown", (event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        onActivate();
      });
      return link;
    }

    // The Summary Text: the title and subtitle as the heading, drawn with the Poll
    // Card's own .question / .subtitle classes, then one line per aspect of the
    // poll. The heading is plain until Step 2 is answered.
    function buildSummary(s = wizard, part = summaryPart) {
      // An existing poll's summary in the wizard is worded for its state.
      if (s === wizard && existing) s = { ...wizard, state: wordedState() };
      const section = el("section", "wizard-summary");
      section.setAttribute("aria-label", "Settings summary");
      const who = s.who;
      const kind = who === "public" ? "Public Poll" : "Private Poll";
      const title = s.title.trim();
      const subtitle = s.subtitle.trim();
      if (title) {
        const heading = el("p", "question wizard-summary-title");
        heading.appendChild(part(title, 2, "title"));
        section.appendChild(heading);
      }
      if (subtitle) {
        const sub = el("p", "subtitle wizard-summary-subtitle");
        sub.appendChild(part(subtitle, 2, "subtitle"));
        section.appendChild(sub);
      }
      const line = () => section.appendChild(el("p", "wizard-summary-text"));
      const who1 = line();
      who1.classList.add("wizard-summary-who");
      who1.append("Your poll is a ", part(kind, 1, "pollVisibility"), ". ");
      if (who === "link") who1.append(part("Anyone you send the link to", 1, "pollVisibility"), " can vote.");
      else if (who === "invite") who1.append(part("Only people you invite", 1, "pollVisibility"), " by email can vote.");
      else who1.append(part("Everyone on CrowdPoll", 1, "pollVisibility"), " can find it and vote.");
      // Private polls say whether votes are anonymous.
      if (who !== "public") {
        who1.append(" ", part(s.showVoters ? "Users can see who voted for what." : "Votes are anonymous.", 1,
          "pollVisibility"));
      }
      if (who === "public" && s.answered.has(2) && s.keywords.length) {
        const keywordsLine = line();
        keywordsLine.classList.add("wizard-summary-keywords");
        keywordsLine.append("It can be found by searching for ", part(s.keywords.join(", "), 2, "keywords"), ".");
      }
      // The choices themselves, once Step 3 is answered.
      if (s.answered.has(3) && choiceLines(s).length) {
        const choicesLine = line();
        choicesLine.classList.add("wizard-summary-choices");
        choicesLine.append("Voters choose from ", part(choiceLines(s).map((l) => l.trim()).join(", "), 3, "labels"), ".");
      }
      if (s.answered.has(4)) section.appendChild(buildColorsSummaryLine(s, line, part));
      // How to vote, once Step 5 is answered.
      if (s.answered.has(5)) {
        const howLine = line();
        howLine.classList.add("wizard-summary-how");
        howLine.append("Each voter picks ", part(howPhrase(howPlan(s)), 5, "choiceMode"), ", and ",
          part(s.mutable ? "can change their vote" : "their vote is final", 5, "voteMutability"), ".");
      }
      // When to vote, once Step 6 is answered (its first change).
      if (s.answered.has(6)) {
        const whenLine = line();
        whenLine.classList.add("wizard-summary-when");
        // The opening phrase is the start's part, the closing phrase the end's.
        const [opening, closing] = whenPhrases(s.state || "INITIALIZED", startDate(s), endDate(s));
        whenLine.append(opening[0], part(opening[1], 6, "startAt"), closing[0], part(closing[1], 6, "endAt"));
        whenLine.append(".");
      }
      return section;
    }

    function buildColorsSummaryLine(s, line, part) {
      const colored = choiceLines(s).map((l) => l.trim()).filter((label) => s.colors[label]);
      const colorsLine = line();
      colorsLine.classList.add("wizard-summary-colors");
      if (!colored.length) {
        colorsLine.append(part("Bar colors are assigned automatically.", 4, "colors"));
        appendLineGraphSentence(colorsLine, s, part);
        return colorsLine;
      }
      const count = colored.length;
      colorsLine.append(part(count + (count === 1 ? " color has" : " colors have") + " been set manually", 4, "colors"), ":");
      for (const label of colored) {
        const swatch = el("span", "wizard-summary-swatch");
        swatch.style.setProperty("--swatch", s.colors[label]);
        swatch.setAttribute("role", "img");
        swatch.setAttribute("aria-label", label + ": " + colorName(s.colors[label]));
        swatch.title = label + ": " + colorName(s.colors[label]);
        colorsLine.append(" ", swatch);
      }
      colorsLine.append(".");
      appendLineGraphSentence(colorsLine, s, part);
      return colorsLine;
    }

    function appendLineGraphSentence(colorsLine, s, part) {
      if (s.lineGraph) colorsLine.append(" ", part("The line graph is shown.", 4, "colors"));
    }

    // Typing in Step 2 updates the summary and the footer (Publish) in place, so the
    // field being typed in keeps its focus.
    function refreshWizardChrome() {
      const summary = card.querySelector(".wizard-summary");
      if (summary) summary.replaceWith(buildSummary());
      const footer = card.querySelector(".wizard-footer");
      if (footer) footer.replaceWith(buildFooter());
      const next = card.querySelector(".wizard-next");
      if (next) setNextBlocked(next);
    }

    function setNextBlocked(next) {
      const blocked = Boolean(duplicateMessage());
      next.disabled = blocked;
      next.title = blocked ? "Remove the duplicate choice first." : "";
    }

    // Only one line of the summary, for a change made as a field loses focus: the
    // press that moved focus may be on a summary part or the footer, and replacing
    // either before the release would swallow that click. Used for the keywords
    // line and the choices line.
    function refreshSummaryLine(className) {
      const summary = card.querySelector(".wizard-summary");
      if (!summary) return;
      const fresh = buildSummary().querySelector("." + className);
      const old = summary.querySelector("." + className);
      if (old && fresh) old.replaceWith(fresh);
      else if (old) old.remove();
      else if (fresh) {
        // Keep the lines in order: insert before the line that follows it in a fresh build.
        const next = fresh.nextElementSibling;
        const nextClass = next && [...next.classList].find((c) => /^wizard-summary-(who|keywords|choices|colors|how|when)$/.test(c));
        summary.insertBefore(fresh, (nextClass && summary.querySelector("." + nextClass)) || null);
      }
    }

    // ── Named Circles ──
    // Visited steps are a filled check, unvisited steps an outlined number (inert),
    // and the current step an outlined number with a thick accent ring. Every short
    // name sits above its circle.
    function buildCircles() {
      const nav = el("ol", "wizard-steps");
      nav.setAttribute("aria-label", "Steps");
      for (const st of WIZARD_STEPS) {
        const li = el("li", "wizard-step");
        const isCurrent = st.n === wizard.step;
        const isVisited = wizard.visited.has(st.n);
        li.classList.add(isCurrent ? "is-current" : isVisited ? "is-visited" : "is-unvisited");
        const btn = el("button", "wizard-step-btn");
        btn.type = "button";
        btn.disabled = !isVisited;
        btn.setAttribute("aria-label", "Step " + st.n + ", " + st.name +
          (isCurrent ? " (current)" : isVisited ? " (visited)" : " (not yet visited)"));
        if (isCurrent) btn.setAttribute("aria-current", "step");
        const label = el("span", "wizard-step-label", st.short);
        const circle = el("span", "wizard-step-circle", isVisited && !isCurrent ? "✓" : String(st.n));
        circle.setAttribute("aria-hidden", "true");
        label.setAttribute("aria-hidden", "true");
        btn.append(label, circle);
        if (isVisited && !isCurrent) btn.addEventListener("click", () => goToStep(st.n));
        li.appendChild(btn);
        nav.appendChild(li);
      }
      return nav;
    }

    // ── Step panels ──
    function nextButton() {
      const next = el("button", "m3-filled-btn wizard-next", "Next >>");
      next.type = "button";
      next.setAttribute("aria-label", "Next step");
      setNextBlocked(next);
      next.addEventListener("click", () => {
        if (wizard.step === 2) wizard.titleTouched = true;
        if (wizard.step === 3) wizard.choicesTouched = true;
        wizard.answered.add(wizard.step);
        goToStep(wizard.step + 1);
      });
      return next;
    }

    function buildStep1() {
      const body = el("div", "wizard-step-body");
      const group = el("div", "m3-radio-list");
      group.setAttribute("role", "radiogroup");
      group.setAttribute("aria-label", "Who can vote?");
      for (const option of WHO_OPTIONS) {
        const row = el("label", "m3-radio-item");
        const input = el("input", "m3-radio");
        input.type = "radio";
        input.name = "who-" + current.pid;
        input.value = option.key;
        input.checked = wizard.who === option.key;
        input.addEventListener("change", () => {
          if (!input.checked) return;
          wizard.who = option.key;
          syncWizardDirty();
          renderWizard();
        });
        const text = el("span", "m3-radio-text");
        text.append(el("span", "m3-radio-label", option.label), el("span", "m3-radio-support", option.support));
        row.append(input, text);
        group.appendChild(row);
        if (option.key === "link" && wizard.who === "link") group.appendChild(buildCopyLink());
      }
      const help = el("details", "wizard-help");
      help.appendChild(el("summary", null, "What does this mean?"));
      const list = el("dl");
      for (const option of WHO_OPTIONS) list.append(el("dt", null, option.label), el("dd", null, option.help));
      if (wizard.who !== "public") list.append(el("dt", null, VOTERS_SWITCH_LABEL), el("dd", null, VOTERS_SWITCH_HELP));
      help.appendChild(list);
      body.appendChild(group);
      if (wizard.who !== "public") body.appendChild(buildVotersSwitch());
      body.appendChild(help);
      return body;
    }

    // ── "Users can see who voted for what" ──
    // A Material 3 switch in one row after the radio list, for private polls only.
    // Off (the default) is voteAnonymity "Yes"; on is "No". Who sees the names is
    // unchanged: administrators only.
    const VOTERS_SWITCH_LABEL = "Users can see who voted for what";
    const VOTERS_SWITCH_HELP = "Off (the default): votes are anonymous. Everyone sees how many votes " +
      "each choice has, but not who cast them. On: the names of voters are shown next to the choices " +
      "they picked. Turn it on only if your voters expect it, and tell them. It can't be changed once " +
      "your poll has votes.";

    function buildVotersSwitch() {
      const row = el("label", "m3-switch-row");
      const text = el("span", "m3-switch-text");
      const support = el("span", "m3-switch-support",
        wizard.showVoters ? "On: voters' names are shown with their choices." : "Off: votes are anonymous.");
      support.id = "votersSwitchSupport-" + current.pid;
      text.append(el("span", "m3-switch-label", VOTERS_SWITCH_LABEL), support);
      const input = el("input", "m3-switch");
      input.type = "checkbox";
      input.setAttribute("role", "switch");
      input.checked = wizard.showVoters;
      input.setAttribute("aria-describedby", support.id);
      input.addEventListener("change", () => {
        wizard.showVoters = input.checked;
        howChanged();
      });
      row.append(text, input);
      return row;
    }

    function buildCopyLink() {
      const wrap = el("div", "wizard-copy-link");
      const btn = el("button", "m3-tonal-btn", "Copy link");
      btn.type = "button";
      btn.setAttribute("aria-label", "Copy the link to your poll");
      const note = el("p", "wizard-copy-note", "Your link will work once the poll is published.");
      const manual = el("input", "wizard-copy-manual");
      manual.type = "text";
      manual.readOnly = true;
      manual.hidden = true;
      manual.setAttribute("aria-label", "Link to your poll");
      btn.addEventListener("click", async () => {
        const url = pollLink();
        try {
          await navigator.clipboard.writeText(url);
          manual.hidden = true;
          snackbar("Link copied");
        } catch {
          // Pages opened from disk may be refused the clipboard: offer the link to copy by hand.
          manual.value = url;
          manual.hidden = false;
          manual.focus();
          manual.select();
          snackbar("Copy the link from the box");
        }
      });
      wrap.append(btn, note, manual);
      return wrap;
    }

    // ── Step 2: Title & Tags ──
    // Underlined text fields: the label always above the input, an underline, the
    // supporting text below on the left, a counter below on the right, and an error
    // in place of the supporting text.
    function m3Field(labelText, id, supportText) {
      const wrap = el("div", "m3-field");
      const box = el("div", "m3-field-box");
      const label = el("label", "m3-field-label", labelText);
      label.setAttribute("for", id);
      const below = el("div", "m3-field-below");
      const support = el("p", "m3-field-support", supportText);
      support.id = id + "-support";
      support.setAttribute("aria-live", "polite");
      const counter = el("span", "m3-field-counter");
      counter.setAttribute("aria-hidden", "true");
      below.append(support, counter);
      box.appendChild(label);
      wrap.append(box, below);

      function setError(message) {
        support.textContent = message || supportText;
        wrap.classList.toggle("is-error", Boolean(message));
      }
      return { wrap, box, support, counter, setError };
    }

    // A single-line field that wraps and grows: a textarea whose Enter moves on.
    function m3TextField(labelText, id, supportText, max, value, onChange, onEnter, enterHint) {
      const field = m3Field(labelText, id, supportText);
      const input = el("textarea", "m3-field-input");
      input.id = id;
      input.rows = 1;
      input.maxLength = max;
      input.value = value;
      input.setAttribute("enterkeyhint", enterHint);
      input.setAttribute("aria-describedby", field.support.id);
      field.box.appendChild(input);

      function grow() {
        input.style.height = "auto";
        input.style.height = input.scrollHeight + "px";
      }
      function update() {
        field.counter.textContent = input.value.length + " / " + max;
        grow();
      }
      input.addEventListener("keydown", (event) => {
        if (event.key !== "Enter" || event.isComposing) return;
        event.preventDefault();
        onEnter();
      });
      input.addEventListener("input", () => {
        // No newlines: pasted ones become spaces.
        if (/[\r\n]/.test(input.value)) {
          const caret = input.selectionStart;
          input.value = input.value.replace(/\r\n|[\r\n]/g, " ");
          input.setSelectionRange(caret, caret);
        }
        onChange(input.value);
        update();
      });
      requestAnimationFrame(grow);   // scrollHeight is only known once it is in the page
      update();
      return { ...field, input };
    }

    // Keywords: Material 3 input chips. Enter or comma makes a chip; lower case
    // letters, digits and spaces; no duplicates; 200 characters in total.
    function m3KeywordsField() {
      const id = "pollKeywords-" + current.pid;
      const field = m3Field("Keywords", id, "Comma separates keywords (keyword1, keyword 2). Letters, numbers and spaces. Used for search.");
      field.wrap.classList.add("m3-field--chips");
      const chips = el("div", "m3-chip-row");
      const input = el("input", "m3-field-input m3-chip-input");
      input.id = id;
      input.type = "text";
      input.autocapitalize = "none";
      input.setAttribute("autocomplete", "off");
      input.setAttribute("enterkeyhint", "done");
      input.setAttribute("aria-describedby", field.support.id);
      chips.appendChild(input);
      field.box.appendChild(chips);

      function update() {
        field.counter.textContent = keywordsTotal(wizard.keywords) + " / " + KEYWORDS_TOTAL_MAX;
      }
      function changed(summaryOnly) {
        drawChips();
        syncWizardDirty();
        if (summaryOnly) refreshSummaryLine("wizard-summary-keywords");
        else refreshWizardChrome();
        update();
      }
      function drawChips() {
        chips.querySelectorAll(".m3-chip").forEach((chip) => chip.remove());
        wizard.keywords.forEach((word, i) => {
          const chip = el("span", "m3-chip");
          chip.appendChild(el("span", "m3-chip-text", word));
          const remove = el("button", "m3-chip-remove", "×");
          remove.type = "button";
          remove.setAttribute("aria-label", "Remove keyword " + word);
          remove.addEventListener("click", () => {
            wizard.keywords.splice(i, 1);
            field.setError("");
            changed();
            input.focus();
          });
          chip.appendChild(remove);
          chips.insertBefore(chip, input);
        });
      }
      // Returns true when the text became a chip (or was blank).
      function commit(text, summaryOnly) {
        const word = text.trim().replace(/ {2,}/g, " ");
        if (!word) return true;
        if (wizard.keywords.includes(word)) {
          field.setError("Already added.");
          return false;
        }
        if (keywordsTotal([...wizard.keywords, word]) > KEYWORDS_TOTAL_MAX) {
          field.setError("Keywords can total at most " + KEYWORDS_TOTAL_MAX + " characters.");
          return false;
        }
        wizard.keywords.push(word);
        field.setError("");
        changed(summaryOnly);
        return true;
      }
      input.addEventListener("keydown", (event) => {
        if (event.isComposing) return;
        if (event.key === "Enter") {
          event.preventDefault();
          if (commit(input.value)) input.value = "";
          update();
        } else if (event.key === "Backspace" && input.value === "" && wizard.keywords.length) {
          wizard.keywords.pop();
          field.setError("");
          changed();
        }
      });
      input.addEventListener("input", () => {
        field.setError("");
        // Capitals become lower case; anything but letters, digits, spaces and commas is dropped.
        let text = input.value.toLowerCase().replace(/[^a-z0-9 ,]/g, "");
        const parts = text.split(",");
        text = parts.pop();
        for (const part of parts) {
          if (!commit(part)) { text = part + text; break; }
        }
        if (input.value !== text) input.value = text;
        update();
      });
      // Leaving the field makes a chip of what is typed, so the last keyword is not
      // lost for want of a comma. Text that cannot become one keeps its error, and is
      // dropped when the user leaves the step, saves or publishes.
      input.addEventListener("blur", () => {
        if (commit(input.value, true)) input.value = "";
      });
      chips.addEventListener("click", (event) => { if (event.target === chips) input.focus(); });
      drawChips();
      update();
      return { ...field, input };
    }

    function buildStep2() {
      const body = el("div", "wizard-step-body wizard-fields");
      const isPublic = wizard.who === "public";
      let subtitle = null;
      let keywords = null;

      const title = m3TextField("Title", "pollTitle-" + current.pid, emojiHint("Required."),
        TITLE_MAX, wizard.title,
        (value) => {
          wizard.title = value;
          syncWizardDirty();
          showTitleError();
          refreshWizardChrome();
        },
        () => subtitle.input.focus(), "next");
      function showTitleError() {
        title.setError(wizard.titleTouched && !titleIsSet() ? "Give your poll a title." : "");
      }
      title.input.addEventListener("blur", () => {
        wizard.titleTouched = true;
        showTitleError();
      });
      showTitleError();

      subtitle = m3TextField("Subtitle", "pollSubtitle-" + current.pid, "Optional. Shown under the title.",
        SUBTITLE_MAX, wizard.subtitle,
        (value) => {
          wizard.subtitle = value;
          syncWizardDirty();
          refreshWizardChrome();
        },
        () => (keywords ? keywords.input.focus() : subtitle.input.blur()),
        isPublic ? "next" : "done");

      body.append(title.wrap, subtitle.wrap);
      // Keywords are for public polls only; on a private poll they are kept but hidden.
      if (isPublic) {
        keywords = m3KeywordsField();
        body.appendChild(keywords.wrap);
      }
      return body;
    }

    // ── Step 3: Choices ──
    // The choices box and its rules (wireChoicesBox, sanitizeChoicesText) in Step
    // 2's underlined field: one choice per line, Enter starts a new one.
    function buildStep3() {
      const body = el("div", "wizard-step-body wizard-fields");
      const id = "pollChoices-" + current.pid;
      const field = m3Field("Choices", id, emojiHint("One choice per line. Press Enter after each choice."));
      field.wrap.classList.add("m3-field--choices");
      // No label (the step heading names it), a placeholder instead, and an
      // accessible name for screen readers.
      field.box.querySelector(".m3-field-label").remove();
      const box = el("textarea", "m3-field-input");
      box.id = id;
      box.rows = 4;
      box.spellcheck = false;
      box.placeholder = "Enter your choices here";
      box.setAttribute("aria-label", "Choices");
      box.value = wizard.choicesText;
      box.setAttribute("enterkeyhint", "enter");
      box.setAttribute("aria-describedby", field.support.id);
      field.box.appendChild(box);

      function grow() {
        box.style.height = "auto";
        box.style.height = box.scrollHeight + "px";
      }
      function update() {
        field.counter.textContent = choiceLines().length + " / " + runtime.maxChoices;
        grow();
      }
      function problem() {
        return wizard.choicesTouched ? choicesProblem() : "";
      }
      // A duplicate wins, since it blocks; then a message from the rules; otherwise
      // the field shows why it cannot be published.
      function setError(message) {
        const duplicate = duplicateMessage();
        field.wrap.classList.toggle("is-duplicate", Boolean(duplicate));
        field.setError(duplicate || message || problem());
      }
      // Any paste (the button, Ctrl+V, long-press) drops repeated choices, keeping
      // the first, and says how many went.
      function insertPasted(text, start, end) {
        text = text.replace(/\r\n?/g, "\n");
        const before = box.value.slice(0, start);
        const joined = before + text + box.value.slice(end);
        const result = withoutDuplicateChoices(joined);
        const caretAfter = withoutDuplicateChoices(before + text).text.length;
        box.value = result.text;
        const caret = Math.min(caretAfter, box.value.length);
        box.setSelectionRange(caret, caret);
        box.dispatchEvent(new Event("input"));
        if (result.removed) {
          snackbar(result.removed === 1 ? "1 duplicate was removed." : result.removed + " duplicates were removed.");
        }
        return result.removed;
      }
      box.addEventListener("paste", (event) => {
        const text = event.clipboardData && event.clipboardData.getData("text/plain");
        if (!text) return;
        event.preventDefault();
        insertPasted(text, box.selectionStart, box.selectionEnd);
      });
      wireChoicesBox(box, {
        // An existing poll keeps the server's 100 characters, so its labels are not cut.
        maxLabel: existing ? CHOICE_LABEL_MAX : WIZARD_CHOICE_MAX,
        setError,
        onInput: () => {
          wizard.choicesText = box.value;
          syncWizardDirty();
          update();
          refreshWizardChrome();
        },
        onBlur: () => {
          wizard.choicesText = box.value;
          wizard.choicesTouched = true;
          syncWizardDirty();
          setError("");
          update();
          refreshSummaryLine("wizard-summary-choices");
        }
      });

      // Paste choices: the clipboard, one choice per line, added after any choices
      // already in the box.
      const paste = el("button", "m3-tonal-btn", "Paste choices");
      paste.type = "button";
      paste.setAttribute("aria-label", "Paste choices from the clipboard, one per line");
      // A caption under the button, like Copy link's note on Step 1.
      const pasteHelp = "Adds choices copied from another app, one per line. Repeats are removed.";
      const pasteNote = el("p", "wizard-copy-note wizard-paste-note", pasteHelp);
      pasteNote.id = "pasteNote-" + current.pid;
      paste.title = pasteHelp;
      paste.setAttribute("aria-describedby", pasteNote.id);
      const pasteWrap = el("div", "wizard-paste");
      paste.addEventListener("click", async () => {
        let text;
        try {
          text = await navigator.clipboard.readText();
        } catch {
          snackbar("Paste into the box instead");
          box.focus();
          return;
        }
        text = (text || "").replace(/\r\n?/g, "\n").replace(/\n+$/, "");
        if (isBlank(text)) {
          snackbar("The clipboard is empty");
          return;
        }
        const own = !isBlank(box.value);
        const head = own ? box.value.replace(/\n+$/, "") + "\n" : "";
        box.value = head;
        if (!insertPasted(text, head.length, head.length)) snackbar(own ? "Choices added" : "Choices pasted");
      });

      update();
      requestAnimationFrame(grow);   // scrollHeight is only known once it is in the page
      pasteWrap.append(paste, pasteNote);
      body.append(field.wrap, pasteWrap);
      return body;
    }

    // ── Step 4: Colors ──
    function colorName(hex) {
      if (!hex) return "Automatic";
      const entry = runtime.barPalette.find((c) => c.hex === hex);
      return entry ? entry.name : hex;
    }

    function colorDot(hex) {
      const dot = el("span", "wizard-color-dot" + (hex ? "" : " is-automatic"));
      if (hex) dot.style.setProperty("--swatch", hex);
      dot.setAttribute("aria-hidden", "true");
      return dot;
    }

    function paintColorButton(button, hex) {
      const arrow = el("span", "wizard-color-arrow", "\u25BE");
      arrow.setAttribute("aria-hidden", "true");
      button.replaceChildren(colorDot(hex), el("span", "wizard-color-name", colorName(hex)), arrow);
    }

    const LINE_GRAPH_SWITCH_LABEL = "Show the line graph";

    function buildLineGraphSwitch() {
      const row = el("label", "m3-switch-row");
      const text = el("span", "m3-switch-text");
      const support = el("span", "m3-switch-support",
        wizard.lineGraph ? "On: the line graph is drawn beside the poll when it is maximized." : "Off: no line graph.");
      support.id = "lineGraphSwitchSupport-" + current.pid;
      text.append(el("span", "m3-switch-label", LINE_GRAPH_SWITCH_LABEL), support);
      const input = el("input", "m3-switch");
      input.type = "checkbox";
      input.checked = wizard.lineGraph;
      input.setAttribute("aria-describedby", support.id);
      input.addEventListener("change", () => {
        wizard.lineGraph = input.checked;
        howChanged();
      });
      row.append(text, input);
      return row;
    }

    function buildColorsStep() {
      pruneColors();
      const body = el("div", "wizard-step-body wizard-colors");
      if (viewerIsAdmin === null) {
        lookupViewer().then(() => {
          if (viewerIsAdmin && wizard && wizard.step === 4) renderWizard();
        });
      }
      if (viewerIsAdmin) body.appendChild(buildLineGraphSwitch());
      const labels = choiceLines().map((line) => line.trim());
      if (!labels.length) {
        body.appendChild(el("p", "wizard-colors-empty",
          "Add your choices first, then come back to choose their colors."));
        return body;
      }
      body.appendChild(el("p", "wizard-colors-help", "Optional. Leave a choice on Automatic to color it for you."));

      const popover = el("div", "wizard-color-popover");
      popover.hidden = true;
      popover.setAttribute("role", "radiogroup");
      popover.setAttribute("aria-label", "Colors");
      let opened = null;

      function swatchButton(hex, name) {
        const swatch = el("button", "wizard-swatch wizard-swatch-outlined" + (hex ? "" : " wizard-swatch-automatic"));
        swatch.type = "button";
        swatch.setAttribute("role", "radio");
        swatch.setAttribute("aria-label", name);
        swatch.title = name;
        swatch.dataset.color = hex || "";
        swatch.appendChild(hex ? el("span", "wizard-swatch-fill") : el("span", "wizard-swatch-fill is-automatic"));
        if (hex) swatch.firstChild.style.setProperty("--swatch", hex);
        swatch.appendChild(el("span", "wizard-swatch-check", "\u2713"));
        if (!hex) swatch.appendChild(el("span", "wizard-swatch-name", name));
        swatch.addEventListener("click", () => chooseColor(hex));
        return swatch;
      }
      popover.appendChild(swatchButton(null, "Automatic"));
      for (const color of runtime.barPalette) popover.appendChild(swatchButton(color.hex, color.name));

      const allSwatches = () => Array.from(popover.querySelectorAll(".wizard-swatch"));

      function paintSwatches(hex) {
        for (const swatch of allSwatches()) {
          const chosen = (swatch.dataset.color || null) === (hex || null);
          swatch.setAttribute("aria-checked", chosen ? "true" : "false");
          swatch.classList.toggle("is-chosen", chosen);
          swatch.tabIndex = chosen ? 0 : -1;
        }
      }

      function focusSwatch(swatch) {
        for (const other of allSwatches()) other.tabIndex = other === swatch ? 0 : -1;
        swatch.focus();
      }

      function showStoredColorSwatch(hex) {
        const old = popover.querySelector(".wizard-swatch-extra");
        if (old) old.remove();
        if (!hex || runtime.barPalette.some((color) => color.hex === hex)) return;
        const extra = swatchButton(hex, hex);
        extra.classList.add("wizard-swatch-extra");
        popover.appendChild(extra);
      }

      function dismissOnOutsidePress(event) {
        if (!popover.isConnected) {
          document.removeEventListener("pointerdown", dismissOnOutsidePress);
          return;
        }
        if (popover.contains(event.target) || (event.target.closest && event.target.closest(".wizard-color-btn"))) return;
        const holdsFocus = popover.contains(document.activeElement);
        closePopover();
        if (holdsFocus) opened.button.focus();
      }

      function closePopover() {
        popover.hidden = true;
        document.removeEventListener("pointerdown", dismissOnOutsidePress);
        if (opened) opened.button.setAttribute("aria-expanded", "false");
      }

      function placePopover(button) {
        popover.classList.remove("wizard-color-popover--above");
        const height = popover.offsetHeight;
        const room = window.innerHeight - button.getBoundingClientRect().bottom;
        if (room < height && button.getBoundingClientRect().top > height) {
          popover.classList.add("wizard-color-popover--above");
        }
      }

      function openPopover(button, label) {
        if (opened && opened.button !== button) closePopover();
        opened = { button, label };
        button.parentElement.appendChild(popover);
        button.setAttribute("aria-expanded", "true");
        popover.setAttribute("aria-label", "Color for " + label);
        showStoredColorSwatch(wizard.colors[label]);
        paintSwatches(wizard.colors[label]);
        popover.hidden = false;
        placePopover(button);
        focusSwatch(allSwatches().find((swatch) => swatch.tabIndex === 0) || allSwatches()[0]);
        document.addEventListener("pointerdown", dismissOnOutsidePress);
      }

      popover.addEventListener("keydown", (event) => {
        const swatches = allSwatches();
        const at = swatches.indexOf(document.activeElement);
        const move = {
          ArrowRight: at + 1, ArrowDown: at + 1, ArrowLeft: at - 1, ArrowUp: at - 1,
          Home: 0, End: swatches.length - 1
        }[event.key];
        if (move !== undefined) {
          event.preventDefault();
          focusSwatch(swatches[Math.max(0, Math.min(swatches.length - 1, move))]);
        } else if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          if (at >= 0) swatches[at].click();
        } else if (event.key === "Escape" || event.key === "Tab") {
          event.preventDefault();
          event.stopPropagation();
          closePopover();
          opened.button.focus();
        }
      });
      popover.addEventListener("keyup", (event) => {
        if (event.key === " ") event.preventDefault();
      });

      function chooseColor(hex) {
        const { button, label } = opened;
        if (hex) wizard.colors[label] = hex;
        else delete wizard.colors[label];
        paintColorButton(button, hex);
        closePopover();
        button.focus();
        syncWizardDirty();
        refreshWizardChrome();
      }

      const list = el("ul", "wizard-color-list");
      for (const label of labels) {
        const row = el("li", "wizard-color-row");
        const text = el("span", "wizard-color-label", label);
        text.title = label;
        const button = el("button", "wizard-color-btn");
        button.type = "button";
        button.setAttribute("aria-haspopup", "true");
        button.setAttribute("aria-expanded", "false");
        button.setAttribute("aria-label", "Color for " + label);
        paintColorButton(button, wizard.colors[label]);
        button.addEventListener("click", () => {
          if (!popover.hidden && opened && opened.button === button) closePopover();
          else openPopover(button, label);
        });
        row.append(text, button);
        list.appendChild(row);
      }
      body.append(list, popover);
      return body;
    }

    // ── Step 5: How to vote ──
    // Two Material radio lists, as Step 1's. "More than one" opens no range or
    // exact count (storedHow).
    function m3RadioRow(name, value, label, support, checked, onPick, disabled) {
      const row = el("label", "m3-radio-item" + (disabled ? " is-disabled" : ""));
      const input = el("input", "m3-radio");
      input.type = "radio";
      input.name = name + "-" + current.pid;
      input.value = value;
      input.checked = checked;
      input.disabled = Boolean(disabled);
      input.addEventListener("change", () => { if (input.checked) onPick(); });
      const text = el("span", "m3-radio-text");
      const labelEl = el("span", "m3-radio-label");
      labelEl.append(...(Array.isArray(label) ? label : [label]));
      text.appendChild(labelEl);
      if (support) text.appendChild(el("span", "m3-radio-support", support));
      row.append(input, text);
      return row;
    }

    // Redraw Step 5 and keep focus on the control that changed.
    function howChanged() {
      const a = document.activeElement;
      let key = null;
      if (a && (a.tagName === "SELECT" || a.type === "datetime-local")) {
        key = a.tagName.toLowerCase() + '[aria-label="' + a.getAttribute("aria-label") + '"]';
      }
      else if (a && a.type === "radio") key = 'input[name="' + a.name + '"][value="' + a.value + '"]';
      else if (a && a.getAttribute && a.getAttribute("role") === "switch") key = 'input[role="switch"]';
      syncWizardDirty();
      renderWizard();
      const target = key && card.querySelector(key);
      if (target) target.focus();
    }

    function buildStep5() {
      const body = el("div", "wizard-step-body wizard-how");
      const plan = howPlan();
      const n = plan.n;

      // How many choices can each voter pick?
      body.appendChild(el("p", "wizard-question", "How many choices can each voter pick?"));
      const many = el("div", "m3-radio-list");
      many.setAttribute("role", "radiogroup");
      many.setAttribute("aria-label", "How many choices can each voter pick?");
      const canMulti = n >= 2;
      many.appendChild(m3RadioRow("howmany", "one", "One choice", "Voters pick a single choice.",
        !plan.multi, () => { wizard.multi = false; howChanged(); }));
      many.appendChild(m3RadioRow("howmany", "multi", "More than one",
        canMulti ? "Voters pick several choices." : "Add at least 2 choices in Step 3 first.",
        plan.multi, () => { wizard.multi = true; howChanged(); }, !canMulti));
      body.appendChild(many);

      // Can voters change their vote?
      body.appendChild(el("p", "wizard-question", "Can voters change their vote?"));
      const change = el("div", "m3-radio-list");
      change.setAttribute("role", "radiogroup");
      change.setAttribute("aria-label", "Can voters change their vote?");
      // "Yes" first, and the default (a new poll is Dynamic-Vote).
      change.append(
        m3RadioRow("mutable", "change", "Yes, as often as they like while the poll is open",
          "Voters can change their vote until the poll closes.",
          wizard.mutable, () => { wizard.mutable = true; howChanged(); }),
        m3RadioRow("mutable", "final", "No, their first vote is final", "Once a vote is cast, it cannot be changed.",
          !wizard.mutable, () => { wizard.mutable = false; howChanged(); })
      );
      body.appendChild(change);

      const help = el("details", "wizard-help");
      help.appendChild(el("summary", null, "What does this mean?"));
      const list = el("dl");
      list.append(
        el("dt", null, "One choice"), el("dd", null, "Each voter picks exactly one choice."),
        el("dt", null, "More than one"), el("dd", null,
          "Each voter picks one or more of the choices."),
        el("dt", null, "They can change their vote"), el("dd", null,
          "Voters can change their vote as often as they like until the poll closes. Only their latest vote counts."),
        el("dt", null, "Their first vote is final"), el("dd", null,
          "A voter's first vote counts, and cannot be changed.")
      );
      help.appendChild(list);
      body.appendChild(help);
      return body;
    }

    // ── Step 6: When to vote ──
    // Two radio lists; "starts on" / "ends on" carry a datetime-local control
    // inline. Picking a date selects its option. Any change answers Step 6.
    function dayAt9Tomorrow() {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      d.setHours(9, 0, 0, 0);
      return d;
    }

    function weekAfter(from) {
      const d = new Date(from.getTime());
      d.setDate(d.getDate() + 7);
      d.setSeconds(0, 0);
      return d;
    }

    function whenChanged() {
      wizard.answered.add(6);
      howChanged();
    }

    function m3DateTime(value, ariaLabel, onChange) {
      const input = el("input", "m3-datetime");
      input.type = "datetime-local";
      input.value = value;
      input.setAttribute("aria-label", ariaLabel);
      input.addEventListener("change", () => onChange(input.value));
      return input;
    }

    function buildStep6() {
      const body = el("div", "wizard-step-body wizard-how wizard-when");

      function pickStart() {
        wizard.startMode = "on";
        if (!wizard.startLocal) wizard.startLocal = toLocalInputValue(dayAt9Tomorrow().toISOString());
        whenChanged();
      }
      function pickEnd() {
        wizard.endMode = "on";
        if (!wizard.endLocal) {
          wizard.endLocal = toLocalInputValue(weekAfter(startDate() || new Date()).toISOString());
        }
        whenChanged();
      }

      // When does voting start?
      body.appendChild(el("p", "wizard-question", "When does voting start?"));
      const starts = el("div", "m3-radio-list");
      starts.setAttribute("role", "radiogroup");
      starts.setAttribute("aria-label", "When does voting start?");
      const startInput = m3DateTime(wizard.startLocal, "Start date and time", (v) => {
        wizard.startMode = "on";
        wizard.startLocal = v;
        whenChanged();
      });
      starts.append(
        m3RadioRow("starts", "now", "Poll starts immediately", "Voting opens as soon as your poll is published.",
          wizard.startMode === "now", () => { wizard.startMode = "now"; whenChanged(); }),
        m3RadioRow("starts", "on", ["Poll starts on ", startInput], "Voting opens at the date and time you choose.",
          wizard.startMode === "on", pickStart)
      );
      body.appendChild(starts);
      const start = startDate();
      if (start && start < new Date() && (!existing || canChange("startAt"))) {
        const note = el("p", "wizard-note", "This is in the past: voting opens as soon as it is published.");
        note.setAttribute("role", "status");
        body.appendChild(note);
      }

      // When does voting end?
      body.appendChild(el("p", "wizard-question", "When does voting end?"));
      const ends = el("div", "m3-radio-list");
      ends.setAttribute("role", "radiogroup");
      ends.setAttribute("aria-label", "When does voting end?");
      const endInput = m3DateTime(wizard.endLocal, "End date and time", (v) => {
        wizard.endMode = "on";
        wizard.endLocal = v;
        whenChanged();
      });
      ends.append(
        m3RadioRow("ends", "none", "Poll has no end date", "Your poll stays open until you close it.",
          wizard.endMode === "none", () => { wizard.endMode = "none"; whenChanged(); }),
        m3RadioRow("ends", "on", ["Poll ends on ", endInput], "Voting closes at the date and time you choose.",
          wizard.endMode === "on", pickEnd)
      );
      body.appendChild(ends);
      const problem = scheduleProblem();
      if (problem) {
        const error = el("p", "wizard-error", problem);
        error.setAttribute("role", "alert");
        error.id = "scheduleError-" + current.pid;
        endInput.setAttribute("aria-describedby", error.id);
        endInput.setAttribute("aria-invalid", "true");
        body.appendChild(error);
      }

      const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      body.appendChild(el("p", "wizard-tz", "Times are in your time zone" + (zone ? " (" + zone + ")." : ".")));

      const help = el("details", "wizard-help");
      help.appendChild(el("summary", null, "What does this mean?"));
      const list = el("dl");
      list.append(
        el("dt", null, "Poll starts immediately"), el("dd", null,
          "Voting opens as soon as your poll is published. Public polls open once they have been reviewed."),
        el("dt", null, "Poll starts on"), el("dd", null,
          "Your poll waits until this date and time, then opens for voting. Until then, anyone who opens it sees that it hasn't started yet."),
        el("dt", null, "Poll has no end date"), el("dd", null,
          "Your poll stays open until you close it from its card."),
        el("dt", null, "Poll ends on"), el("dd", null,
          "Voting closes at this date and time. The results stay available after it closes."),
        el("dt", null, "Time zone"), el("dd", null,
          "Dates and times are in your time zone. Voters see them in their own.")
      );
      help.appendChild(list);
      body.appendChild(help);
      return body;
    }

    // On an existing poll, what cannot change is shown disabled, with one line
    // saying why. Next still moves on.
    const LOCKED_BY_VOTES = "This can't change once your poll has votes.";
    const LOCKED_START = "Voting has opened, so the start can't change.";
    const LOCKED_CLOSED = "Your poll has closed, so its dates can't change.";

    function lockStep(body, n) {
      const reasons = [];
      function lock(selector, reason) {
        const controls = body.querySelectorAll(selector);
        if (!controls.length) return;
        controls.forEach((control) => {
          control.disabled = true;
          const row = control.closest(".m3-radio-item, .m3-switch-row");
          if (row) row.classList.add("is-disabled");
        });
        if (!reasons.includes(reason)) reasons.push(reason);
      }
      const closed = ["CLOSED", "ARCHIVED"].includes(wordedState());
      if (n === 1 && !canChange("pollVisibility")) lock(".m3-radio, .m3-switch", LOCKED_BY_VOTES);
      if (n === 2 && !canChange("keywords")) lock(".m3-chip-input, .m3-chip-remove", LOCKED_BY_VOTES);
      if (n === 3 && !canChange("labels")) lock(".m3-field-input, .wizard-paste .m3-tonal-btn", LOCKED_BY_VOTES);
      if (n === 5 && !canChange("choiceMode")) lock(".m3-radio", LOCKED_BY_VOTES);
      if (n === 6) {
        if (!canChange("startAt")) {
          lock('input[name="starts-' + current.pid + '"], input[aria-label="Start date and time"]',
            closed ? LOCKED_CLOSED : LOCKED_START);
        }
        if (!canChange("endAt")) {
          lock('input[name="ends-' + current.pid + '"], input[aria-label="End date and time"]', LOCKED_CLOSED);
        }
      }
      if (reasons.length) {
        const note = el("p", "wizard-locked", reasons.join(" "));
        body.insertBefore(note, body.firstChild);
      }
    }

    function buildStepPanel() {
      const st = WIZARD_STEPS[wizard.step - 1];
      const panel = el("section", "wizard-panel");
      const heading = el("h3", "wizard-panel-heading", "Step " + st.n + " · " + st.name);
      panel.appendChild(heading);
      const body = st.n === 1 ? buildStep1() : st.n === 2 ? buildStep2() : st.n === 3 ? buildStep3() :
        st.n === 4 ? buildColorsStep() : st.n === 5 ? buildStep5() : buildStep6();
      if (existing) lockStep(body, st.n);
      panel.appendChild(body);
      if (st.n < WIZARD_STEPS.length) {
        const actions = el("div", "wizard-panel-actions");
        actions.appendChild(nextButton());
        panel.appendChild(actions);
      }
      return panel;
    }

    // ── Footer: [Cancel] on the left, [Save] [Publish] on the right ──
    function buildFooter() {
      if (existing) return buildChangesFooter();
      const footer = el("div", "wizard-footer");
      const cancel = el("button", "btn-header-ghost", "Cancel");
      cancel.type = "button";
      cancel.setAttribute("aria-label", "Cancel setting up poll: " + current.title);
      // The wizard's Cancel awaits the page dialog too.
      cancel.addEventListener("click", async () => {
        if (dirty && !(await confirmDiscard())) return;
        void cancelWizard();
      });
      const right = el("div", "wizard-footer-right");
      const save = el("button", "btn-header-ghost", "Save");
      save.type = "button";
      save.title = "Save and finish later";
      save.setAttribute("aria-label", "Save poll and finish later: " + current.title);
      const duplicate = Boolean(duplicateMessage());
      // aria-disabled, not disabled, so the tooltip that names what is missing shows
      // on hover, focus and a long press. A disabled button gets no pointer or
      // focus events. The click does nothing while blocked. Save is treated the
      // same, since its tooltip has the same job.
      save.addEventListener("click", () => {
        if (save.getAttribute("aria-disabled") === "true") return;
        void saveWizard();
      });
      if (duplicate) {
        save.setAttribute("aria-disabled", "true");
        save.title = "Remove the duplicate choice first.";
      }
      const publish = el("button", "btn-header-primary", "Publish");
      publish.type = "button";
      const choicesBlock = choicesProblem();
      const scheduleBlock = scheduleProblem();
      const blocked = duplicate || !allStepsVisited() || !titleIsSet() || Boolean(choicesBlock) ||
        Boolean(scheduleBlock);
      if (blocked) publish.setAttribute("aria-disabled", "true");
      publish.title = duplicate ? "Remove the duplicate choice first."
        : !allStepsVisited() ? "Visit all six steps to publish."
        : !titleIsSet() ? "Give your poll a title to publish."
        : choicesBlock ? choicesBlock.replace(/\.$/, " to publish.")
        : scheduleBlock ? scheduleBlock.replace(/\.$/, " to publish.") : "";
      publish.setAttribute("aria-label", "Publish poll: " + current.title);
      publish.addEventListener("click", () => {
        if (publish.getAttribute("aria-disabled") === "true") return;
        void publishWizard();
      });
      right.append(save, publish);
      footer.append(cancel, right);
      return footer;
    }

    // An existing poll's footer is Cancel and one filled Save changes. It is
    // aria-disabled until something has changed, or while a setting is invalid,
    // with a tooltip saying why, as Publish.
    function buildChangesFooter() {
      const footer = el("div", "wizard-footer");
      const cancel = el("button", "btn-header-ghost", "Cancel");
      cancel.type = "button";
      cancel.setAttribute("aria-label", "Cancel editing poll: " + current.title);
      cancel.addEventListener("click", async () => {
        if (dirty && !(await confirmDiscard())) return;
        void cancelWizard();
      });
      const right = el("div", "wizard-footer-right");
      const save = el("button", "btn-header-primary", "Save changes");
      save.type = "button";
      save.setAttribute("aria-label", "Save changes to poll: " + current.title);
      const choicesBlock = canChange("labels") ? choicesProblem() : "";
      const scheduleBlock = scheduleProblem();
      const why = !dirty ? "Change something to save."
        : duplicateMessage() ? "Remove the duplicate choice first."
        : !titleIsSet() ? "Give your poll a title to save."
        : choicesBlock ? choicesBlock.replace(/\.$/, " to save.")
        : scheduleBlock ? scheduleBlock.replace(/\.$/, " to save.") : "";
      if (why) save.setAttribute("aria-disabled", "true");
      save.title = why || "Save your changes";
      save.addEventListener("click", () => {
        if (save.getAttribute("aria-disabled") === "true") return;
        void saveChanges();
      });
      right.appendChild(save);
      footer.append(cancel, right);
      return footer;
    }

    // /publish sends every saved poll back to screening, with or without votes, so
    // the card says so first.
    function reviewNote() {
      return el("p", "wizard-review-note", "Saving sends your poll to be reviewed again.");
    }

    function renderWizard() {
      card.classList.add("poll-admin-card--new");
      const focusedStep = document.activeElement && document.activeElement.closest &&
        document.activeElement.closest(".poll-admin-card") === card;
      const listed = !existing && showsInvitees();
      card.replaceChildren(status, buildSummary(), buildCircles(), buildStepPanel(),
        ...(existing ? [reviewNote()] : []), buildFooter(), ...(listed ? [inviteesPanel()] : []));
      if (listed && invitees.data === null) loadInvitees();
      if (focusedStep) {
        const target = card.querySelector(".m3-radio:checked:not(:disabled)") ||
          card.querySelector(".wizard-fields .m3-field-input:not(:disabled)") ||
          card.querySelector(".wizard-next") || card.querySelector(".wizard-panel-heading");
        if (target && target.focus) target.focus();
        // The default title opens selected, so typing replaces it.
        if (wizard.step === 2 && target && target.select && !titleIsSet()) target.select();
      }
    }

    // Takes the answers to read (the open wizard by default), so an existing poll's
    // stored answers map to the same fields for the comparison in saveChanges.
    function wizardFields(s = wizard) {
      const option = whoOption(s.who);
      const fields = { pollVisibility: option.pollVisibility };
      if (option.pollSharingMode) fields.pollSharingMode = option.pollSharingMode;
      fields.title = s.title.trim();
      fields.subtitle = s.subtitle.trim();
      // Keywords are stored only with a public poll.
      if (s.who === "public") fields.keywords = s.keywords.join(",");
      fields.labels = choiceLines(s).map((l) => l.trim());
      fields.colors = colorsOfLines(s);
      const plan = howPlan(s);
      fields.choiceMode = plan.multi ? "Multiple-Choice Poll" : "Single-Choice Poll";
      fields.voteMutability = s.mutable ? "Dynamic-Vote Poll" : "Final-Vote Poll";
      const start = startDate(s);
      const end = endDate(s);
      fields.startAt = start ? start.toISOString() : null;
      fields.endAt = end ? end.toISOString() : null;
      // "No" (not anonymous) only on a private poll with the switch on.
      fields.voteAnonymity = s.who !== "public" && s.showVoters ? "No" : "Yes";
      // Only an Administrator may change the line graph; the server refuses the field from anyone else.
      if (viewerIsAdmin) fields.lineGraphEnabled = s.lineGraph === true;
      return fields;
    }

    function keepWizardProgress() {
      wizardSaved = {
        who: wizard.who,
        step: wizard.step,
        visited: [...wizard.visited],
        answered: [...wizard.answered],
        title: wizard.title.trim(),
        subtitle: wizard.subtitle.trim(),
        keywords: [...wizard.keywords],
        choicesText: choiceLines().join("\n"),
        colors: Object.fromEntries(choiceLines().flatMap((line) =>
          wizard.colors[line.trim()] ? [[line.trim(), wizard.colors[line.trim()]]] : [])),
        multi: wizard.multi,
        rangeKind: wizard.rangeKind,
        from: wizard.from,
        to: wizard.to,
        exact: wizard.exact,
        mutable: wizard.mutable,
        startMode: wizard.startMode,
        startLocal: wizard.startLocal,
        endMode: wizard.endMode,
        endLocal: wizard.endLocal,
        showVoters: wizard.showVoters,
        lineGraph: wizard.lineGraph
      };
    }

    function leaveWizard() {
      wizard = null;
      existing = false;
      card.classList.remove("poll-admin-card--new");
      resetEditState();
      deps.onEditEnd(current.pid);
    }

    async function postWizard(suffix) {
      try {
        const res = await fetch(pollUrl(suffix), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...wizardFields(), clientGuid: session.clientGuid, timeZone: timeZone() })
        });
        const body = await res.json().catch(() => ({}));
        return res.ok ? { ok: true, body } : { ok: false, body };
      } catch {
        return { ok: false, body: {} };
      }
    }

    // Save keeps the answers and the progress; the poll stays INITIALIZED.
    async function saveWizard() {
      const result = await postWizard("/save");
      if (!result.ok) {
        showStatus(result.body.error || "Could not save.");
        return;
      }
      keepWizardProgress();
      await releaseSession();
      leaveWizard();
      await deps.refresh({ focusPid: current.pid, message: result.body.message || "Saved: you can finish later." });
    }

    // Publish sends the poll on as the server would (screening: AWAITING APPROVAL).
    async function publishWizard() {
      if (wizard) wizard.answered.add(6);
      const result = await postWizard("/publish");
      if (!result.ok) {
        showStatus(result.body.error || "Could not publish.");
        return;
      }
      wizardSaved = null;
      sessionLost = true; // publishing ends the session on the server
      leaveWizard();
      await deps.refresh({ focusPid: current.pid, message: result.body.message || "" });
    }

    // A colors save, or a line graph change alone, goes to /colors: it never sends the poll to review.
    function savesColorsOnly(body) {
      return editMode() === "UPDATE" && (body.colors !== undefined || body.lineGraphEnabled !== undefined) &&
        Object.keys(body).every((name) => name === "clientGuid" || name === "colors" || name === "lineGraphEnabled");
    }

    // Save changes sends only the fields that changed and may change, to /publish.
    async function saveChanges() {
      const before = wizardFields(pollAnswers());
      const after = wizardFields();
      const body = { clientGuid: session.clientGuid };
      for (const [name, value] of Object.entries(after)) {
        if (JSON.stringify(value) === JSON.stringify(before[name])) continue;
        if (!canChange(FIELD_OF[name] || name)) continue;
        body[name] = value;
      }
      if (body.labels !== undefined) body.colors = after.colors;
      let res;
      let answer = {};
      try {
        res = await fetch(pollUrl(savesColorsOnly(body) ? "/colors" : "/publish"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...body, timeZone: timeZone() })
        });
        answer = await res.json().catch(() => ({}));
      } catch {
        showStatus("Could not save.");
        return;
      }
      if (!res.ok) {
        showStatus(answer.error || "Could not save.");
        return;
      }
      sessionLost = true; // saving ends the session on the server
      leaveWizard();
      await deps.refresh({ focusPid: current.pid, message: answer.message || "" });
    }

    // Cancel discards the answers since the last Save; the poll is unchanged.
    async function cancelWizard() {
      await releaseSession();
      leaveWizard();
      await deps.refresh({ focusPid: current.pid });
    }

    // ── read-only face ────────────────────────────────────────────────────────

    function buildActionsMenu() {
      const menu = el("div", "actions-menu");
      menu.setAttribute("role", "menu");
      menu.hidden = true;
      menu.append(
        menuItem("Duplicate Poll", "Duplicate poll: " + current.title, () => deps.onDuplicate(current)),
        menuItem("Copy Poll Link", "Copy link to poll: " + current.title, () => deps.onCopyLink(current)),
        menuLink("View Results", "View results for poll: " + current.title,
                 "/admin/poll/results?PID=" + encodeURIComponent(current.pid))
      );
      if (current.canRescreen) {
        menu.append(menuItem("Re-attempt Screening", "Re-attempt screening for poll: " + current.title,
                             () => deps.onRescreen(current)));
      }
      if (current.canArchive) {
        menu.append(menuItem("Archive Poll", "Archive poll: " + current.title, () => deps.onArchive(current)));
      }
      if (current.canDelete) {
        menu.append(menuItem("Delete Poll", "Delete poll: " + current.title, () => deps.onDelete(current)));
      }
      return menu;
    }

    function stateButton(target, label, enabled) {
      const btn = el("button", "admin-state-btn", label);
      btn.type = "button";
      btn.disabled = !enabled;
      btn.title = enabled ? label + " your poll"
                          : label + " is not available while the poll is " + current.pollState;
      btn.setAttribute("aria-label", label + " poll: " + current.title);
      if (enabled) btn.addEventListener("click", () => deps.onState(current, target, btn));
      return btn;
    }

    // No pen: the Summary Text's parts open the editor instead.
    function buildReadOnlyHeader(now) {
      const header = el("div", "card-header card-readonly-header");

      const stateWrap = el("div", "card-state");
      stateWrap.appendChild(el("span", "card-field-label", "Poll State Is:"));
      stateWrap.appendChild(el("span", "card-state-value", current.pollState));
      const detail = stateDetailText(current, now);
      const detailNode = el("span", "card-state-detail", detail);
      if (!detail) detailNode.hidden = true;
      stateWrap.appendChild(detailNode);
      if (current.canRescreen) {
        const retry = el("button", "admin-rescreen-btn", "Re-attempt Screening");
        retry.type = "button";
        retry.setAttribute("aria-label", "Re-attempt screening for poll: " + current.title);
        retry.addEventListener("click", () => deps.onRescreen(current));
        stateWrap.appendChild(retry);
      }
      header.appendChild(stateWrap);

      const icons = el("div", "card-actions");
      icons.append(
        iconButton("icon-copy", "Duplicate poll: " + current.title, true, () => deps.onDuplicate(current)),
        iconButton("icon-link", "Copy link to poll: " + current.title, true, () => deps.onCopyLink(current)),
        iconLink("icon-results", "View results for poll: " + current.title,
                 "/admin/poll/results?PID=" + encodeURIComponent(current.pid), true),
        iconButton("icon-trash", "Delete poll: " + current.title, current.canDelete, () => deps.onDelete(current))
      );
      const menu = buildActionsMenu();
      const trigger = el("button", "actions-menu-trigger");
      trigger.type = "button";
      trigger.setAttribute("aria-haspopup", "true");
      trigger.setAttribute("aria-expanded", "false");
      trigger.setAttribute("aria-label", "Actions for " + current.title);
      trigger.innerHTML =
        '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' +
        '<circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/>' +
        "</svg>";
      trigger.addEventListener("click", (event) => {
        event.stopPropagation();
        deps.onMenuToggle(trigger, menu);
      });
      icons.append(trigger, menu);
      header.appendChild(icons);
      return header;
    }

    // The editor opens from the Summary Text while the poll can be edited or
    // updated and no other card is being edited (one at a time). Otherwise every
    // part is plain text.
    function canOpenEditor() {
      return (current.canEdit || current.canUpdate) && !deps.isLatched();
    }

    // The read-only face's answers, in the wizard's shape. A poll still in its wizard
    // reads as the wizard would reopen (its default "Choice 1 / Choice 2" are no
    // choices, and only the answered steps have lines); any other poll has every step
    // answered.
    function readOnlyAnswers() {
      const base = isWizardPoll() ? wizardBase() : pollAnswers();
      return { ...base, answered: new Set(base.answered), state: isWizardPoll() ? "INITIALIZED" : wordedState() };
    }

    // The state the when-line is worded for. A poll being edited is worded as the
    // state it came from; without that field, as OPEN once launched, else unpublished.
    function wordedState() {
      if (current.pollState !== "EDITING") return current.pollState;
      return current.pollStateBeforeEditUpdate || (current.launchedAt ? "OPEN" : "INITIALIZED");
    }

    // A tap opens the wizard at the part's step. A part is a link only when its
    // field can change in the poll's state.
    function readOnlyPart(text, step, field) {
      if (!canOpenEditor() || (field && !canChange(field))) return el("span", "wizard-summary-part", text);
      return tappablePart(text, text + ": change in Step " + step, () => requestEdit(step));
    }

    function readOnlyPanel(className, children) {
      const panel = el("div", "card-panel " + className);
      panel.append(...children);
      return panel;
    }

    function renderReadOnly() {
      wizard = null;
      card.classList.remove("poll-admin-card--new");
      const now = deps.now ? deps.now() : Date.now();

      const states = el("div", "card-state-buttons");
      states.append(
        stateButton("OPEN", "Open", current.canOpen),
        stateButton("CLOSED", "Close", current.canClose),
        stateButton("ARCHIVED", "Archive", current.canArchive)
      );
      const creator = createdByText(current);
      const createdBy = creator ? readOnlyField("Created By", creator) : null;
      if (createdBy && current.ownPoll === false) {
        createdBy.classList.add("card-field--not-own");
        createdBy.appendChild(el("span", "not-your-poll-chip", "Not your poll"));
      }
      const launched = readOnlyField("Launched", formatLaunched(current.launchedAt));
      if (!current.launchedAt) launched.querySelector(".card-field-value").classList.add("admin-date-absent");
      const dates = readOnlyPanel("card-dates-panel", [
        states,
        ...(createdBy ? [createdBy] : []),
        readOnlyField("Created", formatTimestamp(current.createdAt)),
        launched
      ]);

      const counts = [readOnlyField("Vote Count", String(current.voteCount ?? 0))];
      if (showsInvitees()) {
        counts.push(countField("Invitation Count", "invitations", current.invitationCount),
                    countField("Accepted Count", "accepted", current.acceptedCount));
      }
      counts.push(readOnlyField("Banned Voter Count", String(current.bannedVoterCount ?? 0)));

      const focused = invitees && invitees.panel.contains(document.activeElement) ? document.activeElement : null;
      const selection = focused && typeof focused.selectionStart === "number" ? [focused.selectionStart, focused.selectionEnd] : null;
      const body = el("div", "card-readonly");
      body.append(buildSummary(readOnlyAnswers(), readOnlyPart),
                  dates, readOnlyPanel("card-counts-panel", counts),
                  ...(showsInvitees() ? [inviteesPanel()] : []));
      card.replaceChildren(status, buildReadOnlyHeader(now), body);
      if (focused && focused.isConnected) {
        focused.focus({ preventScroll: true });
        if (selection) focused.setSelectionRange(selection[0], selection[1]);
      }
      if (showsInvitees()) loadInvitees();
    }

    function countField(labelText, name, value) {
      const field = readOnlyField(labelText, String(value ?? 0));
      field.querySelector(".card-field-value").dataset.count = name;
      return field;
    }

    // ── invitees ──────────────────────────────────────────────────────────────
    // The panel is built once and moved between faces, so a list refresh keeps a
    // draft in its field and leaves an open row menu or confirmation alone.

    let invitees = null;

    function showsInvitees() {
      return whoFromPoll(current) === "invite";
    }

    function timeZone() {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    }

    function dailyLimitText(retryAt) {
      const time = new Date(retryAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
      return "Your daily invitation limit is reached until " + time.replace(/\.$/, "") + ".";
    }

    function pagerButton(step, label, path) {
      const btn = el("button", "invitees-page-btn");
      btn.type = "button";
      btn.dataset.step = String(step);
      btn.setAttribute("aria-label", label);
      btn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="' + path +
        '" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
      btn.addEventListener("click", () => {
        invitees.page += step;
        renderInvitees();
      });
      return btn;
    }

    function inviteesPanel() {
      if (invitees) {
        if (!rowsBusy()) renderInvitees();
        return invitees.panel;
      }
      const id = "invitees-" + current.pid;
      const panel = el("section", "card-panel card-invitees-panel");
      panel.setAttribute("aria-labelledby", id + "-title");

      const heading = el("div", "invitees-heading");
      const title = el("h3", "invitees-title", "Invitees");
      title.id = id + "-title";
      const capacity = el("span", "invitees-capacity");
      capacity.dataset.count = "capacity";
      heading.append(title, capacity);

      const add = el("div", "invitees-add");
      const label = el("label", "invitees-field-label", "Invite by email");
      label.htmlFor = id + "-input";
      const input = el("textarea", "invitees-input");
      input.id = id + "-input";
      input.rows = 3;
      input.placeholder = "Paste or type addresses, separated by commas, spaces or new lines";
      input.setAttribute("aria-describedby", id + "-results");
      const actions = el("div", "invitees-add-actions");
      const invite = el("button", "invitees-invite-btn", "Invite");
      invite.type = "button";
      actions.append(el("span", "invitees-hint", "Ctrl+Enter"), invite);
      const results = el("div", "invitees-results");
      results.id = id + "-results";
      results.hidden = true;
      const summary = el("p", "invitees-summary");
      summary.setAttribute("role", "status");
      results.append(summary, el("ul", "invitees-refusals"));
      add.append(label, input, actions, results);

      const list = el("ul", "invitee-list");
      list.setAttribute("aria-label", "Invitees");
      const pager = el("div", "invitees-pager");
      const range = el("span", "invitees-pager-range");
      range.setAttribute("aria-live", "polite");
      pager.append(range, pagerButton(-1, "Previous invitees", "M15 6l-6 6 6 6"),
                   pagerButton(1, "Next invitees", "M9 6l6 6-6 6"));

      panel.append(heading, add, list, pager);
      invite.addEventListener("click", addInvitees);
      input.addEventListener("keydown", (event) => {
        if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
          event.preventDefault();
          addInvitees();
        }
      });
      invitees = { panel, input, invite, results, list, pager, range, add, capacity, data: null, page: 0, loaded: false, addSummary: null };
      renderInvitees();
      return panel;
    }

    // A1, on first show and on every list refresh.
    async function loadInvitees() {
      try {
        const res = await fetch(pollUrl("/invitees"));
        if (!res.ok) return;
        takeInvitees(await res.json());
      } catch {
        // The next list refresh tries again.
      }
    }

    function takeInvitees(data) {
      invitees.data = { ...(invitees.data || {}), ...data };
      if (rowsBusy()) return;
      renderInvitees();
    }

    // An open row menu or confirmation holds the rows until it closes.
    function rowsBusy() {
      return !!invitees.list.querySelector(".invitee-confirm, .actions-menu:not([hidden])");
    }

    function lastPage() {
      const size = runtime.participantsViewportSize;
      return Math.max(0, Math.ceil((invitees.data ? invitees.data.invitees.length : 0) / size) - 1);
    }

    function renderInvitees() {
      const data = invitees.data;
      // The server's editable decides; until its answer arrives, nothing can be changed.
      const readOnly = !data || data.editable === false;
      if (readOnly) invitees.panel.dataset.readonly = "";
      else delete invitees.panel.dataset.readonly;
      invitees.add.hidden = readOnly;

      const rows = data ? data.invitees : [];
      const limit = data && data.voterLimit != null ? data.voterLimit : current.voterCountLimit ?? runtime.privateVoterLimit;
      invitees.capacity.textContent = (data ? data.invitationCount : current.invitationCount ?? 0) + " of " + limit;
      if (data) {
        for (const node of card.querySelectorAll('[data-count="invitations"]')) node.textContent = String(data.invitationCount);
        for (const node of card.querySelectorAll('[data-count="accepted"]')) node.textContent = String(data.acceptedCount);
      }

      const size = runtime.participantsViewportSize;
      const pending = invitees.addSummary;
      if (pending && pending.waiting.size) {
        const notSent = new Set(rows.filter((r) => r.status === "Not sent yet").map((r) => r.email));
        for (const email of pending.waiting) if (!notSent.has(email)) pending.waiting.delete(email);
        invitees.results.querySelector(".invitees-summary").textContent = addSummaryText(pending);
      }

      invitees.page = Math.min(Math.max(0, invitees.page), lastPage());
      const start = invitees.page * size;
      invitees.list.replaceChildren(...rows.slice(start, start + size).map((row) => inviteeRow(row, readOnly)));
      invitees.pager.hidden = rows.length <= size;
      invitees.range.textContent = rows.length === 0 ? "" :
        (start + 1) + "–" + Math.min(start + size, rows.length) + " of " + rows.length;
      invitees.pager.querySelector('[data-step="-1"]').disabled = invitees.page === 0;
      invitees.pager.querySelector('[data-step="1"]').disabled = start + size >= rows.length;
    }

    function inviteeRow(invitee, readOnly) {
      const row = el("li", "invitee-row");
      const who = el("div", "invitee-who");
      who.appendChild(el("span", "invitee-email", invitee.email));
      if (invitee.userName) who.appendChild(el("span", "invitee-name", invitee.userName));
      const chip = el("span", "invitee-chip", invitee.status);
      chip.dataset.status = invitee.status;
      row.append(who, chip);
      if (readOnly) return row;

      const trigger = el("button", "actions-menu-trigger");
      trigger.type = "button";
      trigger.setAttribute("aria-haspopup", "true");
      trigger.setAttribute("aria-expanded", "false");
      trigger.setAttribute("aria-label", "Actions for " + invitee.email);
      trigger.innerHTML =
        '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' +
        '<circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/>' +
        "</svg>";
      const menu = el("div", "actions-menu");
      menu.setAttribute("role", "menu");
      menu.hidden = true;
      const choose = (action) => () => {
        deps.onMenuToggle(trigger, menu);
        action();
      };
      const resend = menuItem("Resend invitation", "Resend invitation to " + invitee.email, choose(() => resendInvitee(invitee)));
      if (!invitee.canResend) {
        resend.disabled = true;
        resend.title = invitee.resendBlockedReason || "";
        resend.appendChild(el("span", "invitee-menu-reason", invitee.resendBlockedReason || ""));
      }
      menu.append(resend, menuItem("Remove", "Remove " + invitee.email, choose(() => {
        if (invitee.status === "Voted") confirmRemoval(invitee.email);
        else removeInvitee(invitee.email, false);
      })));
      trigger.addEventListener("click", (event) => {
        event.stopPropagation();
        deps.onMenuToggle(trigger, menu);
      });
      row.append(trigger, menu);
      return row;
    }

    function confirmRemoval(email) {
      const row = Array.from(invitees.list.querySelectorAll(".invitee-row"))
        .find((r) => r.querySelector(".invitee-email").textContent === email);
      if (!row || row.querySelector(".invitee-confirm")) return;
      const strip = el("div", "invitee-confirm");
      strip.setAttribute("role", "alertdialog");
      const text = el("span", "invitee-confirm-text", "Remove " + email + "? Their vote will be removed too.");
      text.id = "confirm-" + current.pid + "-" + email.replace(/[^a-z0-9]/gi, "-");
      strip.setAttribute("aria-labelledby", text.id);
      const cancel = el("button", null, "Cancel");
      cancel.type = "button";
      cancel.addEventListener("click", () => {
        strip.remove();
        renderInvitees();
      });
      const confirm = el("button", "invitee-confirm-remove", "Remove");
      confirm.type = "button";
      confirm.addEventListener("click", () => {
        strip.remove();
        removeInvitee(email, true);
      });
      strip.append(text, cancel, confirm);
      row.appendChild(strip);
      window.M3Ripple?.add(".poll-admin-card .invitee-confirm button");
      cancel.focus();
    }

    async function postInvitees(body) {
      try {
        const res = await fetch(pollUrl("/invitees"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...body, timeZone: timeZone() })
        });
        return { status: res.status, ok: res.ok, body: await res.json().catch(() => ({})) };
      } catch {
        return { status: 0, ok: false, body: {} };
      }
    }

    function addSummaryText({ invited, waiting, refused }) {
      return ["Invited Emails: " + invited + ".",
        waiting.size ? waiting.size + (waiting.size === 1 ? " Email" : " Emails") +
          " will be sent when your daily limit allows.\nDaily Limit: " + runtime.maxInvitationsPerDay +
          (runtime.maxInvitationsPerDay === 1 ? " Email" : " Emails") : "",
        refused ? "Emails that could not be added: " + refused : ""].filter(Boolean).join("\n");
    }

    function showInviteesSummary(text, refusals) {
      invitees.addSummary = null;
      invitees.results.hidden = false;
      invitees.results.querySelector(".invitees-summary").textContent = text;
      invitees.results.querySelector(".invitees-refusals").replaceChildren(...refusals.map((refusal) => {
        const line = el("li");
        line.append(el("span", "invitees-refused-address", refusal.email), " — " + refusal.reason);
        return line;
      }));
    }

    async function addInvitees() {
      const text = invitees.input.value;
      if (!text.trim() || invitees.input.disabled) return;
      invitees.input.disabled = true;
      invitees.invite.disabled = true;
      const before = invitees.data ? invitees.data.invitees.length : 0;
      const answer = await postInvitees({ add: text });
      invitees.input.disabled = false;
      invitees.invite.disabled = false;
      if (!answer.ok) {
        showInviteesSummary(answer.body.error || "Could not invite.", []);
        return;
      }
      const results = answer.body.results || [];
      const refused = results.filter((r) => r.outcome !== "added");
      const summary = {
        invited: results.length - refused.length,
        waiting: new Set(results.filter((r) => r.waiting).map((r) => r.email)),
        refused: refused.length
      };
      invitees.input.value = refused.map((r) => r.email).join("\n");
      showInviteesSummary(addSummaryText(summary), refused);
      invitees.addSummary = summary;
      invitees.data = answer.body;
      if (answer.body.invitees.length > before) {
        invitees.page = Math.floor((answer.body.invitees.length - 1) / runtime.participantsViewportSize);
      }
      renderInvitees();
    }

    async function removeInvitee(email, confirmVoted) {
      const answer = await postInvitees({ remove: [email], confirmVoted });
      if (answer.status === 409 && answer.body.code === "invitee-voted") {
        await loadInvitees();
        confirmRemoval(email);
        return;
      }
      if (!answer.ok) {
        showInviteesSummary(answer.body.error || "Could not remove.", []);
        return;
      }
      invitees.data = answer.body;
      showInviteesSummary("Removed " + email + ".", []);
      renderInvitees();
    }

    async function resendInvitee(invitee) {
      const answer = await postInvitees({ resend: invitee.email });
      if (answer.status === 429 && answer.body.code === "daily-limit") {
        showInviteesSummary(dailyLimitText(answer.body.retryAt), []);
        return;
      }
      if (!answer.ok) {
        showInviteesSummary(answer.body.error || "Could not resend.", []);
        return;
      }
      invitees.data = { ...invitees.data, ...answer.body };
      showInviteesSummary("Reminder sent to " + invitee.email + ".", []);
      renderInvitees();
    }

    // ── leaving with edits ────────────────────────────────────────────────────

    // A Promise<boolean>, so every caller awaits it.
    function confirmDiscard() {
      return askToDiscard();
    }

    function onBeforeUnload(event) {
      if (!dirty) return undefined;
      event.preventDefault();
      event.returnValue = "";
      return "";
    }

    function armExitGuards() {
      if (exitGuardsArmed) return;
      exitGuardsArmed = true;
      window.addEventListener("beforeunload", onBeforeUnload);
    }

    function disarmExitGuards() {
      window.removeEventListener("beforeunload", onBeforeUnload);
      exitGuardsArmed = false;
    }

    // The wizard's Step 3 box: the caller says where messages go (setError) and
    // what to do after input and on blur.
    function wireChoicesBox(box, hooks) {
      const maxLabel = hooks.maxLabel || CHOICE_LABEL_MAX;
      let keepDefaultSelection = false;
      box.addEventListener("focus", () => {
        if (!holdsOnlyDefaultChoices(box.value)) return;
        box.select();
        keepDefaultSelection = true;
      });
      box.addEventListener("mouseup", (event) => {
        if (!keepDefaultSelection) return;
        event.preventDefault();
        keepDefaultSelection = false;
      });
      box.addEventListener("blur", () => {
        keepDefaultSelection = false;
        const result = sanitizeChoicesText(box.value, box.selectionStart, { keepCaretLine: false, maxLabel });
        if (result.text !== box.value) box.value = result.text;
        hooks.onBlur();
      });
      box.addEventListener("keydown", (e) => {
        if (e.key !== "Enter" || e.isComposing) return;
        const { value, selectionStart: start, selectionEnd: end } = box;
        if (isBlank(value.slice(lineStartAt(value, start), start))) {
          e.preventDefault();
          hooks.setError("Type a choice before starting a new line.");
          return;
        }
        if ((value.slice(0, start) + "\n" + value.slice(end)).split("\n").length > runtime.maxChoices) {
          e.preventDefault();
          hooks.setError(`That's the limit — ${runtime.maxChoices} choices maximum.`);
        }
      });
      box.addEventListener("input", () => {
        const result = sanitizeChoicesText(box.value, box.selectionStart, { maxLabel });
        if (result.text !== box.value) {
          box.value = result.text;
          box.setSelectionRange(result.caret, result.caret);
        }
        hooks.onInput();   // first, so setError sees the new text
        if (result.droppedOverflow) hooks.setError(`Only the first ${runtime.maxChoices} choices were kept.`);
        else if (result.truncated) hooks.setError(`Choices are capped at ${maxLabel} characters.`);
        else if (result.droppedBlank) hooks.setError("Blank lines were removed.");
        else hooks.setError("");
      });
    }

    // ── editing session ───────────────────────────────────────────────────────

    function stopHeartbeat() {
      if (heartbeatTimer !== null) {
        clearInterval(heartbeatTimer);
        heartbeatTimer = null;
      }
    }

    async function sendHeartbeat() {
      let alive = false;
      try {
        const res = await fetch(pollUrl("/edit-session/heartbeat"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clientGuid: session.clientGuid })
        });
        const body = await res.json().catch(() => ({}));
        alive = res.ok && body.alive === true;
      } catch {
        return;
      }
      if (!alive) loseSession();
    }

    function startHeartbeat() {
      stopHeartbeat();
      heartbeatTimer = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);
    }

    async function releaseSession() {
      disarmExitGuards(); // leaving editing: no second, browser-drawn prompt (025 FIX10)
      stopHeartbeat();
      if (!session || sessionLost) return;
      try {
        await fetch(pollUrl("/edit-session"), {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clientGuid: session.clientGuid })
        });
      } catch {
        // The stale-session sweep releases it within a bounded time.
      }
    }

    function newClientGuid() {
      return (window.crypto && window.crypto.randomUUID && window.crypto.randomUUID()) ||
        String(Date.now()) + "-" + Math.random().toString(36).slice(2);
    }

    function resetEditState() {
      session = null;
      dirty = false;
      sessionLost = false;
      mode = "READ_ONLY";
      disarmExitGuards();
      stopHeartbeat();
    }

    // After Save, Cancel or a lost session: the first part that opens the editor.
    function focusSummary() {
      const part = card.querySelector(".card-readonly .wizard-summary-link");
      if (part) part.focus();
    }

    // `step` is the Summary Text part's step: the wizard opens there.
    // While the request is out, the summary is busy and ignores further taps.
    async function requestEdit(step) {
      const summary = card.querySelector(".card-readonly .wizard-summary");
      if (summary) {
        if (summary.getAttribute("aria-busy") === "true") return;
        summary.setAttribute("aria-busy", "true");
      }
      showStatus("");
      const clientGuid = newClientGuid();
      let body = {};
      let ok = false;
      try {
        const res = await fetch(pollUrl("/edit-session"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clientGuid })
        });
        body = await res.json().catch(() => ({}));
        ok = res.ok && body.granted === true;
      } catch {
        body = {};
      }
      if (!ok) {
        if (summary) summary.removeAttribute("aria-busy");
        showStatus(body.message || "Your poll cannot be edited right now.");
        deps.onEditEnd(current.pid);
        return;
      }
      session = { clientGuid, poll: body.poll, mode: body.mode };
      // Every poll opens the wizard; one that is not in its new-poll wizard starts
      // from its stored answers, with every step visited and answered.
      mode = "WIZARD";
      existing = !isWizardPoll();
      openWizardState();
      if (step) {
        wizard.step = step;
        wizard.visited.add(step);
      }
      dirty = false;
      deps.onEditStart(current.pid);
      renderWizard();
      startHeartbeat();
    }

    function loseSession() {
      stopHeartbeat();
      sessionLost = true;
      resetEditState();
      deps.onEditEnd(current.pid);
      renderReadOnly();
      showStatus("Your poll is no longer being edited in this tab.");
      focusSummary();
    }

    function update(nextPoll) {
      current = nextPoll;
      if (mode === "READ_ONLY") renderIdle();
    }

    function renderIdle() {
      renderReadOnly();
    }

    renderIdle();

    return {
      element: card,
      pid: poll.pid,
      isEditing: () => mode !== "READ_ONLY",
      isDirty: () => dirty,
      confirmDiscard,
      update,
      showStatus,
      focusSummary,
      openWizard: () => requestEdit(1),
      hasSavedProgress: () => wizardSaved !== null,
      releaseSession
    };
  }

  window.AdminCard = { create, setRuntimeConfig, sanitizeChoicesText, runtime };
})();
