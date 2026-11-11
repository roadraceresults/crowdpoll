(function () {
  "use strict";

  const ARROW_SVG =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>';

  let legalDepth = 0;

  function cameFromThisSite() {
    if (history.length <= 1) return false;
    try {
      return new URL(document.referrer).origin === location.origin;
    } catch {
      return false;
    }
  }

  const canReturn = cameFromThisSite();

  window.SiteBack = {
    canReturn: () => canReturn,
    leave(fallback) {
      if (canReturn) {
        history.back();
        return true;
      }
      if (fallback) {
        location.assign(fallback);
        return true;
      }
      return false;
    }
  };

  function storedDepth() {
    const state = history.state;
    return state && typeof state.legalDepth === "number" ? state.legalDepth : null;
  }

  function numberEntry(depthIfNew) {
    const kept = storedDepth();
    if (kept !== null) {
      legalDepth = kept;
      return;
    }
    legalDepth = depthIfNew;
    history.replaceState({ ...history.state, legalDepth }, "");
  }

  function onStep() {
    numberEntry(legalDepth + 1);
  }

  function buildArrow() {
    const bar = document.createElement("div");
    bar.className = "back-arrow-bar";
    const button = document.createElement("button");
    button.type = "button";
    button.id = "backArrow";
    button.className = "back-arrow";
    button.setAttribute("aria-label", "Back");
    button.title = "Back";
    button.innerHTML = ARROW_SVG;
    button.addEventListener("click", () => {
      history.go(-(legalDepth + 1));
    });
    bar.appendChild(button);
    return bar;
  }

  if (!canReturn || !document.body.hasAttribute("data-back-arrow")) return;
  numberEntry(0);
  window.addEventListener("popstate", onStep);
  window.addEventListener("hashchange", onStep);
  document.getElementById("site-header").after(buildArrow());
})();
