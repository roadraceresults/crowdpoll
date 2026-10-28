(function () {
  "use strict";

  const LADDER = ["no-name", "no-search"];
  const PHONE_QUERY = "(max-width: 639.98px)";
  const ATTRIBUTE = "data-header-fit";

  const header = document.getElementById("site-header");
  if (!header) return;

  const root = document.documentElement;
  const phone = window.matchMedia ? window.matchMedia(PHONE_QUERY) : null;
  const resizeObserver = typeof ResizeObserver === "function" ? new ResizeObserver(schedule) : null;
  let scheduled = 0;
  let searchWasHidden = false;

  function isPhone() {
    return Boolean(phone) && phone.matches;
  }

  function overflows() {
    return header.scrollWidth > header.clientWidth;
  }

  function applyTokens(tokens) {
    if (tokens.length === 0) root.removeAttribute(ATTRIBUTE);
    else root.setAttribute(ATTRIBUTE, tokens.join(" "));
  }

  function searchTabField() {
    return document.getElementById("searchTabBox");
  }

  function copyHeaderTermsToSearchTab() {
    const field = searchTabField();
    const terms = window.SiteSearch ? window.SiteSearch.value() : "";
    if (!field || !terms) return;
    field.value = terms;
    field.dispatchEvent(new Event("input", { bubbles: true }));
  }

  function syncTerms(tokens) {
    const searchIsHidden = tokens.includes("no-search");
    if (searchIsHidden && !searchWasHidden) copyHeaderTermsToSearchTab();
    searchWasHidden = searchIsHidden;
  }

  function evaluate() {
    scheduled = 0;
    const tokens = [];
    applyTokens(tokens);
    if (!isPhone()) {
      for (const token of LADDER) {
        if (!overflows()) break;
        tokens.push(token);
        applyTokens(tokens);
      }
    }
    syncTerms(tokens);
  }

  function schedule() {
    if (scheduled) return;
    scheduled = window.requestAnimationFrame ? window.requestAnimationFrame(evaluate) : window.setTimeout(evaluate, 0);
  }

  function observeSizes() {
    if (!resizeObserver) return;
    resizeObserver.disconnect();
    resizeObserver.observe(header);
    Array.from(header.children).forEach((child) => resizeObserver.observe(child));
  }

  function onHeaderRebuilt() {
    observeSizes();
    schedule();
  }

  document.addEventListener("input", (event) => {
    if (!event.target || event.target.id !== "searchTabBox") return;
    if (!searchWasHidden || !window.SiteSearch) return;
    window.SiteSearch.set(event.target.value);
  });

  new MutationObserver(onHeaderRebuilt).observe(header, { childList: true });
  window.addEventListener("resize", schedule);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(schedule);
  if (phone && phone.addEventListener) phone.addEventListener("change", schedule);

  observeSizes();
  schedule();
})();
