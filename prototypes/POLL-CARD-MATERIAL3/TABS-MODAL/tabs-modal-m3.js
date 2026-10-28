/*
  TABS.MODAL — MATERIAL 3 RIPPLE (REQUIREMENT Use Material 3 For `Tabs.modal`
  Dialog). A copy of ../pollCard-m3.js's delegated pointerdown listener
  (without its vote-row branch), aimed at the dialog's OK, as
  HEADER-TAB-BAR/header-tab-bar-m3.js does for the header. The .m3-ripple
  styles come from ../pollCard-m3.css. Keyboard presses get no ripple: the
  focus layer covers them, as in Material 3.
*/
(function () {
  'use strict';

  const RIPPLE_TARGETS = '.modal .modal-ok';

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  document.addEventListener('pointerdown', (event) => {
    if (event.button !== 0 || reducedMotion.matches) return;
    const target = event.target.closest(RIPPLE_TARGETS);
    if (!target || target.disabled) return;

    const box = target.getBoundingClientRect();
    const size = 2 * Math.max(box.width, box.height);
    const ripple = document.createElement('span');
    ripple.className = 'm3-ripple';
    ripple.setAttribute('aria-hidden', 'true');
    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = (event.clientX - box.left - size / 2) + 'px';
    ripple.style.top = (event.clientY - box.top - size / 2) + 'px';
    target.appendChild(ripple);
    ripple.addEventListener('animationend', () => ripple.remove(), { once: true });
  });
})();
