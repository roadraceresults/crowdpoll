/*
  SEARCH TAB — Enter in the search box runs one search (search floor), selects
  the Search tab, clears the box and renders the results; Refresh re-runs the
  last query under the manual floor. Results are never refreshed on their own.
*/
(function () {
  "use strict";

  const TAB = "search";
  const state = window.DeltaClient.createTabState();
  let grid = null;
  let lastQuery = "";

  function ensureGrid() {
    if (!grid) {
      const panel = document.querySelector('.tab-panel[data-panel="search"]');
      grid = window.Tabs.createGrid(panel.querySelector(".card-grid"), { showVote: false, showLive: true, tab: TAB });
    }
    return grid;
  }

  function applyResults(body) {
    const cards = {};
    const counters = {};
    body.results.forEach((card) => {
      counters[card.pid] = card.counts;
      const copy = Object.assign({}, card);
      delete copy.counts;
      cards[card.pid] = copy;
    });
    const changed = window.DeltaClient.apply(state, {
      cards: cards,
      counters: counters,
      order: body.results.map((c) => c.pid),
      membershipVersion: null
    });
    ensureGrid().render(state, changed);
    if (state.order.length === 0) window.Tabs.emptyState(TAB, "No polls match your search.");
    else if (body.truncated) window.Tabs.emptyState(TAB, "More results are not shown. Try more specific words.");
    else window.Tabs.emptyState(TAB, "");
    fetchOverlay();
  }

  const overlay = window.Tabs.createOverlayFetcher(state, () => grid);
  function fetchOverlay() {
    return overlay.fetch();
  }

  /* FIX014: the X in the header clears the search itself — results, query and
     overlay — and the tab, selected, asks for terms again. */
  async function clear() {
    lastQuery = "";
    showTermsInField("");
    overlay.reset();
    window.DeltaClient.apply(state, { order: [], counters: {}, cards: {}, membershipVersion: null });
    state.overlay.clear();
    ensureGrid().render(state);
    await window.Tabs.select(TAB);
    window.Tabs.emptyState(TAB, "Enter your search terms in the 'Search CrowdPoll' field above.");
  }

  /* Enter is a search-kind request; the tab's Refresh re-runs the query as a
     refresh-kind one (FR-025), each spending a token of its own kind. */
  async function run(url, query, kind) {
    lastQuery = query;
    await window.Tabs.dynamicRequest(
      TAB,
      url,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ q: query }) },
      async (body) => {
        if (body) applyResults(body);
      },
      null,
      kind
    );
  }

  /* Enter or the magnifier in the header (FIX013): with terms, the Search tab is
     selected and the search runs; without, the tab is selected and asks for terms. */
  async function submit(query) {
    const q = (query || "").trim();
    showTermsInField(q);
    ensureGrid();
    if (!q) {
      await window.Tabs.select(TAB);
      return;
    }
    if (!window.Tabs.canRequest(TAB, "search")) return;
    await window.Tabs.select(TAB);
    await run("/api/search", q, "search");
  }

  function termsField() {
    return document.getElementById("searchTabBox");
  }

  function showTermsInField(terms) {
    const box = termsField();
    const clearButton = document.getElementById("searchTabClear");
    if (box) box.value = terms;
    if (clearButton) clearButton.hidden = terms.length === 0;
  }

  function isOnScreen(element) {
    const form = element.closest("form");
    return !element.closest("[hidden]") && getComputedStyle(form || element).display !== "none";
  }

  document.addEventListener("submit", (event) => {
    if (!event.target || event.target.id !== "searchTabForm") return;
    event.preventDefault();
    submit(termsField().value);
  });
  document.addEventListener("input", (event) => {
    if (event.target && event.target.id === "searchTabBox") showTermsInField(event.target.value);
  });
  document.addEventListener("click", async (event) => {
    if (!event.target || !event.target.closest || !event.target.closest("#searchTabClear")) return;
    await clear();
    termsField().focus();
  });
  document.addEventListener(
    "keydown",
    (event) => {
      if (event.key !== "/" || event.altKey || event.ctrlKey || event.metaKey) return;
      const target = event.target;
      const typing = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
      const box = termsField();
      if (typing || !box || !isOnScreen(box)) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      box.focus();
      box.select();
    },
    true
  );

  window.Tabs.register(TAB, {
    guestsAllowed: true,
    state: state,
    get grid() { return grid; },
    async activate() {
      ensureGrid().render(state);
      if (state.order.length === 0 && !lastQuery) window.Tabs.emptyState(TAB, "Enter your search terms in the 'Search CrowdPoll' field above.");
    },
    async refresh() {
      if (!lastQuery || !window.Tabs.canRequest(TAB, "refresh")) return;
      await run("/api/search/refresh", lastQuery, "refresh");
    },
    reset() {
      state.overlay.clear();
      overlay.reset();
      state.order.forEach((pid) => grid && grid.reapply(state, pid));
      fetchOverlay();
    }
  });

  window.SearchTab = {
    state: state,
    submit: submit,
    clear: clear,
    updateOverlay: (pid, entry) => { window.DeltaClient.setOverlay(state, pid, entry); if (grid) grid.reapply(state, pid); }
  };
})();
