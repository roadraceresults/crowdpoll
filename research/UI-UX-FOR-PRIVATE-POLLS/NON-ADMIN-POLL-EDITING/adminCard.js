/**
 * Poll administration card.
 * Layout reference: designDocs/014-poll-edit-card-mockup.jpg
 * Choices box behaviour ported from designDocs/smart-textbox.html
 */
(function () {
  "use strict";

  const CHOICE_MODES = ["Single-Choice Poll", "Multiple-Choice Poll"];
  const VOTE_MUTABILITIES = ["Final-Vote Poll", "Dynamic-Vote Poll"];
  const POLL_VISIBILITIES = ["Public Poll", "Private Poll"];
  const POLL_SHARING_MODES = ["Anyone With The Link", "Invitation Only"];
  const VOTE_ANONYMITIES = ["Yes", "No"];
  const DEFAULT_CHOICE_LABELS = ["Choice 1", "Choice 2"];
  const CHOICE_LABEL_MAX = 100;
  const HEARTBEAT_INTERVAL_MS = 10000;

  // 014: minChoices / maxChoices are ENV_MIN_CHOICES / ENV_MAX_CHOICES, told to the
  // page by /api/config like the voter limit; the values here are only the fallback
  // until it answers.
  const runtime = { privateVoterLimit: 500, participantsViewportSize: 10, minChoices: 2, maxChoices: 50 };

  function setRuntimeConfig(cfg) {
    if (Number.isInteger(cfg.privateVoterLimitDefault)) runtime.privateVoterLimit = cfg.privateVoterLimitDefault;
    if (Number.isInteger(cfg.participantsViewportSize)) runtime.participantsViewportSize = cfg.participantsViewportSize;
    if (Number.isInteger(cfg.minChoices)) runtime.minChoices = cfg.minChoices;
    if (Number.isInteger(cfg.maxChoices)) runtime.maxChoices = cfg.maxChoices;
  }

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function formatTimestamp(value) {
    return value ? new Date(value).toLocaleString() : "—";
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

  // REQUIREMENT013: the emoji shortcut for a computer's keyboard, from the user
  // agent. null on phones and tablets (their keyboards have emoji) and on systems
  // with no single shortcut (Linux).
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

  // REQUIREMENT014: two choices are the same when they differ only in capitals or
  // spaces ("Taco Town", "taco  town ").
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
    let editable = null;
    let draft = {};
    let dirty = false;
    let choicesDirty = false;
    let scheduleInverted = false;
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

    // ── new-poll wizard (REQUIREMENT003, REQUIREMENT005, REQUIREMENT006) ───────
    // A poll just made by Create New Poll (cardType "new") is set up through a
    // five-step wizard inside the card while it is still unpublished (INITIALIZED).
    // Top to bottom: the Settings Summary Section, the Named Circles, the current
    // step's panel, and the Cancel / Save / Publish footer. The wizard holds an edit
    // session like the edit face does, so the one-card-at-a-time rule applies.

    const WIZARD_STEPS = [
      { n: 1, name: "Who can vote", short: "Who" },
      { n: 2, name: "Title & Tags", short: "Title" },
      { n: 3, name: "Choices", short: "Choices" },
      { n: 4, name: "How to vote", short: "How" },
      { n: 5, name: "When to vote", short: "When" }
    ];

    // Step 1's three answers and the values they store, verbatim.
    const WHO_OPTIONS = [
      {
        key: "link", label: "Anyone you send the link to",
        support: "Private. Only people with the link can find and vote in your poll.",
        help: "Your poll is private: it is listed only in the Shared With You tab for the people " +
              "you share it with, and is not listed in Trending, Newest or Search. " +
              "Anyone who has the link can open it and vote.",
        pollVisibility: "Private Poll", pollSharingMode: "Anyone With The Link"
      },
      {
        key: "invite", label: "Only people you invite",
        support: "Private. You'll add their email addresses after the poll is created.",
        help: "Your poll is private: it is listed only in the Shared With You tab for the people " +
              "you share it with, and is not listed in Trending, Newest or Search. " +
              "Only the people whose email addresses you add can vote. " +
              "You add them after the poll is created.",
        pollVisibility: "Private Poll", pollSharingMode: "Invitation Only"
      },
      {
        key: "public", label: "Everyone on CrowdPoll",
        support: "Public. Anyone can find it in Trending, Newest and Search. " +
                 "Public polls are reviewed before they appear.",
        help: "Your poll is public: anyone on CrowdPoll can find it and vote. " +
              "Public polls are reviewed before they appear.",
        pollVisibility: "Public Poll", pollSharingMode: null
      }
    ];

    let wizard = null;       // the open wizard: answers, current step, visited/answered
    let wizardSaved = null;  // what the last Save kept, reopened by the pen

    function isNewCard() {
      return current.cardType === "new";
    }

    function isWizardPoll() {
      return isNewCard() && current.pollState === "INITIALIZED";
    }

    function whoFromPoll(p) {
      if (p.pollVisibility === "Public Poll") return "public";
      return p.pollSharingMode === "Invitation Only" ? "invite" : "link";
    }

    function whoOption(key) {
      return WHO_OPTIONS.find((o) => o.key === key);
    }

    // REQUIREMENT009: Step 2's limits. Lengths count UTF-16 units, as the server does.
    const TITLE_MAX = 100;
    const SUBTITLE_MAX = 50;          // REQUIREMENT011
    const WIZARD_CHOICE_MAX = 40;     // REQUIREMENT014; the edit face keeps CHOICE_LABEL_MAX (100)
    const KEYWORDS_TOTAL_MAX = 200;   // every keyword plus one comma between each pair
    const DEFAULT_TITLE = /^New Poll \d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/;

    function keywordsFromPoll(p) {
      return p.keywords ? p.keywords.split(",").filter(Boolean) : [];
    }

    // A new poll is stored with the sample "Choice 1 / Choice 2"; the wizard shows
    // them as no choices, so Step 3 starts empty (REQUIREMENT014).
    function storedChoicesText() {
      const text = [...(current.choices || [])].sort((a, b) => a.position - b.position)
        .map((c) => c.label).join("\n");
      return holdsOnlyDefaultChoices(text) ? "" : text;
    }

    // Step 4 (REQUIREMENT015). The range is new: minSelections / maxSelections.
    // `to: null` means "up to every choice", so it follows Step 3's count.
    function storedHow() {
      const multi = current.choiceMode === "Multiple-Choice Poll";
      const min = Number.isInteger(current.minSelections) ? current.minSelections : 1;
      const max = Number.isInteger(current.maxSelections) ? current.maxSelections : null;
      const exact = multi && max !== null && min === max;
      return {
        multi,
        rangeKind: exact ? "exact" : "range",
        from: exact ? 1 : min,
        to: exact ? null : max,
        exact: exact ? min : 2,
        mutable: current.voteMutability === "Dynamic-Vote Poll"
      };
    }

    // Step 5 (REQUIREMENT018): "now" / "none" are no date (startAt / endAt null);
    // the dates are kept as datetime-local strings, in the browser's time zone.
    function storedWhen() {
      return {
        startMode: current.startAt ? "on" : "now",
        startLocal: toLocalInputValue(current.startAt),
        endMode: current.endAt ? "on" : "none",
        endLocal: toLocalInputValue(current.endAt)
      };
    }

    function wizardBase() {
      return wizardSaved || {
        who: whoFromPoll(current), step: 1, visited: [1], answered: [],
        title: current.title, subtitle: current.subtitle || "", keywords: keywordsFromPoll(current),
        choicesText: storedChoicesText(),
        ...storedHow(),
        ...storedWhen(),
        showVoters: current.voteAnonymity === "No"   // REQUIREMENT020
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
        ["multi", "rangeKind", "from", "to", "exact", "mutable",
          "startMode", "startLocal", "endMode", "endLocal", "showVoters"].some((k) => wizard[k] !== base[k]);
    }

    // Step 3 (REQUIREMENT013): the choices are the box's non-blank lines. These
    // helpers read the open wizard, or the read-only card's answers (REQUIREMENT021).
    function choiceLines(s = wizard) {
      return s.choicesText.split("\n").filter((l) => !isBlank(l));
    }

    // Why the choices cannot be published yet, or "" when they can.
    function choicesProblem() {
      if (choiceLines().length < runtime.minChoices) return `Add at least ${runtime.minChoices} choices.`;
      return "";
    }

    // What Step 4's answers mean for the current number of choices (REQUIREMENT015):
    // "More than one" needs 2 choices, "Exactly" needs 3 (it offers 2..N-1), and the
    // numbers are clamped to N. It never makes the poll unpublishable.
    function howPlan(s = wizard) {
      const n = choiceLines(s).length;
      if (!s.multi || n < 2) return { multi: false, kind: "one", min: 1, max: 1, n };
      if (s.rangeKind === "exact" && n >= 3) {
        const k = Math.min(Math.max(s.exact, 2), n - 1);
        return { multi: true, kind: "exact", min: k, max: k, n };
      }
      const from = Math.min(Math.max(s.from, 1), n - 1);
      const to = s.to === null ? n : Math.min(Math.max(s.to, from + 1), n);
      return { multi: true, kind: "range", min: from, max: to, n };
    }

    function howPhrase(plan) {
      if (plan.kind === "one") return "one choice";
      if (plan.kind === "exact") return "exactly " + plan.min + " choices";
      return "from " + plan.min + " to " + plan.max + " choices";
    }

    // Step 5's dates as Date objects, or null for "immediately" / "no end date".
    function startDate(s = wizard) {
      return s.startMode === "on" && s.startLocal ? new Date(s.startLocal) : null;
    }
    function endDate(s = wizard) {
      return s.endMode === "on" && s.endLocal ? new Date(s.endLocal) : null;
    }

    // Why the schedule cannot be published, or "": today's rule (Start before End)
    // plus, in the wizard, an end that is already past (REQUIREMENT018).
    function scheduleProblem() {
      const start = startDate();
      const end = endDate();
      if (start && end && start >= end) return "Start must be before End.";
      if (end && end <= new Date()) return "The end must be in the future.";
      return "";
    }

    // "on Sat, Oct 3 at 9:00 AM", with the year when it is not this year (REQUIREMENT022).
    function whenText(date) {
      const day = { weekday: "short", month: "short", day: "numeric" };
      if (date.getFullYear() !== new Date().getFullYear()) day.year = "numeric";
      return "on " + date.toLocaleDateString(undefined, day) + " at " +
        date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
    }

    // The Summary Text's when-line as [lead, part] pairs, decided by the poll state
    // first and the dates second (REQUIREMENT022): "opened" only once the poll has
    // opened, "closed" only once it is CLOSED or ARCHIVED, whatever the clock says.
    // An unpublished poll (the wizard) words its dates as plans.
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

    // A repeated choice blocks leaving Step 3, Save and Publish (REQUIREMENT014).
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

    // ── Settings Summary Section ──
    // A part is tappable only once its step has been answered (Next pressed on it).
    // A tappable part is inline text with a button's role (REQUIREMENT012): a real
    // <button> is an inline block, so a long part could not wrap with the sentence.
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

    // The Summary Text (REQUIREMENT011): the title and subtitle as the heading, drawn
    // with the Poll Card's own .question / .subtitle classes, then one line per aspect
    // of the poll. The heading is plain until Step 2 is answered.
    function buildSummary(s = wizard, part = summaryPart) {
      const section = el("section", "wizard-summary");
      section.setAttribute("aria-label", "Settings summary");
      const who = s.who;
      const kind = who === "public" ? "Public Poll" : "Private Poll";
      const title = s.title.trim();
      const subtitle = s.subtitle.trim();
      if (title) {
        const heading = el("p", "question wizard-summary-title");
        heading.appendChild(part(title, 2));
        section.appendChild(heading);
      }
      if (subtitle) {
        const sub = el("p", "subtitle wizard-summary-subtitle");
        sub.appendChild(part(subtitle, 2));
        section.appendChild(sub);
      }
      const line = () => section.appendChild(el("p", "wizard-summary-text"));
      const who1 = line();
      who1.classList.add("wizard-summary-who");
      who1.append("Your poll is a ", part(kind, 1), ". ");
      if (who === "link") who1.append(part("Anyone you send the link to", 1), " can vote.");
      else if (who === "invite") who1.append(part("Only people you invite", 1), " by email can vote.");
      else who1.append(part("Everyone on CrowdPoll", 1), " can find it and vote.");
      // REQUIREMENT020: private polls say whether votes are anonymous.
      if (who !== "public") {
        who1.append(" ", part(s.showVoters ? "Users can see who voted for what." : "Votes are anonymous.", 1));
      }
      if (who === "public" && s.answered.has(2) && s.keywords.length) {
        const keywordsLine = line();
        keywordsLine.classList.add("wizard-summary-keywords");
        keywordsLine.append("It can be found by searching for ", part(s.keywords.join(", "), 2), ".");
      }
      // REQUIREMENT013: the choices themselves, once Step 3 is answered.
      if (s.answered.has(3) && choiceLines(s).length) {
        const choicesLine = line();
        choicesLine.classList.add("wizard-summary-choices");
        choicesLine.append("Voters choose from ", part(choiceLines(s).map((l) => l.trim()).join(", "), 3), ".");
      }
      // REQUIREMENT015: how to vote, once Step 4 is answered.
      if (s.answered.has(4)) {
        const howLine = line();
        howLine.classList.add("wizard-summary-how");
        howLine.append("Each voter picks ", part(howPhrase(howPlan(s)), 4), ", and ",
          part(s.mutable ? "can change their vote" : "their vote is final", 4), ".");
      }
      // REQUIREMENT018: when to vote, once Step 5 is answered (its first change).
      if (s.answered.has(5)) {
        const whenLine = line();
        whenLine.classList.add("wizard-summary-when");
        for (const [lead, text] of whenPhrases(s.state || "INITIALIZED", startDate(s), endDate(s))) {
          whenLine.append(lead, part(text, 5));
        }
        whenLine.append(".");
      }
      return section;
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
    // either before the release would swallow that click (REQUIREMENT012). Used for
    // the keywords line and the choices line (REQUIREMENT013).
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
        const nextClass = next && [...next.classList].find((c) => /^wizard-summary-(who|keywords|choices|how|when)$/.test(c));
        summary.insertBefore(fresh, (nextClass && summary.querySelector("." + nextClass)) || null);
      }
    }

    // ── Named Circles ──
    // Visited steps are a filled check, unvisited steps an outlined number (inert),
    // and the current step an outlined number with a thick accent ring. Every short
    // name sits above its circle (REQUIREMENT008).
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

    // ── REQUIREMENT020: "Users can see who voted for what" ──
    // A Material 3 switch in one row after the radio list, for private polls only.
    // Off (the default) is voteAnonymity "Yes"; on is "No". With it on, voters as
    // well as the creator see who voted for what (a change to 016's rule).
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

    // ── Step 2: Title & Tags (REQUIREMENT009) ──
    // One UI underlined text fields (REQUIREMENT010): the label always above the
    // input, an underline, the supporting text below on the left, a counter below on
    // the right, and an error in place of the supporting text.
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
        // No newlines: pasted ones become spaces (REQUIREMENT009 clarification 1).
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
      // dropped when the user leaves the step, saves or publishes (REQUIREMENT012).
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

    // ── Step 3: Choices (REQUIREMENT013) ──
    // The edit face's choices box and rules (wireChoicesBox, sanitizeChoicesText) in
    // Step 2's underlined field: one choice per line, Enter starts a new one.
    function buildStep3() {
      const body = el("div", "wizard-step-body wizard-fields");
      const id = "pollChoices-" + current.pid;
      const field = m3Field("Choices", id, emojiHint("One choice per line. Press Enter after each choice."));
      field.wrap.classList.add("m3-field--choices");
      // REQUIREMENT014: no label (the step heading names it), a placeholder instead,
      // and an accessible name for screen readers.
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
        maxLabel: WIZARD_CHOICE_MAX,
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
      // REQUIREMENT016: a caption under the button, like Copy link's note on Step 1.
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

    // ── Step 4: How to vote (REQUIREMENT015) ──
    // Two Material radio lists, as Step 1's. "More than one" opens a range ("From
    // [a] to [b]") or an exact count, chosen with dropdowns (the phone's own picker).
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

    function m3Select(values, selected, ariaLabel, onChange) {
      const select = el("select", "m3-select");
      select.setAttribute("aria-label", ariaLabel);
      for (const v of values) {
        const option = el("option", null, String(v));
        option.value = String(v);
        option.selected = v === selected;
        select.appendChild(option);
      }
      select.addEventListener("change", () => onChange(Number(select.value)));
      // Opening the picker must not also toggle the radio its label belongs to.
      select.addEventListener("click", (event) => event.stopPropagation());
      return select;
    }

    function range(a, b) {
      const out = [];
      for (let v = a; v <= b; v++) out.push(v);
      return out;
    }

    // Redraw Step 4 and keep focus on the control that changed.
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

    function buildStep4() {
      const body = el("div", "wizard-step-body wizard-how");
      const plan = howPlan();
      const n = plan.n;
      // Clamp the stored numbers to Step 3's count, and say so if that changed them.
      let adjusted = false;
      if (plan.kind === "exact" && wizard.exact !== plan.min) { wizard.exact = plan.min; adjusted = true; }
      if (plan.kind === "range") {
        if (wizard.rangeKind === "exact") { wizard.rangeKind = "range"; adjusted = true; }
        if (wizard.from !== plan.min) { wizard.from = plan.min; adjusted = true; }
        const to = plan.max === n ? null : plan.max;
        if (wizard.to !== to && wizard.to !== null) { wizard.to = to; adjusted = true; }
      }
      if (adjusted) syncWizardDirty();

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
      if (plan.multi) {
        const sub = el("div", "m3-radio-list wizard-suboptions");
        sub.setAttribute("role", "radiogroup");
        sub.setAttribute("aria-label", "How many choices, exactly");
        const fromSel = m3Select(range(1, n - 1), plan.kind === "range" ? plan.min : 1, "Fewest choices",
          (v) => { wizard.rangeKind = "range"; wizard.from = v; if (wizard.to !== null && wizard.to <= v) wizard.to = v + 1; howChanged(); });
        const toFrom = plan.kind === "range" ? plan.min + 1 : 2;
        const toSel = m3Select(range(toFrom, n), plan.kind === "range" ? plan.max : n, "Most choices",
          (v) => { wizard.rangeKind = "range"; wizard.to = v === n ? null : v; howChanged(); });
        sub.appendChild(m3RadioRow("howrange", "range", ["From ", fromSel, " to ", toSel, " choices"], null,
          plan.kind === "range", () => { wizard.rangeKind = "range"; howChanged(); }));
        if (n >= 3) {
          const exactSel = m3Select(range(2, n - 1), plan.kind === "exact" ? plan.min : Math.min(wizard.exact, n - 1),
            "Exact number of choices",
            (v) => { wizard.rangeKind = "exact"; wizard.exact = v; howChanged(); });
          sub.appendChild(m3RadioRow("howrange", "exact", ["Exactly ", exactSel, " choices"], null,
            plan.kind === "exact", () => { wizard.rangeKind = "exact"; howChanged(); }));
        }
        many.appendChild(sub);
      }
      body.appendChild(many);
      if (adjusted) {
        const note = el("p", "wizard-note", "Adjusted to your " + n + " choices.");
        note.setAttribute("role", "status");
        body.appendChild(note);
      }

      // Can voters change their vote?
      body.appendChild(el("p", "wizard-question", "Can voters change their vote?"));
      const change = el("div", "m3-radio-list");
      change.setAttribute("role", "radiogroup");
      change.setAttribute("aria-label", "Can voters change their vote?");
      // REQUIREMENT016: "Yes" first, and the default (a new poll is Dynamic-Vote).
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
          "Each voter picks several choices: any number in the range you set, or an exact number."),
        el("dt", null, "They can change their vote"), el("dd", null,
          "Voters can change their vote as often as they like until the poll closes. Only their latest vote counts."),
        el("dt", null, "Their first vote is final"), el("dd", null,
          "A voter's first vote counts, and cannot be changed.")
      );
      help.appendChild(list);
      body.appendChild(help);
      return body;
    }

    // ── Step 5: When to vote (REQUIREMENT018) ──
    // Two radio lists; "starts on" / "ends on" carry the edit face's datetime-local
    // control inline. Picking a date selects its option. Any change answers Step 5.
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
      wizard.answered.add(5);
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

    function buildStep5() {
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
      if (start && start < new Date()) {
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

    function buildStepPanel() {
      const st = WIZARD_STEPS[wizard.step - 1];
      const panel = el("section", "wizard-panel");
      const heading = el("h3", "wizard-panel-heading", "Step " + st.n + " · " + st.name);
      panel.appendChild(heading);
      panel.appendChild(st.n === 1 ? buildStep1() : st.n === 2 ? buildStep2() :
        st.n === 3 ? buildStep3() : st.n === 4 ? buildStep4() : buildStep5());
      if (st.n < WIZARD_STEPS.length) {
        const actions = el("div", "wizard-panel-actions");
        actions.appendChild(nextButton());
        panel.appendChild(actions);
      }
      return panel;
    }

    // ── Footer: [Cancel] on the left, [Save] [Publish] on the right ──
    function buildFooter() {
      const footer = el("div", "wizard-footer");
      const cancel = el("button", "btn-header-ghost", "Cancel");
      cancel.type = "button";
      cancel.setAttribute("aria-label", "Cancel setting up poll: " + current.title);
      cancel.addEventListener("click", () => {
        if (dirty && !confirmDiscard()) return;
        void cancelWizard();
      });
      const right = el("div", "wizard-footer-right");
      const save = el("button", "btn-header-ghost", "Save");
      save.type = "button";
      save.title = "Save and finish later";
      save.setAttribute("aria-label", "Save poll and finish later: " + current.title);
      save.addEventListener("click", () => void saveWizard());
      const duplicate = Boolean(duplicateMessage());
      if (duplicate) {
        save.disabled = true;
        save.title = "Remove the duplicate choice first.";
      }
      const publish = el("button", "btn-header-primary", "Publish");
      publish.type = "button";
      const choicesBlock = choicesProblem();
      const scheduleBlock = scheduleProblem();
      publish.disabled = duplicate || !allStepsVisited() || !titleIsSet() || Boolean(choicesBlock) ||
        Boolean(scheduleBlock);
      publish.title = duplicate ? "Remove the duplicate choice first."
        : !allStepsVisited() ? "Visit all five steps to publish."
        : !titleIsSet() ? "Give your poll a title to publish."
        : choicesBlock ? choicesBlock.replace(/\.$/, " to publish.")
        : scheduleBlock ? scheduleBlock.replace(/\.$/, " to publish.") : "";
      publish.setAttribute("aria-label", "Publish poll: " + current.title);
      publish.addEventListener("click", () => void publishWizard());
      right.append(save, publish);
      footer.append(cancel, right);
      return footer;
    }

    function renderWizard() {
      card.classList.add("poll-admin-card--new");
      const focusedStep = document.activeElement && document.activeElement.closest &&
        document.activeElement.closest(".poll-admin-card") === card;
      card.replaceChildren(status, buildSummary(), buildCircles(), buildStepPanel(), buildFooter());
      if (focusedStep) {
        const target = card.querySelector(".m3-radio:checked") || card.querySelector(".wizard-fields .m3-field-input") ||
          card.querySelector(".wizard-next") || card.querySelector(".wizard-panel-heading");
        if (target && target.focus) target.focus();
        // REQUIREMENT009: the default title opens selected, so typing replaces it.
        if (wizard.step === 2 && target && target.select && !titleIsSet()) target.select();
      }
    }

    function wizardFields() {
      const option = whoOption(wizard.who);
      const fields = { pollVisibility: option.pollVisibility };
      if (option.pollSharingMode) fields.pollSharingMode = option.pollSharingMode;
      fields.title = wizard.title.trim();
      fields.subtitle = wizard.subtitle.trim();
      // Keywords are stored only with a public poll (REQUIREMENT009 clarification 2).
      if (wizard.who === "public") fields.keywords = wizard.keywords.join(",");
      fields.labels = choiceLines().map((l) => l.trim());
      const plan = howPlan();
      fields.choiceMode = plan.multi ? "Multiple-Choice Poll" : "Single-Choice Poll";
      fields.voteMutability = wizard.mutable ? "Dynamic-Vote Poll" : "Final-Vote Poll";
      fields.minSelections = plan.min;
      fields.maxSelections = plan.max;
      const start = startDate();
      const end = endDate();
      fields.startAt = start ? start.toISOString() : null;
      fields.endAt = end ? end.toISOString() : null;
      // REQUIREMENT020: "No" (not anonymous) only on a private poll with the switch on.
      fields.voteAnonymity = wizard.who !== "public" && wizard.showVoters ? "No" : "Yes";
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
        showVoters: wizard.showVoters
      };
    }

    function leaveWizard() {
      wizard = null;
      card.classList.remove("poll-admin-card--new");
      resetEditState();
      deps.onEditEnd(current.pid);
    }

    async function postWizard(suffix) {
      try {
        const res = await fetch(pollUrl(suffix), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...wizardFields(), clientGuid: session.clientGuid })
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
      if (wizard) wizard.answered.add(5);
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

    // REQUIREMENT021: no pen. The Summary Text's parts open the editor instead.
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

    // The editor opens from the Summary Text while the pen would have been enabled:
    // the poll can be edited or updated, and no other card is being edited (one at a
    // time). Otherwise every part is plain text (REQUIREMENT021).
    function canOpenEditor() {
      return (current.canEdit || current.canUpdate) && !deps.isLatched();
    }

    // The read-only face's answers, in the wizard's shape. A poll still in its wizard
    // reads as the wizard would reopen (its default "Choice 1 / Choice 2" are no
    // choices, and only the answered steps have lines); any other poll has every step
    // answered.
    function readOnlyAnswers() {
      const base = isWizardPoll() ? wizardBase() : {
        who: whoFromPoll(current),
        title: current.title,
        subtitle: current.subtitle || "",
        keywords: keywordsFromPoll(current),
        choicesText: [...(current.choices || [])].sort((a, b) => a.position - b.position)
          .map((c) => c.label).join("\n"),
        ...storedHow(),
        ...storedWhen(),
        showVoters: current.voteAnonymity === "No",
        answered: [1, 2, 3, 4, 5]
      };
      return { ...base, answered: new Set(base.answered), state: isWizardPoll() ? "INITIALIZED" : wordedState() };
    }

    // The state the when-line is worded for. A poll being edited is worded as the
    // state it came from; without that field, as OPEN once launched, else unpublished.
    function wordedState() {
      if (current.pollState !== "EDITING") return current.pollState;
      return current.pollStateBeforeEditUpdate || (current.launchedAt ? "OPEN" : "INITIALIZED");
    }

    // A tap opens the wizard at the part's step while the poll is in its wizard, and
    // the edit face once it is published.
    function readOnlyPart(text, step) {
      if (!canOpenEditor()) return el("span", "wizard-summary-part", text);
      const label = isWizardPoll() ? text + ": change in Step " + step : text + ": edit poll";
      return tappablePart(text, label, () => requestEdit(step));
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
      const launched = readOnlyField("Launched", formatLaunched(current.launchedAt));
      if (!current.launchedAt) launched.querySelector(".card-field-value").classList.add("admin-date-absent");
      const dates = readOnlyPanel("card-dates-panel", [
        states,
        readOnlyField("Created", formatTimestamp(current.createdAt)),
        launched
      ]);

      const counts = [readOnlyField("Vote Count", String(current.voteCount ?? 0))];
      if (whoFromPoll(current) === "invite") counts.push(readOnlyField("Invitation Count", String(current.invitationCount ?? 0)));
      counts.push(readOnlyField("Banned Voter Count", String(current.bannedVoterCount ?? 0)));

      const body = el("div", "card-readonly");
      body.append(dates, readOnlyPanel("card-counts-panel", counts),
                  buildSummary(readOnlyAnswers(), readOnlyPart));
      card.replaceChildren(status, buildReadOnlyHeader(now), body);
    }

    // ── editing face ──────────────────────────────────────────────────────────

    function markDirty(field, value) {
      draft[field] = value;
      if (!dirty) {
        dirty = true;
        armExitGuards();
      }
      refreshPublishButton();
    }

    function choicesBoxLines() {
      return editable.choicesBox.value.split("\n").filter((l) => !isBlank(l));
    }

    function refreshPublishButton() {
      if (!editable) return;
      const tooFewChoices = choicesDirty && choicesBoxLines().length < runtime.minChoices;
      editable.publish.disabled = !dirty || scheduleInverted || tooFewChoices;
      editable.publish.title = tooFewChoices ? `Add at least ${runtime.minChoices} choices to save.` : "";
    }

    function refreshChoicesState() {
      if (!editable) return;
      const count = choicesBoxLines().length;
      const tooFew = count < runtime.minChoices;
      editable.choicesCount.textContent = count;
      editable.choicesCounter.classList.toggle("invalid", tooFew);
      editable.choicesBox.classList.toggle("invalid", tooFew && choicesDirty);
      refreshPublishButton();
    }

    function checkSchedule() {
      const startValue = editable.startAt.value;
      const endValue = editable.endAt.value;
      const inverted = Boolean(startValue && endValue && new Date(startValue) >= new Date(endValue));
      editable.scheduleError.textContent = inverted ? "Start must be before End." : "";
      scheduleInverted = inverted;
      refreshPublishButton();
      return !inverted;
    }

    function applyVoterLimitAvailability(visibility) {
      const isPublic = visibility === "Public Poll";
      editable.voterCountLimit.disabled = isPublic;
      editable.voterLimitField.classList.toggle("is-disabled", isPublic);
      if (isPublic) {
        editable.voterCountLimit.value = "";
        editable.voterLimitError.textContent = "";
      }
      editable.voterCountLimit.placeholder = isPublic ? "unlimited" : "";
      editable.voterLimitHint.textContent = isPublic ? "" : `blank = ${runtime.privateVoterLimit}`;
    }

    function confirmDiscard() {
      return window.confirm("Any edits will be lost. Continue?");
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

    function labelledTextarea(labelText, id, maxLength, rows) {
      const section = el("section", "admin-field admin-field--tight");
      const label = el("label", null, labelText);
      label.setAttribute("for", id);
      const box = el("textarea");
      box.id = id;
      box.maxLength = maxLength;
      if (rows) box.rows = rows;
      box.setAttribute("aria-label", labelText + " of poll: " + current.title);
      const error = el("p", "admin-field-error");
      section.append(label, box, error);
      return { section, box, error };
    }

    function radioGroup(name, legendText, values, selected, frozen, onChange) {
      const fieldset = el("fieldset", "admin-field mechanics-group");
      fieldset.appendChild(el("legend", null, legendText));
      if (frozen) {
        fieldset.appendChild(el("p", "mechanics-static is-frozen", selected));
        return fieldset;
      }
      const group = el("div", "mechanics-radios");
      group.setAttribute("role", "radiogroup");
      group.setAttribute("aria-label", legendText + " of poll: " + current.title);
      values.forEach((value) => {
        const option = el("label", "radio-option");
        const input = el("input");
        input.type = "radio";
        input.name = name + "-" + current.pid;
        input.value = value;
        input.checked = value === selected;
        input.addEventListener("change", () => {
          if (input.checked) onChange(value);
        });
        option.append(input, el("span", null, value));
        group.appendChild(option);
      });
      fieldset.appendChild(group);
      return fieldset;
    }

    // Shared by the edit face and the wizard's Step 3 (REQUIREMENT013): the caller
    // says where messages go (setError) and what to do after input and on blur.
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

    // ── participant and banned voter sections ────────────────────────────────

    let participants = { invited: [], banned: [], voted: [] };
    let votedLoaded = false;
    const sections = {
      participants: { expanded: false, page: 1 },
      banned: { expanded: false, page: 1 }
    };

    function isInvitationOnly() {
      return session.poll.pollVisibility === "Private Poll" &&
        session.poll.pollSharingMode === "Invitation Only";
    }

    function byEmail(a, b) {
      const x = String(a).toLowerCase();
      const y = String(b).toLowerCase();
      return x < y ? -1 : x > y ? 1 : 0;
    }

    function participantRows() {
      const votedByEmail = new Map(participants.voted.map((v) => [v.emailAddress, v]));
      if (isInvitationOnly()) {
        return participants.invited.slice().sort(byEmail).map((email) => {
          const voter = votedByEmail.get(email);
          return {
            email,
            userName: voter ? voter.userName : "",
            suffixes: voter ? ["Invited", "Voted"] : ["Invited"]
          };
        });
      }
      return participants.voted
        .slice()
        .sort((a, b) => byEmail(a.emailAddress, b.emailAddress))
        .map((v) => ({ email: v.emailAddress, userName: v.userName, suffixes: ["Voted"] }));
    }

    function bannedRows() {
      return participants.banned.slice().sort(byEmail).map((email) => ({ email, userName: "", suffixes: [] }));
    }

    function rosterCount(kind) {
      if (kind === "banned") return current.bannedVoterCount ?? participants.banned.length;
      return isInvitationOnly()
        ? (current.invitationCount ?? participants.invited.length)
        : (current.voteCount ?? participants.voted.length);
    }

    function overDisplayLimit(kind) {
      return rosterCount(kind) > runtime.privateVoterLimit;
    }

    function sectionLabel(kind) {
      if (kind === "banned") return "Banned Voter List";
      return isInvitationOnly() ? "Invitations" : "Participants";
    }

    function overLimitMessage(kind) {
      const noun = kind === "banned" ? "Banned Voters" : "Participants";
      return `There are ${rosterCount(kind)} ${noun}. This list is too large to display ` +
             `(limit ${runtime.privateVoterLimit}).`;
    }

    function emptyMessage(kind) {
      if (kind === "banned") return "No banned voters.";
      return isInvitationOnly() ? "No invitations yet." : "No participants yet.";
    }

    function markParticipantsDirty() {
      markDirty("invitedVoterList", participants.invited.slice());
      markDirty("bannedVoterList", participants.banned.slice());
      renderRosters();
    }

    function banAddress(email) {
      if (!participants.banned.includes(email)) participants.banned.push(email);
      participants.invited = participants.invited.filter((e) => e !== email);
      participants.voted = participants.voted.filter((v) => v.emailAddress !== email);
      markParticipantsDirty();
    }

    function unbanAddress(email) {
      participants.banned = participants.banned.filter((e) => e !== email);
      markParticipantsDirty();
    }

    async function loadVotedOnce() {
      if (votedLoaded) return;
      votedLoaded = true;
      try {
        const res = await fetch(pollUrl("/results"));
        if (!res.ok) return;
        const { voted } = await res.json();
        participants.voted = (voted || []).map((v) => ({ emailAddress: v.emailAddress, userName: v.userName }));
      } catch {
        // The rows still render from the lists the edit-session response carried.
      }
    }

    function rowText(row) {
      let text = row.userName ? `${row.email} <${row.userName}>` : row.email;
      for (const suffix of row.suffixes) text += ` - ${suffix}`;
      return text;
    }

    function buildRosterList(kind, rows) {
      const list = el("ul", "admin-participant-list roster-list");
      list.style.setProperty("--roster-rows", String(runtime.participantsViewportSize));
      const size = runtime.participantsViewportSize;
      const pageCount = Math.max(1, Math.ceil(rows.length / size));
      const state = sections[kind];
      if (state.page > pageCount) state.page = pageCount;
      const first = (state.page - 1) * size;
      rows.slice(first, first + size).forEach((row) => {
        const li = el("li");
        li.appendChild(el("span", null, rowText(row)));
        const action = el("button", "btn-header-ghost", kind === "banned" ? "Un-ban" : "Ban from Voting");
        action.type = "button";
        action.setAttribute("aria-label",
          (kind === "banned" ? "Un-ban " : "Ban from voting: ") + row.email);
        action.addEventListener("click", () =>
          kind === "banned" ? unbanAddress(row.email) : banAddress(row.email));
        li.appendChild(action);
        list.appendChild(li);
      });
      return { list, pageCount, first };
    }

    function buildPager(kind, rows, pageCount, first) {
      const state = sections[kind];
      const pager = el("div", "roster-pager");
      const last = Math.min(first + runtime.participantsViewportSize, rows.length);
      pager.appendChild(el("span", "roster-range", `${first + 1} - ${last}`));
      pager.appendChild(el("span", "roster-total", `(${rows.length} items)`));

      const pageWrap = el("span", "roster-page");
      pageWrap.appendChild(document.createTextNode("Page "));
      const box = el("input", "roster-page-box");
      box.type = "number";
      box.min = "1";
      box.max = String(pageCount);
      box.value = String(state.page);
      box.setAttribute("aria-label", sectionLabel(kind) + " page number, of " + pageCount);
      const commit = () => {
        const parsed = Number.parseInt(box.value, 10);
        state.page = Number.isInteger(parsed) ? Math.min(Math.max(parsed, 1), pageCount) : state.page;
        renderRosters();
      };
      box.addEventListener("change", commit);
      box.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          commit();
        }
      });
      pageWrap.append(box, document.createTextNode(" of " + pageCount));
      pager.appendChild(pageWrap);

      const prev = el("button", "roster-nav", "‹");
      prev.type = "button";
      prev.disabled = state.page <= 1;
      prev.setAttribute("aria-label", "Previous page of " + sectionLabel(kind));
      prev.addEventListener("click", () => {
        state.page = Math.max(1, state.page - 1);
        renderRosters();
      });
      const next = el("button", "roster-nav", "›");
      next.type = "button";
      next.disabled = state.page >= pageCount;
      next.setAttribute("aria-label", "Next page of " + sectionLabel(kind));
      next.addEventListener("click", () => {
        state.page = Math.min(pageCount, state.page + 1);
        renderRosters();
      });
      pager.append(prev, next);
      return pager;
    }

    function buildInviteRow() {
      const row = el("div", "roster-invite-row");
      const input = el("input");
      input.type = "email";
      input.maxLength = 200;
      input.placeholder = "email@example.com";
      input.setAttribute("aria-label", "Email address to invite to poll: " + current.title);
      const button = el("button", "btn-header-ghost", "Invite");
      button.type = "button";
      button.setAttribute("aria-label", "Invite an address to poll: " + current.title);
      const error = el("p", "admin-field-error");
      button.addEventListener("click", () => {
        const email = input.value.trim().toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 200) {
          error.textContent = "Enter a valid email address.";
          return;
        }
        if (participants.invited.includes(email)) {
          error.textContent = "That address is already invited.";
          return;
        }
        if (participants.banned.includes(email)) {
          error.textContent = "That address is banned. Un-ban it first.";
          return;
        }
        participants.invited.push(email);
        input.value = "";
        error.textContent = "";
        markParticipantsDirty();
      });
      row.append(input, button, error);
      return row;
    }

    function buildSection(kind) {
      const state = sections[kind];
      const section = el("section", "roster-section");
      section.dataset.roster = kind;

      const head = el("div", "roster-head");
      head.appendChild(el("h3", "roster-label", sectionLabel(kind)));

      const toggle = el("button", "roster-toggle");
      toggle.type = "button";
      toggle.textContent = state.expanded ? "▲" : "▼";
      toggle.setAttribute("aria-expanded", state.expanded ? "true" : "false");
      toggle.setAttribute("aria-label",
        (state.expanded ? "Collapse " : "Expand ") + sectionLabel(kind) + " of poll: " + current.title);
      toggle.addEventListener("click", async () => {
        state.expanded = !state.expanded;
        if (state.expanded) await loadVotedOnce();
        renderRosters();
      });
      head.appendChild(toggle);
      section.appendChild(head);

      if (!state.expanded) return section;

      if (overDisplayLimit(kind)) {
        head.appendChild(el("p", "roster-message", overLimitMessage(kind)));
        return section;
      }

      if (kind !== "banned" && isInvitationOnly()) section.appendChild(buildInviteRow());

      const rows = kind === "banned" ? bannedRows() : participantRows();
      if (rows.length === 0) {
        const empty = el("div", "roster-list roster-list--empty");
        empty.style.setProperty("--roster-rows", String(runtime.participantsViewportSize));
        empty.appendChild(el("p", "roster-message", emptyMessage(kind)));
        section.appendChild(empty);
        return section;
      }

      const { list, pageCount, first } = buildRosterList(kind, rows);
      head.appendChild(buildPager(kind, rows, pageCount, first));
      section.appendChild(list);
      return section;
    }

    function renderRosters() {
      if (!editable || !editable.rosters) return;
      editable.rosters.replaceChildren(buildSection("participants"), buildSection("banned"));
    }

    function renderEditing() {
      const p = session.poll;
      const hasVotes = Boolean(current.hasEverBeenVotedOn);
      participants = {
        invited: (p.invitedVoterList || []).slice(),
        banned: (p.bannedVoterList || []).slice(),
        voted: []
      };
      votedLoaded = false;
      sections.participants = { expanded: false, page: 1 };
      sections.banned = { expanded: false, page: 1 };

      const header = el("div", "card-header card-header--editing");
      const publish = el("button", "btn-header", "Save and Publish");
      publish.type = "button";
      publish.disabled = true;
      publish.setAttribute("aria-label", "Save and publish poll: " + current.title);
      const cancel = el("button", "btn-header-ghost", "Cancel");
      cancel.type = "button";
      cancel.setAttribute("aria-label", "Cancel editing poll: " + current.title);
      const bar = el("div", "admin-publish-bar");
      bar.append(publish, cancel);
      header.appendChild(bar);
      header.appendChild(readOnlyField("Created", formatTimestamp(p.createdAt)));

      const publishError = el("p", "admin-field-error");

      const title = labelledTextarea("Title", "pollTitle-" + p.pid, 100, 2);
      const subtitle = labelledTextarea("Subtitle", "pollSubtitle-" + p.pid, 100);
      title.box.value = p.title;
      subtitle.box.value = p.subtitle || "";

      const choicesSection = el("section", "admin-field admin-field--tight");
      const choicesLabel = el("label", null, "Choices");
      choicesLabel.setAttribute("for", "choicesBox-" + p.pid);
      choicesSection.append(choicesLabel, el("p", "choices-hint", "One choice per line. Blank lines are not permitted."));
      const choicesEditor = el("div", "choices-editor");
      const choicesBox = el("textarea");
      choicesBox.id = "choicesBox-" + p.pid;
      choicesBox.spellcheck = false;
      choicesBox.setAttribute("aria-label", "Choices of poll: " + p.title);
      choicesBox.value = [...p.choices].sort((a, b) => a.position - b.position).map((c) => c.label).join("\n");
      const gutter = el("div", "choices-gutter");
      const counter = el("div", "choices-count");
      const countValue = el("b");
      const countNumber = el("span", null, "0");
      countValue.appendChild(countNumber);
      counter.append(countValue, document.createTextNode(" / " + runtime.maxChoices + " lines"));
      gutter.appendChild(counter);
      choicesEditor.append(choicesBox, gutter);
      const choicesError = el("p", "admin-field-error");
      choicesSection.append(choicesEditor, choicesError);

      const mechanicsRow = el("div", "admin-field-row admin-field-row--mechanics");
      mechanicsRow.append(
        radioGroup("choiceMode", "Choice Mode", CHOICE_MODES, p.choiceMode, hasVotes,
                   (v) => markDirty("choiceMode", v)),
        radioGroup("voteMutability", "Vote Mutability", VOTE_MUTABILITIES, p.voteMutability, hasVotes,
                   (v) => markDirty("voteMutability", v)),
        radioGroup("pollVisibility", "Poll Visibility", POLL_VISIBILITIES, p.pollVisibility, hasVotes,
                   (v) => {
                     markDirty("pollVisibility", v);
                     applyVoterLimitAvailability(v);
                     showPrivateSettings(v !== "Public Poll");
                     if (v === "Public Poll") markDirty("voterCountLimit", null);
                   })
      );
      const sharingModeGroup = radioGroup("pollSharingMode", "Sharing Mode", POLL_SHARING_MODES,
                                          p.pollSharingMode, hasVotes, (v) => markDirty("pollSharingMode", v));
      const anonymityGroup = radioGroup("voteAnonymity", "Anonymous Votes", VOTE_ANONYMITIES,
                                        p.voteAnonymity, hasVotes, (v) => markDirty("voteAnonymity", v));
      function showPrivateSettings(shown) {
        sharingModeGroup.hidden = !shown;
        anonymityGroup.hidden = !shown;
      }
      mechanicsRow.append(sharingModeGroup, anonymityGroup);
      showPrivateSettings(p.pollVisibility !== "Public Poll");

      const voterLimitField = el("section", "admin-field admin-field--inline");
      const voterLimitLabel = el("label", null, "Voter Count Limit");
      voterLimitLabel.setAttribute("for", "voterCountLimit-" + p.pid);
      const voterCountLimit = el("input");
      voterCountLimit.type = "number";
      voterCountLimit.id = "voterCountLimit-" + p.pid;
      voterCountLimit.min = "1";
      voterCountLimit.max = String(runtime.privateVoterLimit);
      voterCountLimit.value = p.voterCountLimit ?? "";
      voterCountLimit.setAttribute("aria-label", "Voter count limit of poll: " + p.title);
      const voterLimitHint = el("span", "admin-field-hint");
      const voterLimitError = el("p", "admin-field-error");
      voterLimitField.append(voterLimitLabel, voterCountLimit, voterLimitHint, voterLimitError);

      const dateRow = el("div", "admin-field-row");
      const startField = el("div", "admin-field");
      const startLabel = el("label", null, "Start");
      startLabel.setAttribute("for", "startAt-" + p.pid);
      const startAt = el("input");
      startAt.type = "datetime-local";
      startAt.id = "startAt-" + p.pid;
      startAt.value = toLocalInputValue(p.startAt);
      startAt.setAttribute("aria-label", "Start of poll: " + p.title);
      startField.append(startLabel, startAt);
      const endField = el("div", "admin-field");
      const endLabel = el("label", null, "End");
      endLabel.setAttribute("for", "endAt-" + p.pid);
      const endAt = el("input");
      endAt.type = "datetime-local";
      endAt.id = "endAt-" + p.pid;
      endAt.value = toLocalInputValue(p.endAt);
      endAt.setAttribute("aria-label", "End of poll: " + p.title);
      endField.append(endLabel, endAt);
      dateRow.append(startField, endField);
      const scheduleError = el("p", "admin-field-error");

      const stateRow = el("div", "card-state-buttons");
      stateRow.hidden = true;

      const rosters = el("div", "card-rosters");

      editable = {
        publish, cancel, publishError, title: title.box, subtitle: subtitle.box,
        choicesBox, choicesCounter: counter, choicesCount: countNumber, choicesError,
        voterLimitField, voterCountLimit, voterLimitHint, voterLimitError,
        startAt, endAt, scheduleError, rosters
      };

      title.box.addEventListener("input", () => markDirty("title", title.box.value));
      subtitle.box.addEventListener("input", () => markDirty("subtitle", subtitle.box.value));
      wireChoicesBox(choicesBox, {
        setError: (message) => { choicesError.textContent = message; },
        onInput: () => {
          choicesDirty = true;
          markDirty("labels", choicesBoxLines());
          refreshChoicesState();
        },
        onBlur: refreshChoicesState
      });

      const pushVoterLimit = () => {
        const raw = voterCountLimit.value.trim();
        markDirty("voterCountLimit", raw === "" ? null : raw);
        if (raw === "") {
          voterLimitError.textContent = "";
          return;
        }
        const n = Number(raw);
        voterLimitError.textContent = Number.isInteger(n) && n >= 1 && n <= runtime.privateVoterLimit
          ? ""
          : `Enter a whole number between 1 and ${runtime.privateVoterLimit}, ` +
            `or leave blank for ${runtime.privateVoterLimit}.`;
      };
      voterCountLimit.addEventListener("input", pushVoterLimit);
      voterCountLimit.addEventListener("change", pushVoterLimit);

      for (const [input, field] of [[startAt, "startAt"], [endAt, "endAt"]]) {
        input.addEventListener("change", () => {
          markDirty(field, input.value ? new Date(input.value).toISOString() : null);
          checkSchedule();
        });
      }

      publish.addEventListener("click", () => {
        if (checkSchedule()) void savePoll();
      });
      cancel.addEventListener("click", () => {
        if (!dirty || confirmDiscard()) void cancelEdit();
      });

      const body = el("div", "card-body");
      const left = el("div", "card-column");
      left.append(title.section, subtitle.section, choicesSection);
      const right = el("div", "card-column");
      right.append(dateRow, scheduleError, mechanicsRow, voterLimitField, stateRow);
      body.append(left, right);

      card.replaceChildren(status, header, publishError, body, rosters);
      applyVoterLimitAvailability(p.pollVisibility);
      refreshChoicesState();
      renderRosters();
      title.box.focus();
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
      editable = null;
      draft = {};
      dirty = false;
      choicesDirty = false;
      scheduleInverted = false;
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

    // `step` is the Summary Text part's step: the wizard opens there (REQUIREMENT021).
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
      if (isWizardPoll()) {
        mode = "WIZARD";
        openWizardState();
        if (step) {
          wizard.step = step;
          wizard.visited.add(step);
        }
        dirty = false;
        deps.onEditStart(current.pid);
        renderWizard();
        startHeartbeat();
        return;
      }
      mode = "EDITING";
      deps.onEditStart(current.pid);
      renderEditing();
      startHeartbeat();
    }

    async function savePoll() {
      editable.publishError.textContent = "";
      const payload = { ...draft, clientGuid: session.clientGuid };
      let res;
      let body = {};
      try {
        res = await fetch(pollUrl("/publish"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        body = await res.json().catch(() => ({}));
      } catch {
        editable.publishError.textContent = "Could not publish.";
        return;
      }
      if (!res.ok) {
        editable.publishError.textContent = body.error || "Could not publish.";
        return;
      }
      const message = body.message || "";
      sessionLost = true;
      resetEditState();
      deps.onEditEnd(current.pid);
      await deps.refresh({ focusPid: current.pid, message });
    }

    async function cancelEdit() {
      await releaseSession();
      resetEditState();
      deps.onEditEnd(current.pid);
      await deps.refresh({ focusPid: current.pid });
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
      releaseSession
    };
  }

  window.AdminCard = { create, setRuntimeConfig, sanitizeChoicesText, runtime };
})();
