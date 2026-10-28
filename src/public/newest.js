/*
  Newest — fed from two published objects: newest-counts.json (counts and
  order, every recompute) and newest.json (the cards, only when the set of polls
  changed), served from the same base as the TRENDING objects. The tab keeps its
  copy in sessionStorage so a reload renders at once and then validates; the
  manual floor (with its burst allowance) is enforced here, not by the server.
*/
(function () {
  "use strict";

  const TAB = "newest";
  const COPY_KEY = "newest:copy";
  const state = window.DeltaClient.createTabState();
  let grid = null;
  const overlay = window.Tabs.createOverlayFetcher(state, () => grid);

  function baseUrl(config) {
    return (config && config.trendingBaseUrl) || "/api/trending";
  }

  function recomputeIntervalMs(config) {
    return (config && config.newestRecomputeIntervalMs) || 60000;
  }

  // ---- The sessionStorage copy ----

  function saveCopy(countsObject, cardsObject) {
    try {
      sessionStorage.setItem(COPY_KEY, JSON.stringify({ counts: countsObject, cards: cardsObject, receivedAt: Date.now() }));
    } catch {
      // storage full or unavailable: the tab simply refetches next time
    }
  }

  function loadCopy() {
    try {
      const raw = sessionStorage.getItem(COPY_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  let heldCounts = null;
  let heldCards = null;

  function applyObjects(countsObject, cardsObject) {
    heldCounts = countsObject;
    if (cardsObject) heldCards = cardsObject;
    const counters = {};
    countsObject.polls.forEach((p) => {
      counters[p.pid] = { voteCount: p.voteCount, choiceCounts: p.choiceCounts, countsVersion: p.countsVersion };
    });
    const body = { counters: counters, order: countsObject.polls.map((p) => p.pid), membershipVersion: countsObject.membershipVersion };
    if (cardsObject) body.cards = cardsObject.cards;
    const changed = window.DeltaClient.apply(state, body);
    if (grid) grid.render(state, changed);
    window.Tabs.emptyState(TAB, state.order.length === 0 ? "No polls have been launched yet." : "");
    saveCopy(heldCounts, heldCards);
  }

  // ---- Fetching the objects ----

  async function fetchObject(url) {
    const res = await fetch(url, { cache: "no-cache" });
    if (!res.ok) return null;
    return res.json();
  }

  function cardsOutOfDate(counts) {
    return counts.cardsVersion !== undefined && counts.cardsVersion !== heldCards.cardsVersion;
  }

  async function refresh() {
    if (!window.Tabs.canRequest(TAB)) return;
    window.Tabs.spend(TAB);
    const config = await window.Tabs.config();
    const base = baseUrl(config);
    let counts;
    try {
      counts = await fetchObject(base + "/newest-counts.json");
    } catch {
      counts = null;
    }
    if (!counts) return;
    let cards = null;
    if (counts.membershipVersion !== state.membershipVersion || !heldCards || cardsOutOfDate(counts)) {
      try {
        cards = await fetchObject(base + "/newest.json");
      } catch {
        cards = null;
      }
      if (!cards) return;
    }
    applyObjects(counts, cards);
    await fetchOverlay();
  }

  // ---- The signed-in overlay: fetched, and refetched after a refusal, by Tabs ----

  function fetchOverlay() {
    return overlay.fetch();
  }

  // ---- The tab controller ----

  let activated = false;

  async function activate() {
    const config = await window.Tabs.config();
    if (!grid) {
      const panel = document.querySelector('.tab-panel[data-panel="newest"]');
      grid = window.Tabs.createGrid(panel.querySelector(".card-grid"), { showVote: true, showLive: true, retainMaximized: true, tab: TAB });
    }
    if (!activated) {
      activated = true;
      const copy = loadCopy();
      const limited = Boolean(window.TooManyLoads);
      if (copy && copy.counts && copy.cards && (limited || Date.now() - copy.receivedAt < recomputeIntervalMs(config))) {
        heldCards = copy.cards;
        applyObjects(copy.counts, copy.cards);
        state.receivedAt = copy.receivedAt;
        if (!limited) await fetchOverlay();
      }
      if (limited) {
        window.Tabs.notice("You are refreshing too quickly.");
        window.Tabs.holdOff(TAB, 60000);
        return;
      }
      await refresh();
      return;
    }
    if (grid) grid.render(state);
    if (Date.now() - state.receivedAt > window.Tabs.manualFloorMs()) await refresh();
  }

  window.Tabs.register(TAB, {
    guestsAllowed: true,
    state: state,
    get grid() { return grid; },
    activate: activate,
    refresh: refresh,
    reset() {
      state.overlay.clear();
      overlay.reset();
      state.order.forEach((pid) => grid && grid.reapply(state, pid));
      fetchOverlay();
    }
  });
})();
