(function () {
  "use strict";

  const FIXED_WIDTH = 480;
  const TEXT_SIZE_PROPERTIES = ["text-size-adjust", "-webkit-text-size-adjust"];

  const meta = document.querySelector('meta[name="viewport"]');
  const deviceContent = meta.content;
  const rootStyle = document.documentElement.style;
  const isIos = /iPhone|iPod|iPad/.test(navigator.userAgent);

  function isLandscape() {
    if (screen.orientation) return screen.orientation.type.startsWith("landscape");
    return Math.abs(window.orientation) === 90;
  }

  function heldWidth() {
    const side = isLandscape() ? Math.max : Math.min;
    return side(screen.width, screen.height);
  }

  // iOS Safari zooms in on a focused field whose text is drawn smaller than 16 px, and the fitted page is drawn
  // smaller than its CSS sizes. A maximum scale equal to the fitted scale leaves that zoom nowhere to go; pinching
  // ignores the limit in Safari. Other browsers would hold pinching to it, so they are not given one.
  function fixedContent() {
    const width = "width=" + FIXED_WIDTH;
    if (!isIos) return width;
    return width + ", maximum-scale=" + Math.ceil(heldWidth() / FIXED_WIDTH * 10000) / 10000;
  }

  function apply() {
    const fixed = heldWidth() < FIXED_WIDTH;
    const wanted = fixed ? fixedContent() : deviceContent;
    if (meta.content === wanted) return;
    meta.content = wanted;
    for (const property of TEXT_SIZE_PROPERTIES) {
      if (fixed) rootStyle.setProperty(property, "100%");
      else rootStyle.removeProperty(property);
    }
  }

  apply();
  window.addEventListener("resize", apply);
  window.addEventListener("pageshow", apply);
  if (screen.orientation) screen.orientation.addEventListener("change", apply);
})();
