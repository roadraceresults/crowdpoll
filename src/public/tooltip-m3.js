/* Material 3 plain tooltip: https://m3.material.io/components/tooltips/guidelines */
(function () {
  'use strict';

  const SHOW_DELAY_MS = 500;
  const HIDE_DELAY_MS = 150;
  const LONG_PRESS_MS = 500;
  const TOUCH_SHOW_MS = 1500;
  const TOUCH_SLOP_PX = 10;
  const GAP_PX = 4;
  const EDGE_PX = 8;
  const ROW_LABELS = [['result-row', '.result-label'], ['vote-row', '.vote-label']];

  const tip = document.createElement('div');
  tip.className = 'm3-tooltip';
  tip.setAttribute('aria-hidden', 'true');
  tip.hidden = true;
  document.body.appendChild(tip);

  let anchor = null;
  let pending = null;
  let showTimer = 0;
  let hideTimer = 0;
  let press = null;
  let swallowClick = false;
  let keyboard = false;

  function adopt(el) {
    if (!(el instanceof Element) || !el.hasAttribute('title') || el === tip) return;
    const text = el.getAttribute('title');
    el.removeAttribute('title');
    if (text) el.dataset.tooltip = text;
    else delete el.dataset.tooltip;
    if (el === anchor) {
      if (text) show(el);
      else hide();
    }
  }

  function adoptAll(node) {
    if (!(node instanceof Element)) return;
    adopt(node);
    node.querySelectorAll('[title]').forEach(adopt);
  }

  adoptAll(document.body);
  new MutationObserver((records) => {
    for (const record of records) {
      if (record.type === 'attributes') adopt(record.target);
      else record.addedNodes.forEach(adoptAll);
    }
    if (anchor && !anchor.isConnected) hide();
  }).observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['title'] });

  function controlOf(node) {
    if (!(node instanceof Element) || tip.contains(node)) return null;
    return node.closest('[data-tooltip]');
  }

  function textFor(el) {
    const text = el.dataset.tooltip;
    if (!text) return '';
    for (const [rowClass, labelSelector] of ROW_LABELS) {
      if (!el.classList.contains(rowClass)) continue;
      const label = el.querySelector(labelSelector);
      if (!label || label.scrollWidth <= label.clientWidth) return '';
    }
    return text;
  }

  function place() {
    const box = anchor.getBoundingClientRect();
    const viewWidth = document.documentElement.clientWidth;
    const viewHeight = document.documentElement.clientHeight;
    const width = tip.offsetWidth;
    const height = tip.offsetHeight;
    let top = box.top - GAP_PX - height;
    if (top < EDGE_PX && box.bottom + GAP_PX + height <= viewHeight - EDGE_PX) top = box.bottom + GAP_PX;
    const left = Math.max(EDGE_PX, Math.min(box.left + box.width / 2 - width / 2, viewWidth - EDGE_PX - width));
    top = Math.max(EDGE_PX, Math.min(top, viewHeight - EDGE_PX - height));
    tip.style.left = left + 'px';
    tip.style.top = top + 'px';
  }

  function show(el) {
    clearTimeout(showTimer);
    clearTimeout(hideTimer);
    pending = null;
    const text = textFor(el);
    if (!text) {
      hide();
      return false;
    }
    anchor = el;
    tip.textContent = text;
    tip.hidden = false;
    place();
    return true;
  }

  function hide() {
    clearTimeout(showTimer);
    clearTimeout(hideTimer);
    pending = null;
    anchor = null;
    tip.hidden = true;
  }

  function hideSoon() {
    clearTimeout(hideTimer);
    hideTimer = setTimeout(hide, HIDE_DELAY_MS);
  }

  document.addEventListener('pointerover', (event) => {
    if (event.pointerType === 'touch') return;
    if (tip.contains(event.target)) {
      clearTimeout(hideTimer);
      return;
    }
    const el = controlOf(event.target);
    if (!el) return;
    if (el === anchor) {
      clearTimeout(hideTimer);
      return;
    }
    if (el === pending) return;
    clearTimeout(showTimer);
    if (anchor) {
      show(el);
      return;
    }
    pending = el;
    showTimer = setTimeout(() => show(el), SHOW_DELAY_MS);
  });

  document.addEventListener('pointerout', (event) => {
    if (event.pointerType === 'touch') return;
    const to = event.relatedTarget;
    if (pending && !(to instanceof Node && pending.contains(to))) {
      clearTimeout(showTimer);
      pending = null;
    }
    if (anchor && !(to instanceof Node && (anchor.contains(to) || tip.contains(to)))) hideSoon();
  });

  document.addEventListener('keydown', (event) => {
    keyboard = true;
    if (event.key === 'Escape' && anchor) hide();
  }, true);

  document.addEventListener('focusin', (event) => {
    const el = controlOf(event.target);
    if (el && keyboard) show(el);
    else if (anchor && anchor !== el) hide();
  });

  document.addEventListener('focusout', (event) => {
    if (anchor && anchor.contains(event.target)) hide();
  });

  document.addEventListener('pointerdown', (event) => {
    keyboard = false;
    swallowClick = false;
    if (!tip.contains(event.target)) hide();
    if (event.pointerType !== 'touch') return;
    const el = controlOf(event.target);
    if (!el) return;
    press = {
      el: el,
      x: event.clientX,
      y: event.clientY,
      timer: setTimeout(() => {
        press = null;
        if (!show(el)) return;
        swallowClick = true;
        hideTimer = setTimeout(hide, TOUCH_SHOW_MS);
      }, LONG_PRESS_MS),
    };
  }, true);

  document.addEventListener('pointermove', (event) => {
    if (!press || event.pointerType !== 'touch') return;
    if (Math.hypot(event.clientX - press.x, event.clientY - press.y) > TOUCH_SLOP_PX) {
      clearTimeout(press.timer);
      press = null;
    }
  }, true);

  function endPress() {
    if (!press) return;
    clearTimeout(press.timer);
    press = null;
  }
  document.addEventListener('pointerup', endPress, true);
  document.addEventListener('pointercancel', endPress, true);

  document.addEventListener('click', (event) => {
    if (!swallowClick) return;
    swallowClick = false;
    event.preventDefault();
    event.stopPropagation();
  }, true);

  document.addEventListener('contextmenu', (event) => {
    if (controlOf(event.target)) event.preventDefault();
  });

  window.addEventListener('scroll', () => { if (anchor) hide(); }, true);
  window.addEventListener('resize', () => { if (anchor) hide(); });
})();
