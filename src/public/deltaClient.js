/*
  DELTA CLIENT — the version map one tab holds and the merge of a refresh response
  into it. Every instance-served tab (Your Polls, Shared With You, Your Votes, Watching,
  Search, Live Results) holds one of these; TRENDING holds the same shape fed from the two
  published objects. The card component renders from `toPollDetail`.
*/
(function () {
  "use strict";

  function createTabState() {
    return {
      membershipVersion: null,
      order: [],
      cards: new Map(),
      counts: new Map(),
      overlay: new Map(),
      receivedAt: 0
    };
  }

  /** The request body a refresh sends: what this tab already holds. */
  function versionsOf(state) {
    const versions = {};
    state.order.forEach((pid) => {
      const card = state.cards.get(pid);
      const counts = state.counts.get(pid);
      if (card) versions[pid] = [card.contentVersion, counts ? counts.countsVersion : 0];
    });
    return { membershipVersion: state.membershipVersion, versions };
  }

  /** Counts never step backwards: the higher countsVersion wins. */
  function applyCounters(state, counters) {
    Object.keys(counters || {}).forEach((pid) => {
      const next = counters[pid];
      const held = state.counts.get(pid);
      if (!held || next.countsVersion >= held.countsVersion) state.counts.set(pid, next);
    });
  }

  function applyCards(state, cards) {
    Object.keys(cards || {}).forEach((pid) => {
      const card = cards[pid];
      state.cards.set(pid, card);
      if (card.overlay) state.overlay.set(pid, card.overlay);
    });
  }

  function applyOrder(state, order) {
    state.order = order.slice();
    const keep = new Set(order);
    Array.from(state.cards.keys()).forEach((pid) => {
      if (!keep.has(pid)) {
        state.cards.delete(pid);
        state.counts.delete(pid);
        state.overlay.delete(pid);
      }
    });
  }

  /** Merges a 200 delta body; returns the pids whose card or counts changed. */
  function apply(state, body) {
    const changed = new Set();
    Object.keys(body.counters || {}).forEach((pid) => changed.add(pid));
    Object.keys(body.cards || {}).forEach((pid) => changed.add(pid));
    applyCounters(state, body.counters);
    applyCards(state, body.cards);
    if (body.order) applyOrder(state, body.order);
    if (body.membershipVersion !== undefined) state.membershipVersion = body.membershipVersion;
    state.receivedAt = Date.now();
    return changed;
  }

  function setOverlay(state, pid, entry) {
    state.overlay.set(pid, Object.assign({}, state.overlay.get(pid) || {}, entry));
  }

  /** The shape the card component renders: content + counts + the visitor's own state. */
  function toPollDetail(state, pid) {
    const card = state.cards.get(pid);
    if (!card) return null;
    if (card.notPublished) {
      return {
        pid: card.pid,
        notPublished: true,
        createdByName: card.createdByName || "",
        title: "",
        subtitle: "",
        pollState: "INITIALIZED",
        choices: [],
        totalVoted: 0,
        totalNotYetVoted: 0,
        myChoiceIds: [],
        bookmarked: false,
        canVote: false,
        contentVersion: 0,
        countsVersion: 0
      };
    }
    const counts = state.counts.get(pid) || { voteCount: 0, choiceCounts: {}, countsVersion: 0 };
    const overlay = state.overlay.get(pid) || card.overlay || null;
    const total = counts.voteCount;
    const share = percentDenominator(card.choiceMode, total, counts.choiceCounts, card.choices);
    const choices = card.choices.map((c) => {
      const count = counts.choiceCounts[c.id] || 0;
      return { id: c.id, label: c.label, position: c.position, color: c.color, count: count, pct: share > 0 ? Math.round((count / share) * 100) : 0 };
    });
    const detail = {
      pid: card.pid,
      title: card.title,
      subtitle: card.subtitle,
      choiceMode: card.choiceMode,
      voteMutability: card.voteMutability,
      pollVisibility: card.pollVisibility,
      pollState: card.pollState,
      lineGraphEnabled: card.lineGraphEnabled === true,
      startAt: card.startAt,
      endAt: card.endAt,
      choices: choices,
      totalVoted: total,
      totalNotYetVoted: 0,
      rejectionReason: card.rejectionReason || null,
      contentVersion: card.contentVersion,
      countsVersion: counts.countsVersion
    };
    if (overlay) {
      detail.myChoiceIds = overlay.choiceIds || [];
      detail.bookmarked = Boolean(overlay.bookmarked);
      detail.mayWatch = overlay.mayWatch !== false;
      detail.canVote = !overlay.voteBlockedReason;
      detail.voteBlockedReason = overlay.voteBlockedReason || null;
      // FIX020: the personal tabs say why a poll is listed. The server's relations
      // are brought up to date with what the user did since (a vote, a bookmark).
      if (Array.isArray(overlay.relations)) {
        const reasons = overlay.relations.filter((r) => r !== "bookmarked" && r !== "voted");
        if (overlay.voted || (overlay.choiceIds || []).length > 0 || overlay.relations.indexOf("voted") !== -1) reasons.push("voted");
        if (overlay.bookmarked) reasons.push("bookmarked");
        detail.listedBecause = reasons;
      }
    }
    return detail;
  }

  function percentDenominator(choiceMode, voteCount, choiceCounts, choices) {
    if (choiceMode !== "Multiple-Choice Poll") return voteCount;
    return choices.reduce((sum, c) => sum + (choiceCounts[c.id] || 0), 0);
  }

  window.DeltaClient = {
    percentDenominator: percentDenominator,
    createTabState: createTabState,
    versionsOf: versionsOf,
    apply: apply,
    applyCounters: applyCounters,
    setOverlay: setOverlay,
    toPollDetail: toPollDetail
  };
})();
