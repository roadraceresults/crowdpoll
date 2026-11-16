/*
  The maximized poll view's vote-history line graph. tabs.js mounts it into
  .maximized-graph on maximize and unmounts it on close; the series is
  computed by the service (GET /api/polls/:pid/line-graph) and rendered here
  as inline SVG. Line colours are data: the response's manual hex when a
  choice has one, else the colour the card assigned that choice
  (card.resultColors()), so the lines can never disagree with the bars.
*/
(function () {
  'use strict';

  const SVG_NS = 'http://www.w3.org/2000/svg';

  const SCALE_LABELS = { '1d': '1 Day', '1w': '1 Week', '1m': '1 Month', '1y': '1 Year' };

  const SPARSE_NOTE = 'Not enough voting data to graph yet';
  const UNAVAILABLE_NOTE = 'Results are not available yet';
  const FAILED_NOTE = 'Graph unavailable right now';

  const TOP_LINES = 10;
  const TOP_SHARE_PCT = 80;

  /* Dates and hours read the same on every device ("Apr 16, 2026", "3 PM"), whatever its language setting; the time zone stays the viewer's. */
  const DATE_LOCALE = 'en-US';

  const SEGMENT_KEY_STEPS = { ArrowLeft: -1, ArrowRight: 1 };

  let state = null;

  function colorOf(choiceId) {
    const series = state.data && state.data.series.find((s) => s.id === choiceId);
    if (series && series.color) return series.color;
    if (!state.cardColors) {
      state.cardColors = state.ctx.card && state.ctx.card.resultColors ? state.ctx.card.resultColors() : [];
    }
    const assigned = state.cardColors.find((c) => c.id === choiceId);
    return assigned ? assigned.hex : 'currentColor';
  }

  function surfaceHex() {
    for (let node = state.el; node; node = node.parentElement) {
      const match = /^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)$/.exec(getComputedStyle(node).backgroundColor);
      const alpha = match && match[4] !== undefined ? Number(match[4]) : 1;
      if (!match || alpha === 0) continue;
      if (alpha !== 1) return null;
      return '#' + match.slice(1, 4).map((v) => Number(v).toString(16).padStart(2, '0')).join('');
    }
    return null;
  }

  function lineColorOf(choiceId, surface) {
    const hex = colorOf(choiceId);
    return /^#[0-9a-f]{6}$/i.test(hex) ? window.PollCard.lineColorOn(hex, surface) : hex;
  }

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function svgEl(tag, attributes) {
    const node = document.createElementNS(SVG_NS, tag);
    for (const name of Object.keys(attributes || {})) node.setAttribute(name, attributes[name]);
    return node;
  }

  async function fetchSeries() {
    const res = await fetch('/api/polls/' + encodeURIComponent(state.ctx.pid) + '/line-graph');
    if (!res.ok) return { status: res.status };
    return { data: await res.json() };
  }

  /* The lines drawn and listed: the leading ones of a crowded graph until the viewer asks for all. */
  function drawnSeries() {
    const { series } = state.data;
    return state.showAll ? series : series.slice(0, leadingCount());
  }

  /* On a crowded graph: the lines whose current shares together reach TOP_SHARE_PCT of all the lines' shares,
     with those tied with the last of them, never more than TOP_LINES. */
  function leadingCount() {
    const shares = state.data.series.map(currentShare);
    if (shares.length <= TOP_LINES) return shares.length;
    const total = shares.reduce((sum, share) => sum + share, 0);
    let count = 1;
    for (let sum = shares[0]; count < TOP_LINES && sum * 100 < total * TOP_SHARE_PCT; count++) sum += shares[count];
    while (count < TOP_LINES && shares[count] === shares[count - 1]) count++;
    return count;
  }

  /* The drawn lines with the highlighted one last, so it is painted over the others. */
  function paintOrder() {
    const drawn = drawnSeries();
    return drawn.filter((series) => series.id !== state.highlightId).concat(drawn.filter((series) => series.id === state.highlightId));
  }

  function renderNote(text) {
    state.noteEl.textContent = text;
    state.noteEl.hidden = false;
    state.readoutEl.hidden = true;
    state.legendEl.hidden = true;
    state.showAllEl.hidden = true;
    state.scalesEl.hidden = true;
    state.graphEl.replaceChildren();
    state.graphEl.tabIndex = -1;
    state.view = null;
    state.crosshairTime = null;
    state.pinned = false;
  }

  function checkIcon() {
    const icon = svgEl('svg', { class: 'line-graph-segment-icon', 'aria-hidden': 'true', viewBox: '0 0 24 24', width: 18, height: 18 });
    icon.append(svgEl('path', { d: 'M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z', fill: 'currentColor' }));
    return icon;
  }

  function renderScales() {
    const { data } = state;
    const focused = state.scalesEl.contains(document.activeElement) ? document.activeElement.dataset.scale : null;
    state.scalesEl.hidden = false;
    state.scalesEl.replaceChildren();
    for (const scale of data.availableScales) {
      const selected = scale === data.scale;
      const button = el('button', 'line-graph-segment');
      button.type = 'button';
      button.dataset.scale = scale;
      button.setAttribute('aria-pressed', selected ? 'true' : 'false');
      button.tabIndex = (focused ? scale === focused : selected) ? 0 : -1;
      if (selected) button.append(checkIcon());
      button.append(SCALE_LABELS[scale] || scale);
      button.addEventListener('click', () => {
        if (state && state.scale !== scale) showScale(scale);
      });
      button.addEventListener('keydown', moveSegmentFocus);
      state.scalesEl.append(button);
      if (scale === focused) button.focus();
    }
  }

  function moveSegmentFocus(event) {
    const step = SEGMENT_KEY_STEPS[event.key];
    if (!step) return;
    event.preventDefault();
    const buttons = Array.from(state.scalesEl.children);
    const next = buttons[(buttons.indexOf(event.currentTarget) + step + buttons.length) % buttons.length];
    for (const button of buttons) button.tabIndex = button === next ? 0 : -1;
    next.focus();
  }

  function renderLegend() {
    const { data } = state;
    const surface = surfaceHex();
    const focused = state.legendEl.contains(document.activeElement) ? document.activeElement.dataset.choiceId : null;
    state.readoutEl.hidden = false;
    state.legendEl.hidden = false;
    // A browser may report the focused entry's removal as focus leaving the graph.
    state.rebuildingLegend = true;
    state.legendEl.replaceChildren();
    for (const series of drawnSeries()) {
      const entry = el('button', 'line-graph-legend-entry');
      entry.type = 'button';
      entry.dataset.choiceId = series.id;
      const dot = el('span', 'line-graph-dot');
      dot.style.background = lineColorOf(series.id, surface);
      entry.append(dot, el('span', 'line-graph-legend-label', series.label), el('span', 'line-graph-legend-pct'));
      entry.addEventListener('click', () => toggleHighlight(series.id));
      entry.addEventListener('keydown', onLegendKeydown);
      state.legendEl.append(entry);
      if (series.id === focused) entry.focus();
    }
    state.rebuildingLegend = false;
    // TWEAK03: "voters" only on a multiple-choice poll, read from the card the
    // mount context carries, so the noun always agrees with the card's own totals.
    const detail = state.ctx.card && state.ctx.card.detail ? state.ctx.card.detail() : null;
    const noun = detail && detail.choiceMode === 'Multiple-Choice Poll' ? ' voter' : ' vote';
    state.totalEl.textContent = data.totalVoted + noun + (data.totalVoted === 1 ? '' : 's');
    applyHighlight();
    updateReadout();
    layoutLegend();
  }

  /* The legend is a table filled column by column, each column as wide as its widest entry.
     An entry is as wide in one arrangement as in any other, so the widths are measured once
     and the arrangements are compared by arithmetic. */
  function layoutLegend() {
    const legend = state.legendEl;
    legend.classList.add('is-measuring');
    const widths = Array.from(legend.children, (entry) => Math.ceil(entry.getBoundingClientRect().width));
    legend.classList.remove('is-measuring');
    const gap = parseFloat(getComputedStyle(legend).columnGap) || 0;
    legend.style.setProperty('--line-graph-legend-rows', legendRows(widths, legend.getBoundingClientRect().width, gap));
  }

  /* The fewest rows whose columns fit the width: 1 row is tried, then 2, and so on.
     One entry per row is the answer when nothing narrower fits, or before the legend is laid out. */
  function legendRows(widths, available, gap) {
    const count = Math.max(widths.length, 1);
    if (!available) return count;
    for (let rows = 1; rows < count; rows++) {
      let total = -gap;
      for (let start = 0; start < count; start += rows) total += gap + Math.max(...widths.slice(start, start + rows));
      if (total <= available) return rows;
    }
    return count;
  }

  /* The readout: the time label and every legend entry's share, at the selected time or the latest. */
  function updateReadout() {
    const { buckets } = state.data;
    const selected = buckets.indexOf(state.crosshairTime);
    const index = selected === -1 ? buckets.length - 1 : selected;
    state.readoutTimeEl.textContent = state.crosshairTime === null ? 'Latest' : readoutTimeText(buckets[index]);
    const byId = new Map(drawnSeries().map((series) => [series.id, series]));
    for (const entry of state.legendEl.children) {
      entry.querySelector('.line-graph-legend-pct').textContent = byId.get(entry.dataset.choiceId).points[index] + '%';
    }
  }

  function applyHighlight() {
    state.rootEl.classList.toggle('has-highlight', state.highlightId !== null);
    for (const entry of state.legendEl.children) {
      entry.setAttribute('aria-pressed', entry.dataset.choiceId === state.highlightId ? 'true' : 'false');
    }
  }

  function toggleHighlight(choiceId) {
    state.highlightId = state.highlightId === choiceId ? null : choiceId;
    applyHighlight();
    renderSvg();
  }

  function onLegendKeydown(event) {
    const choiceId = event.currentTarget.dataset.choiceId;
    if (event.key !== 'Escape' || state.highlightId !== choiceId) return;
    event.preventDefault();
    event.stopPropagation();
    toggleHighlight(choiceId);
  }

  function renderShowAll() {
    const count = state.data.series.length;
    state.showAllEl.hidden = count <= TOP_LINES;
    state.showAllEl.textContent = (state.showAll ? 'Show top ' + leadingCount() : 'Show all ' + count) + ' choices';
  }

  function hourlyScale(scale) {
    return scale === '1d' || scale === '1w';
  }

  /* Set without spaces ("Nov14", "3PM"), so the labels stay clear of each other. */
  function xLabelText(bucketMs) {
    const options = hourlyScale(state.data.scale) ? { hour: 'numeric' } : { month: 'short', day: 'numeric' };
    return new Intl.DateTimeFormat(DATE_LOCALE, options).format(new Date(bucketMs)).replace(/\s/g, '');
  }

  function readoutTimeText(bucketMs) {
    const options = hourlyScale(state.data.scale)
      ? { month: 'short', day: 'numeric', hour: 'numeric' }
      : { year: 'numeric', month: 'short', day: 'numeric' };
    return new Intl.DateTimeFormat(DATE_LOCALE, options).format(new Date(bucketMs));
  }

  function nearestBucketIndex(clientX) {
    const view = state.view;
    const rect = view.svg.getBoundingClientRect();
    // Without a laid-out rect (jsdom), clientX is already a viewBox coordinate.
    const xIn = rect.width > 0 ? ((clientX - rect.left) * view.width) / rect.width : clientX;
    let nearest = 0;
    for (let i = 1; i < view.xs.length; i++) {
      if (Math.abs(xIn - view.xs[i]) < Math.abs(xIn - view.xs[nearest])) nearest = i;
    }
    return nearest;
  }

  function placeCrosshair(index) {
    const view = state.view;
    state.crosshairTime = state.data.buckets[index];
    if (!view.crosshair) {
      view.crosshair = svgEl('line', { class: 'line-graph-crosshair' });
      view.svg.append(view.crosshair);
    }
    view.crosshair.setAttribute('x1', view.xs[index]);
    view.crosshair.setAttribute('x2', view.xs[index]);
    view.crosshair.setAttribute('y1', view.padTop);
    view.crosshair.setAttribute('y2', view.plotBottom);

    const surface = surfaceHex();
    for (const marker of view.markers) marker.remove();
    view.markers = paintOrder().map((series) =>
      svgEl('circle', {
        class: series.id === state.highlightId ? 'line-graph-marker is-highlighted' : 'line-graph-marker',
        cx: view.xs[index],
        cy: view.y(series.points[index]),
        r: 4,
        fill: lineColorOf(series.id, surface)
      })
    );
    view.svg.append(...view.markers);
    updateReadout();
  }

  function clearCrosshair() {
    const view = state.view;
    if (!view) return;
    if (view.crosshair) view.crosshair.remove();
    for (const marker of view.markers) marker.remove();
    view.crosshair = null;
    view.markers = [];
    state.crosshairTime = null;
    state.pinned = false;
    state.liveEl.textContent = '';
    updateReadout();
  }

  function announce(index) {
    const shares = drawnSeries().map((series) => series.label + ' ' + series.points[index] + '%');
    state.liveEl.textContent = [readoutTimeText(state.data.buckets[index])].concat(shares).join(', ');
  }

  function placeFromKeyboard(index) {
    placeCrosshair(index);
    announce(index);
  }

  function onPlotFocus() {
    const placedByPointer = state.pointerPlaced;
    state.pointerPlaced = false;
    if (placedByPointer || !state.view) return;
    placeFromKeyboard(state.data.buckets.length - 1);
  }

  /* A press on, or focus moving to, the plot, the legend or the show-all button keeps the selected time. */
  function keepsSelection(node) {
    return state.graphEl.contains(node) || state.legendEl.contains(node) || state.showAllEl.contains(node);
  }

  function onGraphFocusOut(event) {
    if (state.rebuildingLegend) return;
    if (event.target === state.graphEl) state.pointerPlaced = false;
    // Without a next target (a browser that does not focus a pressed button), the last press decides.
    const kept = event.relatedTarget ? keepsSelection(event.relatedTarget) : state.pressedInside;
    if (!kept) clearCrosshair();
  }

  function onPlotKeydown(event) {
    if (!state.view) return;
    const last = state.data.buckets.length - 1;
    const shown = state.data.buckets.indexOf(state.crosshairTime);
    const current = shown === -1 ? last : shown;
    const targets = { ArrowLeft: current - 1, ArrowRight: current + 1, Home: 0, End: last };
    if (event.key === 'Escape') {
      if (shown === -1) return;
      event.preventDefault();
      event.stopPropagation();
      clearCrosshair();
      return;
    }
    if (!(event.key in targets)) return;
    event.preventDefault();
    placeFromKeyboard(Math.min(Math.max(targets[event.key], 0), last));
  }

  const AXIS_TOPS = [25, 50, 75, 100];

  function axisTopFor(series) {
    const highest = Math.max(0, ...series.flatMap((s) => s.points));
    return AXIS_TOPS.find((top) => highest <= top) || 100;
  }

  function renderSvg() {
    const { data } = state;
    const keptTime = state.crosshairTime;
    const surface = surfaceHex();
    const width = Math.max(state.el.clientWidth, 320);
    const height = 280;
    const pad = { top: 12, right: 14, bottom: 26, left: 40 };
    const innerWidth = width - pad.left - pad.right;
    const innerHeight = height - pad.top - pad.bottom;
    const first = data.buckets[0];
    const span = data.buckets[data.buckets.length - 1] - first || 1;
    const x = (t) => pad.left + ((t - first) / span) * innerWidth;
    const top = axisTopFor(drawnSeries());
    const step = top === 100 ? 25 : top / 5;
    const y = (pct) => pad.top + ((top - pct) / top) * innerHeight;

    const svg = svgEl('svg', {
      class: 'line-graph-svg',
      'aria-hidden': 'true',
      viewBox: '0 0 ' + width + ' ' + height,
      preserveAspectRatio: 'none'
    });

    for (let pct = 0; pct <= top; pct += step) {
      svg.append(svgEl('line', { class: pct === 0 ? 'line-graph-grid line-graph-baseline' : 'line-graph-grid', x1: pad.left, y1: y(pct), x2: width - pad.right, y2: y(pct) }));
      const label = svgEl('text', { x: pad.left - 6, y: y(pct), 'text-anchor': 'end', 'dominant-baseline': 'middle' });
      label.textContent = pct + '%';
      svg.append(label);
    }

    const labelStep = Math.max(1, Math.round(data.buckets.length / 6));
    for (let i = 0; i < data.buckets.length - 1; i += labelStep) {
      const label = svgEl('text', { x: x(data.buckets[i]), y: height - 8, 'text-anchor': 'middle' });
      label.textContent = xLabelText(data.buckets[i]);
      svg.append(label);
    }

    for (const series of paintOrder()) {
      svg.append(
        svgEl('polyline', {
          class: series.id === state.highlightId ? 'line-graph-line is-highlighted' : 'line-graph-line',
          'data-choice-id': series.id,
          fill: 'none',
          stroke: lineColorOf(series.id, surface),
          points: series.points.map((pct, i) => x(data.buckets[i]) + ',' + y(pct)).join(' ')
        })
      );
    }

    state.view = {
      svg: svg,
      width: width,
      padTop: pad.top,
      plotBottom: height - pad.bottom,
      xs: data.buckets.map(x),
      y: y,
      crosshair: null,
      markers: []
    };
    const place = (event) => placeCrosshair(nearestBucketIndex(event.clientX));
    // A pressed time is pinned: the mouse moves it again only as a drag or with another press.
    svg.addEventListener('pointermove', (event) => {
      if (state.pinned && event.pointerType !== 'touch' && event.buttons === 0) return;
      place(event);
    });
    svg.addEventListener('pointerdown', (event) => {
      state.pointerPlaced = true;
      state.pinned = true;
      place(event);
    });
    svg.addEventListener('pointerleave', (event) => {
      if (event.pointerType !== 'touch' && !state.pinned) clearCrosshair();
    });

    state.graphEl.replaceChildren(svg);
    state.crosshairTime = null;
    if (keptTime !== null) {
      const index = data.buckets.indexOf(keptTime);
      placeCrosshair(index === -1 ? data.buckets.length - 1 : index);
    }
  }

  function render() {
    if (!state.data) return;
    if (state.data.buckets.length < 2) {
      renderNote(SPARSE_NOTE);
      return;
    }
    state.noteEl.hidden = true;
    state.graphEl.tabIndex = 0;
    if (!drawnSeries().some((series) => series.id === state.highlightId)) state.highlightId = null;
    renderLegend();
    renderShowAll();
    renderSvg();
    renderScales();
  }

  function currentShare(series) {
    return series.points[series.points.length - 1] || 0;
  }

  /* The response carries every available scale, each with its series in choice order;
     state.data is the one drawn, its series ordered by current share (a stable sort,
     so equal shares keep the choice order). */
  function showScale(scale) {
    const { response } = state;
    const previous = state.data && state.data.scale;
    state.scale = response.availableScales.includes(scale) ? scale : response.defaultScale;
    if (previous !== state.scale) {
      state.crosshairTime = null;
      state.pinned = false;
    }
    const view = response.scales[state.scale];
    state.data = {
      scale: state.scale,
      availableScales: response.availableScales,
      totalVoted: response.totalVoted,
      buckets: view.buckets,
      series: view.series.slice().sort((a, b) => currentShare(b) - currentShare(a))
    };
    render();
  }

  async function load() {
    const mounted = state;
    try {
      const answer = await fetchSeries();
      if (state !== mounted) return;
      if (answer.data) {
        state.response = answer.data;
        showScale(state.scale);
        return;
      }
      if (answer.status === 404) {
        stopRefresh();
        renderNote(UNAVAILABLE_NOTE);
        return;
      }
      loadFailed();
    } catch (err) {
      if (state !== mounted) return;
      loadFailed();
    }
  }

  /* A failed first load shows the quiet placeholder; a failed refresh keeps the
     last drawn graph and retries on the next tick. */
  function loadFailed() {
    if (!state.data) {
      renderNote(FAILED_NOTE);
      return;
    }
    if (!state.warned) {
      state.warned = true;
      console.warn('[line-graph] refresh failed; keeping the last drawn graph');
    }
  }

  function startRefresh() {
    const mounted = state;
    const config = window.SiteConfig;
    if (!config || typeof config.then !== 'function') return;
    config.then(function (siteConfig) {
      if (state !== mounted || !siteConfig || !siteConfig.lineGraphRefreshIntervalMs) return;
      mounted.timer = setInterval(function () {
        void load();
      }, siteConfig.lineGraphRefreshIntervalMs);
    }, function () {});
  }

  function stopRefresh() {
    if (state && state.timer) {
      clearInterval(state.timer);
      state.timer = null;
    }
  }

  function mount(element, ctx) {
    if (!element) return;
    unmount();
    state = {
      el: element,
      ctx: ctx,
      scale: null,
      response: null,
      data: null,
      cardColors: null,
      timer: null,
      warned: false,
      crosshairTime: null,
      pinned: false,
      pressedInside: false,
      showAll: false,
      highlightId: null,
      rebuildingLegend: false,
      pointerPlaced: false,
      liveEl: null,
      schemeObserver: null,
      onDocumentPointerDown: null
    };

    const root = el('div', 'line-graph');
    state.rootEl = root;
    state.noteEl = el('p', 'line-graph-note');
    state.noteEl.hidden = true;
    state.readoutEl = el('div', 'line-graph-readout');
    state.readoutEl.hidden = true;
    state.readoutTimeEl = el('span', 'line-graph-readout-time');
    state.totalEl = el('span', 'line-graph-total');
    state.readoutEl.append(state.readoutTimeEl, state.totalEl);
    state.legendEl = el('div', 'line-graph-legend');
    state.legendEl.hidden = true;
    state.showAllEl = el('button', 'line-graph-show-all');
    state.showAllEl.type = 'button';
    state.showAllEl.hidden = true;
    state.showAllEl.addEventListener('click', () => {
      state.showAll = !state.showAll;
      render();
    });
    state.graphEl = el('div', 'line-graph-plot');
    state.scalesEl = el('div', 'line-graph-scales');
    state.scalesEl.hidden = true;
    state.scalesEl.setAttribute('role', 'group');
    state.scalesEl.setAttribute('aria-label', 'Time scale');
    const controls = el('div', 'line-graph-controls');
    const controlsStart = el('div', 'line-graph-controls-start');
    controlsStart.append(state.showAllEl);
    controls.append(controlsStart, state.scalesEl);
    state.graphEl.tabIndex = 0;
    state.graphEl.setAttribute('role', 'group');
    state.graphEl.setAttribute('aria-label', 'Vote share over time for ' + (ctx.title || '') + '. Use the Left and Right arrow keys to read the values.');
    state.graphEl.addEventListener('focus', onPlotFocus);
    state.graphEl.addEventListener('keydown', onPlotKeydown);
    state.liveEl = el('p', 'line-graph-live');
    state.liveEl.setAttribute('aria-live', 'polite');
    root.addEventListener('focusout', onGraphFocusOut);
    root.addEventListener('keydown', () => {
      state.pressedInside = false;
    });
    root.append(
      el('h2', 'line-graph-title', ctx.title || ''),
      el('p', 'line-graph-subtitle', ctx.subtitle || ''),
      state.noteEl,
      state.readoutEl,
      state.legendEl,
      state.graphEl,
      controls,
      state.liveEl
    );
    element.replaceChildren(root);

    if (typeof ResizeObserver !== 'undefined') {
      state.observer = new ResizeObserver(() => {
        if (!state || !state.data || state.data.buckets.length < 2) return;
        layoutLegend();
        renderSvg();
      });
      state.observer.observe(element);
    }

    // The page's color scheme is the data-theme attribute on <html>, set by colorScheme.js.
    state.schemeObserver = new MutationObserver(() => {
      if (!state || !state.data || state.data.buckets.length < 2) return;
      renderLegend();
      renderSvg();
    });
    state.schemeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    state.onDocumentPointerDown = (event) => {
      state.pressedInside = keepsSelection(event.target);
      if (state.crosshairTime !== null && !state.pressedInside) clearCrosshair();
    };
    document.addEventListener('pointerdown', state.onDocumentPointerDown);

    void load();
    startRefresh();
  }

  function unmount() {
    if (!state) return;
    stopRefresh();
    if (state.observer) state.observer.disconnect();
    state.schemeObserver.disconnect();
    if (state.onDocumentPointerDown) document.removeEventListener('pointerdown', state.onDocumentPointerDown);
    state.el.replaceChildren();
    state = null;
  }

  window.M3Ripple?.add('.line-graph-segment');
  window.M3Ripple?.add('.line-graph-legend-entry');
  window.M3Ripple?.add('.line-graph-show-all');

  window.PollLineGraph = { mount: mount, unmount: unmount };
})();
