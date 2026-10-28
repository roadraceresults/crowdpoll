/*
  HARNESS for empty-tab-line.html (REQUIREMENT empty-tab line (.tab-empty)).
  The line needs nothing from the server: emptyTabLine.js holds production's
  emptyState(). This only:

  - shows one of index.html's six panels, as production's tab switch does (2a);
  - offers that tab's production texts, and "(none)", and passes the choice to
    Tabs.emptyState(); "More results are not shown…" also fills the Search
    grid with six static placeholder cards, the only text shown below cards;
  - focuses the shown line as focusTabStart() (tabs.js) and
    focusAfterRemoval() (liveResults.js) do (4a);
  - applies the Theme picker (data-theme on <html>); Theme, Tab and Text are
    kept in the query string where the browser allows: a page opened from
    file:// may not rewrite its own URL.
*/
(function () {
  'use strict';

  const NONE = '';
  const FULL_GRID_TEXT = 'More results are not shown. Try more specific words.';

  // Each tab's texts, as its script passes them to Tabs.emptyState().
  const TEXTS = {
    trending: ['No polls are trending yet.'],                                // trending.js
    newest: ['No polls have been launched yet.'],                            // newest.js
    private: ['Nothing here yet.'],                                          // tabs.js, the personal delta tabs
    favourites: ['Nothing here yet.'],                                       // tabs.js, the personal delta tabs
    live: ['Press Live Results on a poll to watch it here.'],                // liveResults.js
    search: [                                                                // searchTab.js
      "Enter your search terms in the 'Search CrowdPoll' field above.",
      'No polls match your search.',
      FULL_GRID_TEXT,
    ],
  };

  const themePicker = document.getElementById('themePicker');
  const tabPicker = document.getElementById('tabPicker');
  const textPicker = document.getElementById('textPicker');
  const noteEl = document.getElementById('prototypeNote');
  const panelOf = (name) => document.querySelector('.tab-panel[data-panel="' + name + '"]');

  function placeholderCard() {
    const card = document.createElement('div');
    card.className = 'placeholder-card';
    card.setAttribute('aria-hidden', 'true');
    card.innerHTML =
      '<div class="placeholder-title"></div><div class="placeholder-line"></div>' +
      '<div class="placeholder-bar"></div><div class="placeholder-bar"></div><div class="placeholder-bar"></div>';
    return card;
  }

  function fillTextPicker(tab) {
    textPicker.replaceChildren();
    for (const text of TEXTS[tab]) textPicker.add(new Option(text, text));
    textPicker.add(new Option('(none)', NONE));
  }

  function showTab(tab) {
    for (const panel of document.querySelectorAll('.tab-panel')) panel.hidden = panel.dataset.panel !== tab;
  }

  function applyText() {
    const tab = tabPicker.value;
    const text = textPicker.value;
    const grid = panelOf(tab).querySelector('.card-grid');
    grid.replaceChildren();
    if (text === FULL_GRID_TEXT) {
      for (let i = 0; i < 6; i++) grid.appendChild(placeholderCard());
    }
    window.Tabs.emptyState(tab, text);
  }

  function applyTheme() {
    if (themePicker.value === 'system') delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = themePicker.value;
  }

  function saveChoices() {
    const params = new URLSearchParams({ theme: themePicker.value, tab: tabPicker.value, text: textPicker.selectedIndex });
    try {
      history.replaceState(null, '', '?' + params);
    } catch {
      // A page opened from file:// may not rewrite its URL; the choices still apply.
    }
  }

  themePicker.addEventListener('change', () => {
    applyTheme();
    saveChoices();
  });

  tabPicker.addEventListener('change', () => {
    showTab(tabPicker.value);
    fillTextPicker(tabPicker.value);
    applyText();
    noteEl.textContent = '';
    saveChoices();
  });

  textPicker.addEventListener('change', () => {
    applyText();
    noteEl.textContent = '';
    saveChoices();
  });

  // As focusTabStart() and focusAfterRemoval(): the line takes focus only while shown.
  document.getElementById('focusLine').addEventListener('click', () => {
    const line = panelOf(tabPicker.value).querySelector('.tab-empty');
    if (line.hidden) {
      noteEl.textContent = 'The line is hidden, so production would not focus it (sample only)';
      return;
    }
    noteEl.textContent = '';
    line.tabIndex = -1;
    line.focus();
  });

  const params = new URLSearchParams(location.search);
  const theme = params.get('theme');
  themePicker.value = [...themePicker.options].some((o) => o.value === theme) ? theme : 'system';
  const tab = params.get('tab');
  tabPicker.value = Object.hasOwn(TEXTS, tab) ? tab : 'trending';
  fillTextPicker(tabPicker.value);
  const textIndex = Number(params.get('text'));
  if (Number.isInteger(textIndex) && textIndex >= 0 && textIndex < textPicker.options.length) textPicker.selectedIndex = textIndex;
  applyTheme();
  showTab(tabPicker.value);
  applyText();
})();
