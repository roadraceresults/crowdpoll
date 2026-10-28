/*
  POLL CARD — MATERIAL 3 RIPPLE (REQUIREMENT004, clarification 6b)
  One delegated pointerdown listener on the document, so every card is covered,
  including cards mounted later, the maximized one and its close control,
  without a change inside pollCard.js. The state layers themselves are CSS
  (pollCard-m3.css); this only adds the press ripple. Keyboard presses get no
  ripple: the focus layer covers them, as in Material 3.
*/
(function () {
  'use strict';

  const RIPPLE_TARGETS = [
    '.btn-vote', '.icon-btn', '.bookmark-btn', '.maximize-btn',
    '.live-link', '.arrow-row', '.vote-row'
  ].map((s) => '.card-face ' + s)
    // REQUIREMENT006: the maximized view's close control sits outside the card.
    .concat('.maximized-card-close').join(', ');

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  document.addEventListener('pointerdown', (event) => {
    if (event.button !== 0 || reducedMotion.matches) return;
    const target = event.target.closest(RIPPLE_TARGETS);
    if (!target || target.disabled || target.classList.contains('is-inert')
      || target.getAttribute('aria-disabled') === 'true') return;

    const box = target.getBoundingClientRect();
    const size = 2 * Math.max(box.width, box.height);
    const ripple = document.createElement('span');
    ripple.className = 'm3-ripple';
    ripple.setAttribute('aria-hidden', 'true');
    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = (event.clientX - box.left - size / 2) + 'px';
    ripple.style.top = (event.clientY - box.top - size / 2) + 'px';

    // A vote row is rebuilt by the click that follows this press
    // (renderVotingOptions empties the list), which would cut the ripple
    // short. Its ripple is hosted instead in a clipping box laid over the row
    // inside .bar-scroll-inner, which survives the rebuild.
    let host = target;
    let removable = ripple;
    if (target.matches('.vote-row')){
      const inner = target.closest('.bar-scroll-inner');
      const at = inner.getBoundingClientRect();
      const style = getComputedStyle(target);
      host = document.createElement('span');
      host.className = 'm3-ripple-host';
      host.setAttribute('aria-hidden', 'true');
      host.style.left = (box.left - at.left) + 'px';
      host.style.top = (box.top - at.top) + 'px';
      host.style.width = box.width + 'px';
      host.style.height = box.height + 'px';
      host.style.borderRadius = style.borderRadius;
      host.style.color = style.color;
      host.appendChild(ripple);
      inner.appendChild(host);
      removable = host;
    } else {
      host.appendChild(ripple);
    }
    ripple.addEventListener('animationend', () => removable.remove(), { once: true });
  });
})();
