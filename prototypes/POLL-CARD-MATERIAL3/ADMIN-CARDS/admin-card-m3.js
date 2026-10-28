/*
  ADMIN CARDS — MATERIAL 3 RIPPLE (REQUIREMENT Use Material 3 For the admin
  cards). A copy of ../DISCARD-DIALOG/discard-dialog-m3.js, aimed at the
  cards' controls. The .m3-ripple styles come from ../pollCard-m3.css. It
  skips a target that is disabled or aria-disabled (Publish and Save while
  blocked), as production's m3-ripple.js does. Keyboard presses get no ripple:
  the focus layer covers them, as in Material 3.

  It also stands in for production's window.M3Ripple, so adminCard.js's
  window.M3Ripple?.add(".modal .modal-action") adds the Not Saved dialog's
  actions here. In Step 6 these targets move into adminCard.js as
  window.M3Ripple?.add(…) calls, and this file is not ported.
*/
(function () {
  'use strict';

  const targets = [
    '.poll-admin-card .m3-filled-btn',
    '.poll-admin-card .m3-tonal-btn',
    '.poll-admin-card .btn-header-primary',
    '.poll-admin-card .btn-header-ghost',
    '.poll-admin-card .admin-state-btn',
    '.poll-admin-card .admin-rescreen-btn',
    '.poll-admin-card .admin-icon-btn',
    '.poll-admin-card .actions-menu-trigger',
    '.poll-admin-card .m3-radio-item',
    '.poll-admin-card .m3-switch-row',
    '.actions-menu a',
    '.actions-menu button'
  ];

  function add(selector) {
    if (targets.indexOf(selector) === -1) targets.push(selector);
  }

  const reducedMotion = window.matchMedia
    ? window.matchMedia('(prefers-reduced-motion: reduce)')
    : { matches: false };

  function isInactive(target) {
    return target.disabled
      || target.classList.contains('is-disabled')
      || target.getAttribute('aria-disabled') === 'true';
  }

  document.addEventListener('pointerdown', (event) => {
    if (event.button !== 0 || reducedMotion.matches) return;
    const target = event.target instanceof Element ? event.target.closest(targets.join(', ')) : null;
    if (!target || isInactive(target)) return;

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

  window.M3Ripple = { add };
})();
