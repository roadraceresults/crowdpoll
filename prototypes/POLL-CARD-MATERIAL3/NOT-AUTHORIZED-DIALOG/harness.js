/*
  HARNESS for not-authorized-dialog.html (REQUIREMENT Not Authorized Dialog).
  The card needs nothing from the server: notAuthorizedCard.js makes no fetch
  and reads no query string and no session, so there is no stub. This only:

  - shows "(sample only: no action taken)" for the × (to /) instead of
    navigating;
  - applies the Theme picker (data-theme on <html>), kept in the query string
    (?theme=…) where the browser allows: a page opened from file:// may not
    rewrite its own URL.
*/
(function () {
  'use strict';

  const SAMPLE_NOTE = '(sample only: no action taken)';
  const themePicker = document.getElementById('themePicker');
  const noteEl = document.getElementById('prototypeNote');
  const main = document.getElementById('card-root');

  // The × navigates in production.
  main.addEventListener('click', (event) => {
    const link = event.target.closest('a[href]');
    if (!link) return;
    event.preventDefault();
    const name = link.classList.contains('card-shell-close') ? 'Close (back to the home page)' : link.textContent.trim();
    console.log('[sample] ' + name, link.getAttribute('href'));
    noteEl.textContent = name + ': ' + SAMPLE_NOTE;
  });

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
