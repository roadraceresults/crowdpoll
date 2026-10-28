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
  function refreshCreateButton() {
    const createBtn = document.getElementById("createPollBtn");
    if (createBtn) createBtn.disabled = editingPid !== null;
    document.querySelectorAll("#adminTabBar .tab").forEach((btn) => {
      const held = editingPid !== null && btn.dataset.tab !== activeTab;
      btn.disabled = held;
      btn.title = held ? "Finish editing the open poll first" : "";
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

  /*
    017: the structured search narrows the list to the polls matching every filled-in
    control; the list keeps its own periodic refresh, which re-runs the active search.
    Dates are sent with the administrator's zone so a calendar day means their day.
  */
  let activeSearch = null;

  function readSearchForm(form) {
    const params = new URLSearchParams();
    const data = new FormData(form);
    for (const name of ["q", "state", "visibility", "choiceMode", "voteMutability", "createdBy"]) {
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
    await loadList();
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

  async function loadList({ preserve = false, focusPid = null, message = "" } = {}) {
    const openPid = preserve && openMenu ? openMenu.trigger.closest(".poll-admin-card")?.dataset.pid : null;
    const scrollY = window.scrollY;
    if (!preserve) closeMenu();

    const view = VIEWS[activeTab];
    const url = view.url();
    if (!url) {
      // The Search view before a search: an empty list and no message.
      if (editingPid === null) {
        dropControllers(new Set());
        syncChildren(document.getElementById("pollList"), []);
      }
      showSearchNotice("");
      return;
    }
    const res = await fetch(url);
    if (!res.ok) {
      if (activeTab === "search") {
        const body = await res.json().catch(() => ({}));
        showSearchNotice(body.error || "The search could not be run.");
      }
      return;
    }
    const { polls, truncated } = await res.json();
    // FIX009/FIX010: every view is capped; it says so, and says when it is empty.
    showSearchNotice(truncated ? view.cutOff(polls.length) : polls.length === 0 ? view.empty : "");
    // SC-012 scale measurement: how many polls each refresh brings down.
    console.log(`[adminList] /admin received ${polls.length} polls`);

    const container = document.getElementById("pollList");
    const nextOrder = [];
    const seen = new Set();

    for (const poll of polls) {
      seen.add(poll.pid);
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

    dropControllers(seen);

    syncChildren(container, nextOrder);

    if (focusPid) {
      const controller = controllers.get(focusPid);
      if (controller) {
        if (message) controller.showStatus(message);
        controller.focusSummary();
      }
    }

    if (openPid) {
      // A menu whose trigger survived the redraw (an invitee row's) is still open.
      const kept = openMenu && openMenu.trigger.isConnected;
      const trigger = kept ? null : cardFor(openPid)?.querySelector(".actions-menu-trigger");
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
      const controller = editingController();
      if (!controller) return;
      event.preventDefault();
      if (controller.isDirty() && !(await controller.confirmDiscard())) return;
      controller.releaseSession().then(() => {
        window.location.assign(url.href);
      });
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
      document.getElementById("adminSearchToggle").addEventListener("click", () => setSearchCollapsed(!searchCollapsed));
      searchForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        activeSearch = readSearchForm(searchForm);
        await selectTab("search");
        if (document.querySelector("#pollList .poll-admin-card")) setSearchCollapsed(true);
      });
      document.getElementById("adminSearchClear")?.addEventListener("click", () => {
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
