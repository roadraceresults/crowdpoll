/*
  The maximized poll view's vote-history line graph. tabs.js mounts it into
  .maximized-space-right on maximize and unmounts it on close; the series is
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

  const TOOLTIP_GAP = 12;
  const TOOLTIP_TOP = 8;

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
    const match = /^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)$/.exec(getComputedStyle(state.el).backgroundColor);
    if (!match || (match[4] !== undefined && Number(match[4]) !== 1)) return null;
    return '#' + match.slice(1, 4).map((v) => Number(v).toString(16).padStart(2, '0')).join('');
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

  function renderNote(text) {
    state.noteEl.textContent = text;
    state.noteEl.hidden = false;
    state.legendEl.hidden = true;
    state.scalesEl.hidden = true;
    state.graphEl.replaceChildren();
    state.graphEl.tabIndex = -1;
    state.view = null;
    state.crosshairTime = null;
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
    state.legendEl.hidden = false;
    state.legendEl.replaceChildren();
    for (const series of data.series) {
      const entry = el('span', 'line-graph-legend-entry');
      const dot = el('span', 'line-graph-dot');
      dot.style.background = lineColorOf(series.id, surface);
      entry.append(dot, el('span', 'line-graph-legend-label', series.label), el('span', 'line-graph-legend-pct', series.points[series.points.length - 1] + '%'));
      state.legendEl.append(entry);
    }
    state.legendEl.append(el('span', 'line-graph-total', data.totalVoted + ' vote' + (data.totalVoted === 1 ? '' : 's')));
  }

  function hourlyScale(scale) {
    return scale === '1d' || scale === '1w';
  }

  function xLabelText(bucketMs) {
    const options = hourlyScale(state.data.scale) ? { hour: 'numeric' } : { month: 'short', day: 'numeric' };
    return new Intl.DateTimeFormat(undefined, options).format(new Date(bucketMs));
  }

  function tooltipTimeText(bucketMs) {
    const options = hourlyScale(state.data.scale)
      ? { month: 'short', day: 'numeric', hour: 'numeric' }
      : { year: 'numeric', month: 'short', day: 'numeric' };
    return new Intl.DateTimeFormat(undefined, options).format(new Date(bucketMs));
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

    if (!view.tooltip) {
      view.tooltip = el('div', 'line-graph-tooltip');
      state.graphEl.append(view.tooltip);
    }
    const surface = surfaceHex();
    view.tooltip.replaceChildren(el('div', 'line-graph-tooltip-time', tooltipTimeText(state.data.buckets[index])));
    for (const series of state.data.series) {
      const entry = el('div', 'line-graph-tooltip-entry');
      const dot = el('span', 'line-graph-dot');
      dot.style.background = lineColorOf(series.id, surface);
      entry.append(dot, el('span', 'line-graph-tooltip-label', series.label), el('span', 'line-graph-tooltip-pct', series.points[index] + '%'));
      view.tooltip.append(entry);
    }
    positionTooltip(index);

    for (const marker of view.markers) marker.remove();
    view.markers = state.data.series.map((series) =>
      svgEl('circle', { class: 'line-graph-marker', cx: view.xs[index], cy: view.y(series.points[index]), r: 4, fill: lineColorOf(series.id, surface) })
    );
    view.svg.append(...view.markers);
  }

  function positionTooltip(index) {
    const view = state.view;
    const plotWidth = state.graphEl.clientWidth;
    const crosshairX = (view.xs[index] / view.width) * plotWidth;
    const tooltipWidth = view.tooltip.offsetWidth;
    let left = crosshairX + TOOLTIP_GAP;
    if (left + tooltipWidth > plotWidth) left = crosshairX - TOOLTIP_GAP - tooltipWidth;
    left = Math.min(Math.max(left, 0), Math.max(0, plotWidth - tooltipWidth));
    view.tooltip.style.left = left + 'px';
    view.tooltip.style.top = TOOLTIP_TOP + 'px';
  }

  function clearCrosshair() {
    const view = state.view;
    if (!view) return;
    if (view.crosshair) view.crosshair.remove();
    if (view.tooltip) view.tooltip.remove();
    for (const marker of view.markers) marker.remove();
    view.crosshair = null;
    view.tooltip = null;
    view.markers = [];
    state.crosshairTime = null;
    state.liveEl.textContent = '';
  }

  function announce(index) {
    const shares = state.data.series.map((series) => series.label + ' ' + series.points[index] + '%');
    state.liveEl.textContent = [tooltipTimeText(state.data.buckets[index])].concat(shares).join(', ');
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

  function onPlotBlur() {
    state.pointerPlaced = false;
    clearCrosshair();
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
    const y = (pct) => pad.top + ((100 - pct) / 100) * innerHeight;

    const svg = svgEl('svg', {
      class: 'line-graph-svg',
      'aria-hidden': 'true',
      viewBox: '0 0 ' + width + ' ' + height,
      preserveAspectRatio: 'none'
    });

    for (const pct of [0, 25, 50, 75, 100]) {
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

    for (const series of data.series) {
      svg.append(
        svgEl('polyline', {
          class: 'line-graph-line',
          'data-choice-id': series.id,
          fill: 'none',
          stroke: lineColorOf(series.id, surface),
          'stroke-width': 2,
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
      tooltip: null,
      markers: []
    };
    const place = (event) => placeCrosshair(nearestBucketIndex(event.clientX));
    svg.addEventListener('pointermove', place);
    svg.addEventListener('pointerdown', (event) => {
      state.pointerPlaced = true;
      place(event);
    });
    svg.addEventListener('pointerleave', (event) => {
      if (event.pointerType !== 'touch') clearCrosshair();
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
    renderLegend();
    renderSvg();
    renderScales();
  }

  /* The response carries every available scale; state.data is the one drawn. */
  function showScale(scale) {
    const { response } = state;
    const previous = state.data && state.data.scale;
    state.scale = response.availableScales.includes(scale) ? scale : response.defaultScale;
    if (previous !== state.scale) state.crosshairTime = null;
    const view = response.scales[state.scale];
    state.data = {
      scale: state.scale,
      availableScales: response.availableScales,
      totalVoted: response.totalVoted,
      buckets: view.buckets,
      series: view.series
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
      pointerPlaced: false,
      liveEl: null,
      colorScheme: null,
      onSchemeChange: null,
      onDocumentPointerDown: null
    };

    const root = el('div', 'line-graph');
    state.noteEl = el('p', 'line-graph-note');
    state.noteEl.hidden = true;
    state.legendEl = el('div', 'line-graph-legend');
    state.legendEl.hidden = true;
    state.graphEl = el('div', 'line-graph-plot');
    state.scalesEl = el('div', 'line-graph-scales');
    state.scalesEl.hidden = true;
    state.scalesEl.setAttribute('role', 'group');
    state.scalesEl.setAttribute('aria-label', 'Time scale');
    state.graphEl.tabIndex = 0;
    state.graphEl.setAttribute('role', 'group');
    state.graphEl.setAttribute('aria-label', 'Vote share over time for ' + (ctx.title || '') + '. Use the Left and Right arrow keys to read the values.');
    state.graphEl.addEventListener('focus', onPlotFocus);
    state.graphEl.addEventListener('blur', onPlotBlur);
    state.graphEl.addEventListener('keydown', onPlotKeydown);
    state.liveEl = el('p', 'line-graph-live');
    state.liveEl.setAttribute('aria-live', 'polite');
    root.append(el('h2', 'line-graph-title', ctx.title || ''), el('p', 'line-graph-subtitle', ctx.subtitle || ''), state.noteEl, state.legendEl, state.graphEl, state.scalesEl, state.liveEl);
    element.replaceChildren(root);

    if (typeof ResizeObserver !== 'undefined') {
      state.observer = new ResizeObserver(() => {
        if (state && state.data && state.data.buckets.length >= 2) renderSvg();
      });
      state.observer.observe(element);
    }

    if (typeof window.matchMedia === 'function') {
      state.colorScheme = window.matchMedia('(prefers-color-scheme: dark)');
      state.onSchemeChange = () => {
        if (!state || !state.data || state.data.buckets.length < 2) return;
        renderLegend();
        renderSvg();
      };
      state.colorScheme.addEventListener('change', state.onSchemeChange);
    }

    state.onDocumentPointerDown = (event) => {
      if (state.crosshairTime !== null && !state.graphEl.contains(event.target)) clearCrosshair();
    };
    document.addEventListener('pointerdown', state.onDocumentPointerDown);

    void load();
    startRefresh();
  }

  function unmount() {
    if (!state) return;
    stopRefresh();
    if (state.observer) state.observer.disconnect();
    if (state.colorScheme) state.colorScheme.removeEventListener('change', state.onSchemeChange);
    if (state.onDocumentPointerDown) document.removeEventListener('pointerdown', state.onDocumentPointerDown);
    state.el.replaceChildren();
    state = null;
  }

  window.M3Ripple?.add('.line-graph-segment');

  window.PollLineGraph = { mount: mount, unmount: unmount };
})();
