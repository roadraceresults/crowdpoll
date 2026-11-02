/**
 * Site Settings — the page's color scheme. Loaded without defer before every
 * stylesheet, so a page opens in the scheme its device copy remembers; the
 * account's value, from the session, then corrects that copy. Light is the
 * absence of data-theme; the device's own appearance setting is never read.
 */
(function () {
  "use strict";

  const STORAGE_KEY = "colorScheme";
  const root = document.documentElement;
  let saving = false;

  function current() {
    return root.dataset.theme === "dark" ? "dark" : "light";
  }

  function apply(scheme) {
    if (scheme === "dark") root.dataset.theme = "dark";
    else delete root.dataset.theme;
    try {
      if (scheme === "dark") localStorage.setItem(STORAGE_KEY, "dark");
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Blocked storage: the scheme still applies; the next page opens in Light until the session answers.
    }
  }

  /* While the Site Settings card has a save in flight or queued, the user's
     pending choice wins over any session snapshot that arrives meanwhile. */
  function setSaving(flag) {
    saving = Boolean(flag);
  }

  try {
    if (localStorage.getItem(STORAGE_KEY) === "dark") root.dataset.theme = "dark";
  } catch {
    // Blocked storage: Light until the session answers.
  }

  window.ColorScheme = { apply: apply, current: current, setSaving: setSaving };

  document.addEventListener("DOMContentLoaded", () => {
    if (!window.Session) return;
    window.Session.subscribe((me) => {
      if (saving) return;
      apply(me && me.colorScheme === "dark" ? "dark" : "light");
    });
  });
})();
