/**
 * REQUIREMENT001 harness: stands in for src/public/adminList.js on
 * admin-cards.html. It mounts two poll-admin-cards from fixture polls, answers
 * the card's /api/admin/polls/<pid>/… calls with a fake fetch, and opens the new
 * poll's wizard (REQUIREMENT006) through the same POST /edit-session path the real
 * page uses. adminCard.js is this folder's copy, changed by REQUIREMENT003 and
 * REQUIREMENT006.
 *
 * Nothing leaves the page: every action shows a note on the card's status line
 * and logs to the console.
 */
(function () {
  "use strict";

  const HOUR = 3600 * 1000;
  const DAY = 24 * HOUR;
  const now = Date.now();
  const iso = (ms) => new Date(ms).toISOString();

  function choices(labels) {
    return labels.map((label, position) => ({ id: "c" + (position + 1), label, position }));
  }

  // ── fixture polls ─────────────────────────────────────────────────────────
  // Each poll is the admin list row (adminListRow in src/routes/pollsApi.ts:
  // fields + capabilitiesFor) plus the lists the edit-session detail carries.

  const polls = [
    {
      // Read-only card: Private, Anyone With The Link, OPEN, 5 choices, with votes.
      pid: "3f6c1a52-8e7d-4b1a-9c2e-5a1f0d7b9e41",
      title: "Where should we hold the family reunion this summer?",
      subtitle: "Pick the spot that works best for your household.",
      pollState: "OPEN",
      createdAt: iso(now - 9 * DAY),
      launchedAt: iso(now - 7 * DAY),
      startAt: null,
      endAt: iso(now + 14 * DAY),
      pollRejectionReason: null,
      pollApprovalTimestamp: iso(now - 7 * DAY),
      pollAcceptabilityScreeningAttempts: 1,
      hasEverBeenVotedOn: true,
      pollVisibility: "Private Poll",
      pollSharingMode: "Anyone With The Link",
      voteAnonymity: "No",
      choices: choices([
        "Grandma's farm in Vermont",
        "Lake cabin at Moosehead",
        "Cape Cod rental house",
        "Aunt Linda's backyard",
        "Campground at Acadia"
      ]),
      choiceMode: "Single-Choice Poll",
      voteMutability: "Dynamic-Vote Poll",
      voterCountLimit: 50,
      voteCount: 23,
      invitationCount: 0,
      bannedVoterCount: 0,
      // capabilitiesFor(OPEN, voted): UPDATE mode, Close only.
      canEdit: false,
      canUpdate: true,
      canOpen: false,
      canClose: true,
      canArchive: false,
      canDelete: false,
      canRescreen: false,
      invitedVoterList: [],
      bannedVoterList: [],
      voted: [
        { emailAddress: "maria.alvarez@example.com", userName: "Maria" },
        { emailAddress: "tom.nguyen@example.com", userName: "Tom" },
        { emailAddress: "priya.shah@example.com", userName: "" }
      ]
    },
    {
      // Edit-mode card: Private, Invitation Only, WAITING TO OPEN,
      // 12 invited (the roster pages at 10) and 2 banned.
      pid: "b8e2d4f7-1c3a-4e5b-8f6d-2a9c7e1b3d50",
      title: "Which Saturday works for the neighborhood cleanup?",
      subtitle: "Invitation only — one vote per household.",
      pollState: "WAITING TO OPEN",
      createdAt: iso(now - 2 * DAY),
      launchedAt: null,
      startAt: iso(now + 3 * DAY),
      endAt: iso(now + 10 * DAY),
      pollRejectionReason: null,
      pollApprovalTimestamp: iso(now - 1 * DAY),
      pollAcceptabilityScreeningAttempts: 1,
      hasEverBeenVotedOn: false,
      pollVisibility: "Private Poll",
      pollSharingMode: "Invitation Only",
      voteAnonymity: "Yes",
      choices: choices(["October 4", "October 11", "October 18", "October 25"]),
      choiceMode: "Multiple-Choice Poll",
      voteMutability: "Final-Vote Poll",
      voterCountLimit: null,
      voteCount: 0,
      invitationCount: 12,
      bannedVoterCount: 2,
      // capabilitiesFor(WAITING TO OPEN, never voted): EDIT mode, Open and Close.
      canEdit: true,
      canUpdate: false,
      canOpen: true,
      canClose: true,
      canArchive: false,
      canDelete: false,
      canRescreen: false,
      invitedVoterList: [
        "alice.moreno@example.com", "ben.carter@example.com", "chloe.kim@example.com",
        "david.okafor@example.com", "emma.rossi@example.com", "farid.haddad@example.com",
        "grace.liu@example.com", "henry.walsh@example.com", "isabel.fernandes@example.com",
        "jamal.brooks@example.com", "keiko.tanaka@example.com", "liam.obrien@example.com"
      ],
      bannedVoterList: ["spam.account@example.com", "noisy.neighbor@example.com"],
      voted: []
    },
    {
      // REQUIREMENT003: a poll just made by Create New Poll. cardType "new" makes
      // adminCard.js draw the blank new-poll card. The values are createDefaultPoll's
      // (src/polls/service.ts), except that it starts as a Private Poll. They are
      // carried for later requirements, not shown yet.
      cardType: "new",
      pid: "5d0a7c3e-2b9f-4f61-a8d4-7e3c1b6f9a28",
      title: "New Poll " + iso(now).slice(0, 19).replace("T", " "),
      subtitle: "",
      pollState: "INITIALIZED",
      createdAt: iso(now),
      launchedAt: null,
      startAt: null,
      endAt: null,
      pollRejectionReason: null,
      pollApprovalTimestamp: null,
      pollAcceptabilityScreeningAttempts: 0,
      hasEverBeenVotedOn: false,
      pollVisibility: "Private Poll",
      pollSharingMode: "Anyone With The Link",
      voteAnonymity: "Yes",
      choices: choices(["Choice 1", "Choice 2"]),
      choiceMode: "Single-Choice Poll",
      voteMutability: "Dynamic-Vote Poll",   // REQUIREMENT016: createDefaultPoll's new default
      voterCountLimit: null,
      voteCount: 0,
      invitationCount: 0,
      bannedVoterCount: 0,
      // capabilitiesFor(INITIALIZED, never voted): EDIT mode and Delete.
      canEdit: true,
      canUpdate: false,
      canOpen: false,
      canClose: false,
      canArchive: false,
      canDelete: true,
      canRescreen: false,
      invitedVoterList: [],
      bannedVoterList: [],
      voted: []
    }
  ];

  const byPid = new Map(polls.map((p) => [p.pid, p]));

  // The list row the card is built from: everything but the edit-session lists.
  function listRow(poll) {
    const { invitedVoterList: _i, bannedVoterList: _b, voted: _v, ...row } = poll;
    return row;
  }

  // The edit-session detail (buildAdminPollDetail): the poll with its rosters.
  function detail(poll) {
    const { voted: _v, ...rest } = poll;
    return rest;
  }

  // ── fake fetch for /api/admin/polls/<pid>/… ────────────────────────────────

  function json(body, status) {
    return Promise.resolve(new Response(JSON.stringify(body), {
      status: status || 200,
      headers: { "Content-Type": "application/json" }
    }));
  }

  window.fetch = function (url, init) {
    const method = ((init && init.method) || "GET").toUpperCase();
    const match = /^\/api\/admin\/polls\/([^/]+)(\/.*)?$/.exec(String(url));
    const poll = match && byPid.get(decodeURIComponent(match[1]));
    const route = match ? match[2] || "" : "";
    console.info("[harness] fetch", method, url, init && init.body ? JSON.parse(init.body) : "");
    if (!poll) return json({ error: "Not found" }, 404);

    if (route === "/edit-session" && method === "POST") {
      return json({ granted: true, mode: poll.hasEverBeenVotedOn ? "UPDATE" : "EDIT", poll: detail(poll) });
    }
    if (route === "/edit-session/heartbeat") return json({ alive: true });
    if (route === "/edit-session" && method === "DELETE") return json({});
    if (route === "/results") return json({ voted: poll.voted });
    // REQUIREMENT006: the new poll's wizard. Save keeps its answers (still
    // INITIALIZED); Publish sends it to screening, as the server would.
    const fields = init && init.body ? JSON.parse(init.body) : {};
    const keep = () => {
      // REQUIREMENT009: Step 2 adds subtitle and keywords (public polls only); an
      // empty title is not kept, so the card never shows a blank title.
      for (const name of ["pollVisibility", "pollSharingMode", "subtitle", "keywords", "voteAnonymity"]) {
        if (typeof fields[name] === "string") poll[name] = fields[name];
      }
      if (typeof fields.title === "string" && fields.title) poll.title = fields.title;
      if (fields.pollVisibility === "Private Poll") poll.keywords = "";
      // REQUIREMENT013: Step 3's choices, as the poll's choice list.
      if (Array.isArray(fields.labels) && fields.labels.length) poll.choices = choices(fields.labels);
      // REQUIREMENT015: Step 4. choiceMode and voteMutability verbatim, plus the new range.
      for (const name of ["choiceMode", "voteMutability"]) {
        if (typeof fields[name] === "string") poll[name] = fields[name];
      }
      for (const name of ["minSelections", "maxSelections"]) {
        if (Number.isInteger(fields[name])) poll[name] = fields[name];
      }
      // REQUIREMENT018: Step 5. null is "immediately" / "no end date".
      for (const name of ["startAt", "endAt"]) {
        if (fields[name] === null || typeof fields[name] === "string") poll[name] = fields[name];
      }
    };
    if (route === "/save") {
      keep();
      return json({ message: "Saved: you can finish later (sample only: nothing was sent)." });
    }
    if (route === "/publish") {
      if (poll.cardType === "new") {
        keep();
        Object.assign(poll, {
          pollState: "AWAITING APPROVAL",
          pollApprovalTimestamp: null,
          // Prototype only (REQUIREMENT006 F4): the summary opens the old edit face after
          // Publish. The real server refuses editing while AWAITING APPROVAL.
          canEdit: true,
          canDelete: false
        });
        return json({ message: "Published: waiting for approval (sample only: nothing was sent)." });
      }
      return json({ message: "Saved (sample only: nothing was sent)." });
    }
    return json({ error: "Not handled by the harness" }, 404);
  };

  // ── the actions menu (copied from adminList.js) ────────────────────────────

  let openMenu = null;

  function closeMenu() {
    if (!openMenu) return;
    const { trigger, menu } = openMenu;
    menu.hidden = true;
    trigger.setAttribute("aria-expanded", "false");
    menu.classList.remove("actions-menu--flip-up", "actions-menu--flip-left");
    openMenu = null;
  }

  function positionMenu(trigger, menu) {
    const triggerRect = trigger.getBoundingClientRect();
    const menuRect = menu.getBoundingClientRect();
    let left = triggerRect.right - menuRect.width;
    let top = triggerRect.bottom + 4;
    let flipUp = false;
    let flipLeft = false;
    if (top + menuRect.height > window.innerHeight) {
      top = triggerRect.top - 4 - menuRect.height;
      flipUp = true;
    }
    if (left < 0) {
      left = triggerRect.left;
      flipLeft = true;
    }
    menu.style.top = top + "px";
    menu.style.left = left + "px";
    menu.classList.toggle("actions-menu--flip-up", flipUp);
    menu.classList.toggle("actions-menu--flip-left", flipLeft);
  }

  function openMenuFor(trigger, menu) {
    if (openMenu && openMenu.menu !== menu) closeMenu();
    menu.hidden = false;
    trigger.setAttribute("aria-expanded", "true");
    positionMenu(trigger, menu);
    openMenu = { trigger, menu };
    const first = menu.querySelector('[role="menuitem"]');
    if (first) first.focus();
  }

  function toggleMenu(trigger, menu) {
    if (openMenu && openMenu.menu === menu) {
      closeMenu();
      trigger.focus();
    } else {
      openMenuFor(trigger, menu);
    }
  }

  function selectItem() {
    const trigger = openMenu && openMenu.trigger;
    closeMenu();
    if (trigger) trigger.focus();
  }

  document.addEventListener("click", (event) => {
    if (!openMenu) return;
    if (openMenu.menu.contains(event.target) || openMenu.trigger.contains(event.target)) return;
    closeMenu();
  });

  document.addEventListener("keydown", (event) => {
    if (!openMenu) return;
    if (event.key === "Escape") {
      event.preventDefault();
      const trigger = openMenu.trigger;
      closeMenu();
      trigger.focus();
      return;
    }
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    const items = Array.from(openMenu.menu.querySelectorAll('[role="menuitem"]'));
    const currentIndex = items.indexOf(document.activeElement);
    if (currentIndex === -1) return;
    event.preventDefault();
    const delta = event.key === "ArrowDown" ? 1 : -1;
    items[(currentIndex + delta + items.length) % items.length].focus();
  });

  // ── the cards ──────────────────────────────────────────────────────────────

  const controllers = new Map();
  let editingPid = null;

  function note(poll, message) {
    selectItem();
    console.info("[harness]", message, poll.pid);
    const controller = controllers.get(poll.pid);
    if (controller) controller.showStatus(message + " (sample only: no action taken)");
  }

  function redrawIdleCards() {
    for (const controller of controllers.values()) {
      if (!controller.isEditing()) controller.update(listRow(byPid.get(controller.pid)));
    }
  }

  const deps = {
    now: () => Date.now(),
    isLatched: () => editingPid !== null,
    onEditStart: (pid) => {
      editingPid = pid;
      redrawIdleCards();
    },
    onEditEnd: (pid) => {
      if (editingPid === pid) editingPid = null;
      redrawIdleCards();
    },
    refresh: async ({ focusPid, message } = {}) => {
      redrawIdleCards();
      const controller = focusPid && controllers.get(focusPid);
      if (controller) {
        if (message) controller.showStatus(message);
        controller.focusSummary();
      }
    },
    onDuplicate: (poll) => note(poll, "Duplicate Poll"),
    onCopyLink: (poll) => note(poll, "Copy Poll Link"),
    onRescreen: (poll) => note(poll, "Re-attempt Screening"),
    onDelete: (poll) => note(poll, "Delete Poll"),
    onArchive: (poll) => note(poll, "Archive Poll"),
    onState: (poll, target) => note(poll, "Change state to " + target),
    onMenuToggle: toggleMenu,
    // The Copy link button's origin: a page opened from disk has none of its own.
    origin: () => (location.protocol === "file:" ? "https://crowdpoll.example" : location.origin)
  };

  // View Results links point at /admin/poll/results, which is not part of this copy.
  document.addEventListener("click", (event) => {
    const link = event.target.closest && event.target.closest('a[href^="/admin/"]');
    if (!link) return;
    event.preventDefault();
    const card = link.closest(".poll-admin-card");
    const poll = card && byPid.get(card.dataset.pid);
    if (poll) note(poll, "View Results");
  });

  function start() {
    window.AdminCard.setRuntimeConfig({
      privateVoterLimitDefault: 500,
      participantsViewportSize: 10,
      minChoices: 2,
      maxChoices: 50
    });
    const list = document.getElementById("pollList");
    // A new poll is the newest, so it is listed first, as on the admin page's
    // Newest view. The other cards keep their order.
    const shown = [...polls.filter((p) => p.cardType === "new"), ...polls.filter((p) => p.cardType !== "new")];
    for (const poll of shown) {
      const controller = window.AdminCard.create(listRow(poll), deps);
      controllers.set(poll.pid, controller);
      list.appendChild(controller.element);
    }
    // REQUIREMENT006: the new poll opens in its wizard, as a click would: since
    // REQUIREMENT021, a tap on its Summary Text's Step 1 part (there is no pen). The
    // other cards' parts are plain until the wizard closes (one card at a time); then
    // a tap opens the old edit face.
    const first = controllers.get(polls.find((p) => p.cardType === "new").pid).element
      .querySelector(".wizard-summary-who .wizard-summary-link");
    first.click();
    setTimeout(() => window.scrollTo(0, 0), 0);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
