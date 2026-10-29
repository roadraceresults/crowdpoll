/*
  TABS — the eight-tab home page. Each tab holds its own copy of what it last
  received and re-renders that copy on a click; a request leaves only when the
  copy is older than the manual floor, when nothing is held, when Refresh is
  pressed while the kind's burst allowance has a token, or when the user's own
  bookmark changed what a personal tab lists (then at the first allowed moment).
  Every response's nextRefreshMs sets the kind's refill interval; 429 and 503
  empty the allowance for retryAfterMs and show nothing.
*/
(function () {
  "use strict";

  const PERSONAL_TABS = ["your-polls", "shared-with-you", "your-votes", "watching", "live"];
  const controllers = {};
  const nextAllowedAt = {};
  let activeTab = "trending";
  let config = null;
  let configLoaded = null;

  const tabBar = () => document.getElementById("tabBar");
  const refreshBtn = () => document.getElementById("refreshBtn");
  const panelOf = (name) => document.querySelector('.tab-panel[data-panel="' + name + '"]');
  const isSignedIn = () => Boolean(window.Session && window.Session.getSession());

  window.M3Ripple?.add(".tab-notice-close, .modal .modal-ok");

  async function loadConfig() {
    if (!configLoaded) {
      const source = window.SiteConfig || fetch("/api/config").then((res) => (res.ok ? res.json() : null));
      configLoaded = Promise.resolve(source)
        .catch(() => null)
        .then((body) => {
          config = body || {};
          config.floors = config.floors || { live: 2000, refresh: 5000, search: 2000, vote: 2000 };
          return config;
        });
    }
    return configLoaded;
  }

  function manualFloorMs() {
    return (config && config.floors && config.floors.refresh) || 5000;
  }

  // ---- Notices ----

  let noticeTimer = null;
  function notice(text, ms) {
    const el = document.getElementById("tabNotice");
    if (!el) return;
    clearTimeout(noticeTimer);
    if (!text) {
      hideNotice(el);
      return;
    }
    el.replaceChildren(document.createTextNode(text));
    if (!ms) el.appendChild(noticeCloseButton(el));
    el.hidden = false;
    if (ms) noticeTimer = setTimeout(() => hideNotice(el), ms);
  }

  function hideNotice(el) {
    const focusWasInside = el.contains(document.activeElement);
    el.hidden = true;
    if (focusWasInside && refreshBtn()) refreshBtn().focus();
  }

  function noticeCloseButton(el) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "tab-notice-close";
    button.setAttribute("aria-label", "Close");
    button.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>';
    button.addEventListener("click", () => {
      clearTimeout(noticeTimer);
      hideNotice(el);
    });
    return button;
  }

  /* FIX027: a modal message with one OK button, for what a passing notice would
     undersell. OK, Escape and a click on the backdrop dismiss it; focus goes to
     the button and returns to where it was. */
  function modal(text) {
    const backdrop = document.createElement("div");
    backdrop.className = "modal-backdrop";
    const box = document.createElement("div");
    box.className = "modal";
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-modal", "true");
    box.innerHTML = '<p class="modal-text"></p><div class="modal-actions"><button type="button" class="tab-refresh modal-ok">OK</button></div>';
    box.querySelector(".modal-text").textContent = text;
    box.querySelector(".modal-text").id = "modal-text";
    box.setAttribute("aria-labelledby", "modal-text");
    backdrop.appendChild(box);
    const before = document.activeElement;
    function close() {
      document.removeEventListener("keydown", onKey);
      backdrop.remove();
      if (before && before.focus) before.focus();
    }
    function onKey(event) {
      if (event.key === "Escape") close();
      if (event.key === "Tab") {
        event.preventDefault();
        box.querySelector(".modal-ok").focus();
      }
    }
    box.querySelector(".modal-ok").addEventListener("click", close);
    backdrop.addEventListener("click", (event) => { if (event.target === backdrop) close(); });
    document.addEventListener("keydown", onKey);
    document.body.appendChild(backdrop);
    box.querySelector(".modal-ok").focus();
  }

  // A signed-in user without the View Polls grant sees no poll cards anywhere, only this.
  // The grants come from /api/me: a rendering hint; the routes that know the user refuse too.
  const NO_VIEW_MESSAGE = "You do not have permission to view polls.";

  function viewerBarred() {
    const me = window.Session && window.Session.getSession();
    const granted = me && Array.isArray(me.permissions) ? me.permissions : null;
    if (!granted) return false;
    return !granted.includes("Administrator") && !granted.includes("View Polls");
  }

  const EMPTY_LINES = {
    "your-polls": "You haven't created any polls yet.",
    "shared-with-you": "Nothing has been shared with you yet.",
    "your-votes": "You haven't voted in any polls yet.",
    watching: "You aren't watching any polls yet."
  };

  function emptyLine(name) {
    return EMPTY_LINES[name] || "Nothing here yet.";
  }

  function offersCreatePoll(name, text) {
    return name === "your-polls" && text === EMPTY_LINES[name] && Boolean(window.Session && window.Session.canCreatePolls());
  }

  function emptyState(name, text) {
    if (viewerBarred()) text = NO_VIEW_MESSAGE;
    const panel = panelOf(name);
    const el = panel && panel.querySelector(".tab-empty");
    if (!el) return;
    if (text) {
      el.textContent = text;
      if (offersCreatePoll(name, text)) {
        const link = document.createElement("a");
        link.href = "/admin";
        link.textContent = "Create Poll";
        el.append(" ", link);
      }
      el.hidden = false;
    } else {
      el.hidden = true;
    }
  }

  // ---- Card grids: one per tab, cards kept mounted across tab switches ----

  let maximized = null;

  function shownMaximizeButton(cardEl) {
    const flipped = cardEl.querySelector(".card-flip").classList.contains("is-flipped");
    return cardEl.querySelector((flipped ? ".card-back" : ".card-front") + " .maximize-btn");
  }

  function closeMaximized(options) {
    if (maximized) maximized.grid.restore(options);
  }

  function createGrid(gridEl, cardOpts) {
    const mounted = new Map();
    let lastOrder = [];
    let maximizedPid = null;
    let maximizedEl = null;
    let returnScrollY = 0;
    let retainedDetail = null;
    let pinnedPid = null;
    const opts = Object.assign(
      {
        isSignedIn: isSignedIn,
        onVoted: (pid, outcome) => applyVote(cardOpts.tab, pid, outcome),
        onLive: (pid) => { if (window.LiveResults) window.LiveResults.addPoll(pid); },
        onBookmark: (pid, bookmarked) => toggleBookmark(pid, bookmarked),
        onMaximize: (pid) => maximize(pid),
        onMinimize: () => restore(),
        choiceBounds: { minChoices: (config && config.minChoices) || 2, maxChoices: (config && config.maxChoices) || 50 }
      },
      cardOpts
    );

    function render(state, changed) {
      const barred = viewerBarred();
      const order = barred ? [] : state.order;
      lastOrder = order.slice();
      const seen = new Set();
      order.forEach((pid) => {
        const detail = window.DeltaClient.toPollDetail(state, pid);
        if (!detail) return;
        seen.add(pid);
        if (pid === maximizedPid) retainedDetail = null;
        let card = mounted.get(pid);
        if (!card) {
          card = window.PollCard.mount(gridEl, pid, opts);
          mounted.set(pid, card);
          card.applyPoll(detail);
        } else if (!changed || changed.has(pid)) {
          card.applyPoll(detail);
        }
      });
      Array.from(mounted.keys()).forEach((pid) => {
        if (seen.has(pid)) return;
        if (pid === maximizedPid) {
          if ((opts.retainMaximized || pid === pinnedPid) && !barred) {
            if (!retainedDetail) retainedDetail = mounted.get(pid).detail();
            return;
          }
          restore({ left: true });
        }
        mounted.get(pid).unmount();
        mounted.delete(pid);
      });
      // A card is moved only when its position is wrong: re-appending an element
      // that is already in place takes it out of the document and back, which
      // blurs whatever the visitor had focused.
      order.filter((pid) => pid !== maximizedPid).forEach((pid, position) => {
        const card = mounted.get(pid);
        if (!card || !card.element) return;
        if (gridEl.children[position] !== card.element) {
          gridEl.insertBefore(card.element, gridEl.children[position] || null);
        }
      });
      if (barred) emptyState(cardOpts.tab, "");
    }

    function maximizedView() {
      if (!maximizedEl) {
        const template = document.getElementById("maximizedCardGrid");
        if (!template) return null;
        maximizedEl = template.content.firstElementChild.cloneNode(true);
        gridEl.after(maximizedEl);
      }
      return maximizedEl;
    }

    function maximize(pid) {
      const card = mounted.get(pid);
      if (!card || maximizedPid === pid) return;
      closeMaximized({ quiet: true });
      const view = maximizedView();
      if (!view) return;
      returnScrollY = window.scrollY;
      maximizedPid = pid;
      gridEl.hidden = true;
      view.hidden = false;
      view.insertBefore(card.element, view.querySelector(".col-rule"));
      card.setMaximized(true);
      const top = gridEl.parentNode.getBoundingClientRect().top;
      const fixedChromeHeight = window.FixedChrome ? window.FixedChrome.height() : 0;
      if (top < fixedChromeHeight) window.scrollTo(0, window.scrollY + top - fixedChromeHeight);
      maximized = { grid: api, pid: pid };
      shownMaximizeButton(card.element).focus();
    }

    function restore(options = {}) {
      if (!maximizedPid) return;
      const pid = maximizedPid;
      const card = mounted.get(pid);
      const leftTheTab = Boolean(options.left || retainedDetail);
      const position = lastOrder.filter((held) => mounted.has(held)).indexOf(pid);
      maximizedPid = null;
      maximized = null;
      gridEl.hidden = false;
      maximizedEl.hidden = true;
      if (card && retainedDetail) {
        card.unmount();
        mounted.delete(pid);
      } else if (card) {
        gridEl.insertBefore(card.element, gridEl.children[position] || null);
        card.setMaximized(false);
      }
      retainedDetail = null;
      pinnedPid = null;
      if (options.quiet) return;
      window.scrollTo(0, returnScrollY);
      if (leftTheTab) setTimeout(focusTabStart, 0);
      else if (card) focusCardAfterClose(card);
    }

    function focusCardAfterClose(card) {
      shownMaximizeButton(card.element).focus();
    }

    function focusTabStart() {
      const held = document.activeElement;
      if (held && held !== document.body && !(maximizedEl && maximizedEl.contains(held))) return;
      const firstCard = gridEl.querySelector(".card-viewport");
      if (firstCard) {
        shownMaximizeButton(firstCard).focus();
        return;
      }
      const line = gridEl.parentNode.querySelector(".tab-empty");
      if (line) {
        line.tabIndex = -1;
        line.focus();
      }
    }

    function patchRetained(pid, patch) {
      if (pid !== maximizedPid || !retainedDetail) return;
      const next = Object.assign({}, retainedDetail);
      if (patch.overlay && "bookmarked" in patch.overlay) next.bookmarked = Boolean(patch.overlay.bookmarked);
      if (patch.outcome) {
        const total = patch.outcome.voteCount;
        next.totalVoted = total;
        next.myChoiceIds = patch.outcome.myChoiceIds || [];
        next.countsVersion = patch.outcome.countsVersion;
        const share = window.DeltaClient.percentDenominator(next.choiceMode, total, patch.outcome.choiceCounts, next.choices);
        next.choices = next.choices.map((choice) => {
          const count = patch.outcome.choiceCounts[choice.id] || 0;
          return Object.assign({}, choice, { count: count, pct: share > 0 ? Math.round((count / share) * 100) : 0 });
        });
      }
      retainedDetail = next;
      mounted.get(pid).applyPoll(next);
    }

    /* A poll no list holds, shown maximized: it stays until it is closed, whatever the
       tab's own refreshes list, and is not added to the tab's list. */
    function mountRetained(pid, detail) {
      if (!mounted.has(pid)) {
        const card = window.PollCard.mount(gridEl, pid, opts);
        mounted.set(pid, card);
        card.applyPoll(detail);
        retainedDetail = detail;
        pinnedPid = pid;
      }
      maximize(pid);
    }

    function reapply(state, pid) {
      const card = mounted.get(pid);
      const detail = window.DeltaClient.toPollDetail(state, pid);
      if (card && detail) card.applyPoll(detail);
    }

    function clear() {
      restore({ quiet: true });
      mounted.forEach((card) => card.unmount());
      mounted.clear();
    }

    const api = {
      render: render,
      reapply: reapply,
      clear: clear,
      size: () => mounted.size,
      cardOf: (pid) => mounted.get(pid) || null,
      maximize: maximize,
      mountRetained: mountRetained,
      restore: restore,
      patchRetained: patchRetained
    };
    return api;
  }

  // ---- Floors, the burst allowance and the shared response handling ----

  /*
    FIX008: the browser mirrors the server's buckets — one per request kind, of
    bursts[kind] tokens, one back every floor interval (the stretched interval a
    response hands back). A request spends a token when it is sent; a tab may ask
    while a token is left. TRENDING's Refresh is not a dynamic request, but gets
    the same allowance from a bucket of its own. Live Results and votes hold one
    token, which is the plain floor.
  */
  const KIND_OF = { "your-polls": "refresh", "shared-with-you": "refresh", "your-votes": "refresh", watching: "refresh", "live-membership": "refresh", search: "refresh", live: "live", trending: "trending", newest: "newest" };
  const buckets = {};

  function kindOf(name) {
    return KIND_OF[name] || "refresh";
  }

  function bucketOf(kind) {
    let bucket = buckets[kind];
    if (!bucket) {
      const floorKind = kind === "trending" || kind === "newest" ? "refresh" : kind;
      const capacity = Math.max(1, (config && config.bursts && config.bursts[floorKind]) || 1);
      const intervalMs = (config && config.floors && config.floors[floorKind]) || manualFloorMs();
      bucket = { capacity: capacity, tokens: capacity, at: Date.now(), intervalMs: intervalMs };
      buckets[kind] = bucket;
    }
    return bucket;
  }

  function refill(bucket) {
    const now = Date.now();
    const earned = Math.floor((now - bucket.at) / bucket.intervalMs);
    if (earned > 0) {
      bucket.tokens += earned;
      bucket.at += earned * bucket.intervalMs;
    }
    if (bucket.tokens >= bucket.capacity) {
      bucket.tokens = bucket.capacity;
      bucket.at = now;
    }
  }

  /** Milliseconds until the kind has a token: 0 when it has one now. */
  function tokenWait(kind) {
    const bucket = bucketOf(kind);
    refill(bucket);
    return bucket.tokens >= 1 ? 0 : Math.max(1, bucket.at + bucket.intervalMs - Date.now());
  }

  function spend(kind) {
    const bucket = bucketOf(kind);
    refill(bucket);
    bucket.tokens = Math.max(0, bucket.tokens - 1);
    updateRefreshButton();
  }

  /* The interval a response handed back becomes the bucket's refill interval; when
     the last token has just gone, the refill clock starts at the response. */
  function settle(kind, intervalMs) {
    const bucket = bucketOf(kind);
    if (intervalMs) bucket.intervalMs = intervalMs;
    if (bucket.tokens === 0) bucket.at = Date.now();
    updateRefreshButton();
  }

  /* The server refused: another window spent what this mirror still counted.
     The bucket is emptied and refills only after the wait it named. */
  function drain(kind, waitMs) {
    const bucket = bucketOf(kind);
    bucket.tokens = 0;
    bucket.at = Date.now() + waitMs - bucket.intervalMs;
    updateRefreshButton();
  }

  function jitterMs() {
    return Math.floor(Math.random() * 1000);
  }

  function holdOff(name, ms) {
    nextAllowedAt[name] = Math.max(nextAllowedAt[name] || 0, Date.now() + ms);
    updateRefreshButton();
  }

  function nextAllowedIn(name, kind) {
    return Math.max(0, (nextAllowedAt[name] || 0) - Date.now(), tokenWait(kind || kindOf(name)));
  }

  function canRequest(name, kind) {
    return nextAllowedIn(name, kind) === 0;
  }

  /* How long the active tab's Refresh waits: its floor, and for Trending and
     Newest until a newer copy can exist (`refreshAvailableIn`). */
  function refreshWait() {
    const controller = controllers[activeTab];
    const listing = controller && controller.refreshAvailableIn ? controller.refreshAvailableIn() : 0;
    return Math.max(nextAllowedIn(activeTab), listing);
  }

  /* aria-disabled, not disabled, so the button keeps its tooltip, which counts
     the wait down a second at a time. */
  let refreshButtonTimer = null;
  function updateRefreshButton() {
    const btn = refreshBtn();
    if (!btn) return;
    clearTimeout(refreshButtonTimer);
    refreshButtonTimer = null;
    const controller = controllers[activeTab];
    const wait = controller && controller.refresh ? refreshWait() : 0;
    if (!controller || !controller.refresh || wait > 0) btn.setAttribute("aria-disabled", "true");
    else btn.removeAttribute("aria-disabled");
    btn.title = wait > 0 ? "Refresh available in " + Math.ceil(wait / 1000) + " s" : "Refresh";
    if (wait > 0) refreshButtonTimer = setTimeout(updateRefreshButton, Math.min(wait, 1000) + 10);
  }

  /*
    Runs one dynamic request for a tab, spending a token of its kind (`kind`
    overrides the tab's own, e.g. the Search tab's Refresh is refresh-kind). The
    caller's `onResponse` sees a 200 body or a 304; a 429/503 empties the bucket
    for retryAfterMs (+ jitter on 503) and, when `retry` is given, runs it once
    after that wait if the tab is still the one on screen. Returns true when the
    request was served.
  */
  async function dynamicRequest(name, input, init, onResponse, retry, kind) {
    kind = kind || kindOf(name);
    spend(kind);
    let res;
    try {
      res = await fetch(input, init);
    } catch {
      holdOff(name, manualFloorMs());
      return false;
    }
    if (res.status === 304) {
      settle(kind, null);
      await onResponse(null, res);
      return true;
    }
    if (res.status === 429 || res.status === 503) {
      const body = await res.json().catch(() => ({}));
      const wait = (body.retryAfterMs || manualFloorMs()) + (res.status === 503 ? jitterMs() : 0);
      drain(kind, wait);
      holdOff(name, wait);
      if (retry) setTimeout(() => { if (activeTab === name) retry(); }, wait + 20);
      return false;
    }
    if (res.status === 401) {
      holdOff(name, manualFloorMs());
      if (window.Session) window.Session.refresh();
      return false;
    }
    if (!res.ok) {
      holdOff(name, manualFloorMs());
      await onResponse(null, res);
      return false;
    }
    const body = await res.json();
    settle(kind, body.nextRefreshMs);
    await onResponse(body, res);
    return true;
  }

  // ---- The signed-in overlay for polls a tab holds (FR-019) ----

  /*
    One fetcher per tab that lists polls without their overlay (TRENDING, Search).
    `fetch()` asks /api/me/polls for the held polls that have no entry yet. The call
    is a refresh-kind request and takes the session's manual floor, so it can be
    refused when another request — a bookmark, a tab confirmation, the same call
    from another window — took the floor moments before; a refusal is asked again
    once the wait has passed (FIX06) rather than left until the next Refresh, up
    to a few times. While a retry is pending the pids stay claimed, so a second
    caller sends nothing.
  */
  function createOverlayFetcher(state, gridOf) {
    const MAX_RETRIES = 5;
    let requested = new Set();
    let retryTimer = null;
    let retries = 0;

    function release(pids) {
      pids.forEach((pid) => requested.delete(pid));
    }

    async function fetchOverlay() {
      if (!isSignedIn()) return;
      const missing = state.order.filter((pid) => !state.overlay.has(pid) && !requested.has(pid));
      if (missing.length === 0) return;
      missing.forEach((pid) => requested.add(pid));
      spend("refresh");
      let res;
      try {
        res = await fetch("/api/me/polls?pids=" + encodeURIComponent(missing.join(",")));
      } catch {
        release(missing);
        return;
      }
      if (res.status === 429 || res.status === 503) {
        const body = await res.json().catch(() => ({}));
        const wait = (body.retryAfterMs || manualFloorMs()) + (res.status === 503 ? jitterMs() : 0);
        drain("refresh", wait);
        if (retries >= MAX_RETRIES) {
          release(missing);
          return;
        }
        retries += 1;
        clearTimeout(retryTimer);
        retryTimer = setTimeout(() => {
          retryTimer = null;
          release(missing);
          fetchOverlay();
        }, wait + 20);
        return;
      }
      if (!res.ok) {
        release(missing);
        return;
      }
      retries = 0;
      const body = await res.json();
      settle("refresh", body.nextRefreshMs);
      const grid = gridOf();
      Object.keys(body.overlay || {}).forEach((pid) => {
        window.DeltaClient.setOverlay(state, pid, body.overlay[pid]);
        if (grid) grid.reapply(state, pid);
      });
    }

    return {
      fetch: fetchOverlay,
      reset() {
        clearTimeout(retryTimer);
        retryTimer = null;
        retries = 0;
        requested = new Set();
      }
    };
  }

  // ---- Instance-served tabs with version-keyed deltas ----

  function createDeltaTab(name, url, cardOpts) {
    const state = window.DeltaClient.createTabState();
    const panel = panelOf(name);
    const grid = createGrid(panel.querySelector(".card-grid"), cardOpts);
    let requested = false;
    // Set when what this tab lists may have changed behind its copy — the user's
    // own bookmark, one made in another window, or a return to this window with an
    // old copy: the copy is shown but is confirmed at the first allowed moment.
    let due = false;
    let dueTimer = null;

    async function request() {
      if (!canRequest(name)) {
        // Nothing held yet, or a change to confirm: ask as soon as the allowance permits.
        if (due || !requested) retryWhenAllowed();
        return;
      }
      const served = await dynamicRequest(
        name,
        url,
        { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(window.DeltaClient.versionsOf(state)) },
        async (body) => {
          if (body) {
            const changed = window.DeltaClient.apply(state, body);
            grid.render(state, changed);
          } else {
            state.receivedAt = Date.now();
          }
          emptyState(name, state.order.length === 0 ? emptyLine(name) : "");
        },
        requested && !due ? null : retryLater
      );
      if (served) {
        requested = true;
        due = false;
      }
    }

    function retryLater() {
      nextAllowedAt[name] = 0;
      request();
    }

    function retryWhenAllowed() {
      clearTimeout(dueTimer);
      dueTimer = setTimeout(() => {
        dueTimer = null;
        if (activeTab === name && (due || !requested)) request();
      }, nextAllowedIn(name) + 20);
    }

    /* Places a card this tab does not yet list at its top, from the copy another
       tab holds, so the user's own bookmark shows at once; the next confirmation
       brings the server's order. */
    function placeFirst(pid, card, counts, overlay) {
      if (state.cards.has(pid)) return;
      state.cards.set(pid, card);
      if (counts) state.counts.set(pid, counts);
      if (overlay) state.overlay.set(pid, overlay);
      state.order.unshift(pid);
      grid.render(state, new Set([pid]));
      emptyState(name, "");
    }

    /* Drops a card from this tab's copy at once; the next confirmation brings it
       back should the server still list it. */
    function remove(pid) {
      if (!state.cards.has(pid)) return;
      state.order = state.order.filter((held) => held !== pid);
      state.cards.delete(pid);
      state.counts.delete(pid);
      state.overlay.delete(pid);
      grid.render(state);
      emptyState(name, state.order.length === 0 ? emptyLine(name) : "");
    }

    return {
      state: state,
      grid: grid,
      guestsAllowed: false,
      async activate() {
        grid.render(state);
        const stale = Date.now() - state.receivedAt > manualFloorMs();
        if (!requested || due || (stale && canRequest(name))) await request();
      },
      refresh: request,
      placeFirst: placeFirst,
      remove: remove,
      markDue() {
        due = true;
        if (activeTab === name) request();
      },
      confirmIfStale() {
        if (requested && Date.now() - state.receivedAt > manualFloorMs()) this.markDue();
      },
      reset() {
        clearTimeout(dueTimer);
        dueTimer = null;
        state.order = [];
        state.cards.clear();
        state.counts.clear();
        state.overlay.clear();
        state.membershipVersion = null;
        state.receivedAt = 0;
        requested = false;
        due = false;
        grid.clear();
      }
    };
  }

  // ---- A bookmark, like a vote, updates every tab's copy of the overlay locally ----

  function updateOverlayEverywhere(pid, entry) {
    Object.keys(controllers).forEach((name) => {
      const controller = controllers[name];
      if (!controller.state || !controller.grid) return;
      if (!controller.state.cards.has(pid)) return;
      window.DeltaClient.setOverlay(controller.state, pid, entry);
      controller.grid.reapply(controller.state, pid);
    });
    if (maximized) maximized.grid.patchRetained(pid, { overlay: entry });
  }

  /* The copy of a card any tab holds: the projection, its live counts and the
     visitor's overlay, or null when no tab lists the poll. */
  function heldCopy(pid) {
    const names = Object.keys(controllers);
    for (let i = 0; i < names.length; i++) {
      const state = controllers[names[i]].state;
      if (state && state.cards.has(pid)) {
        return { card: state.cards.get(pid), counts: state.counts.get(pid) || null, overlay: state.overlay.get(pid) || null };
      }
    }
    return null;
  }

  /** The visitor's overlay for a poll from whichever tab already holds one, or null. */
  function overlayOf(pid) {
    const names = Object.keys(controllers);
    for (let i = 0; i < names.length; i++) {
      const state = controllers[names[i]].state;
      if (state && state.overlay.has(pid)) return state.overlay.get(pid);
    }
    return null;
  }

  /*
    Watching a poll places it first in Watching, from the copy the pressed card came
    from; the other personal tabs list the poll for their own reasons and are left as
    they are. Stopping removes it from Watching only, and Watching is marked due for a
    confirmation at the first allowed moment.
  */
  function placeBookmark(pid, bookmarked) {
    const target = controllers.watching;
    if (!target || !target.markDue) return;
    const held = heldCopy(pid);
    if (bookmarked && held && target.placeFirst) target.placeFirst(pid, held.card, held.counts, held.overlay);
    if (!bookmarked && target.remove) target.remove(pid);
    target.markDue();
  }

  function waitNotice(ms) {
    notice("Please wait " + Math.max(1, Math.ceil(ms / 1000)) + " s and try again.", 3000);
  }

  /* A bookmark is a refresh-kind request: it spends a token of the same bucket
     the personal tabs draw on, so a click with none left is not sent at all. */
  async function toggleBookmark(pid, bookmarked) {
    const wait = tokenWait("refresh");
    if (wait > 0) {
      waitNotice(wait);
      return;
    }
    spend("refresh");
    let res;
    try {
      res = await fetch("/api/polls/" + encodeURIComponent(pid) + "/bookmark", { method: bookmarked ? "POST" : "DELETE" });
    } catch {
      return;
    }
    const body = await res.json().catch(() => ({}));
    if (res.status === 409 && body.error === "bookmark-cap") {
      settle("refresh", body.nextRefreshMs);
      modal(
        "You have reached the maximum number of polls you can watch. The limit is " + body.limit +
        ". Please stop watching a poll on the Watching tab before watching another."
      );
      return;
    }
    if (res.status === 403 && body.code === "no-view-permission") {
      modal(body.error);
      return;
    }
    if (res.status === 429 || res.status === 503) {
      const retryMs = (body.retryAfterMs || manualFloorMs()) + (res.status === 503 ? jitterMs() : 0);
      drain("refresh", retryMs);
      waitNotice(retryMs);
      return;
    }
    if (!res.ok) return;
    settle("refresh", body.nextRefreshMs);
    updateOverlayEverywhere(pid, { bookmarked: Boolean(body.bookmarked) });
    placeBookmark(pid, Boolean(body.bookmarked));
    tellOtherWindows({ type: "bookmark", pid: pid, bookmarked: Boolean(body.bookmarked) });
  }

  // ---- Other windows of this browser hear of a bookmark at once (FIX04) ----

  /*
    A bookmark made in one window is posted to the others on a broadcast channel;
    each applies it as if it were its own — the icon flips, the poll is placed in
    (or dropped from) the personal tab from any card it holds, and the tabs are
    marked due so the server's list is confirmed at the first allowed moment. No
    request is sent for the message itself. Browsers without the channel, and
    other devices, are covered by the return-to-window check below.
  */
  const CHANNEL_NAME = "crowdpoll-tabs";
  let channel = null;

  function openChannel() {
    if (typeof BroadcastChannel === "undefined") return;
    try {
      channel = new BroadcastChannel(CHANNEL_NAME);
    } catch {
      channel = null;
      return;
    }
    channel.onmessage = (event) => {
      const msg = event && event.data;
      if (!msg || msg.type !== "bookmark" || typeof msg.pid !== "string" || !isSignedIn()) return;
      updateOverlayEverywhere(msg.pid, { bookmarked: Boolean(msg.bookmarked) });
      // The other window spent a token of the session's bucket; this mirror follows.
      spend("refresh");
      placeBookmark(msg.pid, Boolean(msg.bookmarked));
    };
  }

  function tellOtherWindows(msg) {
    if (!channel) return;
    try {
      channel.postMessage(msg);
    } catch {
      /* the channel is a courtesy; the next confirmation covers it */
    }
  }

  /* Coming back to this window — focus, or the document becoming visible again —
     a personal tab whose copy is older than the floor confirms it, so a change
     made elsewhere shows without a press of Refresh. */
  function onReturnToWindow() {
    if (document.hidden) return;
    const controller = controllers[activeTab];
    if (controller && controller.confirmIfStale) controller.confirmIfStale();
  }

  // ---- A vote's outcome lands in the tab that owns the card ----

  function applyVote(name, pid, outcome) {
    Object.keys(controllers).forEach((other) => {
      const controller = controllers[other];
      if (!controller.state || !controller.grid || !controller.state.cards.has(pid)) return;
      window.DeltaClient.applyCounters(controller.state, {
        [pid]: { voteCount: outcome.voteCount, choiceCounts: outcome.choiceCounts, countsVersion: outcome.countsVersion }
      });
      window.DeltaClient.setOverlay(controller.state, pid, { voted: true, choiceIds: outcome.myChoiceIds });
      controller.grid.reapply(controller.state, pid);
    });
    if (maximized) maximized.grid.patchRetained(pid, { outcome: outcome });
    const owner = controllers[name];
    if (owner && owner.onVoted) owner.onVoted(pid);
  }

  // ---- Selection ----

  function setActiveButton(name) {
    const bar = tabBar();
    if (!bar) return;
    bar.querySelectorAll(".tab").forEach((btn) => {
      const selected = btn.dataset.tab === name;
      btn.classList.toggle("is-active", selected);
      btn.setAttribute("aria-selected", selected ? "true" : "false");
      btn.tabIndex = selected ? 0 : -1;
      if (selected && btn.scrollIntoView) btn.scrollIntoView({ inline: "nearest", block: "nearest" });
    });
    updateOverflowFades();
  }

  /* The bar scrolls sideways when the tabs are wider than the window: the row says which
     side still holds tabs by fading that edge. */
  function updateOverflowFades() {
    const bar = tabBar();
    const wrap = bar && bar.closest(".tab-bar-wrap");
    if (!wrap) return;
    wrap.classList.toggle("has-tabs-before", bar.scrollLeft > 1);
    wrap.classList.toggle("has-tabs-after", bar.scrollLeft + bar.clientWidth < bar.scrollWidth - 1);
  }

  /* Arrow keys, Home and End move between the tabs and Enter or Space activates the one
     focused (manual activation: moving over a tab must not start a request or, for a guest,
     leave the page). */
  function moveTabFocus(event) {
    const keys = { ArrowRight: 1, ArrowLeft: -1, Home: 0, End: 0 };
    if (!(event.key in keys)) return;
    const tabs = Array.from(tabBar().querySelectorAll(".tab"));
    const at = tabs.indexOf(document.activeElement);
    if (at === -1) return;
    let next = at;
    if (event.key === "Home") next = 0;
    else if (event.key === "End") next = tabs.length - 1;
    else next = (at + keys[event.key] + tabs.length) % tabs.length;
    event.preventDefault();
    tabs.forEach((btn, i) => { btn.tabIndex = i === next ? 0 : -1; });
    tabs[next].focus({ preventScroll: true });
    if (tabs[next].scrollIntoView) tabs[next].scrollIntoView({ inline: "nearest", block: "nearest" });
  }

  function showPanel(name) {
    document.querySelectorAll(".tab-panel").forEach((panel) => {
      panel.hidden = panel.dataset.panel !== name;
    });
    // FIX019: the row knows which tab is on screen; Live Results, which refreshes
    // itself, hides the Refresh control rather than showing it disabled.
    const wrap = document.querySelector(".tab-bar-wrap");
    if (wrap) wrap.dataset.active = name;
  }

  async function select(name) {
    const controller = controllers[name];
    if (!controller) return;
    closeMaximized({ quiet: true });
    if (!controller.guestsAllowed && !isSignedIn()) {
      location.href = "/login";
      return;
    }
    activeTab = name;
    setActiveButton(name);
    showPanel(name);
    updateRefreshButton();
    await controller.activate();
  }

  function applyGuestState() {
    const signedIn = isSignedIn();
    const bar = tabBar();
    if (!bar) return;
    PERSONAL_TABS.forEach((name) => {
      const btn = bar.querySelector('.tab[data-tab="' + name + '"]');
      if (!btn) return;
      if (signedIn) btn.removeAttribute("aria-disabled");
      else btn.setAttribute("aria-disabled", "true");
      btn.title = signedIn ? "" : "Sign in to use this tab";
    });
    if (!signedIn && PERSONAL_TABS.indexOf(activeTab) !== -1) select("trending");
  }

  // ---- Wiring ----

  /* The first tab render waits for the page's own session answer, which also says
     whether this load was refused for being too frequent. */
  function sessionReady() {
    return new Promise((resolve) => {
      if (!window.Session) {
        resolve();
        return;
      }
      const timer = setTimeout(resolve, 3000);
      const unsubscribe = window.Session.subscribe(() => {
        clearTimeout(timer);
        resolve();
        setTimeout(unsubscribe, 0);
      });
    });
  }

  // ---- Where a poll link landed, /?open=<id>&tab=<tab>&notice=<kind> ----

  /*
    The server decides what a poll link shows (see the pages route) and sends the visitor
    here with a landing in the address. Only the fixed values below are honoured.
  */
  const POLL_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const LANDING_TABS = ["your-polls", "shared-with-you", "trending"];
  const LANDING_NOTICES = {
    unavailable: "That poll isn't available.",
    unpublished: "This poll hasn't been published yet. It's waiting in Shared With You, and you can vote once it's published."
  };
  const LANDING_PARAMS = ["open", "tab", "notice"];

  function takeLanding() {
    const params = new URLSearchParams(location.search);
    if (!LANDING_PARAMS.some((key) => params.has(key))) return null;
    const open = params.get("open") || "";
    const tab = params.get("tab") || "";
    const kind = params.get("notice") || "";
    LANDING_PARAMS.forEach((key) => params.delete(key));
    const rest = params.toString();
    history.replaceState(null, "", location.pathname + (rest ? "?" + rest : "") + location.hash);
    return {
      pid: POLL_ID.test(open) ? open : null,
      tab: LANDING_TABS.indexOf(tab) !== -1 ? tab : null,
      notice: Object.prototype.hasOwnProperty.call(LANDING_NOTICES, kind) ? LANDING_NOTICES[kind] : null
    };
  }

  async function mountLinkedPoll(grid, pid) {
    let res;
    try {
      res = await fetch("/api/me/polls/" + encodeURIComponent(pid));
    } catch {
      notice("This poll could not be opened.", 4000);
      return;
    }
    if (!res.ok) {
      notice(LANDING_NOTICES.unavailable, 4000);
      return;
    }
    const body = await res.json();
    const state = window.DeltaClient.createTabState();
    state.cards.set(pid, body.poll);
    state.counts.set(pid, body.counts);
    state.overlay.set(pid, body.overlay);
    grid.mountRetained(pid, window.DeltaClient.toPollDetail(state, pid));
  }

  // Resolves true when the landing chose the tab, so the caller skips the default one.
  async function applyLanding(landing) {
    if (!landing || !isSignedIn()) return false;
    if (landing.notice) notice(landing.notice, 6000);
    if (!landing.tab) return false;
    await select(landing.tab);
    const grid = controllers[landing.tab] && controllers[landing.tab].grid;
    if (landing.pid && grid) {
      if (!grid.cardOf(landing.pid)) await mountLinkedPoll(grid, landing.pid);
      if (grid.cardOf(landing.pid)) grid.maximize(landing.pid);
    }
    return true;
  }

  async function init() {
    await loadConfig();
    await sessionReady();
    const bar = tabBar();
    if (!bar) return;
    const noticeEl = document.getElementById("tabNotice");
    if (noticeEl) noticeEl.setAttribute("role", "status");

    ["your-polls", "shared-with-you", "your-votes", "watching"].forEach((name) => {
      controllers[name] = createDeltaTab(name, "/api/tabs/" + name + "/refresh", { showVote: true, showLive: true, tab: name });
    });

    bar.addEventListener("keydown", moveTabFocus);
    bar.addEventListener("scroll", updateOverflowFades, { passive: true });
    window.addEventListener("resize", updateOverflowFades);
    updateOverflowFades();

    bar.addEventListener("click", (event) => {
      const btn = event.target.closest(".tab");
      if (!btn) return;
      if (btn.getAttribute("aria-disabled") === "true") {
        location.href = "/login";
        return;
      }
      if (btn.dataset.tab === activeTab && maximized) {
        closeMaximized();
        return;
      }
      select(btn.dataset.tab);
    });

    const btn = refreshBtn();
    if (btn) {
      btn.addEventListener("click", () => {
        if (btn.getAttribute("aria-disabled") === "true") return;
        const controller = controllers[activeTab];
        if (controller && controller.refresh && refreshWait() === 0) controller.refresh();
      });
    }

    if (window.Session) {
      let lastSignedIn = null;
      window.Session.subscribe((session) => {
        const signedIn = Boolean(session);
        if (lastSignedIn !== null && lastSignedIn !== signedIn) {
          closeMaximized({ quiet: true });
          Object.keys(controllers).forEach((name) => {
            if (controllers[name].reset) controllers[name].reset();
          });
          if (controllers[activeTab]) controllers[activeTab].activate();
        }
        lastSignedIn = signedIn;
        applyGuestState();
      });
    }
    applyGuestState();
    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape" || !maximized) return;
      if (document.querySelector('[aria-modal="true"]')) return;
      const target = event.target;
      if (target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))) return;
      closeMaximized();
    });
    openChannel();
    window.addEventListener("focus", onReturnToWindow);
    document.addEventListener("visibilitychange", onReturnToWindow);
    if (await applyLanding(takeLanding())) return;
    // FIX013: arriving from another page's search box — the terms ride on the URL.
    const q = new URLSearchParams(location.search).get("q");
    if (q && q.trim() && window.SearchTab && window.SearchTab.submit) {
      if (window.SiteSearch) window.SiteSearch.set(q.trim());
      await window.SearchTab.submit(q.trim());
      return;
    }
    await select("trending");
  }

  window.Tabs = {
    register(name, controller) {
      controllers[name] = controller;
    },
    applyVote: applyVote,
    select: select,
    active: () => activeTab,
    config: loadConfig,
    manualFloorMs: manualFloorMs,
    createGrid: createGrid,
    createOverlayFetcher: createOverlayFetcher,
    overlayOf: overlayOf,
    dynamicRequest: dynamicRequest,
    holdOff: holdOff,
    canRequest: canRequest,
    nextAllowedIn: nextAllowedIn,
    spend: spend,
    settle: settle,
    updateRefreshButton: updateRefreshButton,
    notice: notice,
    modal: modal,
    emptyState: emptyState,
    isSignedIn: isSignedIn,
    controller: (name) => controllers[name]
  };

  document.addEventListener("DOMContentLoaded", init);
})();
