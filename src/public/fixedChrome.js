(function () {
  "use strict";

  const HEADER_PROPERTY = "--fixed-chrome-height-header";
  const TOTAL_PROPERTY = "--fixed-chrome-height";

  const header = document.getElementById("site-header");
  if (!header) return;

  const root = document.documentElement;
  const resizeObserver = typeof ResizeObserver === "function" ? new ResizeObserver(schedule) : null;
  let scheduled = 0;

  function tabBarWrap() {
    return document.querySelector(".tab-bar-wrap");
  }

  function measure() {
    scheduled = 0;
    const headerHeight = header.offsetHeight;
    const wrap = tabBarWrap();
    const wrapHeight = wrap ? wrap.offsetHeight + (parseFloat(getComputedStyle(wrap).marginBottom) || 0) : 0;
    root.style.setProperty(HEADER_PROPERTY, headerHeight + "px");
    root.style.setProperty(TOTAL_PROPERTY, headerHeight + wrapHeight + "px");
    window.dispatchEvent(new Event("fixedchromechange"));
  }

  function schedule() {
    if (scheduled) return;
    scheduled = window.requestAnimationFrame ? window.requestAnimationFrame(measure) : window.setTimeout(measure, 0);
  }

  function height() {
    const value = parseFloat(getComputedStyle(root).getPropertyValue(TOTAL_PROPERTY));
    return Number.isNaN(value) ? 0 : value;
  }

  function observeSizes() {
    if (!resizeObserver) return;
    resizeObserver.disconnect();
    resizeObserver.observe(header);
    const wrap = tabBarWrap();
    if (wrap) resizeObserver.observe(wrap);
  }

  function onHeaderRebuilt() {
    observeSizes();
    schedule();
  }

  new MutationObserver(onHeaderRebuilt).observe(header, { childList: true });
  window.addEventListener("resize", schedule);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(schedule);

  window.FixedChrome = { height: height };

  observeSizes();
  schedule();
})();
