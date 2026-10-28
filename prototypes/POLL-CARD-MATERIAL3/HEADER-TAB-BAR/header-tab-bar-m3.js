/*
  HEADER AND TAB BAR — MATERIAL 3 BEHAVIOUR (REQUIREMENT Use Material 3 For
  Header Tab Bar and Other UI Components). Three things, none of which edits
  the copied markup or header.js:

  1. The ripple: a copy of ../pollCard-m3.js's delegated pointerdown listener
     (without its vote-row branch), aimed at the header and tab bar controls.
     The .m3-ripple styles come from ../pollCard-m3.css.
  2. Snackbar stacking: while the cookie banner shows, --cookie-banner-offset
     on <html> is its height plus 8px, so the tab notice rises above it.
  3. role="status" on #tabNotice, so screen readers announce the snackbar.
*/
(function () {
  'use strict';

  // ---- 1. Ripple ----

  const RIPPLE_TARGETS = [
    '.tab-bar .tab', '.tab-refresh--icon', '.search-icon-btn', '.header-search-clear',
    '.btn-header-ghost', '.btn-header-primary', '.avatar-menu a', '.avatar-menu button',
    '#cookie-banner button', '.tab-notice-close'
  ].join(', ');

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
    target.appendChild(ripple);
    ripple.addEventListener('animationend', () => ripple.remove(), { once: true });
  });

  // ---- 2. Snackbar stacking ----

  const root = document.documentElement;
  let watched = null;
  const sizeWatch = typeof ResizeObserver === 'function'
    ? new ResizeObserver(() => setOffset())
    : null;

  function setOffset() {
    const banner = document.getElementById('cookie-banner');
    if (banner) root.style.setProperty('--cookie-banner-offset', (banner.offsetHeight + 8) + 'px');
    else root.style.removeProperty('--cookie-banner-offset');
  }

  function watchBanner() {
    const banner = document.getElementById('cookie-banner');
    if (banner === watched) return;
    if (sizeWatch && watched) sizeWatch.unobserve(watched);
    watched = banner;
    if (sizeWatch && banner) sizeWatch.observe(banner);
    setOffset();
  }

  new MutationObserver(watchBanner).observe(document.body, { childList: true });
  watchBanner();

  // ---- 3. Announce the snackbar ----

  const notice = document.getElementById('tabNotice');
  if (notice) notice.setAttribute('role', 'status');
})();
