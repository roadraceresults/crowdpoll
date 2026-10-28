/*
  LIVE RESULTS — the only tab that refreshes on its own. It holds up to the
  configured number of polls, newest on top, and asks the server for a delta on a
  timer set by the last nextRefreshMs (never sooner than the live floor). The timer
  pauses while the page is hidden and stops for an idle prompt after
  ENV_MAX_IDLE_TIME without interaction; Cancel, or a lapsed registration, closes
  the tab.
*/
(function () {
  "use strict";

  const TAB = "live";
  const IDLE_PROMPT = "Do you want to continue to receive Live Results updates?";

  window.M3Ripple?.add(".live-idle-actions .tab-refresh");
  const state = window.DeltaClient.createTabState();
  // FIX011: the Live Results delta is served from the cache alone and carries no
  // per-visitor state; the overlay (voted, bookmarked) comes from the tab that
  // handed the poll over when it can, and from /api/me/polls otherwise (FR-019).
  const overlay = window.Tabs.createOverlayFetcher(state, () => grid);
  let grid = null;
  let panel = null;
  let timer = null;
  let idleTimer = null;
  let lastInteractionAt = Date.now();
  let prompting = false;
  let open = false;

  function config() {
    return window.Tabs.config();
  }

  function fillOverlay() {
    state.order.forEach((pid) => {
      if (state.overlay.has(pid)) return;
      const held = window.Tabs.overlayOf(pid);
      if (!held) return;
      window.DeltaClient.setOverlay(state, pid, held);
      if (grid) grid.reapply(state, pid);
    });
    return overlay.fetch();
  }

  function ensureGrid() {
    if (!grid) {
      panel = document.querySelector('.tab-panel[data-panel="live"]');
      grid = window.Tabs.createGrid(panel.querySelector(".card-grid"), { showVote: true, onClose: removePoll, tab: TAB });
      ["click", "keydown", "scroll", "pointerdown"].forEach((type) => {
        panel.addEventListener(type, () => { lastInteractionAt = Date.now(); }, { passive: true });
      });
    }
    return grid;
  }

  // ---- Timer ----

  function clearTimer() {
    if (timer) clearTimeout(timer);
    timer = null;
  }

  /*
    The next tick. After a served response `ms` is the interval the server handed
    back, never shorter than the live floor. After a refusal — another window of
    the session took the floor — the tick lands when the floor next allows,
    which is sooner than a whole interval (FIX019: clamping that wait to the
    floor let the other window win every time). Both carry a little jitter so
    two windows take turns.
  */
  async function schedule(ms, afterRefusal) {
    clearTimer();
    const cfg = await config();
    const floor = cfg.floors.live || 2000;
    const jitter = Math.floor(Math.random() * 150);
    const wait = afterRefusal ? Math.max(ms, 50) + jitter : Math.max(ms || floor, floor) + jitter;
    timer = setTimeout(tick, wait);
  }

  async function tick() {
    timer = null;
    if (!open || prompting) return;
    if (document.hidden) return;
    const cfg = await config();
    if (Date.now() - lastInteractionAt >= (cfg.maxIdleTimeMs || 1800000)) {
      showIdlePrompt();
      return;
    }
    await refresh();
  }

  /*
    FIX018: the registration is the session's, kept on the server; this window's
    list is only its copy. When the tab is opened with nothing held — another
    window added the polls, or this page was reloaded — it asks the server once,
    quietly: a registration answers with the polls and the tab opens; none
    (403) leaves the prompt to press Live Results, with no tab change.
  */
  async function restore() {
    if (!window.Tabs.isSignedIn() || !window.Tabs.canRequest(TAB)) return;
    let nextMs = 0;
    await window.Tabs.dynamicRequest(
      TAB,
      "/api/live/refresh",
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(window.DeltaClient.versionsOf(state)) },
      async (body) => {
        if (!body || !body.order || body.order.length === 0) return;
        const changed = window.DeltaClient.apply(state, body);
        ensureGrid().render(state, changed);
        void fillOverlay();
        nextMs = body.nextRefreshMs || 0;
      },
      // Another window of the session may hold the live floor: ask again after the wait.
      restore
    );
    if (state.order.length === 0) return;
    open = true;
    lastInteractionAt = Date.now();
    window.Tabs.emptyState(TAB, "");
    await schedule(nextMs || (window.Tabs.nextAllowedIn ? window.Tabs.nextAllowedIn(TAB) : 0));
  }

  async function refresh() {
    if (!window.Tabs.canRequest(TAB)) {
      await schedule(window.Tabs.nextAllowedIn(TAB), true);
      return;
    }
    let nextMs = 0;
    let expired = false;
    let served = false;
    await window.Tabs.dynamicRequest(
      TAB,
      "/api/live/refresh",
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(window.DeltaClient.versionsOf(state)) },
      async (body, res) => {
        if (body) {
          served = true;
          const changed = window.DeltaClient.apply(state, body);
          ensureGrid().render(state, changed);
          if (state.order.some((pid) => !state.overlay.has(pid))) void fillOverlay();
          nextMs = body.nextRefreshMs || 0;
        } else if (res && res.status === 304) {
          served = true;
        } else if (res && res.status === 403) {
          expired = true;
        }
      }
    );
    if (expired) {
      await closeTab(false);
      return;
    }
    if (!open) return;
    if (served) await schedule(nextMs);
    else await schedule(window.Tabs.nextAllowedIn(TAB), true);
  }

  // ---- The idle prompt ----

  function showIdlePrompt() {
    if (!panel || prompting) return;
    prompting = true;
    const dialog = document.createElement("div");
    dialog.className = "live-idle-prompt";
    dialog.setAttribute("role", "dialog");
    dialog.innerHTML =
      '<p class="live-idle-text"></p>' +
      '<div class="live-idle-actions">' +
      '<button type="button" class="tab-refresh live-idle-cancel">Cancel</button>' +
      '<button type="button" class="tab-refresh live-idle-yes">Yes</button>' +
      "</div>";
    dialog.querySelector(".live-idle-text").textContent = IDLE_PROMPT;
    dialog.querySelector(".live-idle-text").id = "live-idle-text";
    dialog.setAttribute("aria-labelledby", "live-idle-text");
    const focusBefore = document.activeElement;
    dialog.querySelector(".live-idle-yes").addEventListener("click", () => {
      dialog.remove();
      prompting = false;
      lastInteractionAt = Date.now();
      if (focusBefore && focusBefore !== document.body && focusBefore.isConnected && focusBefore.focus) focusBefore.focus();
      refresh();
    });
    dialog.querySelector(".live-idle-cancel").addEventListener("click", () => {
      dialog.remove();
      prompting = false;
      closeTab(true);
    });
    panel.prepend(dialog);
    dialog.querySelector(".live-idle-yes").focus();
  }

  // ---- Membership ----

  async function addPoll(pid) {
    if (!window.Tabs.isSignedIn()) {
      location.href = "/login";
      return;
    }
    ensureGrid();
    let added = false;
    await window.Tabs.dynamicRequest(
      "live-membership",
      "/api/live/" + encodeURIComponent(pid),
      { method: "POST" },
      async (body, res) => {
        if (body) {
          added = true;
          window.DeltaClient.apply(state, { order: body.polls, counters: {}, cards: {} });
        } else if (res && res.status === 409) {
          // FIX028: the tab is full; the server names the limit it enforced.
          const refused = await res.json().catch(() => ({}));
          window.Tabs.modal(
            "You have reached the maximum number of polls that can be viewed on the Live Results tab. The limit is " +
              refused.limit + ". Please remove a poll on the Live Results tab before adding another."
          );
        } else if (res && res.status === 403) {
          const refused = await res.json().catch(() => ({}));
          window.Tabs.notice(refused.error || "You may not view this poll.", 4000);
        }
      }
    );
    if (!added) return;
    open = true;
    lastInteractionAt = Date.now();
    await window.Tabs.select(TAB);
  }

  /* FIX025: the X on a card. Like adding a poll, a refresh-kind request; a click
     with no token left is told how long to wait and sends nothing. The server
     answers with what the session still watches; an empty tab stays open on its
     empty-state line with the timer stopped, ready for the next Live Results press. */
  async function removePoll(pid) {
    const wait = window.Tabs.nextAllowedIn("live-membership");
    if (wait > 0) {
      window.Tabs.notice("Please wait " + Math.max(1, Math.ceil(wait / 1000)) + " s and try again.", 3000);
      return;
    }
    // The server's answer replaces state.order in place, so the position this poll
    // held is read before the request rather than after it.
    const index = state.order.indexOf(pid);
    let removed = false;
    await window.Tabs.dynamicRequest(
      "live-membership",
      "/api/live/" + encodeURIComponent(pid),
      { method: "DELETE" },
      async (body) => {
        if (!body) return;
        removed = true;
        window.DeltaClient.apply(state, { order: body.polls || [], counters: {}, cards: {} });
      }
    );
    if (!removed) return;
    lastInteractionAt = Date.now();
    ensureGrid().render(state);
    if (state.order.length === 0) {
      open = false;
      clearTimer();
      window.Tabs.emptyState(TAB, "Press Live Results on a poll to watch it here.");
    }
    focusAfterRemoval(index);
  }

  /* The removed card held the focus, so it is placed on the card that takes its
     position, on the one before it when the last card went, or on the tab's
     empty-state line when nothing is left. */
  function focusAfterRemoval(index) {
    const next = state.order[index] || state.order[index - 1] || null;
    if (next) {
      const card = ensureGrid().cardOf(next);
      const link = card && card.element && card.element.querySelector(".live-link");
      if (link) link.focus();
      return;
    }
    const line = panel && panel.querySelector(".tab-empty");
    if (line) {
      line.tabIndex = -1;
      line.focus();
    }
  }

  async function removeAll() {
    const pids = state.order.slice();
    for (const pid of pids) {
      try {
        await fetch("/api/live/" + encodeURIComponent(pid), { method: "DELETE" });
      } catch {
        // the registration lapses on its own
      }
    }
  }

  async function closeTab(sendRemovals) {
    open = false;
    clearTimer();
    if (sendRemovals) await removeAll();
    window.DeltaClient.apply(state, { order: [], counters: {}, cards: {} });
    if (grid) grid.render(state);
    if (window.Tabs.active() === TAB) window.Tabs.select("trending");
  }

  // ---- Visibility ----

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      if (open) clearTimer();
      return;
    }
    if (window.Tabs.active() !== TAB) return;
    if (open) refresh();
    else if (state.order.length === 0) restore();
  });

  window.Tabs.register(TAB, {
    guestsAllowed: false,
    state: state,
    get grid() { return grid; },
    async activate() {
      ensureGrid().render(state);
      window.Tabs.emptyState(TAB, state.order.length === 0 ? "Press Live Results on a poll to watch it here." : "");
      if (state.order.length === 0) {
        await restore();
        return;
      }
      open = true;
      lastInteractionAt = Date.now();
      await refresh();
    },
    refresh: null,
    reset() {
      overlay.reset();
      closeTab(false);
    }
  });

  window.LiveResults = { addPoll: addPoll, state: state, isOpen: () => open };
})();
