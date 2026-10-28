/*
  HARNESS for live-results-idle-prompt.html (REQUIREMENT Live Results idle
  prompt). The prompt needs nothing from the server: liveIdlePrompt.js's
  stand-ins replace what liveResults.js would call. This only:

  - draws six static placeholder blocks shaped like grid cards (2a);
  - shows the prompt from a button, instead of after ENV_MAX_IDLE_TIME (3a);
    a press while it shows does nothing, by production's own `prompting`;
  - reports what Yes or Cancel would do in production (the stand-ins'
    "live-idle-sample" events);
  - applies the Theme picker (data-theme on <html>), kept in the query string
    (?theme=…) where the browser allows: a page opened from file:// may not
    rewrite its own URL.
*/
(function () {
  'use strict';

  const SAMPLE_NOTE = '(sample only)';
  const themePicker = document.getElementById('themePicker');
  const noteEl = document.getElementById('prototypeNote');
  const grid = document.querySelector('.tab-panel[data-panel="live"] .card-grid');

  for (let i = 0; i < 6; i++) {
    const card = document.createElement('div');
    card.className = 'placeholder-card';
    card.setAttribute('aria-hidden', 'true');
    card.innerHTML =
      '<div class="placeholder-title"></div><div class="placeholder-line"></div>' +
      '<div class="placeholder-bar"></div><div class="placeholder-bar"></div><div class="placeholder-bar"></div>';
    grid.appendChild(card);
  }

  document.getElementById('showIdlePrompt').addEventListener('click', () => {
    noteEl.textContent = '';
    window.LiveIdlePrompt.show();
  });

  document.addEventListener('live-idle-sample', (event) => {
    const detail = event.detail;
    console.log('[sample] ' + detail.action, detail);
    noteEl.textContent = detail.action === 'refresh'
      ? 'Yes: the idle clock is reset and Live Results refreshes ' + SAMPLE_NOTE
      : 'Cancel: the polls are removed and the page returns to Trending ' + SAMPLE_NOTE;
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
