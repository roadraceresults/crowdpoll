/**
 * admin.html logic: the view tabs (Newest, Awaiting Approval, Rejected, Search —
 * FIX010), the poll card list of the view on screen and its periodic refresh,
 * the shared actions-menu behaviour, and Create New Poll.
 */
(function () {
  "use strict";

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

  const controllers = new Map();
  let editingPid = null;

  function cardFor(pid) {
    const controller = controllers.get(pid);
    return controller ? controller.element : null;
  }

  function reportOnCard(poll, message) {
    const controller = controllers.get(poll.pid);
    if (controller) controller.showStatus(message);
  }

  function editingController() {
    return editingPid ? controllers.get(editingPid) : null;
  }

  async function actDuplicate(poll) {
    selectItem();
    const res = await fetch("/api/admin/polls/" + encodeURIComponent(poll.pid) + "/duplicate", { method: "POST" });
    if (res.ok) loadList();
    else reportOnCard(poll, "Could not duplicate this poll.");
  }

  function actCopyLink(poll) {
    selectItem();
    navigator.clipboard.writeText(location.origin + "/?PID=" + encodeURIComponent(poll.pid));
  }

  async function actRescreen(poll) {
    selectItem();
    const res = await fetch("/api/admin/polls/" + encodeURIComponent(poll.pid) + "/rescreen", { method: "POST" });
    if (res.ok) loadList();
    else reportOnCard(poll, "Could not re-attempt screening for this poll.");
  }

  async function actDelete(poll) {
    selectItem();
    if (!window.confirm("Are you sure you want to delete this poll?")) return;
    const res = await fetch("/api/admin/polls/" + encodeURIComponent(poll.pid), { method: "DELETE" });
    if (res.ok) loadList();
    else reportOnCard(poll, "Could not delete this poll.");
  }

  async function actArchive(poll) {
    selectItem();
    if (!window.confirm("Archive this poll? This cannot be undone.")) return;
    await changeState(poll, "ARCHIVED");
  }

  async function changeState(poll, target, button) {
    if (target === "ARCHIVED" && button && !window.confirm("Archive this poll? Archiving cannot be undone.")) {
      return;
    }
    if (button) button.disabled = true;
    const res = await fetch("/api/admin/polls/" + encodeURIComponent(poll.pid), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pollState: target, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone })
    });
    if (res.ok) {
      loadList();
      return;
    }
    const body = await res.json().catch(() => ({}));
    reportOnCard(poll, body.error || "Could not change this poll's state.");
    if (button) button.disabled = false;
  }

  /* Create and the other views are held while a card is being edited: the draft
     lives in that card's DOM, which a view change would replace. */
  const HELD_TITLE = "Finish editing the open poll first";

  function refreshCreateButton() {
    const editing = editingPid !== null;
    const createBtn = document.getElementById("createPollBtn");
    if (createBtn) createBtn.disabled = editing;
    document.querySelectorAll("#adminTabBar .tab").forEach((btn) => {
      const held = editing && btn.dataset.tab !== activeTab;
      btn.disabled = held;
      btn.title = held ? HELD_TITLE : "";
    });
    for (const result of resultRows.values()) holdResult(result, editing);
    document.querySelectorAll("#adminSearchForm .admin-search-btn, #adminSearchClear").forEach((btn) => {
      btn.disabled = editing;
      btn.title = editing ? HELD_TITLE : "";
    });
  }

  const deps = {
    now: () => Date.now(),
    isLatched: () => editingPid !== null,
    onEditStart: (pid) => {
      editingPid = pid;
      refreshCreateButton();
      redrawIdleCards();
    },
    onEditEnd: (pid) => {
      if (editingPid === pid) editingPid = null;
      refreshCreateButton();
      redrawIdleCards();
    },
    refresh: (options) => loadList(options),
    onDuplicate: actDuplicate,
    onCopyLink: actCopyLink,
    onRescreen: actRescreen,
    onDelete: actDelete,
    onArchive: actArchive,
    onState: (poll, target, button) => changeState(poll, target, button),
    onMenuToggle: toggleMenu
  };

  function redrawIdleCards() {
    for (const controller of controllers.values()) {
      if (!controller.isEditing()) controller.update(controller.poll);
    }
  }

  // Reconcile the list in place instead of replaceChildren(): detaching a card
  // blurs whatever is focused inside it, which would kick the admin out of the
  // field they are typing in on every refresh tick while a card is in Edit mode.
  // Cards already in position are left alone; if the editing card still has to
  // move, focus (and the caret) is put back where it was.
  function syncChildren(container, nextOrder) {
    const active = document.activeElement;
    const caret = active && "selectionStart" in active
      ? { start: active.selectionStart, end: active.selectionEnd, dir: active.selectionDirection }
      : null;

    for (const child of Array.from(container.children)) {
      if (!nextOrder.includes(child)) child.remove();
    }
    nextOrder.forEach((node, i) => {
      if (container.children[i] !== node) container.insertBefore(node, container.children[i] || null);
    });

    if (active && container.contains(active) && document.activeElement !== active) {
      active.focus({ preventScroll: true });
      if (caret && caret.start !== null) {
        try { active.setSelectionRange(caret.start, caret.end, caret.dir || "none"); } catch { /* non-text input */ }
      }
    }
  }

  /* Disclosure pattern: https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/ */
  const resultRows = new Map();
  let openPid = null;
  const RESULT_HEADING = ["title", "subtitle"];
  const RESULT_FACTS = ["visibility", "state", "creator", "voters"];

  function resultTitle(poll) {
    return (poll.title || "").trim() || "(untitled)";
  }

  function resultVisibility(poll) {
    if (poll.pollVisibility !== "Private Poll") return "Public";
    return poll.pollSharingMode === "Invitation Only" ? "Private (invitation)" : "Private (shared link)";
  }

  function resultCreated(poll) {
    if (!poll.createdAt) return "";
    return new Date(poll.createdAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  }

  function resultCreator(poll) {
    const creator = poll.createdByName || poll.createdByEmail || "";
    const created = resultCreated(poll);
    if (!creator) return created && "Created on " + created;
    return "Created by: " + creator + (created && " on " + created);
  }

  function resultVoters(poll) {
    const count = Number(poll.voteCount) || 0;
    return count.toLocaleString() + (count === 1 ? " voter" : " voters");
  }

  function resultChevron() {
    const SVG = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(SVG, "svg");
    svg.setAttribute("class", "admin-result-chevron");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");
    const path = document.createElementNS(SVG, "path");
    path.setAttribute("d", "m6 9 6 6 6-6");
    svg.appendChild(path);
    return svg;
  }

  function holdResult(result, held) {
    result.button.disabled = held;
    const title = held ? HELD_TITLE : resultTitle(result.poll);
    if (result.shownTitle !== title) {
      result.shownTitle = title;
      result.button.title = title;
    }
  }

  function paintResult(result) {
    const texts = {
      title: resultTitle(result.poll),
      subtitle: (result.poll.subtitle || "").trim(),
      visibility: resultVisibility(result.poll),
      state: "Poll state: " + result.poll.pollState,
      creator: resultCreator(result.poll),
      voters: resultVoters(result.poll)
    };
    for (const name of Object.keys(texts)) {
      if (result.cells[name].textContent !== texts[name]) result.cells[name].textContent = texts[name];
    }
    holdResult(result, editingPid !== null);
  }

  function resultCells(className, names, cells) {
    const group = document.createElement("span");
    group.className = className;
    for (const name of names) {
      cells[name] = document.createElement("span");
      cells[name].className = "admin-result-" + name;
      group.appendChild(cells[name]);
    }
    return group;
  }

  function createResult(poll) {
    const element = document.createElement("div");
    element.className = "admin-result";
    element.dataset.pid = poll.pid;
    const panel = document.createElement("div");
    panel.className = "admin-result-panel";
    panel.id = "admin-result-panel-" + poll.pid;
    panel.hidden = true;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "admin-result-row";
    button.setAttribute("aria-expanded", "false");
    button.setAttribute("aria-controls", panel.id);
    const cells = {};
    const main = document.createElement("span");
    main.className = "admin-result-main";
    main.append(
      resultCells("admin-result-heading", RESULT_HEADING, cells),
      resultCells("admin-result-facts", RESULT_FACTS, cells)
    );
    button.append(main, resultChevron());
    button.addEventListener("click", () => toggleResult(poll.pid));
    element.append(button, panel);
    const result = { element, button, panel, cells, poll, shownTitle: null };
    paintResult(result);
    return result;
  }

  function closeResult() {
    if (openPid === null) return;
    const controller = controllers.get(openPid);
    if (controller) {
      controller.element.remove();
      if (!controller.hasSavedProgress()) controllers.delete(openPid);
    }
    const result = resultRows.get(openPid);
    if (result) {
      result.panel.hidden = true;
      result.button.setAttribute("aria-expanded", "false");
      result.element.classList.remove("admin-result--open");
    }
    openPid = null;
  }

  function openResult(pid) {
    const result = resultRows.get(pid);
    if (!result) return;
    if (openPid !== pid) closeResult();
    let controller = controllers.get(pid);
    if (!controller) {
      controller = window.AdminCard.create(result.poll, deps);
      controller.poll = result.poll;
      controllers.set(pid, controller);
    }
    result.panel.appendChild(controller.element);
    result.panel.hidden = false;
    result.button.setAttribute("aria-expanded", "true");
    result.element.classList.add("admin-result--open");
    openPid = pid;
  }

  function revealRow(row) {
    const box = row.getBoundingClientRect();
    const chromeBottom = parseFloat(getComputedStyle(row).scrollMarginTop) || 0;
    if (box.top < chromeBottom || box.bottom > window.innerHeight) row.scrollIntoView({ block: "start" });
  }

  function toggleResult(pid) {
    if (editingPid !== null) return;
    if (openPid === pid) {
      closeResult();
      return;
    }
    openResult(pid);
    revealRow(resultRows.get(pid).button);
  }

  function forgetResults() {
    resultRows.clear();
    openPid = null;
  }

  function updateOpenCard(poll) {
    const controller = controllers.get(poll.pid);
    if (!controller || controller.isEditing()) return;
    controller.poll = poll;
    controller.update(poll);
  }

  // The result of the poll being edited stays where it is when the search stops returning it.
  function keepEditingResult(container, nextOrder) {
    const result = resultRows.get(editingPid);
    const index = Array.prototype.indexOf.call(container.children, result.element);
    nextOrder.splice(Math.min(Math.max(index, 0), nextOrder.length), 0, result.element);
  }

  function resultElements(container, polls) {
    const nextOrder = [];
    const seen = new Set();
    for (const poll of polls) {
      seen.add(poll.pid);
      let result = resultRows.get(poll.pid);
      if (result) {
        result.poll = poll;
        paintResult(result);
      } else {
        result = createResult(poll);
        resultRows.set(poll.pid, result);
      }
      if (poll.pid === openPid) updateOpenCard(poll);
      nextOrder.push(result.element);
    }
    for (const pid of [...resultRows.keys()]) {
      if (seen.has(pid)) continue;
      if (pid === editingPid) {
        keepEditingResult(container, nextOrder);
        continue;
      }
      if (pid === openPid) closeResult();
      resultRows.delete(pid);
    }
    return nextOrder;
  }

  function cardElements(polls) {
    const nextOrder = [];
    for (const poll of polls) {
      // A card being edited keeps its element and ignores its row entirely: the
      // server reports the poll as EDITING with every capability false, and the
      // draft lives in the DOM this would otherwise replace.
      if (poll.pid === editingPid) {
        nextOrder.push(controllers.get(poll.pid).element);
        continue;
      }
      let controller = controllers.get(poll.pid);
      if (controller && !controller.isEditing()) {
        controller.poll = poll;
        controller.update(poll);
      } else {
        controller = window.AdminCard.create(poll, deps);
        controller.poll = poll;
        controllers.set(poll.pid, controller);
      }
      nextOrder.push(controller.element);
    }
    return nextOrder;
  }

  /*
    017: the structured search narrows the list to the polls matching every filled-in
    control; the list keeps its own periodic refresh, which re-runs the active search.
    Dates are sent with the administrator's zone so a calendar day means their day.
  */
  let activeSearch = null;

  function readSearchForm(form) {
    const params = new URLSearchParams();
    const data = new FormData(form);
    for (const name of ["q", "state", "visibility", "choiceMode", "voteMutability", "lineGraphEnabled", "customColors", "createdBy"]) {
      const value = String(data.get(name) || "").trim();
      if (value) params.set(name, value);
    }
    let anyDate = false;
    for (const name of ["createdAt", "startAt", "endAt"]) {
      const day = String(data.get(name) || "").trim();
      if (!day) continue;
      anyDate = true;
      params.set(name, String(data.get(name + "Op") || "eq") + ":" + day);
    }
    if (anyDate) params.set("tz", Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC");
    for (const name of ["voteCount", "invitedVoterCount", "bannedVoterCount"]) {
      const n = String(data.get(name) || "").trim();
      if (n !== "") params.set(name, String(data.get(name + "Op") || "gte") + ":" + n);
    }
    return [...params.keys()].length > 0 ? params : null;
  }

  /*
    FIX010: the views. Each has its own request and its own empty and cut-off
    messages; the list on screen is always the active view's. The Search view
    asks nothing until a search has been submitted.
  */
  const TAB_KEY = "admin:tab";
  const VIEWS = {
    newest: {
      url: () => "/api/admin/polls",
      empty: "No polls yet.",
      cutOff: (n) => "Only the newest " + n + " polls are shown. Use Search to find others."
    },
    awaiting: {
      url: () => "/api/admin/polls/search?" + new URLSearchParams({ state: "AWAITING APPROVAL" }).toString(),
      empty: "No polls are awaiting approval.",
      cutOff: (n) => "Only the newest " + n + " polls awaiting approval are shown."
    },
    rejected: {
      url: () => "/api/admin/polls/search?" + new URLSearchParams({ state: "REJECTED" }).toString(),
      empty: "No rejected polls.",
      cutOff: (n) => "Only the newest " + n + " rejected polls are shown."
    },
    search: {
      url: () => (activeSearch ? "/api/admin/polls/search?" + activeSearch.toString() : null),
      empty: "No polls match.",
      count: (n) => (n === 1 ? "1 poll matches." : n + " polls match."),
      cutOff: () => "More polls match than are shown. Narrow the search."
    }
  };
  const CREATOR_VIEW = {
    url: () => "/api/admin/polls",
    empty: "You haven't created any polls yet.",
    cutOff: (n) => "Only your newest " + n + " polls are shown."
  };
  let activeTab = "newest";
  try {
    const remembered = sessionStorage.getItem(TAB_KEY);
    if (remembered && VIEWS[remembered]) activeTab = remembered;
  } catch {
    // storage unavailable: the page opens on Newest
  }

  function listUrl() {
    return VIEWS[activeTab].url();
  }

  function paintTabs() {
    document.querySelectorAll("#adminTabBar .tab").forEach((btn) => {
      btn.classList.toggle("is-active", btn.dataset.tab === activeTab);
    });
    paintSearchPanel();
    refreshCreateButton();
  }

  /*
    The search panel shows only in the Search view and can be collapsed by hand. It collapses by
    itself after a search the user ran has put results on screen, and stays open when nothing
    matched or the search failed so the filters can be changed. Collapsing is in memory only.
  */
  let searchCollapsed = false;

  function paintSearchPanel() {
    const form = document.getElementById("adminSearchForm");
    const toggle = document.getElementById("adminSearchToggle");
    if (!form || !toggle) return;
    const inSearch = activeTab === "search";
    form.hidden = !inSearch;
    toggle.parentElement.hidden = !inSearch;
    form.toggleAttribute("data-collapsed", searchCollapsed);
    toggle.setAttribute("aria-expanded", String(!searchCollapsed));
    toggle.firstElementChild.textContent = searchCollapsed ? "Expand Search" : "Collapse Search";
  }

  function setSearchCollapsed(collapsed) {
    searchCollapsed = collapsed;
    paintSearchPanel();
  }

  async function selectTab(name) {
    if (!VIEWS[name]) return;
    if (editingPid !== null && name !== activeTab) return;
    activeTab = name;
    try {
      sessionStorage.setItem(TAB_KEY, name);
    } catch {
      // not remembered, nothing else changes
    }
    paintTabs();
    showSearchNotice("");
    await loadList({ fresh: true });
  }

  function showSearchNotice(text) {
    const notice = document.getElementById("adminSearchNotice");
    if (!notice) return;
    notice.textContent = text;
    notice.hidden = !text;
  }

  // Forgets the cards of polls not in the view, except the one being edited and any
  // that holds a new poll's saved wizard progress, which must survive a view switch.
  function dropControllers(seen) {
    for (const [pid, controller] of [...controllers]) {
      if (!seen.has(pid) && pid !== editingPid && !controller.hasSavedProgress()) controllers.delete(pid);
    }
  }

  function emptyList() {
    if (editingPid !== null) return;
    forgetResults();
    dropControllers(new Set());
    syncChildren(document.getElementById("pollList"), []);
  }

  function noticeFor(view, count, truncated) {
    if (truncated) return view.cutOff(count);
    if (count === 0) return view.empty;
    return view.count ? view.count(count) : "";
  }

  // `fresh` is a search the administrator ran (Search, Clear, a view tab): only then may a
  // result be closed, or a single result opened, without a click on its row.
  async function loadList({ preserve = false, focusPid = null, message = "", fresh = false } = {}) {
    const menuPid = preserve && openMenu ? openMenu.trigger.closest(".poll-admin-card")?.dataset.pid : null;
    const scrollY = window.scrollY;
    if (!preserve) closeMenu();

    const inSearch = activeTab === "search";
    const view = VIEWS[activeTab];
    const url = view.url();
    if (!url) {
      // The Search view before a search: an empty list and no message.
      emptyList();
      showSearchNotice("");
      return;
    }
    const res = await fetch(url);
    if (!res.ok) {
      if (inSearch) {
        const body = await res.json().catch(() => ({}));
        showSearchNotice(body.error || "The search could not be run.");
        if (fresh) emptyList();
      }
      return;
    }
    const { polls, truncated } = await res.json();
    // FIX009/FIX010: every view is capped; it says so, and says when it is empty.
    showSearchNotice(noticeFor(view, polls.length, truncated));
    // SC-012 scale measurement: how many polls each refresh brings down.
    console.log(`[adminList] /admin received ${polls.length} polls`);

    const container = document.getElementById("pollList");
    if (inSearch) {
      if (fresh && editingPid === null) closeResult();
      syncChildren(container, resultElements(container, polls));
      dropControllers(new Set(openPid === null ? [] : [openPid]));
      if (fresh && editingPid === null && polls.length === 1) openResult(polls[0].pid);
    } else {
      forgetResults();
      const nextOrder = cardElements(polls);
      dropControllers(new Set(polls.map((poll) => poll.pid)));
      syncChildren(container, nextOrder);
    }

    if (focusPid) {
      const controller = controllers.get(focusPid);
      if (controller) {
        if (message) controller.showStatus(message);
        controller.focusSummary();
      }
    }

    if (menuPid) {
      // A menu whose trigger survived the redraw (an invitee row's) is still open.
      const kept = openMenu && openMenu.trigger.isConnected;
      const trigger = kept ? null : cardFor(menuPid)?.querySelector(".actions-menu-trigger");
      if (trigger) trigger.click();
      window.scrollTo(0, scrollY);
    }
  }

  async function loadRuntimeConfig() {
    let intervalMs = 5000;
    try {
      const res = await fetch("/api/config");
      if (res.ok) {
        const cfg = await res.json();
        window.AdminCard.setRuntimeConfig(cfg);
        intervalMs = cfg.pollAdminPageRefreshIntervalMs || intervalMs;
      }
    } catch {
      // Fall back to the documented defaults rather than not refreshing at all.
    }
    return intervalMs;
  }

  // 025 FIX10: every link that stays on the site (the back arrow, the banner, the
  // header and avatar menu links) asks with the in-page dialog; beforeunload is
  // left for what a page cannot intercept (reload, closing the tab, a typed address).
  function guardNavigation() {
    document.addEventListener("click", async (event) => {
      const link = event.target.closest && event.target.closest("a[href]");
      if (!link || event.defaultPrevented || event.button !== 0) return;
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      if (link.target && link.target !== "_self") return;
      if (link.getAttribute("href").startsWith("#")) return;
      const url = new URL(link.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      const backLink = link.classList.contains("admin-back-link");
      const controller = editingController();
      if (!controller && !backLink) return;
      event.preventDefault();
      if (controller && controller.isDirty() && !(await controller.confirmDiscard())) return;
      const leave = () => {
        if (backLink && window.SiteBack) window.SiteBack.leave(url.href);
        else window.location.assign(url.href);
      };
      if (controller) controller.releaseSession().then(leave);
      else leave();
    });
  }

  async function isAdministrator() {
    try {
      const res = await fetch("/api/me");
      if (!res.ok) return false;
      return (await res.json()).isAdmin === true;
    } catch {
      return false;
    }
  }

  // A poll creator who is not an administrator gets one list, their own polls, and
  // neither the views nor the search form, which the server refuses them anyway.
  function becomeCreatorView() {
    document.getElementById("adminTabBar")?.remove();
    document.getElementById("adminSearchForm")?.remove();
    document.getElementById("adminSearchToggle")?.parentElement.remove();
    VIEWS.newest = CREATOR_VIEW;
    activeTab = "newest";
  }

  function startAutoRefresh(intervalMs) {
    setInterval(() => void loadList({ preserve: true }), intervalMs);
  }

  document.addEventListener("DOMContentLoaded", async () => {
    const intervalMs = await loadRuntimeConfig();
    if (!(await isAdministrator())) becomeCreatorView();
    paintTabs();
    await loadList();
    guardNavigation();
    startAutoRefresh(intervalMs);
    document.getElementById("adminTabBar")?.addEventListener("click", (event) => {
      const btn = event.target.closest(".tab");
      if (!btn || btn.disabled) return;
      if (btn.dataset.tab === "search") setSearchCollapsed(false);
      void selectTab(btn.dataset.tab);
    });
    const searchForm = document.getElementById("adminSearchForm");
    if (searchForm) {
      window.M3Ripple?.add("#adminSearchForm .admin-search-btn, #adminSearchForm .admin-search-clear, #adminSearchToggle");
      window.M3Ripple?.add("#pollList .admin-result-row");
      document.getElementById("adminSearchToggle").addEventListener("click", () => setSearchCollapsed(!searchCollapsed));
      searchForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        if (editingPid !== null) return;
        activeSearch = readSearchForm(searchForm);
        await selectTab("search");
        if (document.querySelector("#pollList .admin-result")) setSearchCollapsed(true);
      });
      document.getElementById("adminSearchClear")?.addEventListener("click", () => {
        if (editingPid !== null) return;
        searchForm.reset();
        activeSearch = null;
        setSearchCollapsed(false);
        void selectTab("search");
      });
    }
    // Create New Poll works from any view: the new poll is the newest, so the page
    // moves to Newest, where the card is scrolled into view and opened for editing.
    document.getElementById("createPollBtn")?.addEventListener("click", async () => {
      if (editingPid !== null) return;
      const res = await fetch("/api/admin/polls", { method: "POST" });
      if (!res.ok) return;
      const { pid } = await res.json();
      await selectTab("newest");
      const controller = controllers.get(pid);
      if (!controller) return;
      controller.element.scrollIntoView({ block: "center" });
      controller.openWizard();
    });
  });
})();
