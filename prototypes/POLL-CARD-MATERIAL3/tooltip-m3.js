/*
  TOOLTIPS — MATERIAL 3 PLAIN TOOLTIP (REQUIREMENT Use Material 3 For
  tooltips). One tooltip element on <body>, styled by tooltip-m3.css.

  - Text (clarification 1a): production keeps writing `title`. Every `title`
    in the page, now or later, is moved to `data-tooltip` and removed, so the
    browser's own tooltip never shows. An empty `title` clears it.
  - Rows (2a): a .result-row or .vote-row shows its tooltip only while its
    label is cut off.
  - When (4b): mouse, 500 ms after entering, hidden 150 ms after leaving the
    control and the tooltip; keyboard focus, at once; touch, a 500 ms press
    without moving shows it for 1.5 s and cancels that press's click. Escape,
    a press, scrolling and resizing hide it.
  - Where (5a): centred 4 px below the control, above it when there is no room
    below, kept 8 px inside the viewport.

  The tooltip is aria-hidden: each icon control's aria-label already gives the
  same words, and a row's label is its visible text.
*/
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

  let anchor = null;      // the control whose tooltip shows
  let pending = null;     // the control waiting out SHOW_DELAY_MS
  let showTimer = 0;
  let hideTimer = 0;
  let press = null;       // a touch press that may become a long press
  let swallowClick = false;
  let keyboard = false;   // the last input was a key, as :focus-visible decides

  // ---- Text: take every title over ----

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

  // ---- Showing and placing ----

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
    let top = box.bottom + GAP_PX;
    if (top + height > viewHeight - EDGE_PX && box.top - GAP_PX - height >= EDGE_PX) top = box.top - GAP_PX - height;
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

  // ---- Mouse and pen ----

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
      show(el); // moving from one tooltip to the next shows the next at once
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

  // ---- Keyboard ----

  document.addEventListener('keydown', (event) => {
    keyboard = true;
    // Escape dismisses the tooltip and is not stopped: the page's own Escape
    // handlers (the maximized view, dialogs) still receive it.
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

  // ---- Touch, and any press ----

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

  // A long press shows the tooltip; it does not also activate the control.
  document.addEventListener('click', (event) => {
    if (!swallowClick) return;
    swallowClick = false;
    event.preventDefault();
    event.stopPropagation();
  }, true);

  // A long press on a control with a tooltip opens no browser menu.
  document.addEventListener('contextmenu', (event) => {
    if (controlOf(event.target)) event.preventDefault();
  });

  window.addEventListener('scroll', () => { if (anchor) hide(); }, true);
  window.addEventListener('resize', () => { if (anchor) hide(); });
})();
