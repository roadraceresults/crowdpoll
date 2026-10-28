/*
  EMPTY-TAB LINE — emptyState() from src/public/tabs.js (REQUIREMENT empty-tab
  line (.tab-empty), clarification 1a). The function is copied verbatim. What
  it reads from elsewhere in tabs.js, panelOf, is copied beside it and marked
  "STAND-IN". It is exposed as Tabs.emptyState, the name production's callers
  use.
*/
(function () {
  "use strict";

  // STAND-IN: tabs.js line 22, copied as is.
  const panelOf = (name) => document.querySelector('.tab-panel[data-panel="' + name + '"]');

  function emptyState(name, text) {
    const panel = panelOf(name);
    const el = panel && panel.querySelector(".tab-empty");
    if (!el) return;
    if (text) {
      el.textContent = text;
      el.hidden = false;
    } else {
      el.hidden = true;
    }
  }

  window.Tabs = { emptyState: emptyState };
})();
