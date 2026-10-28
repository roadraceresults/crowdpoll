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
  }

  function renderScales() {
    const { data } = state;
    state.scalesEl.hidden = false;
    state.scalesEl.replaceChildren();
    for (const scale of data.availableScales) {
      const button = el('button', 'line-graph-scale', SCALE_LABELS[scale] || scale);
      button.type = 'button';
      button.classList.toggle('is-selected', scale === data.scale);
      button.setAttribute('aria-pressed', scale === data.scale ? 'true' : 'false');
      button.addEventListener('click', () => {
        if (state && state.scale !== scale) showScale(scale);
      });
      state.scalesEl.append(button);
    }
  }

  function renderLegend() {
    const { data } = state;
    state.legendEl.hidden = false;
    state.legendEl.replaceChildren();
    for (const series of data.series) {
      const entry = el('span', 'line-graph-legend-entry');
      const dot = el('span', 'line-graph-dot');
      dot.style.background = colorOf(series.id);
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
    view.tooltip.replaceChildren(el('div', 'line-graph-tooltip-time', tooltipTimeText(state.data.buckets[index])));
    for (const series of state.data.series) {
      const entry = el('div', 'line-graph-tooltip-entry');
      const dot = el('span', 'line-graph-dot');
      dot.style.background = colorOf(series.id);
      entry.append(dot, el('span', 'line-graph-tooltip-label', series.label), el('span', 'line-graph-tooltip-pct', series.points[index] + '%'));
      view.tooltip.append(entry);
    }
    view.tooltip.style.left = (view.xs[index] / view.width) * 100 + '%';
  }

  function clearCrosshair() {
    const view = state.view;
    if (view.crosshair) view.crosshair.remove();
    if (view.tooltip) view.tooltip.remove();
    view.crosshair = null;
    view.tooltip = null;
  }

  function renderSvg() {
    const { data } = state;
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
      role: 'img',
      'aria-label': 'Vote share over time for ' + state.ctx.title,
      viewBox: '0 0 ' + width + ' ' + height,
      preserveAspectRatio: 'none'
    });

    for (const pct of [0, 25, 50, 75, 100]) {
      svg.append(svgEl('line', { class: 'line-graph-grid', x1: pad.left, y1: y(pct), x2: width - pad.right, y2: y(pct) }));
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
          stroke: colorOf(series.id),
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
      crosshair: null,
      tooltip: null
    };
    const place = (event) => placeCrosshair(nearestBucketIndex(event.clientX));
    svg.addEventListener('pointermove', place);
    svg.addEventListener('pointerdown', place);
    svg.addEventListener('pointerleave', clearCrosshair);

    state.graphEl.replaceChildren(svg);
  }

  function render() {
    if (!state.data) return;
    if (state.data.buckets.length < 2) {
      renderNote(SPARSE_NOTE);
      return;
    }
    state.noteEl.hidden = true;
    renderLegend();
    renderSvg();
    renderScales();
  }

  /* The response carries every available scale; state.data is the one drawn. */
  function showScale(scale) {
    const { response } = state;
    state.scale = response.availableScales.includes(scale) ? scale : response.defaultScale;
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
    state = { el: element, ctx: ctx, scale: null, response: null, data: null, cardColors: null, timer: null, warned: false };

    const root = el('div', 'line-graph');
    state.noteEl = el('p', 'line-graph-note');
    state.noteEl.hidden = true;
    state.legendEl = el('div', 'line-graph-legend');
    state.legendEl.hidden = true;
    state.graphEl = el('div', 'line-graph-plot');
    state.scalesEl = el('div', 'line-graph-scales');
    state.scalesEl.hidden = true;
    root.append(el('h2', 'line-graph-title', ctx.title || ''), el('p', 'line-graph-subtitle', ctx.subtitle || ''), state.noteEl, state.legendEl, state.graphEl, state.scalesEl);
    element.replaceChildren(root);

    if (typeof ResizeObserver !== 'undefined') {
      state.observer = new ResizeObserver(() => {
        if (state && state.data && state.data.buckets.length >= 2) renderSvg();
      });
      state.observer.observe(element);
    }

    void load();
    startRefresh();
  }

  function unmount() {
    if (!state) return;
    stopRefresh();
    if (state.observer) state.observer.disconnect();
    state.el.replaceChildren();
    state = null;
  }

  window.PollLineGraph = { mount: mount, unmount: unmount };
})();
