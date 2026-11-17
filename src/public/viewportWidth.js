(function () {
  "use strict";

  const PHONE_WIDTH = 480;
  const WIDE_PHONE_WIDTH = 640;
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

  function fixedWidth() {
    const held = heldWidth();
    if (held < PHONE_WIDTH) return PHONE_WIDTH;
    if (held > PHONE_WIDTH && held < WIDE_PHONE_WIDTH) return WIDE_PHONE_WIDTH;
    return 0;
  }

  // iOS Safari zooms in on a focused field whose text is drawn smaller than 16 px, and the fitted page is drawn
  // smaller than its CSS sizes. A maximum scale equal to the fitted scale leaves that zoom nowhere to go; pinching
  // ignores the limit in Safari. Other browsers would hold pinching to it, so they are not given one.
  function fixedContent(fixed) {
    const width = "width=" + fixed;
    if (!isIos) return width;
    return width + ", maximum-scale=" + Math.ceil(heldWidth() / fixed * 10000) / 10000;
  }

  function apply() {
    const fixed = fixedWidth();
    const wanted = fixed ? fixedContent(fixed) : deviceContent;
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
