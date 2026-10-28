/*
  HARNESS for tabs-modal.html (REQUIREMENT `Tabs.modal` dialog).
  Tabs.modal needs nothing from the server, so there is no stub. This only:

  - draws six static placeholder blocks shaped like grid cards (2a);
  - opens the dialog with production's two messages, from buttons that stand
    in for the star (409 bookmark-cap, tabs.js) and the Live Results button
    (409 live-cap, liveResults.js), so focus returns to them on close;
  - notes how the last dialog closed (OK, Escape or the backdrop);
  - applies the Theme picker (data-theme on <html>), kept in the query string
    (?theme=…) where the browser allows: a page opened from file:// may not
    rewrite its own URL.
*/
(function () {
  'use strict';

  // Production's strings, with sample limits (ENV_MAX_BOOKMARKS_PER_USER and
  // ENV_MAX_LIVE_RESULTS_PER_USER defaults).
  const FAVORITES_CAP_LIMIT = 200;
  const LIVE_CAP_LIMIT = 5;
  const favoritesCapText = (limit) =>
    'You have reached the maximum number of Favorites. The limit is ' + limit +
    '. Please remove a poll on the Favorites tab before adding another.';
  const liveCapText = (limit) =>
    'You have reached the maximum number of polls that can be viewed on the Live Results tab. The limit is ' +
    limit + '. Please remove a poll on the Live Results tab before adding another.';

  const themePicker = document.getElementById('themePicker');
  const noteEl = document.getElementById('prototypeNote');
  const grid = document.getElementById('placeholderGrid');

  for (let i = 0; i < 6; i++) {
    const card = document.createElement('div');
    card.className = 'placeholder-card';
    card.innerHTML =
      '<div class="placeholder-title"></div><div class="placeholder-line"></div>' +
      '<div class="placeholder-bar"></div><div class="placeholder-bar"></div><div class="placeholder-bar"></div>';
    grid.appendChild(card);
  }

  // Watches the one open dialog to name how it closed. Capture phase, so this
  // runs before modal()'s own handlers remove it.
  let howClosed = null;
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && document.querySelector('.modal-backdrop')) howClosed = 'Escape';
  }, true);
  document.addEventListener('click', (event) => {
    if (event.target.closest('.modal-ok')) howClosed = 'OK';
    else if (event.target.classList.contains('modal-backdrop')) howClosed = 'backdrop';
  }, true);
  new MutationObserver(() => {
    if (howClosed && !document.querySelector('.modal-backdrop')) {
      noteEl.textContent = 'Closed with ' + howClosed + '.';
      howClosed = null;
    }
  }).observe(document.body, { childList: true });

  function open(text) {
    noteEl.textContent = '';
    window.Tabs.modal(text);
  }
  document.getElementById('openFavoritesCap').addEventListener('click', () => open(favoritesCapText(FAVORITES_CAP_LIMIT)));
  document.getElementById('openLiveCap').addEventListener('click', () => open(liveCapText(LIVE_CAP_LIMIT)));

  function applyTheme() {
    if (themePicker.value === 'system') delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = themePicker.value;
  }

  themePicker.addEventListener('change', () => {
    applyTheme();
    try {
      history.replaceState(null, '', '?theme=' + themePicker.value);
    } catch {
      // A page opened from file:// may not rewrite its URL; the choice still applies.
    }
  });

  const theme = new URLSearchParams(location.search).get('theme');
  themePicker.value = [...themePicker.options].some((o) => o.value === theme) ? theme : 'system';
  applyTheme();
})();
