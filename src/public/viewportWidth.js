(function () {
  "use strict";

  const FIXED_WIDTH = 480;
  const TEXT_SIZE_PROPERTIES = ["text-size-adjust", "-webkit-text-size-adjust"];

  const meta = document.querySelector('meta[name="viewport"]');
  const deviceContent = meta.content;
  const fixedContent = "width=" + FIXED_WIDTH;
  const rootStyle = document.documentElement.style;

  function isLandscape() {
    if (screen.orientation) return screen.orientation.type.startsWith("landscape");
    return Math.abs(window.orientation) === 90;
  }

  function heldWidth() {
    const side = isLandscape() ? Math.max : Math.min;
    return side(screen.width, screen.height);
  }

  function apply() {
    const fixed = heldWidth() < FIXED_WIDTH;
    const wanted = fixed ? fixedContent : deviceContent;
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
